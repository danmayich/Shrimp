import Phaser from 'phaser';
import { VARIANT_SPRITES } from '../data/pixelArtData';
import { SPRITE_SIZE } from '../data/gameConfig';

/**
 * BootScene
 * Responsible for generating all shrimp sprite textures from pixel art data
 * before the main game scene starts.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Generate a simple progress bar while we build textures
    const { width, height } = this.scale;
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 20, 320, 40);

    const progressBar = this.add.graphics();
    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0x4aadff, 1);
      progressBar.fillRect(width / 2 - 155, height / 2 - 15, 310 * value, 30);
    });
  }

  create() {
    this.generateAllTextures();
    this.generateTankTextures();
    this.generatePlantTextures();
    this.generateEquipmentTextures();
    this.generateParticleTextures();
    this.scene.start('TankScene');
  }

  /** Convert palette-indexed pixel array to a Phaser texture */
  private generateAllTextures() {
    const variantIds = Object.keys(VARIANT_SPRITES);

    variantIds.forEach(variantId => {
      const sprite = VARIANT_SPRITES[variantId];
      sprite.frames.forEach((frame, frameIndex) => {
        const key = `shrimp_${variantId}_${frameIndex}`;
        if (this.textures.exists(key)) return;

        const canvas = document.createElement('canvas');
        canvas.width = SPRITE_SIZE;
        canvas.height = SPRITE_SIZE;
        const ctx = canvas.getContext('2d')!;

        for (let row = 0; row < SPRITE_SIZE; row++) {
          for (let col = 0; col < SPRITE_SIZE; col++) {
            const idx = frame.pixels[row]?.[col] ?? 0;
            if (idx === 0) continue;
            const color = sprite.palette[idx];
            ctx.fillStyle = color;
            ctx.fillRect(col, row, 1, 1);
          }
        }

        this.textures.addCanvas(key, canvas);
      });

      // Also generate a 16×16 juvenile version of idle-A by scaling down
      const juvenileKey = `shrimp_${variantId}_juvenile`;
      if (!this.textures.exists(juvenileKey)) {
        const jCanvas = document.createElement('canvas');
        jCanvas.width = 16;
        jCanvas.height = 16;
        const jCtx = jCanvas.getContext('2d')!;

        const frame = sprite.frames[0];
        // Draw every other pixel at half scale
        for (let row = 0; row < SPRITE_SIZE; row += 2) {
          for (let col = 0; col < SPRITE_SIZE; col += 2) {
            const idx = frame.pixels[row]?.[col] ?? 0;
            if (idx === 0) continue;
            jCtx.fillStyle = sprite.palette[idx];
            jCtx.fillRect(col / 2, row / 2, 1, 1);
          }
        }
        this.textures.addCanvas(juvenileKey, jCanvas);
      }
    });
  }

  /** Generate tank background, substrate, water overlay, and glass glare textures */
  private generateTankTextures() {
    const sizes = [5, 10, 20, 40, 55, 60, 75, 125, 200];
    const dims: Record<number, [number, number]> = {
      5:  [480, 260],
      10: [640, 320],
      20: [800, 380],
      40: [960, 440],
      55: [1024, 460],
      60: [1120, 430],
      75: [1200, 500],
      125: [1440, 560],
      200: [1680, 620],
    };

    sizes.forEach(gal => {
      const [w, h] = dims[gal];

      // ── Background gradient (water column) ──────────────────────────────────
      if (!this.textures.exists(`tank_bg_${gal}`)) {
        const bg = document.createElement('canvas');
        bg.width = w;
        bg.height = h;
        const ctx = bg.getContext('2d')!;
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#0a1a2e');
        grad.addColorStop(0.6, '#0d2a42');
        grad.addColorStop(1, '#0a1e30');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        this.textures.addCanvas(`tank_bg_${gal}`, bg);
      }

      // ── Substrate (bottom strip) ─────────────────────────────────────────────
      const subH = Math.floor(h * 0.15);
      if (!this.textures.exists(`substrate_${gal}_inert`)) {
        const sub = document.createElement('canvas');
        sub.width = w;
        sub.height = subH;
        const ctx = sub.getContext('2d')!;
        // Gravel look: random pebble-colored rectangles
        const colors = ['#8a7560', '#6e5f4a', '#a08870', '#5c4e38', '#b09078'];
        for (let i = 0; i < w * 3; i++) {
          ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
          const x = Math.floor(Math.random() * w);
          const y = Math.floor(Math.random() * subH);
          ctx.fillRect(x, y, 3 + Math.floor(Math.random() * 4), 2 + Math.floor(Math.random() * 3));
        }
        this.textures.addCanvas(`substrate_${gal}_inert`, sub);
      }

      if (!this.textures.exists(`substrate_${gal}_active`)) {
        const sub = document.createElement('canvas');
        sub.width = w;
        sub.height = subH;
        const ctx = sub.getContext('2d')!;
        // Dark soil look
        const colors = ['#2a1a0e', '#3d2810', '#1e1208', '#4a3218', '#241608'];
        for (let i = 0; i < w * 3; i++) {
          ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
          const x = Math.floor(Math.random() * w);
          const y = Math.floor(Math.random() * subH);
          ctx.fillRect(x, y, 2 + Math.floor(Math.random() * 3), 2 + Math.floor(Math.random() * 2));
        }
        this.textures.addCanvas(`substrate_${gal}_active`, sub);
      }

      // ── Glass glare overlay (thin highlight along top + left edge) ───────────
      if (!this.textures.exists(`glass_glare_${gal}`)) {
        const gl = document.createElement('canvas');
        gl.width = w;
        gl.height = h;
        const ctx = gl.getContext('2d')!;
        ctx.fillStyle = 'rgba(200,230,255,0.07)';
        ctx.fillRect(0, 0, w, 4);
        ctx.fillRect(0, 0, 3, h);
        ctx.fillStyle = 'rgba(200,230,255,0.03)';
        ctx.fillRect(w - 3, 0, 3, h);
        this.textures.addCanvas(`glass_glare_${gal}`, gl);
      }
    });

    // ── Food pellet ──────────────────────────────────────────────────────────
    if (!this.textures.exists('food_pellet')) {
      const fp = document.createElement('canvas');
      fp.width = 6;
      fp.height = 6;
      const ctx = fp.getContext('2d')!;
      ctx.fillStyle = '#c8901a';
      ctx.beginPath();
      ctx.arc(3, 3, 3, 0, Math.PI * 2);
      ctx.fill();
      this.textures.addCanvas('food_pellet', fp);
    }

    // ── Veggie slice ─────────────────────────────────────────────────────────
    if (!this.textures.exists('food_veggie')) {
      const fv = document.createElement('canvas');
      fv.width = 10;
      fv.height = 8;
      const ctx = fv.getContext('2d')!;
      ctx.fillStyle = '#5aaa22';
      ctx.beginPath();
      ctx.ellipse(5, 4, 5, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      this.textures.addCanvas('food_veggie', fv);
    }
  }

  private generateParticleTextures() {
    // Bubble particle
    if (!this.textures.exists('bubble')) {
      const b = document.createElement('canvas');
      b.width = 6;
      b.height = 6;
      const ctx = b.getContext('2d')!;
      ctx.strokeStyle = 'rgba(180,220,255,0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(3, 3, 2, 0, Math.PI * 2);
      ctx.stroke();
      this.textures.addCanvas('bubble', b);
    }
  }

  private generatePlantTextures() {
    // Java moss clump (pixel-ish organic tuft)
    if (!this.textures.exists('plant_java_moss')) {
      const c = document.createElement('canvas');
      c.width = 22;
      c.height = 16;
      const ctx = c.getContext('2d')!;

      const dark = '#1f6b33';
      const mid = '#2f8a3e';
      const light = '#4eb35d';

      const dots: Array<[number, number, string]> = [
        [4, 12, dark], [6, 11, mid], [8, 12, dark], [10, 10, mid], [12, 12, dark], [14, 11, mid], [16, 12, dark],
        [5, 9, mid], [7, 8, light], [9, 7, mid], [11, 8, light], [13, 7, mid], [15, 9, light],
        [6, 6, light], [8, 5, mid], [10, 4, light], [12, 5, mid], [14, 6, light],
      ];
      dots.forEach(([x, y, color]) => {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 2, 2);
      });

      this.textures.addCanvas('plant_java_moss', c);
    }

    // Anubias leaf cluster (broad leaves + short stem)
    if (!this.textures.exists('plant_anubias')) {
      const c = document.createElement('canvas');
      c.width = 22;
      c.height = 20;
      const ctx = c.getContext('2d')!;

      ctx.fillStyle = '#5d4324';
      ctx.fillRect(10, 12, 2, 8);

      const leaves: Array<[number, number, number, number, string]> = [
        [6, 4, 6, 10, '#2d7d3f'],
        [10, 2, 6, 11, '#37944a'],
        [13, 5, 5, 9, '#2f8845'],
      ];
      leaves.forEach(([x, y, w, h, color]) => {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, h);
      });

      // Leaf highlights
      ctx.fillStyle = 'rgba(174,255,188,0.45)';
      ctx.fillRect(8, 6, 1, 6);
      ctx.fillRect(12, 5, 1, 6);
      ctx.fillRect(15, 7, 1, 5);

      this.textures.addCanvas('plant_anubias', c);
    }
  }

  private generateEquipmentTextures() {
    if (!this.textures.exists('filter_sponge_small')) {
      const c = document.createElement('canvas');
      c.width = 24;
      c.height = 36;
      const ctx = c.getContext('2d')!;

      // Base and sponge body
      ctx.fillStyle = '#2c2c2e';
      ctx.fillRect(8, 32, 8, 3);
      ctx.fillStyle = '#303236';
      ctx.fillRect(6, 19, 12, 13);

      // Sponge pores for texture
      ctx.fillStyle = '#1f2022';
      for (let y = 21; y < 31; y += 2) {
        for (let x = 7; x < 17; x += 3) {
          ctx.fillRect(x, y, 1, 1);
        }
      }

      // Lift tube and outlet
      ctx.fillStyle = '#7f858d';
      ctx.fillRect(11, 4, 2, 15);
      ctx.fillStyle = '#969da6';
      ctx.fillRect(9, 2, 6, 3);

      this.textures.addCanvas('filter_sponge_small', c);
    }

    if (!this.textures.exists('filter_sponge_large')) {
      const c = document.createElement('canvas');
      c.width = 34;
      c.height = 38;
      const ctx = c.getContext('2d')!;

      // Base and twin sponge blocks
      ctx.fillStyle = '#2b2b2d';
      ctx.fillRect(10, 33, 14, 3);
      ctx.fillStyle = '#2f3136';
      ctx.fillRect(5, 20, 10, 13);
      ctx.fillRect(19, 20, 10, 13);

      // Sponge pores
      ctx.fillStyle = '#1f2022';
      for (let y = 22; y < 32; y += 2) {
        for (let x = 6; x < 28; x += 3) {
          if (x === 16 || x === 17) continue;
          ctx.fillRect(x, y, 1, 1);
        }
      }

      // Center riser tube and outlet cap
      ctx.fillStyle = '#818893';
      ctx.fillRect(16, 5, 2, 15);
      ctx.fillStyle = '#9aa1ab';
      ctx.fillRect(13, 3, 8, 3);

      this.textures.addCanvas('filter_sponge_large', c);
    }

    if (!this.textures.exists('filter_hob')) {
      const c = document.createElement('canvas');
      c.width = 34;
      c.height = 28;
      const ctx = c.getContext('2d')!;

      ctx.fillStyle = '#2e343a';
      ctx.fillRect(7, 4, 20, 14);
      ctx.fillRect(5, 3, 24, 3);

      ctx.fillStyle = '#4b535b';
      ctx.fillRect(9, 7, 16, 8);

      ctx.fillStyle = '#9aa3ad';
      ctx.fillRect(20, 14, 3, 8);
      ctx.fillRect(11, 17, 2, 7);

      ctx.fillStyle = '#1f252a';
      ctx.fillRect(8, 6, 1, 10);
      ctx.fillRect(25, 6, 1, 10);

      ctx.fillStyle = '#77d8ff';
      ctx.fillRect(21, 20, 2, 4);

      this.textures.addCanvas('filter_hob', c);
    }
  }
}
