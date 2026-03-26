import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { TankState, ShrimpState, WaterParams, PlantState } from '../game/types';
import type { TankStateSnapshot } from '../game/ShrimpGame';
import { STARTING_CASH } from '../game/data/gameConfig';
import { NEO_TAP_DEFAULTS } from '../game/systems/WaterParamSystem';
import type { SpeedMultiplier } from '../game/data/gameConfig';

export interface InventoryItem {
  itemId: string;
  quantity: number;
  acquiredAt: number; // unix ms
}

export interface PlayerProfile {
  id: string;
  username: string;
  cash: number;
  inventory: InventoryItem[];
  tanks: TankState[];
  activeTankId: string | null;
  gameSpeedMultiplier: SpeedMultiplier;
  lastSavedAt: number;
}

interface GameState {
  profile: PlayerProfile | null;
  /** Live in-game tank snapshot from Phaser (not persisted directly) */
  tankSnapshot: TankStateSnapshot | null;
  waterWarnings: string[];
  breedingNotifications: string[];
  isLoading: boolean;

  // Profile management
  initProfile: (username: string, id: string) => void;
  setProfile: (p: PlayerProfile) => void;
  clearProfile: () => void;
  deductCash: (amount: number) => boolean;
  addCash: (amount: number) => void;
  addInventoryItem: (itemId: string, qty?: number) => void;
  removeInventoryItem: (itemId: string, qty?: number) => boolean;
  hasInventoryItem: (itemId: string) => boolean;

  // Tank management
  purchaseTank: (gallons: number, tankItemId: string, price: number) => TankState | null;
  setActiveTank: (tankId: string) => void;
  getActiveTank: () => TankState | null;
  updateActiveTankParams: (params: Partial<WaterParams>) => void;
  addPlantToActiveTank: (itemId: string, coverIncrease: number) => TankState | null;
  updatePlantPositionInActiveTank: (plantId: string, x: number, y: number) => void;
  installFilterInActiveTank: (filterType: TankState['filterType']) => TankState | null;
  updateFilterPositionInActiveTank: (x: number, y: number) => void;

  // Shrimp management
  addShrimpToActiveTank: (variantId: string, count?: number) => ShrimpState[];
  removeShrimpFromTank: (shrimpId: string) => void;
  getShrimpById: (id: string) => ShrimpState | null;

  // Phaser live updates
  setTankSnapshot: (snap: TankStateSnapshot) => void;
  setWaterWarnings: (warnings: string[]) => void;
  addBreedingNotification: (msg: string) => void;
  clearBreedingNotifications: () => void;

  setSpeed: (speed: SpeedMultiplier) => void;
  setLoading: (v: boolean) => void;
}

const defaultProfile = (username: string, id: string): PlayerProfile => ({
  id,
  username,
  cash: STARTING_CASH,
  inventory: [],
  tanks: [],
  activeTankId: null,
  gameSpeedMultiplier: 1,
  lastSavedAt: Date.now(),
});

const makeShrimpState = (variantId: string, tankW: number, tankH: number): ShrimpState => ({
  id: nanoid(),
  variantId,
  sex: Math.random() < 0.5 ? 'female' : 'male',
  stage: 'adult',
  ageGameDays: 60 + Math.floor(Math.random() * 60),
  health: 1,
  fullness: 0.9,
  daysToMolt: 14 + Math.floor(Math.random() * 21),
  postMoltWindow: 0,
  berriedDaysRemaining: null,
  eggCount: 0,
  stressAccumulated: 0,
  x: 50 + Math.random() * (tankW - 100),
  y: 40 + Math.random() * (tankH * 0.6),
  facingRight: Math.random() > 0.5,
  behavior: 'idle',
  behaviorTimer: 0,
  listedPrice: null,
});

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      profile: null,
      tankSnapshot: null,
      waterWarnings: [],
      breedingNotifications: [],
      isLoading: false,

      initProfile: (username, id) => {
        set({ profile: defaultProfile(username, id) });
      },

      setProfile: (profile) => set({ profile }),

      clearProfile: () => set({
        profile: null,
        tankSnapshot: null,
        waterWarnings: [],
        breedingNotifications: [],
      }),

      deductCash: (amount) => {
        const p = get().profile;
        if (!p || p.cash < amount) return false;
        set({ profile: { ...p, cash: p.cash - amount } });
        return true;
      },

      addCash: (amount) => {
        const p = get().profile;
        if (!p) return;
        set({ profile: { ...p, cash: p.cash + amount } });
      },

      addInventoryItem: (itemId, qty = 1) => {
        const p = get().profile;
        if (!p) return;
        const existing = p.inventory.find(i => i.itemId === itemId);
        if (existing) {
          set({
            profile: {
              ...p,
              inventory: p.inventory.map(i =>
                i.itemId === itemId ? { ...i, quantity: i.quantity + qty } : i
              ),
            },
          });
        } else {
          set({
            profile: {
              ...p,
              inventory: [...p.inventory, { itemId, quantity: qty, acquiredAt: Date.now() }],
            },
          });
        }
      },

      removeInventoryItem: (itemId, qty = 1) => {
        const p = get().profile;
        if (!p) return false;
        const existing = p.inventory.find(i => i.itemId === itemId);
        if (!existing || existing.quantity < qty) return false;
        const newQty = existing.quantity - qty;
        set({
          profile: {
            ...p,
            inventory: newQty > 0
              ? p.inventory.map(i => i.itemId === itemId ? { ...i, quantity: newQty } : i)
              : p.inventory.filter(i => i.itemId !== itemId),
          },
        });
        return true;
      },

      hasInventoryItem: (itemId) => {
        const p = get().profile;
        return (p?.inventory.find(i => i.itemId === itemId)?.quantity ?? 0) > 0;
      },

      purchaseTank: (gallons, tankItemId, price) => {
        const p = get().profile;
        if (!p) return null;
        if (!get().deductCash(price)) return null;

        const tankId = nanoid();
        const newTank: TankState = {
          id: tankId,
          ownerId: p.id,
          gallons,
          substateType: 'none',
          substrateAgeMonths: 0,
          cycled: false,
          cyclingDaysElapsed: 0,
          bacteriaLevel: 0,
          filterType: 'none',
          hasHeater: false,
          hasLight: false,
          lightType: 'none',
          hasRO: false,
          hasDechlorinator: false,
          params: { ...NEO_TAP_DEFAULTS },
          copperPpm: 0,
          uneatenfood: 0,
          tannins: 0,
          plantCoverScore: 0,
          biofilmLevel: 0,
          filterVisual: null,
          plants: [],
          shrimp: [],
          gameAge: 0,
        };

        get().addInventoryItem(tankItemId);
        const newProfile = {
          ...p,
          tanks: [...p.tanks, newTank],
          activeTankId: p.activeTankId ?? tankId,
        };
        set({ profile: newProfile });
        return newTank;
      },

      setActiveTank: (tankId) => {
        const p = get().profile;
        if (!p) return;
        set({ profile: { ...p, activeTankId: tankId } });
      },

      getActiveTank: () => {
        const p = get().profile;
        if (!p || !p.activeTankId) return null;
        return p.tanks.find(t => t.id === p.activeTankId) ?? null;
      },

      updateActiveTankParams: (params) => {
        const p = get().profile;
        if (!p || !p.activeTankId) return;
        set({
          profile: {
            ...p,
            tanks: p.tanks.map(t =>
              t.id === p.activeTankId
                ? { ...t, params: { ...t.params, ...params } }
                : t
            ),
          },
        });
      },

      addPlantToActiveTank: (itemId, coverIncrease) => {
        const p = get().profile;
        if (!p || !p.activeTankId) return null;

        const tank = p.tanks.find(t => t.id === p.activeTankId);
        if (!tank) return null;

        const plantType: PlantState['type'] =
          itemId === 'java_moss' ? 'java_moss' :
          itemId === 'anubias' ? 'anubias' :
          'other';

        const dims = { width: tank.gallons * 16 + 480, height: 320 };
        const substrateY = Math.floor(dims.height * 0.85);
        const plant: PlantState = {
          id: nanoid(),
          itemId,
          type: plantType,
          x: 40 + Math.random() * (dims.width - 80),
          y: substrateY - (plantType === 'java_moss' ? 8 : 14),
          scale: plantType === 'java_moss' ? 0.9 + Math.random() * 0.3 : 0.75 + Math.random() * 0.2,
        };

        let updatedTank: TankState | null = null;
        set({
          profile: {
            ...p,
            tanks: p.tanks.map(t => {
              if (t.id !== p.activeTankId) return t;
              updatedTank = {
                ...t,
                plantCoverScore: Math.min(20, t.plantCoverScore + coverIncrease),
                plants: [...(t.plants ?? []), plant],
              };
              return updatedTank;
            }),
          },
        });

        return updatedTank;
      },

      updatePlantPositionInActiveTank: (plantId, x, y) => {
        const p = get().profile;
        if (!p || !p.activeTankId) return;

        set({
          profile: {
            ...p,
            tanks: p.tanks.map(t => {
              if (t.id !== p.activeTankId) return t;
              return {
                ...t,
                plants: (t.plants ?? []).map(plant =>
                  plant.id === plantId ? { ...plant, x, y } : plant
                ),
              };
            }),
          },
        });
      },

      installFilterInActiveTank: (filterType) => {
        const p = get().profile;
        if (!p || !p.activeTankId) return null;

        const tank = p.tanks.find(t => t.id === p.activeTankId);
        if (!tank) return null;

        const dims = { width: tank.gallons * 16 + 480, height: 320 };
        const substrateY = Math.floor(dims.height * 0.85);
        const existingVisual = tank.filterVisual;
        const defaultVisual = {
          x: Math.round(dims.width * 0.82),
          y: substrateY + 4,
        };

        let updatedTank: TankState | null = null;
        set({
          profile: {
            ...p,
            tanks: p.tanks.map(t => {
              if (t.id !== p.activeTankId) return t;
              updatedTank = {
                ...t,
                filterType,
                filterVisual: existingVisual ? { ...existingVisual } : defaultVisual,
              };
              return updatedTank;
            }),
          },
        });

        return updatedTank;
      },

      updateFilterPositionInActiveTank: (x, y) => {
        const p = get().profile;
        if (!p || !p.activeTankId) return;

        set({
          profile: {
            ...p,
            tanks: p.tanks.map(t => {
              if (t.id !== p.activeTankId) return t;
              return {
                ...t,
                filterVisual: { x, y },
              };
            }),
          },
        });
      },

      addShrimpToActiveTank: (variantId, count = 1) => {
        const p = get().profile;
        if (!p || !p.activeTankId) return [];
        const tank = p.tanks.find(t => t.id === p.activeTankId);
        if (!tank) return [];

        const dims = { width: tank.gallons * 16 + 480, height: 320 };
        const newShrimp = Array.from({ length: count }, () =>
          makeShrimpState(variantId, dims.width, dims.height)
        );

        set({
          profile: {
            ...p,
            tanks: p.tanks.map(t =>
              t.id === p.activeTankId
                ? { ...t, shrimp: [...t.shrimp, ...newShrimp] }
                : t
            ),
          },
        });
        return newShrimp;
      },

      removeShrimpFromTank: (shrimpId) => {
        const p = get().profile;
        if (!p || !p.activeTankId) return;
        set({
          profile: {
            ...p,
            tanks: p.tanks.map(t =>
              t.id === p.activeTankId
                ? { ...t, shrimp: t.shrimp.filter(s => s.id !== shrimpId) }
                : t
            ),
          },
        });
      },

      getShrimpById: (id) => {
        const p = get().profile;
        if (!p) return null;
        for (const tank of p.tanks) {
          const s = tank.shrimp.find(sh => sh.id === id);
          if (s) return s;
        }
        return null;
      },

      setTankSnapshot: (snap) => set({ tankSnapshot: snap }),
      setWaterWarnings: (waterWarnings) => set({ waterWarnings }),

      addBreedingNotification: (msg) => {
        set(s => ({ breedingNotifications: [msg, ...s.breedingNotifications].slice(0, 10) }));
      },
      clearBreedingNotifications: () => set({ breedingNotifications: [] }),

      setSpeed: (speed) => {
        const p = get().profile;
        if (p) set({ profile: { ...p, gameSpeedMultiplier: speed } });
      },

      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'shrimp_game',
      partialize: (s) => ({ profile: s.profile }),
    }
  )
);
