// ─────────────────────────────────────────────────────────────────────────────
// Shrimp Variant Definitions
// All times are expressed in GAME DAYS.
// Water parameters use the format: { min, idealLow, idealHigh, max }
// ─────────────────────────────────────────────────────────────────────────────

export interface ParamRange {
  min: number;
  idealLow: number;
  idealHigh: number;
  max: number;
}

export type ShrimpGroup = 'neocaridina' | 'caridina' | 'tiger';

export interface ShrimpVariant {
  id: string;
  name: string;
  group: ShrimpGroup;
  description: string;
  // Water chemistry
  ph: ParamRange;
  gh: ParamRange;      // °dGH
  kh: ParamRange;      // °dKH
  tds: ParamRange;     // ppm
  tempF: ParamRange;   // °F
  // Nitrogen – absolute thresholds (ppm); ideal is always 0
  ammoniaMax: number;   // lethal at or above
  nitriteMax: number;   // lethal at or above
  nitrateMax: number;   // chronic stress / lethal threshold
  // Lifecycle (game days, assuming 1× time scale)
  gestationDaysMin: number;
  gestationDaysMax: number;
  eggsPerClutch: [number, number]; // [min, max]
  maturityDays: number;
  lifespanDaysMin: number;
  lifespanDaysMax: number;
  moltFrequencyDays: [number, number]; // adult [min, max] days between molts
  // Requirements
  requiresRO: boolean;
  requiresActiveSubstrate: boolean;
  // Price (in-game $) for NPC store
  npcPrice: number;
  purchaseUnit: 'each';
  // Colour description used for sprite tinting hints
  primaryColor: string;
  secondaryColor: string | null;
  patternType: 'solid' | 'banded' | 'rili' | 'pinto' | 'striped';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

// ─── NEOCARIDINA GROUP ───────────────────────────────────────────────────────
// All share identical water chemistry — color is purely cosmetic.
const neoBase: Pick<
  ShrimpVariant,
  | 'group' | 'ph' | 'gh' | 'kh' | 'tds' | 'tempF'
  | 'ammoniaMax' | 'nitriteMax' | 'nitrateMax'
  | 'gestationDaysMin' | 'gestationDaysMax' | 'eggsPerClutch'
  | 'maturityDays' | 'lifespanDaysMin' | 'lifespanDaysMax'
  | 'moltFrequencyDays' | 'requiresRO' | 'requiresActiveSubstrate'
  | 'purchaseUnit' | 'difficulty'
> = {
  group: 'neocaridina',
  ph:   { min: 6.2, idealLow: 6.8, idealHigh: 7.6, max: 8.0 },
  gh:   { min: 4,   idealLow: 6,   idealHigh: 8,   max: 15  },
  kh:   { min: 2,   idealLow: 3,   idealHigh: 6,   max: 12  },
  tds:  { min: 100, idealLow: 150, idealHigh: 250, max: 400  },
  tempF:{ min: 65,  idealLow: 70,  idealHigh: 76,  max: 80  },
  ammoniaMax: 1.0,
  nitriteMax: 0.5,
  nitrateMax: 40,
  gestationDaysMin: 21,
  gestationDaysMax: 30,
  eggsPerClutch: [20, 30],
  maturityDays: 60,
  lifespanDaysMin: 365,
  lifespanDaysMax: 730,
  moltFrequencyDays: [21, 56],
  requiresRO: false,
  requiresActiveSubstrate: false,
  purchaseUnit: 'each',
  difficulty: 'beginner',
};

// ─── CARIDINA (bee shrimp) BASE ───────────────────────────────────────────────
const cariBase: typeof neoBase = {
  group: 'caridina',
  ph:   { min: 5.8, idealLow: 6.2, idealHigh: 6.8, max: 7.4 },
  gh:   { min: 3,   idealLow: 4,   idealHigh: 6,   max: 8   },
  kh:   { min: 0,   idealLow: 0,   idealHigh: 2,   max: 4   },
  tds:  { min: 80,  idealLow: 100, idealHigh: 150, max: 200  },
  tempF:{ min: 62,  idealLow: 68,  idealHigh: 74,  max: 76  },
  ammoniaMax: 0.25,
  nitriteMax: 0.25,
  nitrateMax: 20,
  gestationDaysMin: 28,
  gestationDaysMax: 35,
  eggsPerClutch: [15, 25],
  maturityDays: 70,
  lifespanDaysMin: 365,
  lifespanDaysMax: 548,
  moltFrequencyDays: [21, 42],
  requiresRO: true,
  requiresActiveSubstrate: true,
  purchaseUnit: 'each',
  difficulty: 'advanced',
};

export const SHRIMP_VARIANTS: ShrimpVariant[] = [
  // ── NEOCARIDINA ─────────────────────────────────────────────────────────────
  {
    ...neoBase,
    id: 'red_cherry',
    name: 'Red Cherry Shrimp',
    description: 'The classic beginner shrimp. Deep red coloration; females more vibrant than males. Very hardy.',
    primaryColor: '#e8241a',
    secondaryColor: null,
    patternType: 'solid',
    npcPrice: 3,
  },
  {
    ...neoBase,
    id: 'fire_red',
    name: 'Fire Red Shrimp',
    description: 'A high-grade Red Cherry with intense, fully opaque red covering the entire body including legs.',
    primaryColor: '#cc0000',
    secondaryColor: null,
    patternType: 'solid',
    npcPrice: 6,
  },
  {
    ...neoBase,
    id: 'yellow_neo',
    name: 'Yellow / Neon Yellow Shrimp',
    description: 'Bright sunshine yellow body. High grade individuals glow under good lighting.',
    primaryColor: '#f5c518',
    secondaryColor: null,
    patternType: 'solid',
    npcPrice: 4,
  },
  {
    ...neoBase,
    id: 'orange_pumpkin',
    name: 'Orange (Pumpkin) Shrimp',
    description: 'Deep orange, pumpkin-colored shrimp. One of the easier fancy morphs to keep.',
    primaryColor: '#f07800',
    secondaryColor: null,
    patternType: 'solid',
    npcPrice: 4,
  },
  {
    ...neoBase,
    id: 'blue_dream',
    name: 'Blue Dream / Blue Velvet Shrimp',
    description: 'Stunning deep iridescent blue. Blue Velvet grade is fully opaque and deeply colored.',
    primaryColor: '#1a6bb5',
    secondaryColor: null,
    patternType: 'solid',
    npcPrice: 6,
  },
  {
    ...neoBase,
    id: 'black_rose',
    name: 'Black Rose / Dark Carbon Shrimp',
    description: 'Deep black to charcoal coloration. Striking against light-colored substrates.',
    primaryColor: '#1a1a1a',
    secondaryColor: null,
    patternType: 'solid',
    npcPrice: 5,
  },
  {
    ...neoBase,
    id: 'snowball',
    name: 'Snowball (White) Shrimp',
    description: 'Opaque white shrimp. Females carry distinctive white egg clutches — giving the morph its name.',
    primaryColor: '#f0eeee',
    secondaryColor: null,
    patternType: 'solid',
    npcPrice: 5,
  },
  {
    ...neoBase,
    id: 'chocolate_neo',
    name: 'Chocolate Shrimp',
    description: 'Rich brown pigmentation. Underrated morph that pops in a planted tank.',
    primaryColor: '#5c3317',
    secondaryColor: null,
    patternType: 'solid',
    npcPrice: 4,
  },
  {
    ...neoBase,
    id: 'green_jade',
    name: 'Green Jade Shrimp',
    description: 'Soft green iridescence. One of the rarer Neocaridina morphs; pairs beautifully with red plants.',
    primaryColor: '#3a7a3a',
    secondaryColor: null,
    patternType: 'solid',
    npcPrice: 6,
  },
  {
    ...neoBase,
    id: 'red_rili',
    name: 'Red Rili Shrimp',
    description: 'Red head and tail with a transparent/white mid-section. A distinctive partial-color pattern.',
    primaryColor: '#dd2211',
    secondaryColor: '#d4d4d4',
    patternType: 'rili',
    npcPrice: 5,
  },

  // ── CARIDINA ────────────────────────────────────────────────────────────────
  {
    ...cariBase,
    id: 'crystal_red',
    name: 'Crystal Red Shrimp (SSS)',
    description: 'The crown jewel of freshwater shrimp. SSS grade has bright white with minimal red coverage — the inverse of lower grades. Requires pristine soft, acidic water.',
    primaryColor: '#e8241a',
    secondaryColor: '#ffffff',
    patternType: 'banded',
    npcPrice: 20,
  },
  {
    ...cariBase,
    id: 'crystal_black',
    name: 'Crystal Black Shrimp (SSS)',
    description: 'The black-and-white counterpart to Crystal Red. SSS grade features bold white bands on near-black body.',
    primaryColor: '#111111',
    secondaryColor: '#ffffff',
    patternType: 'banded',
    npcPrice: 18,
  },
  {
    ...cariBase,
    id: 'blue_bolt',
    name: 'Blue Bolt Shrimp',
    description: 'Derived from Crystal Red genetics — vivid electric blue replaces red. One of the most stunning Caridina morphs.',
    primaryColor: '#1a4fd1',
    secondaryColor: '#ffffff',
    patternType: 'banded',
    npcPrice: 25,
  },
  {
    ...cariBase,
    id: 'galaxy_pinto',
    name: 'Galaxy Pinto Shrimp',
    description: 'Irregular white splotch pattern over a dark base — like a galaxy. Each shrimp is unique. Rare and highly prized.',
    primaryColor: '#1a1a2e',
    secondaryColor: '#ffffff',
    patternType: 'pinto',
    npcPrice: 22,
  },
  {
    ...cariBase,
    group: 'tiger',
    id: 'tiger_orange_eye',
    name: 'Orange Eye Blue Tiger Shrimp',
    description: 'Deep blue/black body with distinctive orange eyes and subtle dark stripes. Slightly more tolerant than bee shrimp variants.',
    primaryColor: '#1a2d5a',
    secondaryColor: '#e87a00',
    patternType: 'striped',
    ph:   { min: 6.0, idealLow: 6.5, idealHigh: 7.0, max: 7.5 },
    gh:   { min: 3,   idealLow: 4,   idealHigh: 6,   max: 8   },
    kh:   { min: 0,   idealLow: 0,   idealHigh: 3,   max: 6   },
    tds:  { min: 80,  idealLow: 100, idealHigh: 200, max: 250  },
    tempF:{ min: 64,  idealLow: 68,  idealHigh: 75,  max: 78  },
    ammoniaMax: 0.5,
    nitriteMax: 0.5,
    nitrateMax: 30,
    npcPrice: 10,
    difficulty: 'intermediate',
  },
];

export const VARIANT_MAP = new Map<string, ShrimpVariant>(
  SHRIMP_VARIANTS.map(v => [v.id, v])
);

/** Get health score [0..1] for a shrimp given the current tank params.
 *  1.0 = perfect; 0.0 = dead or about to die. */
export function calcHealthScore(
  variant: ShrimpVariant,
  params: {
    ph: number; gh: number; kh: number; tds: number; tempF: number;
    ammonia: number; nitrite: number; nitrate: number;
  }
): number {
  let score = 1.0;

  const checkRange = (value: number, range: ParamRange): number => {
    if (value < range.min || value > range.max) return 0;
    if (value >= range.idealLow && value <= range.idealHigh) return 1;
    if (value < range.idealLow) {
      return (value - range.min) / (range.idealLow - range.min);
    }
    return (range.max - value) / (range.max - range.idealHigh);
  };

  score *= checkRange(params.ph, variant.ph);
  score *= checkRange(params.gh, variant.gh);
  score *= checkRange(params.kh, variant.kh);
  score *= checkRange(params.tds, variant.tds);
  score *= checkRange(params.tempF, variant.tempF);

  // Nitrogen: instant-kill thresholds
  if (params.ammonia >= variant.ammoniaMax) return 0;
  if (params.nitrite >= variant.nitriteMax) return 0;
  if (params.nitrate >= variant.nitrateMax) return 0;

  // Linear degradation from 0 to threshold
  score *= 1 - Math.min(1, params.ammonia / variant.ammoniaMax);
  score *= 1 - Math.min(1, params.nitrite / variant.nitriteMax);
  score *= 1 - Math.min(1, params.nitrate / variant.nitrateMax);

  return Math.max(0, Math.min(1, score));
}

/** Returns true if breeding conditions are met (all params must be ideal) */
export function isBreedingReady(
  variant: ShrimpVariant,
  params: {
    ph: number; gh: number; kh: number; tds: number; tempF: number;
    ammonia: number; nitrite: number; nitrate: number;
  }
): boolean {
  const inIdeal = (v: number, r: ParamRange) =>
    v >= r.idealLow && v <= r.idealHigh;

  return (
    inIdeal(params.ph, variant.ph) &&
    inIdeal(params.gh, variant.gh) &&
    inIdeal(params.kh, variant.kh) &&
    inIdeal(params.tds, variant.tds) &&
    inIdeal(params.tempF, variant.tempF) &&
    params.ammonia < 0.25 &&
    params.nitrite < 0.25 &&
    params.nitrate < (variant.nitrateMax * 0.5)
  );
}
