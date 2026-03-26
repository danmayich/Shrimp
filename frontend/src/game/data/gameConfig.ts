/** Real-time seconds per in-game minute */
export const SECONDS_PER_GAME_MINUTE = 1;

/** How many real seconds = 1 game hour */
export const REALTIME_PER_GAME_HOUR = 60 * SECONDS_PER_GAME_MINUTE;

/** Phaser update tick rate (ms) */
export const GAME_UPDATE_MS = 200;

/** How many Phaser ticks = 1 game minute */
export const TICKS_PER_GAME_MINUTE = (REALTIME_PER_GAME_HOUR * 1000) / (60 * GAME_UPDATE_MS);

/** Speed multipliers available to the player */
export const SPEED_OPTIONS = [1, 2, 3, 5] as const;
export type SpeedMultiplier = (typeof SPEED_OPTIONS)[number];

/** Initial player cash in USD (in-game) */
export const STARTING_CASH = 1000;

/** Max shrimp name display length */
export const MAX_SHRIMP_NAME_LEN = 20;

/** Tank canvas sizes (in pixels) keyed to gallon sizes */
export const TANK_CANVAS: Record<number, { width: number; height: number }> = {
  5:  { width: 480, height: 260 },
  10: { width: 640, height: 320 },
  20: { width: 800, height: 380 },
  40: { width: 960, height: 440 },
  55: { width: 1024, height: 460 },
  60: { width: 1120, height: 430 },
  75: { width: 1200, height: 500 },
  125: { width: 1440, height: 560 },
  200: { width: 1680, height: 620 },
};

/** Pixel art cell size */
export const SPRITE_SIZE = 32;

/** Number of shrimplet pixels while juvenile */
export const JUVENILE_SPRITE_SIZE = 16;

/** The substrate "floor height" as a fraction of tank height */
export const SUBSTRATE_FRACTION = 0.15;
