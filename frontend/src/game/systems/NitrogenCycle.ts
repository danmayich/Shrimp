import type { TankState } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// NitrogenCycle
// Models the ammonia → nitrite → nitrate conversion by bacteria.
// Called every game hour from TankScene.
// ─────────────────────────────────────────────────────────────────────────────

/** How fast bacteria convert compounds per ppm per game hour */
const CONVERSION_RATES = {
  ammoniaToNitrite: 0.08,  // Nitrosomonas: converts NH3 → NO2
  nitriteToNitrate: 0.06,  // Nitrospira: converts NO2 → NO3
  bacteriaGrowthRate: 0.01, // How fast bacteria colony grows per hour
  bacteriaStarterBoost: 0.04,
};

/** Food decay and waste production */
const WASTE = {
  uneatenfoodDecayPerHour: 0.5,    // Units decayed per hour
  ammoniaPerUnitFood: 0.03,        // ppm ammonia per unit of decayed food
  shrimpWastePerShrimpPerHour: 0.002, // ppm ammonia per shrimp per hour
  tanninsDecayPerHour: 0.003,      // Tannins fade from botanicals
};

/** Plant nitrate absorption per 1 unit of cover score per hour */
const PLANT_NITRATE_ABSORPTION = 0.005;

export class NitrogenCycle {
  speedMultiplier = 1;

  private getInstalledFilters(tank: TankState) {
    if (Array.isArray(tank.filters) && tank.filters.length > 0) return tank.filters;
    if (tank.filterType && tank.filterType !== 'none') {
      return [{ type: tank.filterType }];
    }
    return [];
  }

  private getFilterSupport(tank: TankState): number {
    const filters = this.getInstalledFilters(tank);
    if (filters.length === 0) return 0.68;

    const supportBoost = filters.reduce((total, filter) => {
      if (filter.type === 'sponge') return total + 0.32;
      return total + 0.44;
    }, 0);

    return Math.min(1.8, 0.68 + supportBoost);
  }

  /** Apply one game-hour of nitrogen cycle activity */
  tick(tank: TankState, gameHours = 1) {
    const p = tank.params;
    const hrs = gameHours * this.speedMultiplier;
    const shrimpCount = tank.shrimp.length;
    const filterSupport = this.getFilterSupport(tank);

    // ── Step 1: Ammonia production ────────────────────────────────────────────
    // From uneaten food decay
    const foodToDecay = Math.min(tank.uneatenfood, WASTE.uneatenfoodDecayPerHour * hrs);
    tank.uneatenfood -= foodToDecay;
    p.ammonia += foodToDecay * WASTE.ammoniaPerUnitFood;

    // From shrimp metabolism / waste
    p.ammonia += shrimpCount * WASTE.shrimpWastePerShrimpPerHour * hrs;

    // From new/active substrate (releases ammonia for first 6 weeks)
    if (tank.substateType === 'active' && tank.substrateAgeMonths < 1.5) {
      const releaseRate = Math.max(0, (1.5 - tank.substrateAgeMonths) / 1.5);
      p.ammonia += releaseRate * 0.1 * hrs;
      // Mark as not yet cycled until bacteria can handle it
    }

    // ── Step 2: Bacteria colony growth ───────────────────────────────────────
    // Growth is stronger with available ammonia and better filtration area.
    const ammoniaFoodSignal = Math.min(2.2, Math.max(0.2, 0.35 + p.ammonia * 3));
    const loadSignal = Math.min(1.25, 0.8 + shrimpCount * 0.02);
    const bacteriaGrowth = CONVERSION_RATES.bacteriaGrowthRate * hrs * ammoniaFoodSignal * loadSignal * filterSupport;
    tank.bacteriaLevel = Math.min(1, tank.bacteriaLevel + bacteriaGrowth);

    // ── Step 3: Bacteria starter dose effect ──────────────────────────────────
    // (Applied via addBacteriaStarter — not here per tick)

    // ── Step 4: Ammonia → Nitrite (Nitrosomonas) ─────────────────────────────
    const ammoniaColonyEfficiency = Math.min(1.2, tank.bacteriaLevel * filterSupport);
    const ammConversion = Math.min(
      p.ammonia,
      p.ammonia * CONVERSION_RATES.ammoniaToNitrite * ammoniaColonyEfficiency * hrs
    );
    p.ammonia -= ammConversion;
    p.nitrite += ammConversion;

    // ── Step 5: Nitrite → Nitrate (Nitrospira — slightly slower to establish) ─
    // Nitrospira lag — only active after bacteria level > 0.3
    if (tank.bacteriaLevel > 0.25) {
      const nitriteColonyEfficiency = Math.min(1.15, Math.max(0, (tank.bacteriaLevel - 0.25) / 0.75) * filterSupport);
      const nitriteConversion = Math.min(
        p.nitrite,
        p.nitrite * CONVERSION_RATES.nitriteToNitrate * nitriteColonyEfficiency * hrs
      );
      p.nitrite -= nitriteConversion;
      p.nitrate += nitriteConversion;
    }

    // ── Step 6: Plant nitrate absorption ─────────────────────────────────────
    const plantAbsorption = tank.plantCoverScore * PLANT_NITRATE_ABSORPTION * hrs;
    p.nitrate = Math.max(0, p.nitrate - plantAbsorption);

    // ── Step 7: Tannin decay ─────────────────────────────────────────────────
    tank.tannins = Math.max(0, tank.tannins - WASTE.tanninsDecayPerHour * hrs);

    // ── Step 8: Biofilm accumulation (grows passively with plants/bacteria) ───
    const biofilmGrowth = (tank.plantCoverScore / 20) * 0.002 * hrs +
      tank.bacteriaLevel * 0.001 * hrs;
    tank.biofilmLevel = Math.min(1, tank.biofilmLevel + biofilmGrowth);
    // Biofilm consumed by shrimp
    const biofilmConsumption = shrimpCount * 0.0002 * hrs;
    tank.biofilmLevel = Math.max(0, tank.biofilmLevel - biofilmConsumption);

    // ── Step 9: Cycling status ────────────────────────────────────────────────
    if (
      !tank.cycled &&
      tank.bacteriaLevel > 0.8 &&
      p.ammonia < 0.25 &&
      p.nitrite < 0.25 &&
      p.nitrate > 0
    ) {
      tank.cycled = true;
    }

    // ── Step 10: Clamp all nitrogen values ────────────────────────────────────
    p.ammonia = Math.max(0, p.ammonia);
    p.nitrite = Math.max(0, p.nitrite);
    p.nitrate = Math.max(0, p.nitrate);

    // ── Step 11: Update cycling elapsed days ─────────────────────────────────
    if (!tank.cycled) {
      tank.cyclingDaysElapsed += hrs / 24;
    }
  }

  /** Apply a bacteria starter / seeded filter media dose */
  addBacteriaStarter(tank: TankState, boostAmount: number = 0.2) {
    tank.bacteriaLevel = Math.min(1, tank.bacteriaLevel + boostAmount);
  }

  /** Drop food into the tank */
  addFood(tank: TankState, units: number) {
    tank.uneatenfood += units;
  }

  /** Emergency large-food-spike (overfeeding event) */
  overfeed(tank: TankState) {
    this.addFood(tank, 10);
  }

  /** Introduce copper (immediate tank-wide toxicity) */
  addCopper(tank: TankState, ppm: number) {
    tank.copperPpm += ppm;
    // Copper also kills bacteria colonies
    tank.bacteriaLevel = Math.max(0, tank.bacteriaLevel - ppm * 2);
  }

  /** Get cycle phase description for UI */
  getCyclePhase(tank: TankState): { label: string; colorHex: string } {
    if (tank.cycled) return { label: 'Cycled ✅', colorHex: '#22cc44' };
    const p = tank.params;
    if (p.ammonia > 0.5 && p.nitrite < 0.1)
      return { label: 'Phase 1: Ammonia Spike 🟡', colorHex: '#ccaa00' };
    if (p.ammonia > 0 && p.nitrite > 0.1)
      return { label: 'Phase 2: Nitrite Spike 🟠', colorHex: '#cc6600' };
    if (p.nitrite > 0.5)
      return { label: 'Phase 3: Nitrite Peak ⚠️', colorHex: '#cc3300' };
    return { label: 'Cycling in progress…', colorHex: '#aaaaaa' };
  }
}
