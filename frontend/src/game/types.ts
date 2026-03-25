// ─────────────────────────────────────────────────────────────────────────────
// Shared game types used across multiple systems
// ─────────────────────────────────────────────────────────────────────────────

export interface WaterParams {
  ph: number;
  gh: number;       // °dGH
  kh: number;       // °dKH
  tds: number;      // ppm
  tempF: number;    // °F
  ammonia: number;  // ppm
  nitrite: number;  // ppm
  nitrate: number;  // ppm
}

export type SubstrateType = 'inert' | 'active' | 'none';
export type FilterType = 'sponge' | 'sponge_large' | 'hob' | 'none';
export type LightType = 'basic' | 'planted' | 'none';

export interface TankState {
  id: string;
  ownerId: string;
  gallons: number;
  substateType: SubstrateType;
  /** months since substrate was installed (game months) */
  substrateAgeMonths: number;
  /** Whether active substrate has been cycled */
  cycled: boolean;
  cyclingDaysElapsed: number;
  /** Nitrogen cycle bacteria readiness 0..1 */
  bacteriaLevel: number;
  filterType: FilterType;
  hasHeater: boolean;
  hasLight: boolean;
  lightType: LightType;
  hasRO: boolean;
  hasDechlorinator: boolean;
  params: WaterParams;
  /** Copper contamination level — 0 = safe; > 0 = shrimp dying */
  copperPpm: number;
  /** Accumulated uneaten food mass (arbitrary units) */
  uneatenfood: number;
  /** Indian almond leaves / botanicals present */
  tannins: number;      // 0..1 affects pH slightly
  plantCoverScore: number;  // 0..20 affects hiding/biofilm
  biofilmLevel: number;     // 0..1 fed by biofilm powder + plants + time
  shrimp: ShrimpState[];
  /** Game timestamp (game minutes elapsed since tank creation) */
  gameAge: number;
}

export type ShrimpLifeStage = 'shrimplet' | 'juvenile' | 'adult';
export type ShrimpSex = 'male' | 'female';
export type ShrimpBehavior = 'idle' | 'wander' | 'seek_food' | 'eat' | 'hide' | 'post_molt' | 'breeding_swim';

export interface ShrimpState {
  id: string;
  variantId: string;
  name?: string;
  sex: ShrimpSex;
  stage: ShrimpLifeStage;
  ageGameDays: number;
  /** 0..1 health score */
  health: number;
  /** 0..1 fullness — decreases over time, 0 = starving */
  fullness: number;
  /** game days until next molt, recalculated after each molt */
  daysToMolt: number;
  /** post-molt vulnerability window in game hours remaining */
  postMoltWindow: number;
  /** null or berried female: game days remaining until shrimplets hatch */
  berriedDaysRemaining: number | null;
  eggCount: number;
  /** accumulated stress (0..1); too much stress = death */
  stressAccumulated: number;
  x: number;
  y: number;
  facingRight: boolean;
  behavior: ShrimpBehavior;
  behaviorTimer: number;  // ticks remaining in current behavior
  /** For listing in marketplace — null = not for sale */
  listedPrice: number | null;
}

export interface FoodParticle {
  id: string;
  x: number;
  y: number;
  type: 'pellet' | 'veggie' | 'biofilm' | 'baby' | 'protein';
  decayTicksRemaining: number;
  ammoniaOnDecay: number;
}
