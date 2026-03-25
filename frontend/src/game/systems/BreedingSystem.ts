import { nanoid } from 'nanoid';
import type { TankState, ShrimpState } from '../types';
import { VARIANT_MAP, isBreedingReady, calcHealthScore } from '../data/shrimpVariants';

// ─────────────────────────────────────────────────────────────────────────────
// BreedingSystem
// Handles the full shrimp breeding lifecycle:
//   female saddle → molt → pheromone release → male swarm →
//   berried → gestation countdown → shrimplet spawn → growth to juvenile → adult
// ─────────────────────────────────────────────────────────────────────────────

/** Events emitted outward via the event bus */
export type BreedingEvent =
  | { type: 'female_molt'; shrimpId: string }
  | { type: 'male_swarm'; tankId: string }
  | { type: 'female_berried'; shrimpId: string; eggCount: number }
  | { type: 'hatch'; tankId: string; count: number; variantId: string }
  | { type: 'shrimp_died'; shrimpId: string; cause: string };

export type BreedingEventHandler = (event: BreedingEvent) => void;

export class BreedingSystem {
  private handlers: BreedingEventHandler[] = [];
  speedMultiplier = 1;

  onEvent(handler: BreedingEventHandler) {
    this.handlers.push(handler);
  }

  private emit(event: BreedingEvent) {
    this.handlers.forEach(h => h(event));
  }

  /** Called every in-game DAY by TankScene */
  tick(tank: TankState, gameDays = 1) {
    const days = gameDays * this.speedMultiplier;

    for (const shrimp of [...tank.shrimp]) {
      shrimp.ageGameDays += days;
      this.tickMolting(shrimp, tank, days);
      this.tickAging(shrimp, tank, days);
      this.tickFullness(shrimp, tank, days);
    }

    this.tickBreeding(tank, days);
    this.tickBerried(tank, days);
    this.removeDeadShrimp(tank);
  }

  /** Manage molting countdown and post-molt window */
  private tickMolting(shrimp: ShrimpState, tank: TankState, days: number) {
    if (shrimp.postMoltWindow > 0) {
      shrimp.postMoltWindow = Math.max(0, shrimp.postMoltWindow - days * 24);
      return; // Waiting for shell to harden
    }

    shrimp.daysToMolt -= days;

    if (shrimp.daysToMolt <= 0) {
      const variant = VARIANT_MAP.get(shrimp.variantId);
      if (!variant) return;

      // Check GH for successful molt
      const ghOk = tank.params.gh >= variant.gh.min + 1;
      if (!ghOk) {
        // Failed molt — shrimp dies
        shrimp.health = 0;
        this.emit({ type: 'shrimp_died', shrimpId: shrimp.id, cause: 'Failed molt (GH too low)' });
        return;
      }

      // Successful molt — schedule next molt
      const [minM, maxM] = variant.moltFrequencyDays;
      shrimp.daysToMolt = minM + Math.random() * (maxM - minM);
      shrimp.postMoltWindow = 48; // hours

      // If female and adult, this molt can trigger breeding
      if (shrimp.sex === 'female' && shrimp.stage === 'adult') {
        this.emit({ type: 'female_molt', shrimpId: shrimp.id });
        this.triggerBreeding(shrimp, tank);
      }
    }
  }

  /** Advance shrimp life stages */
  private tickAging(shrimp: ShrimpState, _tank: TankState, _days: number) {
    const variant = VARIANT_MAP.get(shrimp.variantId);
    if (!variant) return;

    if (shrimp.stage === 'shrimplet' && shrimp.ageGameDays >= 14) {
      shrimp.stage = 'juvenile';
    } else if (shrimp.stage === 'juvenile' && shrimp.ageGameDays >= 30) {
      shrimp.stage = 'adult';
    }
  }

  /** Reduce fullness over time; starvation stress */
  private tickFullness(shrimp: ShrimpState, tank: TankState, days: number) {
    shrimp.fullness = Math.max(0, shrimp.fullness - 0.08 * days);

    // Shrimplets can survive on biofilm alone
    if (shrimp.stage === 'shrimplet') {
      if (tank.biofilmLevel < 0.1) {
        shrimp.stressAccumulated += 0.05 * days;
      } else {
        shrimp.fullness = Math.min(1, shrimp.fullness + tank.biofilmLevel * 0.3 * days);
      }
    }

    if (shrimp.fullness < 0.1) {
      shrimp.stressAccumulated += 0.02 * days;
    }
  }

  /** Attempt to initiate breeding in the tank */
  private triggerBreeding(female: ShrimpState, tank: TankState) {
    const variant = VARIANT_MAP.get(female.variantId);
    if (!variant) return;
    if (female.berriedDaysRemaining !== null) return; // Already berried
    if (female.ageGameDays < variant.maturityDays) return;

    // Check if breeding conditions met
    if (!isBreedingReady(variant, tank.params)) return;

    // Find at least one male of same (or compatible) group
    const males = tank.shrimp.filter(
      s => s.sex === 'male' && s.stage === 'adult' &&
        VARIANT_MAP.get(s.variantId)?.group === variant.group
    );
    if (males.length === 0) return;

    // Trigger male swarm event
    this.emit({ type: 'male_swarm', tankId: tank.id });

    // Berried!
    const [minEgg, maxEgg] = variant.eggsPerClutch;
    female.eggCount = Math.floor(minEgg + Math.random() * (maxEgg - minEgg + 1));

    // Gestation duration: inversely proportional to temperature above idealLow
    const tempRatio = Math.max(0, Math.min(1,
      (tank.params.tempF - variant.tempF.idealLow) / (variant.tempF.idealHigh - variant.tempF.idealLow)
    ));
    const gestation = variant.gestationDaysMax -
      (variant.gestationDaysMax - variant.gestationDaysMin) * tempRatio;
    female.berriedDaysRemaining = gestation;

    this.emit({ type: 'female_berried', shrimpId: female.id, eggCount: female.eggCount });
  }

  /** Advance gestation countdown on berried females */
  private tickBerried(tank: TankState, days: number) {
    for (const shrimp of tank.shrimp) {
      if (shrimp.berriedDaysRemaining === null) continue;
      shrimp.berriedDaysRemaining -= days;

      if (shrimp.berriedDaysRemaining <= 0) {
        // Hatch!
        const count = shrimp.eggCount;
        shrimp.berriedDaysRemaining = null;
        shrimp.eggCount = 0;

        this.spawnShrimplets(tank, shrimp.variantId, count);
        this.emit({ type: 'hatch', tankId: tank.id, count, variantId: shrimp.variantId });
      }
    }
  }

  private spawnShrimplets(tank: TankState, variantId: string, count: number) {
    const variant = VARIANT_MAP.get(variantId);
    if (!variant) return;

    // Determine gender at random (50/50 roughly, but environment can skew — simplified here)
    for (let i = 0; i < count; i++) {
      // Max density check
      if (tank.shrimp.length >= tank.gallons * 10) break;

      const newShrimp: ShrimpState = {
        id: nanoid(),
        variantId,
        sex: Math.random() < 0.5 ? 'female' : 'male',
        stage: 'shrimplet',
        ageGameDays: 0,
        health: 1,
        fullness: 0.7,
        daysToMolt: 1 + Math.random() * 2, // shrimplets molt very frequently
        postMoltWindow: 0,
        berriedDaysRemaining: null,
        eggCount: 0,
        stressAccumulated: 0,
        x: 50 + Math.random() * (tank.gallons * 15),
        y: 50 + Math.random() * 80,
        facingRight: Math.random() > 0.5,
        behavior: 'idle',
        behaviorTimer: 0,
        listedPrice: null,
      };
      tank.shrimp.push(newShrimp);
    }
  }

  /** Tick breeding-readiness for all adult females */
  private tickBreeding(tank: TankState, days: number) {
    for (const shrimp of tank.shrimp) {
      if (shrimp.sex !== 'female' || shrimp.stage !== 'adult') continue;
      if (shrimp.berriedDaysRemaining !== null) continue;
      // Each day there's a small chance a female with a saddle triggers a molt
      // (simplified: if mature, every ~45-game-day cycle a female releases pheromone)
      if (shrimp.ageGameDays > 0 && shrimp.daysToMolt <= 0) {
        // handled in tickMolting
      }
    }
  }

  /** Remove dead shrimp from the tank */
  private removeDeadShrimp(tank: TankState) {
    tank.shrimp = tank.shrimp.filter(s => {
      if (s.health <= 0) {
        this.emit({ type: 'shrimp_died', shrimpId: s.id, cause: 'health depleted' });
        return false;
      }
      if (s.stressAccumulated >= 1) {
        this.emit({ type: 'shrimp_died', shrimpId: s.id, cause: 'accumulated stress' });
        return false;
      }
      return true;
    });
  }

  /** Apply health scoring from water params to all shrimp */
  updateHealth(tank: TankState) {
    for (const shrimp of tank.shrimp) {
      const variant = VARIANT_MAP.get(shrimp.variantId);
      if (!variant) continue;
      const rawHealth = calcHealthScore(variant, tank.params);

      // Copper kills instantly
      if (tank.copperPpm > 0.05) {
        shrimp.health = 0;
        continue;
      }

      // Smooth health changes: allow rapid drops, slow recovery
      if (rawHealth < shrimp.health) {
        shrimp.health = Math.max(0, shrimp.health - (shrimp.health - rawHealth) * 0.3);
      } else {
        shrimp.health = Math.min(1, shrimp.health + (rawHealth - shrimp.health) * 0.05);
      }

      // Poor health adds stress
      if (shrimp.health < 0.4) {
        shrimp.stressAccumulated += (0.4 - shrimp.health) * 0.01;
      }
    }
  }
}
