import Phaser from 'phaser';
import { nanoid } from 'nanoid';
import type { TankState, FoodParticle as FoodParticleState } from '../types';
import { WaterParamSystem, NEO_TAP_DEFAULTS, CARI_RO_DEFAULTS } from '../systems/WaterParamSystem';
import { NitrogenCycle } from '../systems/NitrogenCycle';
import { BreedingSystem } from '../systems/BreedingSystem';
import { ShrimpSprite } from '../sprites/ShrimpSprite';
import type { SpeedMultiplier } from '../data/gameConfig';
import { TANK_CANVAS, SPRITE_SIZE, TICKS_PER_GAME_MINUTE } from '../data/gameConfig';
import { GAME_EVENTS } from '../ShrimpGame';
import type { TankTooltipData } from '../ShrimpGame';
import { VARIANT_MAP } from '../data/shrimpVariants';
import { STORE_ITEMS } from '../data/storeItems';
import type { PlantState, ShrimpBehavior, ShrimpState, InstalledFilterState, InstalledFilterType, FilterVisualState } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// TankScene — the main Phaser simulation
// ─────────────────────────────────────────────────────────────────────────────

const TICKS_PER_GAME_HOUR = TICKS_PER_GAME_MINUTE * 60;
const TICKS_PER_GAME_DAY = TICKS_PER_GAME_HOUR * 24;
const STORE_ITEM_NAME_BY_ID = new Map(STORE_ITEMS.map(i => [i.id, i.name]));
const PLANT_RENDER_SCALE_MULTIPLIER = 1.4;
const PLANT_DRAG_TOP_PADDING = 12;
const PLANT_DRAG_BOTTOM_PADDING = 6;
const FILTER_DRAG_TOP_PADDING = 10;
const FILTER_DRAG_BOTTOM_PADDING = 8;
const FILTER_SLOT_X_FACTORS = [0.82, 0.18, 0.5, 0.68, 0.32, 0.9, 0.1] as const;

export class TankScene extends Phaser.Scene {
  private tank!: TankState;
  private shrimpSprites: Map<string, ShrimpSprite> = new Map();
  private plantSprites: Map<string, Phaser.GameObjects.Image> = new Map();
  private filterSprites: Map<string, Phaser.GameObjects.Image> = new Map();
  private filterBubbleEvents: Map<string, Phaser.Time.TimerEvent> = new Map();
  private foodSprites: Map<string, Phaser.GameObjects.Image> = new Map();
  private foodParticles: FoodParticleState[] = [];
  private bubbleParticles: Phaser.GameObjects.Image[] = [];

  private waterParams!: WaterParamSystem;
  private nitrogenCycle!: NitrogenCycle;
  private breedingSystem!: BreedingSystem;

  private tickAccumulator = 0; // ms
  private hourAccumulator = 0; // game ticks
  private dayAccumulator = 0;  // game ticks

  private speed: SpeedMultiplier = 1;
  private substrateY = 0;
  private tankW = 0;
  private tankH = 0;
  private pinnedTooltipTarget: { kind: 'shrimp' | 'plant'; id: string } | null = null;
  private draggingPlantId: string | null = null;
  private draggingFilterId: string | null = null;

  constructor() {
    super({ key: 'TankScene' });
  }

  create() {
    this.waterParams = new WaterParamSystem();
    this.nitrogenCycle = new NitrogenCycle();
    this.breedingSystem = new BreedingSystem();

    // Listen for breeding events and forward to React via event bus
    this.breedingSystem.onEvent(evt => {
      this.game.events.emit(GAME_EVENTS.BREEDING_EVENT, evt);
    });

    // Listen to commands from React UI
    this.game.events.on(GAME_EVENTS.SET_TANK, this.initTank, this);
    this.game.events.on(GAME_EVENTS.ADD_FOOD, this.handleAddFood, this);
    this.game.events.on(GAME_EVENTS.WATER_CHANGE, this.handleWaterChange, this);
    this.game.events.on(GAME_EVENTS.ADD_ADDITIVE, this.handleAddAdditive, this);
    this.game.events.on(GAME_EVENTS.SET_SPEED, this.setSpeed, this);
    this.game.events.on(GAME_EVENTS.ADD_SHRIMP, this.handleAddShrimp, this);

    // Tooltip pinning lifecycle
    this.input.on('pointermove', this.handlePointerMove, this);
    this.input.on('pointerdown', this.handlePointerDown, this);
    this.input.on('dragstart', this.handleDragStart, this);
    this.input.on('drag', this.handleDrag, this);
    this.input.on('dragend', this.handleDragEnd, this);
    this.input.on('gameout', this.clearPinnedTooltip, this);
  }

  /**
   * Called by React store when a tank is ready to render.
   * Clears the scene and rebuilds everything from TankState.
   */
  private initTank(tank: TankState) {
    this.tank = this.cloneTankState(tank);
    const dims = TANK_CANVAS[tank.gallons] ?? TANK_CANVAS[10];
    this.tankW = dims.width;
    this.tankH = dims.height;
    this.substrateY = Math.floor(this.tankH * 0.85);

    // Clear previous objects
    this.children.removeAll(true);
    this.shrimpSprites.clear();
    this.plantSprites.clear();
    this.filterSprites.clear();
    this.foodSprites.clear();
    this.foodParticles = [];
    this.draggingPlantId = null;
    this.draggingFilterId = null;
    this.stopAllFilterBubbleEmitters();
    this.clearPinnedTooltip();

    // Resize the Phaser canvas
    this.scale.resize(this.tankW, this.tankH);

    // Background
    const bgKey = `tank_bg_${tank.gallons}`;
    if (this.textures.exists(bgKey)) {
      this.add.image(0, 0, bgKey).setOrigin(0, 0);
    } else {
      this.add.rectangle(0, 0, this.tankW, this.tankH, 0x0d2a42).setOrigin(0, 0);
    }

    // Substrate
    const subKey = `substrate_${tank.gallons}_${tank.substateType === 'active' ? 'active' : 'inert'}`;
    if (this.textures.exists(subKey)) {
      this.add.image(0, this.substrateY, subKey).setOrigin(0, 0);
    }

    // Plants (rendered before shrimp so shrimp can swim above)
    this.renderPlants();

    // Equipment visual
    this.renderFilters();

    // Glass glare
    const glareKey = `glass_glare_${tank.gallons}`;
    if (this.textures.exists(glareKey)) {
      this.add.image(0, 0, glareKey).setOrigin(0, 0).setAlpha(1);
    }

    // Shrimp
    for (const s of tank.shrimp) {
      this.addShrimpSprite(s);
    }
  }

  private addShrimpSprite(state: import('../types').ShrimpState) {
    const sprite = new ShrimpSprite(this, state, this.tankW, this.tankH, this.substrateY);
    sprite.setData('tooltipKind', 'shrimp');
    sprite.setData('tooltipId', state.id);
    sprite.setInteractive({ useHandCursor: true, pixelPerfect: true });
    sprite.on('pointerdown', () => {
      this.pinTooltipToShrimp(sprite.shrimpState.id);
    });
    this.shrimpSprites.set(state.id, sprite);
  }

  private pinTooltipToShrimp(id: string) {
    this.pinnedTooltipTarget = { kind: 'shrimp', id };
    this.hidePlantTooltip();
    this.refreshPinnedTooltip();
  }

  private pinTooltipToPlant(id: string) {
    this.pinnedTooltipTarget = { kind: 'plant', id };
    this.hideShrimpTooltip();
    this.refreshPinnedTooltip();
  }

  private clearPinnedTooltip() {
    this.pinnedTooltipTarget = null;
    this.hideShrimpTooltip();
    this.hidePlantTooltip();
  }

  private emitTooltip(data: TankTooltipData | null) {
    this.game.events.emit(GAME_EVENTS.TANK_TOOLTIP, data);
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer) {
    if (!this.pinnedTooltipTarget) return;
    const insideX = pointer.x >= 0 && pointer.x <= this.tankW;
    const insideY = pointer.y >= 0 && pointer.y <= this.tankH;
    if (!insideX || !insideY) {
      this.clearPinnedTooltip();
    }
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[] = []) {
    if (!this.pinnedTooltipTarget) return;

    const hitPinnedTarget = currentlyOver.some(obj => {
      const kind = obj.getData('tooltipKind');
      const id = obj.getData('tooltipId');
      return kind === this.pinnedTooltipTarget?.kind && id === this.pinnedTooltipTarget?.id;
    });

    if (!hitPinnedTarget) {
      this.clearPinnedTooltip();
    }
  }

  private refreshPinnedTooltip() {
    if (!this.pinnedTooltipTarget) return;

    if (this.pinnedTooltipTarget.kind === 'shrimp') {
      const sprite = this.shrimpSprites.get(this.pinnedTooltipTarget.id);
      if (!sprite) {
        this.clearPinnedTooltip();
        return;
      }
      this.showShrimpTooltip(sprite.shrimpState, sprite.x, sprite.y - 8, true);
      return;
    }

    const sprite = this.plantSprites.get(this.pinnedTooltipTarget.id);
    const state = this.tank.plants?.find(p => p.id === this.pinnedTooltipTarget?.id);
    if (!sprite || !state) {
      this.clearPinnedTooltip();
      return;
    }

    this.showPlantTooltip(this.getPlantName(state.itemId, state.type), state.type, sprite.x, sprite.y - 10, true);
  }

  private getBehaviorLabel(behavior: ShrimpBehavior): string {
    switch (behavior) {
      case 'seek_food':
        return 'Foraging';
      case 'eat':
        return 'Grazing';
      case 'breeding_swim':
        return 'Looking for mate';
      case 'post_molt':
        return 'Recovering after molt';
      case 'hide':
        return 'Hiding';
      case 'wander':
        return 'Exploring';
      case 'idle':
      default:
        return 'Resting';
    }
  }

  private getBehaviorDetail(behavior: ShrimpBehavior): string {
    switch (behavior) {
      case 'seek_food':
        return 'Searching substrate and surfaces for edible bits.';
      case 'eat':
        return 'Actively feeding on biofilm or food particles.';
      case 'breeding_swim':
        return 'Pheromone response swim after a molt event.';
      case 'post_molt':
        return 'Soft shell phase. More vulnerable to stress.';
      case 'hide':
        return 'Taking shelter to reduce stress.';
      case 'wander':
        return 'Cruising the tank and scouting habitat.';
      case 'idle':
      default:
        return 'Low activity period between tasks.';
    }
  }

  private getStageLabel(stage: ShrimpState['stage']): string {
    switch (stage) {
      case 'shrimplet':
        return 'Shrimplet';
      case 'juvenile':
        return 'Juvenile';
      case 'adult':
      default:
        return 'Adult';
    }
  }

  private formatAgeDays(ageGameDays: number): string {
    if (ageGameDays < 10) return `${ageGameDays.toFixed(1)} d`;
    return `${Math.round(ageGameDays)} d`;
  }

  private getPlantTypeLabel(type: string): string {
    switch (type) {
      case 'java_moss':
        return 'Moss';
      case 'anubias':
        return 'Rhizome plant';
      default:
        return 'Aquatic plant';
    }
  }

  private getPlantBenefit(type: string): string {
    switch (type) {
      case 'java_moss':
        return 'Boosts biofilm and gives shrimplets dense cover.';
      case 'anubias':
        return 'Adds stable cover and gentle nitrate uptake.';
      default:
        return 'Adds cover, surfaces, and water quality support.';
    }
  }

  private getPlantName(itemId: string, type: string): string {
    const fromStore = STORE_ITEM_NAME_BY_ID.get(itemId);
    if (fromStore) return fromStore;
    if (type === 'java_moss') return 'Java Moss';
    if (type === 'anubias') return 'Anubias';
    return 'Aquarium Plant';
  }

  private showShrimpTooltip(shrimp: ShrimpState, x: number, y: number, pinned = false) {
    const variantName = VARIANT_MAP.get(shrimp.variantId)?.name ?? 'Unknown Shrimp';
    const identity = shrimp.name?.trim()?.length
      ? `${variantName} (${shrimp.name.trim()})`
      : variantName;
    const sexLabel = shrimp.sex === 'female' ? 'Female' : 'Male';
    const stageLabel = this.getStageLabel(shrimp.stage);
    const task = this.getBehaviorLabel(shrimp.behavior);
    const taskDetail = this.getBehaviorDetail(shrimp.behavior);
    const healthPct = Math.round(Math.max(0, Math.min(1, shrimp.health)) * 100);
    const fullnessPct = Math.round(Math.max(0, Math.min(1, shrimp.fullness)) * 100);
    const berriedText = shrimp.berriedDaysRemaining !== null && shrimp.sex === 'female'
      ? `${Math.max(0, Math.ceil(shrimp.berriedDaysRemaining))} d to hatch`
      : undefined;

    this.emitTooltip({
      kind: 'shrimp',
      pinned,
      x,
      y,
      tankW: this.tankW,
      tankH: this.tankH,
      title: identity,
      subtitle: `${sexLabel} ${stageLabel}  Age: ${this.formatAgeDays(shrimp.ageGameDays)}`,
      stats: [
        { label: 'Health', value: `${healthPct}%`, tone: healthPct >= 70 ? 'good' : healthPct >= 40 ? 'warn' : 'danger' },
        { label: 'Fullness', value: `${fullnessPct}%`, tone: fullnessPct >= 60 ? 'good' : fullnessPct >= 30 ? 'warn' : 'danger' },
        { label: 'Task', value: task, tone: 'info' },
        ...(berriedText ? [{ label: 'Berried', value: berriedText, tone: 'info' as const }] : []),
      ],
      detail: taskDetail,
    });
  }

  private hideShrimpTooltip() {
    this.emitTooltip(null);
  }

  private showPlantTooltip(name: string, type: string, x: number, y: number, pinned = false) {
    this.emitTooltip({
      kind: 'plant',
      pinned,
      x,
      y,
      tankW: this.tankW,
      tankH: this.tankH,
      title: name,
      subtitle: `Type: ${this.getPlantTypeLabel(type)}`,
      stats: [
        { label: 'Role', value: this.getPlantTypeLabel(type), tone: 'info' },
      ],
      detail: this.getPlantBenefit(type),
    });
  }

  private hidePlantTooltip() {
    this.emitTooltip(null);
  }

  private cloneTankState(tank: TankState): TankState {
    return {
      ...tank,
      params: { ...tank.params },
      filters: (Array.isArray(tank.filters) ? tank.filters : []).map(filter => ({
        ...filter,
        visual: { ...filter.visual },
      })),
      filterVisual: tank.filterVisual ? { ...tank.filterVisual } : null,
      plants: (tank.plants ?? []).map(plant => ({ ...plant })),
      shrimp: tank.shrimp.map(shrimp => ({ ...shrimp })),
    };
  }

  private getInstalledFilters(): InstalledFilterState[] {
    if (Array.isArray(this.tank.filters) && this.tank.filters.length > 0) return this.tank.filters;
    if (this.tank.filterType && this.tank.filterType !== 'none') {
      return [{
        id: 'legacy-filter',
        type: this.tank.filterType,
        visual: this.tank.filterVisual ?? this.getFilterDefaultPosition(0),
      }];
    }
    return [];
  }

  private getPlantState(id: string): PlantState | undefined {
    return this.tank.plants?.find(plant => plant.id === id);
  }

  private getPlantDragBounds(sprite: Phaser.GameObjects.Image) {
    const displayWidth = sprite.width * Math.abs(sprite.scaleX);
    const displayHeight = sprite.height * Math.abs(sprite.scaleY);
    const minX = Math.ceil(displayWidth / 2);
    const maxX = Math.floor(this.tankW - displayWidth / 2);
    const minY = Math.ceil(displayHeight + PLANT_DRAG_TOP_PADDING);
    const maxY = Math.floor(this.substrateY + PLANT_DRAG_BOTTOM_PADDING);

    return {
      minX,
      maxX,
      minY: Math.min(minY, maxY),
      maxY,
    };
  }

  private getFilterDragBounds(sprite: Phaser.GameObjects.Image) {
    const displayWidth = sprite.width * Math.abs(sprite.scaleX);
    const displayHeight = sprite.height * Math.abs(sprite.scaleY);
    const minX = Math.ceil(displayWidth / 2);
    const maxX = Math.floor(this.tankW - displayWidth / 2);
    const minY = Math.ceil(displayHeight + FILTER_DRAG_TOP_PADDING);
    const maxY = Math.floor(this.substrateY + FILTER_DRAG_BOTTOM_PADDING);

    return {
      minX,
      maxX,
      minY: Math.min(minY, maxY),
      maxY,
    };
  }

  private isPlantObject(gameObject: Phaser.GameObjects.GameObject): gameObject is Phaser.GameObjects.Image {
    return gameObject instanceof Phaser.GameObjects.Image && gameObject.getData('tooltipKind') === 'plant';
  }

  private isFilterObject(gameObject: Phaser.GameObjects.GameObject): gameObject is Phaser.GameObjects.Image {
    return gameObject instanceof Phaser.GameObjects.Image && gameObject.getData('draggableKind') === 'filter';
  }

  private getFilterTextureKey(filterType: InstalledFilterType) {
    if (filterType === 'sponge_large') return 'filter_sponge_large';
    if (filterType === 'sponge') return 'filter_sponge_small';
    if (filterType === 'hob') return 'filter_hob';
    return null;
  }

  private getFilterDefaultPosition(index: number) {
    const slot = FILTER_SLOT_X_FACTORS[index] ?? FILTER_SLOT_X_FACTORS[index % FILTER_SLOT_X_FACTORS.length];
    return {
      x: Math.round(this.tankW * slot),
      y: this.substrateY + 4,
    };
  }

  private ensureFilterPosition(filter: InstalledFilterState, index: number): FilterVisualState {
    if (!filter.visual) {
      filter.visual = this.getFilterDefaultPosition(index);
    }
    return filter.visual;
  }

  private renderFilters() {
    this.filterSprites.forEach(sprite => sprite.destroy());
    this.filterSprites.clear();
    this.stopAllFilterBubbleEmitters();

    this.getInstalledFilters().forEach((filter, index) => {
      const textureKey = this.getFilterTextureKey(filter.type);
      if (!textureKey) return;

      const pos = this.ensureFilterPosition(filter, index);
      const sprite = this.add.image(pos.x, pos.y, textureKey).setOrigin(0.5, 1);
      sprite.setData('draggableKind', 'filter');
      sprite.setData('filterId', filter.id);
      sprite.setInteractive({ useHandCursor: true, pixelPerfect: true });
      this.input.setDraggable(sprite);

      this.filterSprites.set(filter.id, sprite);
      this.startFilterBubbleEmitter(filter.id, sprite, filter.type);
    });
  }

  private getFilterBubbleOrigin(sprite: Phaser.GameObjects.Image, filterType: InstalledFilterType) {
    const bubbleX = filterType === 'hob' ? sprite.x + 3 : sprite.x;
    const bubbleY = filterType === 'hob'
      ? sprite.y - sprite.displayHeight + 10
      : sprite.y - sprite.displayHeight + 4;
    return { x: bubbleX, y: bubbleY };
  }

  private startFilterBubbleEmitter(filterId: string, sprite: Phaser.GameObjects.Image, filterType: InstalledFilterType) {
    this.stopFilterBubbleEmitter(filterId);

    const delay = filterType === 'sponge_large' ? 180 : filterType === 'hob' ? 150 : 240;
    const event = this.time.addEvent({
      delay,
      loop: true,
      callback: () => {
        const origin = this.getFilterBubbleOrigin(sprite, filterType);
        if (!origin) return;

        const b = this.add.image(
          origin.x + Phaser.Math.Between(-3, 3),
          origin.y + Phaser.Math.Between(-2, 1),
          'bubble'
        );
        const topY = Phaser.Math.Between(4, 10);
        const travelDistance = Math.max(16, b.y - topY);
        this.tweens.add({
          targets: b,
          y: topY,
          x: origin.x + Phaser.Math.Between(-16, 16),
          alpha: { from: 0.8, to: 0 },
          duration: 900 + travelDistance * 14,
          onComplete: () => b.destroy(),
        });
      },
    });

    this.filterBubbleEvents.set(filterId, event);
  }

  private stopFilterBubbleEmitter(filterId: string) {
    this.filterBubbleEvents.get(filterId)?.remove();
    this.filterBubbleEvents.delete(filterId);
  }

  private stopAllFilterBubbleEmitters() {
    this.filterBubbleEvents.forEach(event => event.remove());
    this.filterBubbleEvents.clear();
  }

  private handleDragStart(
    _pointer: Phaser.Input.Pointer,
    gameObject: Phaser.GameObjects.GameObject,
  ) {
    if (this.isFilterObject(gameObject)) {
      this.draggingFilterId = gameObject.getData('filterId') as string | null;
      return;
    }

    if (!this.isPlantObject(gameObject)) return;

    const plantId = gameObject.getData('tooltipId') as string | undefined;
    if (!plantId) return;

    this.draggingPlantId = plantId;
    this.pinTooltipToPlant(plantId);
  }

  private handleDrag(
    _pointer: Phaser.Input.Pointer,
    gameObject: Phaser.GameObjects.GameObject,
    dragX: number,
    dragY: number,
  ) {
    if (this.isFilterObject(gameObject)) {
      const filterId = gameObject.getData('filterId') as string | undefined;
      if (!filterId) return;

      const bounds = this.getFilterDragBounds(gameObject);
      const nextX = Math.round(Phaser.Math.Clamp(dragX, bounds.minX, bounds.maxX));
      const nextY = Math.round(Phaser.Math.Clamp(dragY, bounds.minY, bounds.maxY));
      gameObject.setPosition(nextX, nextY);
      this.tank.filters = this.getInstalledFilters().map(filter =>
        filter.id === filterId
          ? { ...filter, visual: { x: nextX, y: nextY } }
          : filter
      );
      return;
    }

    if (!this.isPlantObject(gameObject)) return;

    const plantId = gameObject.getData('tooltipId') as string | undefined;
    if (!plantId) return;

    const bounds = this.getPlantDragBounds(gameObject);
    const nextX = Math.round(Phaser.Math.Clamp(dragX, bounds.minX, bounds.maxX));
    const nextY = Math.round(Phaser.Math.Clamp(dragY, bounds.minY, bounds.maxY));

    gameObject.setPosition(nextX, nextY);

    const plant = this.getPlantState(plantId);
    if (plant) {
      plant.x = nextX;
      plant.y = nextY;
    }

    if (this.pinnedTooltipTarget?.kind === 'plant' && this.pinnedTooltipTarget.id === plantId) {
      this.refreshPinnedTooltip();
    }
  }

  private handleDragEnd(
    _pointer: Phaser.Input.Pointer,
    gameObject: Phaser.GameObjects.GameObject,
  ) {
    if (this.isFilterObject(gameObject)) {
      const filterId = gameObject.getData('filterId') as string | undefined;
      this.draggingFilterId = null;
      if (!filterId) return;

      this.game.events.emit(GAME_EVENTS.FILTER_MOVED, {
        filterId,
        x: Math.round(gameObject.x),
        y: Math.round(gameObject.y),
      });
      return;
    }

    if (!this.isPlantObject(gameObject)) return;

    const plantId = gameObject.getData('tooltipId') as string | undefined;
    if (!plantId) return;

    this.draggingPlantId = null;
    this.game.events.emit(GAME_EVENTS.PLANT_MOVED, {
      plantId,
      x: Math.round(gameObject.x),
      y: Math.round(gameObject.y),
    });
  }

  private renderPlants() {
    const plants = this.tank.plants ?? [];

    plants.forEach(p => {
      const key = p.type === 'java_moss'
        ? 'plant_java_moss'
        : p.type === 'anubias'
          ? 'plant_anubias'
          : 'plant_java_moss';

      const sprite = this.add.image(p.x, p.y, key).setOrigin(0.5, 1);
      sprite.setData('tooltipKind', 'plant');
      sprite.setData('tooltipId', p.id);
      sprite.setScale(p.scale * PLANT_RENDER_SCALE_MULTIPLIER);
      sprite.setAlpha(0.95);
      sprite.setInteractive({ useHandCursor: true, pixelPerfect: true });
      this.input.setDraggable(sprite);

      const name = this.getPlantName(p.itemId, p.type);
      sprite.on('pointerdown', () => {
        this.pinTooltipToPlant(p.id);
      });

      this.plantSprites.set(p.id, sprite);
    });

    if (plants.length === 0) {
      this.hidePlantTooltip();
    }
  }

  update(_time: number, delta: number) {
    if (!this.tank) return;

    this.tickAccumulator += delta * this.speed;

    // ── Update shrimp sprites every frame ────────────────────────────────────
    this.shrimpSprites.forEach(sprite => {
      sprite.update(delta * this.speed, this.foodParticles);
    });

    if (this.pinnedTooltipTarget) {
      this.refreshPinnedTooltip();
    }

    // ── Game simulation ticks ─────────────────────────────────────────────────
    const tickDuration = 200; // ms per logical tick
    while (this.tickAccumulator >= tickDuration) {
      this.tickAccumulator -= tickDuration;
      this.gameLogicTick();
    }

    // ── Food particle decay update ────────────────────────────────────────────
    this.foodParticles = this.foodParticles.filter(fp => {
      fp.decayTicksRemaining--;
      if (fp.decayTicksRemaining <= 0) {
        this.nitrogenCycle.addFood(this.tank, fp.ammoniaOnDecay);
        const sprite = this.foodSprites.get(fp.id);
        sprite?.destroy();
        this.foodSprites.delete(fp.id);
        return false;
      }
      return true;
    });

    // ── Sync React state ─────────────────────────────────────────────────────
    this.game.events.emit(GAME_EVENTS.TANK_STATE_UPDATE, this.getTankStateSnapshot());
  }

  private gameLogicTick() {
    this.hourAccumulator++;
    this.dayAccumulator++;

    // Every game hour
    if (this.hourAccumulator >= TICKS_PER_GAME_HOUR) {
      this.hourAccumulator = 0;
      this.waterParams.tick(this.tank, 1);
      this.nitrogenCycle.tick(this.tank, 1);
      this.breedingSystem.updateHealth(this.tank);
      this.tank.gameAge += 60; // 60 game minutes per hour

      // Emit warnings
      this.game.events.emit(
        GAME_EVENTS.WATER_WARNINGS,
        this.waterParams.getWarnings(this.tank, this.getPrimaryGroup())
      );
    }

    // Every game day
    if (this.dayAccumulator >= TICKS_PER_GAME_DAY) {
      this.dayAccumulator = 0;
      this.breedingSystem.tick(this.tank, 1);
      this.syncShrimpSprites();
    }
  }

  private syncShrimpSprites() {
    // Destroy sprites for dead/removed shrimp
    this.shrimpSprites.forEach((sprite, id) => {
      if (!this.tank.shrimp.find(s => s.id === id)) {
        if (this.pinnedTooltipTarget?.kind === 'shrimp' && this.pinnedTooltipTarget.id === id) {
          this.clearPinnedTooltip();
        }
        sprite.destroy();
        this.shrimpSprites.delete(id);
      }
    });
    // Add sprites for new shrimp (shrimplets from breeding)
    for (const s of this.tank.shrimp) {
      if (!this.shrimpSprites.has(s.id)) {
        this.addShrimpSprite(s);
      }
    }
    // Update ShrimpSprite.shrimpState references
    this.tank.shrimp.forEach(s => {
      const sp = this.shrimpSprites.get(s.id);
      if (sp) sp.shrimpState = s;
    });
  }

  private handleAddFood(foodType: string) {
    if (!this.tank) return;
    const x = 50 + Math.random() * (this.tankW - 100);
    const y = 40 + Math.random() * 60;
    const decayTicks = foodType === 'veggie' ? 720 : 300; // ticks before it rots
    const ammoniaOnDecay = foodType === 'protein' ? 0.08 : 0.03;

    const fp: FoodParticleState = {
      id: nanoid(),
      x,
      y,
      type: foodType as FoodParticleState['type'],
      decayTicksRemaining: decayTicks,
      ammoniaOnDecay,
    };
    this.foodParticles.push(fp);
    this.nitrogenCycle.addFood(this.tank, 0.2);

    // Visual
    const textureKey = foodType === 'veggie' ? 'food_veggie' : 'food_pellet';
    const sprite = this.add.image(x, y, textureKey);
    this.foodSprites.set(fp.id, sprite);

    // Sink to substrate
    this.tweens.add({
      targets: sprite,
      y: this.substrateY - SPRITE_SIZE / 4,
      duration: 2000,
      ease: 'Power1',
    });
  }

  private handleWaterChange(data: {
    // New UI payload: pct (0-100) + custom fresh params
    pct?: number;
    freshParams?: Partial<TankState['params']>;
    // Back-compat payload: volume (0-1) + useRO
    volume?: number;
    useRO?: boolean;
  }) {
    if (!this.tank) return;

    const fallbackFresh = data.useRO ? { ...CARI_RO_DEFAULTS } : { ...NEO_TAP_DEFAULTS };
    const freshParams = data.freshParams
      ? { ...fallbackFresh, ...data.freshParams }
      : fallbackFresh;

    const volume = typeof data.volume === 'number'
      ? data.volume
      : (typeof data.pct === 'number' ? data.pct / 100 : 0.2);

    this.waterParams.waterChange(this.tank, volume, freshParams);

    // Recompute warnings immediately so resolved warnings disappear right away.
    this.game.events.emit(
      GAME_EVENTS.WATER_WARNINGS,
      this.waterParams.getWarnings(this.tank, this.getPrimaryGroup())
    );
  }

  private handleAddAdditive(data: { type: string; value?: number }) {
    if (!this.tank) return;
    switch (data.type) {
      case 'dechlorinator':
        this.waterParams.applyDechlorinator(this.tank);
        break;
      case 'gh_kh_neo':
        this.waterParams.addGHKHBooster(this.tank, data.value ?? 1, data.value ?? 1);
        break;
      case 'gh_cari':
        this.waterParams.addGHBooster(this.tank, data.value ?? 1);
        break;
      case 'bacteria':
        this.nitrogenCycle.addBacteriaStarter(this.tank, 0.2);
        break;
      case 'tannins':
        this.waterParams.addTannins(this.tank, data.value ?? 0.1);
        break;
    }
  }

  private handleAddShrimp(shrimpState: import('../types').ShrimpState) {
    if (!this.tank) return;
    this.tank.shrimp.push(shrimpState);
    this.addShrimpSprite(shrimpState);
  }

  private setSpeed(speed: SpeedMultiplier) {
    this.speed = speed;
    this.waterParams.speedMultiplier = speed;
    this.nitrogenCycle.speedMultiplier = speed;
    this.breedingSystem.speedMultiplier = speed;
  }

  private getPrimaryGroup(): 'neocaridina' | 'caridina' | 'tiger' {
    if (!this.tank.shrimp.length) return 'neocaridina';
    const first = this.tank.shrimp[0];
    const variant = VARIANT_MAP.get(first.variantId);
    return variant?.group ?? 'neocaridina';
  }

  private getTankStateSnapshot() {
    return {
      params: { ...this.tank.params },
      cycled: this.tank.cycled,
      bacteriaLevel: this.tank.bacteriaLevel,
      shrimpCount: this.tank.shrimp.length,
      shrimp: this.tank.shrimp.map(s => ({ ...s })),
      uneatenfood: this.tank.uneatenfood,
      gameAge: this.tank.gameAge,
      cyclePhase: this.nitrogenCycle.getCyclePhase(this.tank),
    };
  }

  shutdown() {
    this.stopAllFilterBubbleEmitters();
    this.emitTooltip(null);
  }
}
