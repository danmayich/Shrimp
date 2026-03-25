import type { TankState, WaterParams } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// WaterParamSystem
// Simulates gradual drift of water chemistry over game time.
// Called every game tick from TankScene.
// ─────────────────────────────────────────────────────────────────────────────

// How much parameters drift per game hour without intervention
const DRIFT_RATES = {
  // pH naturally drops slightly in a biologically active tank (CO₂ production)
  ph: -0.005,
  // GH and KH are consumed by organisms / plants; rises slightly via evaporation
  gh: -0.002,
  kh: -0.003,
  // TDS rises slowly as minerals accumulate (no water changes)
  tds: 0.2,
  // Temperature drifts toward ambient (simulated ambient = 74°F if no heater)
  tempFAmbient: 74,
  tempFDriftRate: 0.08,
};

/** Target params for a Neocaridina inert-substrate tank with proper mineral support */
export const NEO_TAP_DEFAULTS: WaterParams = {
  ph: 7.2, gh: 7, kh: 4, tds: 200, tempF: 73,
  ammonia: 0, nitrite: 0, nitrate: 0,
};

/** Target params for a Caridina RO+remineralized tank */
export const CARI_RO_DEFAULTS: WaterParams = {
  ph: 6.5, gh: 5, kh: 1, tds: 120, tempF: 71,
  ammonia: 0, nitrite: 0, nitrate: 0,
};

export class WaterParamSystem {
  /** Tick rate multiplier — updated by TankScene each tick */
  speedMultiplier = 1;

  /** Apply one in-game HOUR of drift to a tank's water parameters */
  tick(tank: TankState, gameHours = 1) {
    const p = tank.params;
    const hrs = gameHours * this.speedMultiplier;

    // ── pH drift ─────────────────────────────────────────────────────────────
    // KH buffers pH — if KH > 2, pH drift is reduced
    const kHbuffer = Math.min(1, (p.kh - 0.5) / 4);
    p.ph += DRIFT_RATES.ph * hrs * (1 - kHbuffer * 0.8);
    // Active substrate continually buffers toward ~6.5 for Caridina
    if (tank.substateType === 'active' && tank.substrateAgeMonths < 18) {
      const target = 6.5;
      const power = Math.max(0, (18 - tank.substrateAgeMonths) / 18) * 0.02;
      p.ph += (target - p.ph) * power * hrs;
    }
    // Tannins lower pH slightly
    p.ph -= tank.tannins * 0.002 * hrs;

    // ── GH/KH drift ──────────────────────────────────────────────────────────
    p.gh += DRIFT_RATES.gh * hrs;
    p.kh += DRIFT_RATES.kh * hrs;

    // ── TDS drift (evaporation concentrates minerals) ─────────────────────────
    p.tds += DRIFT_RATES.tds * hrs;

    // ── Temperature drift toward ambient ────────────────────────────────────
    if (!tank.hasHeater) {
      p.tempF += (DRIFT_RATES.tempFAmbient - p.tempF) * DRIFT_RATES.tempFDriftRate * hrs;
    }

    // ── Clamp to physical minimums ────────────────────────────────────────────
    p.ph  = Math.max(4.0, Math.min(9.5, p.ph));
    p.gh  = Math.max(0, p.gh);
    p.kh  = Math.max(0, p.kh);
    p.tds = Math.max(5, p.tds);
    p.tempF = Math.max(50, Math.min(100, p.tempF));

    // ── Substrate age advancement ─────────────────────────────────────────────
    // 1 game month = 30 game days * 24 hrs = 720 game hours
    tank.substrateAgeMonths += hrs / 720;
  }

  /** Perform a partial water change. volume: fraction 0–1 (e.g. 0.15 = 15%) */
  waterChange(tank: TankState, volume: number, freshParams: WaterParams) {
    const p = tank.params;
    const k = Math.min(1, Math.max(0, volume));

    // Blend current params toward fresh params by the change fraction
    p.ph    = p.ph    * (1 - k) + freshParams.ph    * k;
    p.gh    = p.gh    * (1 - k) + freshParams.gh    * k;
    p.kh    = p.kh    * (1 - k) + freshParams.kh    * k;
    p.tds   = p.tds   * (1 - k) + freshParams.tds   * k;
    p.tempF = p.tempF * (1 - k) + freshParams.tempF * k;

    // Partial dilution of nitrogen compounds
    p.ammonia = p.ammonia * (1 - k);
    p.nitrite = p.nitrite * (1 - k);
    p.nitrate = p.nitrate * (1 - k);

    // Copper dilution
    tank.copperPpm = tank.copperPpm * (1 - k);
  }

  /** Apply a dechlorinator dose — also temporarily binds ammonia/nitrite */
  applyDechlorinator(tank: TankState) {
    tank.params.ammonia = Math.max(0, tank.params.ammonia - 0.25);
    tank.params.nitrite = Math.max(0, tank.params.nitrite - 0.1);
  }

  /** Add GH/KH booster (Neocaridina) */
  addGHKHBooster(tank: TankState, ghIncrease: number, khIncrease: number) {
    tank.params.gh  = Math.min(15, tank.params.gh  + ghIncrease);
    tank.params.kh  = Math.min(12, tank.params.kh  + khIncrease);
    tank.params.tds = Math.min(600, tank.params.tds + (ghIncrease + khIncrease) * 8);
  }

  /** Add GH+ salt (Caridina RO — GH only, no KH) */
  addGHBooster(tank: TankState, ghIncrease: number) {
    tank.params.gh  = Math.min(10, tank.params.gh  + ghIncrease);
    tank.params.tds = Math.min(400, tank.params.tds + ghIncrease * 10);
  }

  /** Add Indian almond leaf or other tannin source */
  addTannins(tank: TankState, amount: number) {
    tank.tannins = Math.min(1, tank.tannins + amount);
    // Each leaf decays over ~14 game days
    // Decay handled in NitrogenCycle
  }

  /** Introduce copper contamination — lethal above ~0.05 ppm */
  addCopper(tank: TankState, ppm: number) {
    tank.copperPpm += ppm;
  }

  /** Return an object describing current water quality as warnings */
  getWarnings(tank: TankState, variantGroup: 'neocaridina' | 'caridina' | 'tiger') {
    const p = tank.params;
    const warnings: string[] = [];

    if (p.ammonia > 0.25) warnings.push('⚠️ Ammonia detected!');
    if (p.ammonia > 0.5)  warnings.push('🚨 Dangerous ammonia levels!');
    if (p.nitrite > 0.25) warnings.push('⚠️ Nitrite spike detected!');
    if (p.nitrate > 30)   warnings.push('⚠️ High nitrate — time for a water change!');
    if (p.tempF > 78)     warnings.push('🌡️ Temperature dangerously high!');
    if (p.tempF < 64)     warnings.push('🌡️ Temperature too cold!');
    if (tank.copperPpm > 0.05) warnings.push('☠️ Copper detected — shrimp are dying!');

    const isCari = variantGroup === 'caridina' || variantGroup === 'tiger';
    if (isCari && p.kh > 4) warnings.push('⚠️ KH too high for Caridina — use RO water!');
    if (isCari && p.ph > 7.2) warnings.push('⚠️ pH too high for Caridina!');
    if (!isCari && p.ph < 6.5) warnings.push('⚠️ pH too low for Neocaridina!');

    if (tank.substateType === 'active' && tank.substrateAgeMonths > 18) {
      warnings.push('⚠️ Active substrate has expired — pH will rise! Replace substrate.');
    }

    return warnings;
  }
}
