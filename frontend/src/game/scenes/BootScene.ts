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
    const sizes = [5, 10, 20, 40];
    const dims: Record<number, [number, number]> = {
      5:  [480, 260],
      10: [640, 320],
      20: [800, 380],
      40: [960, 440],
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
}
