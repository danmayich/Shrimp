import Phaser from 'phaser';
import type { ShrimpState, TankState, FoodParticle } from '../types';
import { VARIANT_MAP } from '../data/shrimpVariants';
import { SPRITE_SIZE } from '../data/gameConfig';

// ─────────────────────────────────────────────────────────────────────────────
// ShrimpSprite
// A single shrimp's visual representation and movement behavior in the tank.
// State machine: idle → wander → seek_food → eat → hide → post_molt
// ─────────────────────────────────────────────────────────────────────────────

const WANDER_SPEED = 24;          // px per second
const SEEK_FOOD_SPEED = 40;
const FLEE_SPEED = 60;
const IDLE_DURATION_MS = [2000, 5000] as const;
const WANDER_DURATION_MS = [3000, 8000] as const;

export class ShrimpSprite extends Phaser.GameObjects.Image {
  shrimpState!: ShrimpState;
  private stateTimer = 0;
  private vx = 0;
  private vy = 0;
  private tankW: number;
  private tankH: number;
  private substrateY: number;
  private animTimer = 0;
  private currentFrame = 0;
  private readonly ANIM_INTERVAL = 300; // ms per frame

  constructor(
    scene: Phaser.Scene,
    state: ShrimpState,
    tankW: number,
    tankH: number,
    substrateY: number,
  ) {
    const textureKey = ShrimpSprite.textureKey(state);
    super(scene, state.x, state.y, textureKey);
    this.shrimpState = state;
    this.tankW = tankW;
    this.tankH = tankH;
    this.substrateY = substrateY;
    this.setOrigin(0.5, 0.5);
    this.applyScale();
    this.applyFacing(this.shrimpState.facingRight);
    scene.add.existing(this as Phaser.GameObjects.Image);
  }

  static textureKey(state: ShrimpState, frameIdx = 0): string {
    if (state.stage === 'shrimplet') return `shrimp_${state.variantId}_juvenile`;
    if (state.berriedDaysRemaining !== null && state.sex === 'female') {
      return `shrimp_${state.variantId}_4`;
    }
    return `shrimp_${state.variantId}_${frameIdx}`;
  }

  private applyScale() {
    if (this.shrimpState.stage === 'shrimplet') {
      this.setScale(0.5);
    } else if (this.shrimpState.stage === 'juvenile') {
      this.setScale(0.75);
    } else {
      this.setScale(1);
    }
  }

  private applyFacing(facingRight: boolean) {
    this.shrimpState.facingRight = facingRight;
    // Pixel source art is drawn facing left, so flip when moving/facing right.
    this.setFlipX(facingRight);
  }

  update(delta: number, foodParticles: FoodParticle[]) {
    this.applyScale();
    this.stateTimer -= delta;
    this.animTimer += delta;

    // ── Animation frames ────────────────────────────────────────────────────
    if (this.animTimer >= this.ANIM_INTERVAL) {
      this.animTimer = 0;
      if (this.shrimpState.behavior === 'wander' || this.shrimpState.behavior === 'seek_food') {
        this.currentFrame = this.currentFrame === 2 ? 3 : 2;
      } else {
        this.currentFrame = this.currentFrame === 0 ? 1 : 0;
      }
      const key = ShrimpSprite.textureKey(this.shrimpState, this.currentFrame);
      if (this.scene.textures.exists(key)) {
        this.setTexture(key);
      }
    }

    // ── Force flip based on velocity direction ───────────────────────────────
    if (this.vx !== 0) {
      this.applyFacing(this.vx > 0);
    }

    // ── State machine ────────────────────────────────────────────────────────
    switch (this.shrimpState.behavior) {
      case 'idle':
        this.vx = 0;
        this.vy = 0;
        this.shrimpState.x = this.x;
        this.shrimpState.y = this.y;
        if (this.stateTimer <= 0) this.transitionState();
        break;

      case 'wander':
        this.x += this.vx * (delta / 1000);
        this.y += this.vy * (delta / 1000);
        this.clampToBounds();
        this.shrimpState.x = this.x;
        this.shrimpState.y = this.y;
        if (this.stateTimer <= 0) this.transitionState();
        break;

      case 'seek_food': {
        const nearest = this.findNearestFood(foodParticles);
        if (!nearest) { this.transitionState(); break; }
        const dx = nearest.x - this.x;
        const dy = nearest.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 8) {
          this.shrimpState.behavior = 'eat';
          this.stateTimer = 1500;
          this.vx = 0; this.vy = 0;
        } else {
          if (Math.abs(dx) > 0.1) {
            this.applyFacing(dx > 0);
          }
          const speed = SEEK_FOOD_SPEED * (delta / 1000);
          this.x += (dx / dist) * speed;
          this.y += (dy / dist) * speed;
          this.shrimpState.x = this.x;
          this.shrimpState.y = this.y;
        }
        break;
      }

      case 'eat':
        this.vx = 0;
        this.vy = 0;
        if (this.stateTimer <= 0) {
          this.shrimpState.fullness = Math.min(1, this.shrimpState.fullness + 0.3);
          this.transitionState();
        }
        break;

      case 'hide':
        this.vx = 0;
        this.vy = 0;
        this.setAlpha(0.7); // dim a little when hiding
        if (this.stateTimer <= 0) {
          this.setAlpha(1);
          this.transitionState();
        }
        break;

      case 'post_molt':
        this.vx = 0;
        this.vy = 0;
        this.setAlpha(0.5); // pale / soft shell visual
        if (this.shrimpState.postMoltWindow <= 0) {
          this.setAlpha(1);
          this.shrimpState.behavior = 'idle';
          this.stateTimer = this.rand(...IDLE_DURATION_MS);
        }
        break;

      case 'breeding_swim':
        // Males swim erratically when female molts
        const driftX = Math.sin(Date.now() * 0.01 + this.shrimpState.id.charCodeAt(0)) * 2;
        if (Math.abs(driftX) > 0.05) {
          this.applyFacing(driftX > 0);
        }
        this.x += driftX;
        this.y += Math.cos(Date.now() * 0.013 + this.shrimpState.id.charCodeAt(1)) * 2;
        this.clampToBounds();
        this.shrimpState.x = this.x;
        this.shrimpState.y = this.y;
        if (this.stateTimer <= 0) this.transitionState();
        break;
    }
  }

  private transitionState() {
    const roll = Math.random();

    // Post-molt always hides
    if (this.shrimpState.postMoltWindow > 0) {
      this.shrimpState.behavior = 'post_molt';
      this.stateTimer = 99999;
      return;
    }

    // Hungry shrimp prioritize food-seeking
    if (this.shrimpState.fullness < 0.4 && roll < 0.7) {
      this.shrimpState.behavior = 'seek_food';
      this.stateTimer = 8000;
      return;
    }

    if (roll < 0.35) {
      this.shrimpState.behavior = 'idle';
      this.stateTimer = this.rand(...IDLE_DURATION_MS);
      this.vx = 0; this.vy = 0;
    } else if (roll < 0.75) {
      this.shrimpState.behavior = 'wander';
      this.stateTimer = this.rand(...WANDER_DURATION_MS);
      const angle = Math.random() * Math.PI * 2;
      this.vx = Math.cos(angle) * WANDER_SPEED;
      this.vy = Math.sin(angle) * WANDER_SPEED * 0.4; // mostly horizontal
    } else if (roll < 0.9) {
      this.shrimpState.behavior = 'hide';
      this.stateTimer = this.rand(4000, 12000);
    } else {
      this.shrimpState.behavior = 'seek_food';
      this.stateTimer = 8000;
    }
  }

  private clampToBounds() {
    const halfW = SPRITE_SIZE * this.scaleX / 2;
    const halfH = SPRITE_SIZE * this.scaleY / 2;
    if (this.x < halfW) { this.x = halfW; this.vx = Math.abs(this.vx); }
    if (this.x > this.tankW - halfW) { this.x = this.tankW - halfW; this.vx = -Math.abs(this.vx); }
    if (this.y < halfH + 10) { this.y = halfH + 10; this.vy = Math.abs(this.vy); }
    if (this.y > this.substrateY - halfH) { this.y = this.substrateY - halfH; this.vy = -Math.abs(this.vy); }
  }

  private findNearestFood(particles: FoodParticle[]): FoodParticle | null {
    if (particles.length === 0) return null;
    let nearest: FoodParticle | null = null;
    let minDist = Infinity;
    for (const p of particles) {
      const dx = p.x - this.x;
      const dy = p.y - this.y;
      const d = dx * dx + dy * dy;
      if (d < minDist) { minDist = d; nearest = p; }
    }
    return nearest;
  }

  /** Trigger the breeding swim behavior (for males when pheromone detected) */
  startBreedingSwim() {
    this.shrimpState.behavior = 'breeding_swim';
    this.stateTimer = 6000 + Math.random() * 4000;
  }

  private rand(min: number, max: number) {
    return min + Math.random() * (max - min);
  }
}
