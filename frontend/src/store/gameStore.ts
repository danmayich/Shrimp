import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { TankState, ShrimpState, WaterParams, PlantState, InstalledFilterType, FilterVisualState } from '../game/types';
import type { TankStateSnapshot } from '../game/ShrimpGame';
import { STARTING_CASH } from '../game/data/gameConfig';
import { TANK_CANVAS } from '../game/data/gameConfig';
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
  installFilterInActiveTank: (filterType: InstalledFilterType) => TankState | null;
  updateFilterPositionInActiveTank: (filterId: string, x: number, y: number) => void;

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

const FILTER_SLOT_X_FACTORS = [0.82, 0.18, 0.5, 0.68, 0.32, 0.9, 0.1] as const;

const getDefaultFilterVisual = (gallons: number, index: number): FilterVisualState => {
  const dims = TANK_CANVAS[gallons] ?? TANK_CANVAS[10];
  const substrateY = Math.floor(dims.height * 0.85);
  const slot = FILTER_SLOT_X_FACTORS[index] ?? FILTER_SLOT_X_FACTORS[index % FILTER_SLOT_X_FACTORS.length];

  return {
    x: Math.round(dims.width * slot),
    y: substrateY + 4,
  };
};

const normalizeTank = (tank: TankState): TankState => {
  const existingFilters = Array.isArray(tank.filters) ? tank.filters : [];

  if (existingFilters.length > 0) {
    return {
      ...tank,
      filters: existingFilters.map((filter, index) => ({
        ...filter,
        visual: filter.visual ?? getDefaultFilterVisual(tank.gallons, index),
      })),
    };
  }

  if (tank.filterType && tank.filterType !== 'none') {
    return {
      ...tank,
      filters: [{
        id: nanoid(),
        type: tank.filterType,
        visual: tank.filterVisual ?? getDefaultFilterVisual(tank.gallons, 0),
      }],
      filterType: 'none',
      filterVisual: null,
    };
  }

  return {
    ...tank,
    filters: [],
    filterType: 'none',
    filterVisual: null,
  };
};

const normalizeProfile = (profile: PlayerProfile): PlayerProfile => ({
  ...profile,
  tanks: profile.tanks.map(normalizeTank),
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

      setProfile: (profile) => set({ profile: normalizeProfile(profile) }),

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
          filters: [],
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

        const dims = TANK_CANVAS[tank.gallons] ?? TANK_CANVAS[10];
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

        const nextFilter = {
          id: nanoid(),
          type: filterType,
          visual: getDefaultFilterVisual(tank.gallons, Array.isArray(tank.filters) ? tank.filters.length : 0),
        };

        let updatedTank: TankState | null = null;
        set({
          profile: {
            ...p,
            tanks: p.tanks.map(t => {
              if (t.id !== p.activeTankId) return t;
              updatedTank = {
                ...t,
                filters: [...(Array.isArray(t.filters) ? t.filters : []), nextFilter],
                filterType: 'none',
                filterVisual: null,
              };
              return updatedTank;
            }),
          },
        });

        return updatedTank;
      },

      updateFilterPositionInActiveTank: (filterId, x, y) => {
        const p = get().profile;
        if (!p || !p.activeTankId) return;

        set({
          profile: {
            ...p,
            tanks: p.tanks.map(t => {
              if (t.id !== p.activeTankId) return t;
              return {
                ...t,
                filters: (Array.isArray(t.filters) ? t.filters : []).map(filter =>
                  filter.id === filterId
                    ? { ...filter, visual: { x, y } }
                    : filter
                ),
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

        const dims = TANK_CANVAS[tank.gallons] ?? TANK_CANVAS[10];
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
      version: 2,
      partialize: (s) => ({ profile: s.profile }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<GameState>;
        return {
          ...currentState,
          ...persisted,
          profile: persisted.profile ? normalizeProfile(persisted.profile as PlayerProfile) : null,
        };
      },
    }
  )
);
