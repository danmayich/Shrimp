// ─────────────────────────────────────────────────────────────────────────────
// NPC Store Item Catalog
// Prices are in in-game dollars ($).
// ─────────────────────────────────────────────────────────────────────────────

export type StoreCategory =
  | 'tanks'
  | 'equipment'
  | 'food'
  | 'additives'
  | 'plants'
  | 'decor'
  | 'shrimp';

export interface StoreItem {
  id: string;
  name: string;
  category: StoreCategory;
  description: string;
  price: number;
  icon: string;           // emoji used in shop UI
  /** Extra metadata varies by category */
  meta?: Record<string, unknown>;
}

export const STORE_ITEMS: StoreItem[] = [
  // ── TANKS ───────────────────────────────────────────────────────────────────
  {
    id: 'tank_5gal',
    name: '5-Gallon Nano Tank',
    category: 'tanks',
    description: 'A perfect starter tank for a small Neocaridina colony. Holds up to 40 shrimp.',
    price: 25,
    icon: '🪣',
    meta: { gallons: 5, maxShrimp: 40 },
  },
  {
    id: 'tank_10gal',
    name: '10-Gallon Starter Tank',
    category: 'tanks',
    description: 'The most popular size for beginners. Easier to maintain stable water parameters. Holds up to 80 shrimp.',
    price: 50,
    icon: '🐟',
    meta: { gallons: 10, maxShrimp: 80 },
  },
  {
    id: 'tank_20gal',
    name: '20-Gallon Planted Setup',
    category: 'tanks',
    description: 'Great for a serious colony or mixed planted display. More stable chemistry and room to grow.',
    price: 120,
    icon: '🌿',
    meta: { gallons: 20, maxShrimp: 180 },
  },
  {
    id: 'tank_40gal',
    name: '40-Gallon Breeder',
    category: 'tanks',
    description: 'The serious breeder\'s tank. Large water volume = exceptional stability. For professional colonies.',
    price: 200,
    icon: '🏊',
    meta: { gallons: 40, maxShrimp: 400 },
  },

  // ── EQUIPMENT ───────────────────────────────────────────────────────────────
  {
    id: 'sponge_filter',
    name: 'Sponge Filter (small)',
    category: 'equipment',
    description: 'The #1 shrimp-safe filter. Gentle flow, baby-safe intake, and provides biological filtration. Requires an air pump.',
    price: 15,
    icon: '🌀',
    meta: { filterType: 'sponge', bioCapacity: 1, flowRate: 'gentle', babyProof: true },
  },
  {
    id: 'sponge_filter_large',
    name: 'Hamburger Sponge Filter (large)',
    category: 'equipment',
    description: 'Dual-sponge high-capacity filter for larger tanks. Still baby-safe. Ideal for 20–40 gal setups.',
    price: 28,
    icon: '🌀',
    meta: { filterType: 'sponge_large', bioCapacity: 2, flowRate: 'gentle', babyProof: true },
  },
  {
    id: 'hob_filter',
    name: 'HOB Filter + Pre-filter Sponge',
    category: 'equipment',
    description: 'Hang-on-back filter with a pre-filter sponge on the intake — safe for shrimp and babies. Higher flow than sponge filters.',
    price: 38,
    icon: '💧',
    meta: { filterType: 'hob', bioCapacity: 2, flowRate: 'medium', babyProof: true },
  },
  {
    id: 'air_pump',
    name: 'Air Pump (dual outlet)',
    category: 'equipment',
    description: 'Powers sponge filters and increases oxygenation. Required for sponge filter operation.',
    price: 12,
    icon: '💨',
    meta: { powersFilter: true },
  },
  {
    id: 'nano_heater',
    name: 'Nano Heater (25W)',
    category: 'equipment',
    description: 'Compact submersible heater for tanks up to 10 gallons. Essential for maintaining optimal shrimp temperatures.',
    price: 18,
    icon: '🌡️',
    meta: { heaterType: 'nano', maxGallons: 10 },
  },
  {
    id: 'heater_50w',
    name: 'Adjustable Heater (50W)',
    category: 'equipment',
    description: 'For tanks up to 20 gallons. Adjustable dial thermostat. Keeps temperature rock steady.',
    price: 28,
    icon: '🌡️',
    meta: { heaterType: 'standard', maxGallons: 20 },
  },
  {
    id: 'aquarium_chiller',
    name: 'Inline Aquarium Chiller',
    category: 'equipment',
    description: 'REQUIRED if ambient temperature exceeds 78°F. Caridina shrimp cannot survive summer temperatures without active cooling.',
    price: 180,
    icon: '❄️',
    meta: { heaterType: 'chiller', cools: true },
  },
  {
    id: 'led_light_basic',
    name: 'Basic LED Light',
    category: 'equipment',
    description: 'Low-output LED strip. Sufficient for low-tech shrimp tanks; supports algae growth that shrimp graze on.',
    price: 22,
    icon: '💡',
    meta: { lightType: 'basic', par: 20, photoperiodHours: 8 },
  },
  {
    id: 'led_light_planted',
    name: 'Planted Tank LED (Chihiros Style)',
    category: 'equipment',
    description: 'Full-spectrum medium-output LED ideal for planted Caridina setups. Promotes lush plant growth and biofilm production.',
    price: 55,
    icon: '☀️',
    meta: { lightType: 'planted', par: 50, photoperiodHours: 10 },
  },
  {
    id: 'test_kit_liquid',
    name: 'Liquid Test Kit (NH₃/NO₂/NO₃/pH)',
    category: 'equipment',
    description: 'Far more accurate than test strips. Tests ammonia, nitrite, nitrate, and pH. ESSENTIAL before adding shrimp.',
    price: 22,
    icon: '🧪',
    meta: { tests: ['ammonia', 'nitrite', 'nitrate', 'ph'] },
  },
  {
    id: 'gh_kh_test_kit',
    name: 'GH/KH Test Kit',
    category: 'equipment',
    description: 'Titration drop test for general and carbonate hardness. Essential for both Neocaridina and Caridina setups.',
    price: 12,
    icon: '🧫',
    meta: { tests: ['gh', 'kh'] },
  },
  {
    id: 'tds_meter',
    name: 'TDS Meter',
    category: 'equipment',
    description: 'Digital pen meter for total dissolved solids. Indispensable for Caridina keepers using RO water.',
    price: 15,
    icon: '📏',
    meta: { tests: ['tds'] },
  },
  {
    id: 'thermometer',
    name: 'Digital Thermometer',
    category: 'equipment',
    description: 'Stick-on digital thermometer with LCD display. Always know your tank temperature.',
    price: 8,
    icon: '🌡️',
    meta: { tests: ['tempF'] },
  },
  {
    id: 'ro_unit',
    name: 'Reverse Osmosis Filter Unit',
    category: 'equipment',
    description: 'REQUIRED for Caridina shrimp. Removes all minerals from tap water so you can remineralize to exact Caridina specifications.',
    price: 150,
    icon: '🔵',
    meta: { producesRO: true },
  },
  {
    id: 'siphon_nano',
    name: 'Nano Gravel Vacuum Siphon',
    category: 'equipment',
    description: 'Removes waste and debris from substrate without disturbing shrimp or sucking up babies.',
    price: 10,
    icon: '🌊',
    meta: { maintenance: 'vacuum' },
  },
  {
    id: 'substrate_inert',
    name: 'Inert Gravel / River Sand (10 lbs)',
    category: 'equipment',
    description: 'Neutral substrate for Neocaridina tanks. Will NOT affect pH. Available in natural river-stone colors.',
    price: 18,
    icon: '⚫',
    meta: { substrateType: 'inert', forGroup: 'neocaridina', expiresMonths: null },
  },
  {
    id: 'substrate_active',
    name: 'Active Buffering Soil (ADA Amazonia Style, 9L)',
    category: 'equipment',
    description: 'REQUIRED for Caridina tanks. Naturally buffers pH to 6.2–6.8. Will release ammonia for 4–6 weeks when new — must cycle first! Expires after ~18 game months.',
    price: 65,
    icon: '🟤',
    meta: { substrateType: 'active', forGroup: 'caridina', expiresMonths: 18, buffersPhTo: 6.5 },
  },

  // ── FOOD ────────────────────────────────────────────────────────────────────
  {
    id: 'shrimp_pellets',
    name: 'Shrimp Pellets (Dennerle Shrimp King)',
    category: 'food',
    description: 'Complete daily food for all shrimp. Balanced plant-protein blend. Use 2–3 pellets per 10 shrimp daily.',
    price: 10,
    icon: '🟡',
    meta: { foodType: 'pellet', servings: 30, proteinLevel: 'balanced' },
  },
  {
    id: 'veggie_pack',
    name: 'Blanched Veggie Pack (Zucchini/Spinach)',
    category: 'food',
    description: 'Pre-blanched vegetable treats. Shrimp love grazing them. Remove after 2 hours to prevent ammonia spikes.',
    price: 5,
    icon: '🥒',
    meta: { foodType: 'vegetable', servings: 10, timeoutHours: 2 },
  },
  {
    id: 'bee_pollen',
    name: 'Bee Pollen Granules',
    category: 'food',
    description: 'High-protein, vitamin-rich supplement. Shrimp go crazy for it. Promotes breeding activity. Use sparingly.',
    price: 8,
    icon: '🐝',
    meta: { foodType: 'supplement', breedingBoost: 0.1, servings: 20 },
  },
  {
    id: 'biofilm_powder',
    name: 'Biofilm Bacteria Powder (Glasgarten Bacter AE Style)',
    category: 'food',
    description: 'Cultivates beneficial biofilm and bacteria on all surfaces. ESSENTIAL for shrimplet survival — baby shrimp graze exclusively on biofilm for their first weeks.',
    price: 12,
    icon: '🦠',
    meta: { foodType: 'biofilm', benefitsJuveniles: true, servings: 40 },
  },
  {
    id: 'baby_food',
    name: 'Shrimplet Baby Powder (Glasgarten/Shirakura Style)',
    category: 'food',
    description: 'Micro-fine powder food specifically for newborn shrimplets. Helps survival of juvenile shrimp through their critical early weeks.',
    price: 8,
    icon: '🍼',
    meta: { foodType: 'baby', benefitsJuveniles: true, servings: 30 },
  },
  {
    id: 'leaf_litter',
    name: 'Indian Almond Leaves (10 pack)',
    category: 'food',
    description: 'Natural botanical. Releases tannins (mild antibacterial, slight pH reduction) and creates a perfect biofilm grazing surface. Shrimp love them. Also slightly lowers pH.',
    price: 5,
    icon: '🍂',
    meta: { foodType: 'botanical', lowersPh: 0.1, biofilm: true, servings: 10, decayDays: 14 },
  },
  {
    id: 'protein_treat',
    name: 'Frozen Bloodworm Treat (cube)',
    category: 'food',
    description: 'High-protein treat. Use max 1–2×/week — overuse causes ammonia spikes and excess fat on shrimp. Not suitable for Caridina.',
    price: 4,
    icon: '🔴',
    meta: { foodType: 'protein', servings: 5, maxPerWeek: 2 },
  },

  // ── ADDITIVES ────────────────────────────────────────────────────────────────
  {
    id: 'dechlorinator',
    name: 'Dechlorinator (Seachem Prime Style)',
    category: 'additives',
    description: 'Removes chlorine and chloramine from tap water. Also temporarily detoxifies ammonia and nitrite. REQUIRED for every water change with tap water.',
    price: 8,
    icon: '💊',
    meta: { additive: 'dechlorinator', treatsTap: true, servings: 50 },
  },
  {
    id: 'gh_kh_booster_neo',
    name: 'GH/KH+ Booster (Neocaridina / Tap)',
    category: 'additives',
    description: 'Raises both GH and KH in RO or soft tap water to ideal Neocaridina levels. Each dose remineralizes 10 gallons.',
    price: 15,
    icon: '💎',
    meta: { additive: 'gh_kh_neo', raisesGH: 6, raisesKH: 3, forGroup: 'neocaridina', servings: 20 },
  },
  {
    id: 'gh_booster_cari',
    name: 'GH+ Remineralizer (Caridina / RO)',
    category: 'additives',
    description: 'Raises GH ONLY — keeps KH at zero — for Caridina RO water setups. Must use with RO water. Each dose treats 10 gallons to Caridina specs.',
    price: 18,
    icon: '💎',
    meta: { additive: 'gh_cari', raisesGH: 5, raisesKH: 0, forGroup: 'caridina', requiresRO: true, servings: 20 },
  },
  {
    id: 'bacteria_starter',
    name: 'Beneficial Bacteria Starter (Seachem Stability Style)',
    category: 'additives',
    description: 'Jumpstarts the nitrogen cycle. Reduces cycling time from 4–8 weeks to ~2 weeks. Dose daily for 2 weeks after setup.',
    price: 12,
    icon: '🦠',
    meta: { additive: 'bacteria', reducesCycleWeeks: 3, servings: 14 },
  },
  {
    id: 'ph_down',
    name: 'pH Down Buffer',
    category: 'additives',
    description: 'Lowers pH in water. Use cautiously — sudden pH swings are deadly. Better to use active substrate for Caridina tanks instead.',
    price: 10,
    icon: '🔻',
    meta: { additive: 'ph_down', changePerDose: -0.2, servings: 25 },
  },
  {
    id: 'mineral_supplement',
    name: 'Calcium/Magnesium Molting Supplement',
    category: 'additives',
    description: 'Boosts calcium and magnesium for healthy, complete molts. Prevents "failed molt" deaths from mineral deficiency.',
    price: 11,
    icon: '🦴',
    meta: { additive: 'mineral', preventsMoltFail: true, servings: 30 },
  },

  // ── PLANTS ───────────────────────────────────────────────────────────────────
  {
    id: 'java_moss',
    name: 'Java Moss (portion)',
    category: 'plants',
    description: 'The #1 shrimp plant. Shrimplets hide and graze in it. Nearly indestructible. No CO₂ needed. Grows on any surface.',
    price: 10,
    icon: '🌿',
    meta: { plantType: 'moss', lowLight: true, noCo2: true, coverScore: 10 },
  },
  {
    id: 'anubias',
    name: 'Anubias (leaf)',
    category: 'plants',
    description: 'Ultra-hardy broadleaf plant. Attach to wood or rock — never plant in substrate. Leaves develop biofilm shrimp graze on.',
    price: 15,
    icon: '🍃',
    meta: { plantType: 'rhizome', lowLight: true, noCo2: true, coverScore: 5, biofilm: true },
  },
  {
    id: 'java_fern',
    name: 'Java Fern (portion)',
    category: 'plants',
    description: 'Classic easy plant. Attaches to wood/rock. Develops characteristic baby plantlets on older leaves.',
    price: 12,
    icon: '🌱',
    meta: { plantType: 'rhizome', lowLight: true, noCo2: true, coverScore: 6 },
  },
  {
    id: 'guppy_grass',
    name: 'Guppy Grass (bunch)',
    category: 'plants',
    description: 'Fast-growing stem plant that doubles as a perfect baby shrimp refuge and aggressive nitrate consumer.',
    price: 7,
    icon: '🌾',
    meta: { plantType: 'stem', lowLight: true, noCo2: true, coverScore: 8, nitrateAbsorption: 2 },
  },
  {
    id: 'subwassertang',
    name: 'Subwassertang (portion)',
    category: 'plants',
    description: 'A rare freshwater liverwort with a distinctive feathery look. Very popular in Caridina setups. No CO₂ needed.',
    price: 12,
    icon: '🌿',
    meta: { plantType: 'liverwort', lowLight: true, noCo2: true, coverScore: 9 },
  },
  {
    id: 'bucephalandra',
    name: 'Bucephalandra (small portion)',
    category: 'plants',
    description: 'Stunning slow-growing epiphyte with iridescent leaves. A prize plant in Caridina tanks. Attach to hardscape.',
    price: 18,
    icon: '💙',
    meta: { plantType: 'rhizome', lowLight: true, noCo2: false, coverScore: 4 },
  },
  {
    id: 'frogbit',
    name: 'Frogbit (5 plants)',
    category: 'plants',
    description: 'Floating plant with long hanging roots. Baby shrimp love the root jungle. Shades the tank and absorbs nitrates fast.',
    price: 7,
    icon: '🍀',
    meta: { plantType: 'floating', lowLight: true, noCo2: true, coverScore: 7, nitrateAbsorption: 3 },
  },
  {
    id: 'marimo_ball',
    name: 'Marimo Moss Ball',
    category: 'plants',
    description: 'Dense algae ball shrimp love to push around and graze on. Also acts as a mild KH buffer in Neocaridina tanks. Ball shape = unique!',
    price: 8,
    icon: '🟢',
    meta: { plantType: 'algae_ball', lowLight: true, noCo2: true, coverScore: 3, raisesKH: 0.1 },
  },

  // ── DECOR ─────────────────────────────────────────────────────────────────────
  {
    id: 'cholla_wood',
    name: 'Cholla Wood (piece)',
    category: 'decor',
    description: 'Hollow skeleton of the cholla cactus. Shrimp walk through the tubes and graze the porous surface. Biofilm heaven.',
    price: 8,
    icon: '🪵',
    meta: { decorType: 'wood', biofilm: true, hides: 2, tannins: 0.05 },
  },
  {
    id: 'driftwood',
    name: 'Driftwood (small piece)',
    category: 'decor',
    description: 'Releases tannins that mildly lower pH and create that natural amber-water look. Great biofilm surface. May cloud water initially.',
    price: 15,
    icon: '🌲',
    meta: { decorType: 'wood', biofilm: true, hides: 1, tannins: 0.15, lowersPh: 0.1 },
  },
  {
    id: 'dragon_stone',
    name: 'Dragon Stone (Ohko Rock)',
    category: 'decor',
    description: 'Highly porous volcanic-style rock. Inert — will not affect water chemistry. Excellent for planted Caridina aquascapes.',
    price: 20,
    icon: '🗿',
    meta: { decorType: 'rock', hides: 3, inert: true },
  },
  {
    id: 'coconut_cave',
    name: 'Coconut Shell Cave',
    category: 'decor',
    description: 'Natural coconut shell half. Classic shrimp hide. Shrimp love the enclosed space. Releases harmless tannins.',
    price: 6,
    icon: '🥥',
    meta: { decorType: 'cave', hides: 5, tannins: 0.05 },
  },
  {
    id: 'ceramic_tubes',
    name: 'Ceramic Shrimp Tubes (set of 3)',
    category: 'decor',
    description: 'Specially designed ceramic hides for shrimp. Shrimp retreat here to molt safely. Inert and easy to clean.',
    price: 10,
    icon: '🔌',
    meta: { decorType: 'tube', hides: 8, inert: true, moltSafety: true },
  },
  {
    id: 'lava_rock',
    name: 'Lava Rock (small piece)',
    category: 'decor',
    description: 'Incredibly porous surface for beneficial bacteria colonization. Inert. Shrimp pick at the surface for food.',
    price: 8,
    icon: '⚫',
    meta: { decorType: 'rock', hides: 2, inert: true, bioCapacity: 2 },
  },
];

export const STORE_ITEM_MAP = new Map<string, StoreItem>(
  STORE_ITEMS.map(i => [i.id, i])
);

export const STORE_BY_CATEGORY = STORE_ITEMS.reduce<
  Partial<Record<StoreCategory, StoreItem[]>>
>((acc, item) => {
  if (!acc[item.category]) acc[item.category] = [];
  acc[item.category]!.push(item);
  return acc;
}, {});
