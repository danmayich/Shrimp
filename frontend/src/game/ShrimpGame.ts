import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { TankScene } from './scenes/TankScene';
import type { SpeedMultiplier } from './data/gameConfig';
import type { BreedingEvent } from './systems/BreedingSystem';

// ─── Global event names ───────────────────────────────────────────────────────
export const GAME_EVENTS = {
  // React → Phaser commands
  SET_TANK:        'cmd:set_tank',
  ADD_FOOD:        'cmd:add_food',
  WATER_CHANGE:    'cmd:water_change',
  ADD_ADDITIVE:    'cmd:add_additive',
  SET_SPEED:       'cmd:set_speed',
  ADD_SHRIMP:      'cmd:add_shrimp',

  // Phaser → React outputs
  TANK_STATE_UPDATE: 'out:tank_state',
  WATER_WARNINGS:    'out:water_warnings',
  BREEDING_EVENT:    'out:breeding_event',
  TANK_TOOLTIP:      'out:tank_tooltip',
} as const;

export type GameEventMap = {
  [GAME_EVENTS.TANK_STATE_UPDATE]: TankStateSnapshot;
  [GAME_EVENTS.WATER_WARNINGS]: string[];
  [GAME_EVENTS.BREEDING_EVENT]: BreedingEvent;
  [GAME_EVENTS.TANK_TOOLTIP]: TankTooltipData | null;
  [GAME_EVENTS.SET_SPEED]: SpeedMultiplier;
};

export interface TankStateSnapshot {
  params: import('./types').WaterParams;
  cycled: boolean;
  bacteriaLevel: number;
  shrimpCount: number;
  shrimp: import('./types').ShrimpState[];
  uneatenfood: number;
  gameAge: number;
  cyclePhase: { label: string; colorHex: string };
}

export interface TankTooltipData {
  kind: 'shrimp' | 'plant';
  pinned: boolean;
  x: number;
  y: number;
  tankW: number;
  tankH: number;
  title: string;
  subtitle?: string;
  stats?: Array<{ label: string; value: string; tone?: 'good' | 'warn' | 'danger' | 'info' }>;
  detail?: string;
  detail2?: string;
}

let gameInstance: Phaser.Game | null = null;

export function createShrimpGame(parent: HTMLElement): Phaser.Game {
  if (gameInstance) {
    gameInstance.destroy(true);
    gameInstance = null;
  }

  gameInstance = new Phaser.Game({
    type: Phaser.AUTO,
    width: 640,
    height: 320,
    backgroundColor: '#0d2a42',
    parent,
    scene: [BootScene, TankScene],
    pixelArt: true,
    antialias: false,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    audio: { disableWebAudio: true },
  });

  return gameInstance;
}

export function destroyShrimpGame() {
  if (gameInstance) {
    gameInstance.destroy(true);
    gameInstance = null;
  }
}

export function getGame(): Phaser.Game | null {
  return gameInstance;
}
