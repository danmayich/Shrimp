// ─────────────────────────────────────────────────────────────────────────────
// Pixel Art Data — 32×32 Shrimp Sprites (programmatic canvas definition)
//
// Each variant has a "frames" array. Each frame is a 32×32 grid of color indices.
// 0 = transparent, other numbers index into the variant's palette array.
//
// Coordinate system: [row][col], row 0 = top.
// The shrimp faces RIGHT by default. Phaser flips X for leftward facing.
//
// Body region legend (for documentation):
//   A = antennae                E = eyes
//   H = head/rostrum            D = dorsal (back stripe)
//   T = thorax                  B = abdomen segments
//   L = legs/pleopods           F = fan tail
//   P = pattern/overlay         S = secondary/pattern color
//   G = eggs under abdomen (berried female frame only)
// ─────────────────────────────────────────────────────────────────────────────

export interface SpriteFrame {
  /** 32 rows × 32 cols of palette indices. 0 = transparent. */
  pixels: number[][];
}

export interface VariantSprite {
  /** RGBA hex colors indexed by palette number (index 0 is unused / transparent) */
  palette: string[];
  /** frames[0]=idle-A  frames[1]=idle-B  frames[2]=walk-A  frames[3]=walk-B  frames[4]=berried-female */
  frames: SpriteFrame[];
}

// ─── Shared shrimp body silhouette helper ────────────────────────────────────
// We build each frame from a base template and swap color indices per variant.
// Index key:
//  1 = primary body color
//  2 = secondary / pattern color (white bands, rili clear, pinto splash)
//  3 = eye color (usually orange or dark red)
//  4 = leg/antenna accent (slightly lighter primary)
//  5 = dark dorsal stripe (slightly darker primary)
//  6 = egg/berry color (berried frame only — bright orange)

// ── Shared 32×32 base silhouette (color indices, 0=transparent) ──────────────
// The shrimp is drawn at rows 8–26 in the 32-row grid (8 rows padding top/bottom).
// Facing RIGHT. Body ~18px wide, ~7px tall.

function makeIdleA(p: number, s: number, e: number, l: number, d: number): SpriteFrame {
  const _ = 0;
  // Rows 0-7: antennae + empty
  // Row 8: long thin antennae extend left
  // Rows 9-12: head/thorax
  // Rows 13-20: abdomen segments
  // Rows 21-25: tail fan
  // Rows 26-31: empty

  /* eslint-disable prettier/prettier */
  const pixels: number[][] = [
    [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_], // 0
    [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_], // 1
    [_,_,_,_,_,_,_,_,_,l,_,l,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_], // 2 antennae dots
    [_,_,_,_,_,_,_,_,l,_,l,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_], // 3
    [_,_,_,_,_,_,_,l,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_], // 4
    [_,_,_,_,_,_,l,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_], // 5
    [_,_,_,_,_,l,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_], // 6
    [_,_,_,_,l,l,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_], // 7
    [_,_,_,_,_,p,p,p,p,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_], // 8 rostrum
    [_,_,_,_,p,p,p,p,p,p,p,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_], // 9 head
    [_,_,_,p,p,e,p,p,p,p,p,p,d,d,d,d,d,p,p,p,_,_,_,_,_,_,_,_,_,_,_,_], //10 eye + dorsal start
    [_,_,_,p,p,p,p,p,p,p,p,p,p,p,p,p,p,p,p,p,p,_,_,_,_,_,_,_,_,_,_,_], //11 thorax
    [_,_,_,_,l,l,p,p,p,p,p,p,p,p,p,p,p,p,p,p,p,p,_,_,_,_,_,_,_,_,_,_], //12 legs row 1
    [_,_,_,_,l,_,l,p,p,p,p,p,p,p,p,p,p,p,p,p,p,p,p,_,_,_,_,_,_,_,_,_], //13 abdomen 1
    [_,_,_,_,_,l,_,l,p,p,p,p,p,p,p,p,p,p,p,p,p,p,p,p,_,_,_,_,_,_,_,_], //14 abdomen 2
    [_,_,_,_,_,_,l,_,l,p,p,p,p,p,p,p,p,p,p,p,p,p,p,p,p,_,_,_,_,_,_,_], //15 abdomen 3
    [_,_,_,_,_,_,_,l,_,l,p,p,p,p,p,p,p,p,p,p,p,p,p,p,p,p,_,_,_,_,_,_], //16 abdomen 4
    [_,_,_,_,_,_,_,_,l,_,l,p,p,p,p,p,p,p,p,p,p,p,p,p,p,p,p,_,_,_,_,_], //17 abdomen 5
    [_,_,_,_,_,_,_,_,_,l,_,p,p,p,p,p,p,p,p,p,p,p,p,p,p,p,p,p,_,_,_,_], //18 abdomen 6
    [_,_,_,_,_,_,_,_,_,_,_,_,p,p,p,p,p,p,p,p,p,p,p,p,p,s,s,s,s,_,_,_], //19 tail base + fan
    [_,_,_,_,_,_,_,_,_,_,_,_,_,_,p,p,p,p,p,p,p,p,p,s,s,_,_,s,s,s,_,_], //20 tail fan spread
    [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,p,p,p,p,p,s,s,_,_,_,_,_,s,s,s,_], //21 tail tips
    [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,s,_,_,_,_,_,_,_,_,s,s,_], //22
    [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_], //23
    [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_], //24
    [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_], //25
    [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_], //26
    [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_], //27
    [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_], //28
    [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_], //29
    [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_], //30
    [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_], //31
  ];
  /* eslint-enable prettier/prettier */
  return { pixels };
}

/** Idle-B frame: legs slightly shifted down-right for a subtle sway */
function makeIdleB(p: number, s: number, e: number, l: number, d: number): SpriteFrame {
  const base = makeIdleA(p, s, e, l, d).pixels.map(row => [...row]);
  // Shift antennae slightly
  for (let r = 2; r <= 7; r++) {
    base[r] = base[r].map((_v, c) => (c > 0 ? base[r][c - 1] : 0));
  }
  return { pixels: base };
}

/** Walk-A: legs spread forward */
function makeWalkA(p: number, s: number, e: number, l: number, d: number): SpriteFrame {
  const base = makeIdleA(p, s, e, l, d).pixels.map(row => [...row]);
  // Shift body row 12 legs outward
  [12, 14, 16, 18].forEach(r => {
    base[r] = base[r].map((_v, c) => (c > 1 ? base[r][c - 1] : 0));
  });
  return { pixels: base };
}

/** Walk-B: legs swept back */
function makeWalkB(p: number, s: number, e: number, l: number, d: number): SpriteFrame {
  const base = makeIdleA(p, s, e, l, d).pixels.map(row => [...row]);
  [13, 15, 17].forEach(r => {
    base[r] = base[r].map((_v, c) => (c < 31 ? base[r][c + 1] : 0));
  });
  return { pixels: base };
}

/** Berried frame: add egg cluster under abdomen (rows 15–19, cols 8–22) */
function makeBerried(p: number, s: number, e: number, l: number, d: number): SpriteFrame {
  const base = makeIdleA(p, s, e, l, d).pixels.map(row => [...row]);
  const eggColor = 6;
  // Scatter egg pixels beneath abdomen
  const eggPositions = [
    [14,10],[14,12],[14,14],[14,16],[14,18],
    [15,11],[15,13],[15,15],[15,17],[15,19],
    [16,12],[16,14],[16,16],[16,18],[16,20],
    [17,13],[17,15],[17,17],[17,19],[17,21],
  ];
  eggPositions.forEach(([r, c]) => {
    if (base[r][c] > 0) base[r][c] = eggColor;
  });
  return { pixels: base };
}

// ── Banded pattern overlay (Crystal Red / Crystal Black / Blue Bolt) ──────────
function applyBandedPattern(base: SpriteFrame, primaryIdx: number, secondaryIdx: number): SpriteFrame {
  const pixels = base.pixels.map(row => [...row]);
  // White bands at approximate thirds of body length (columns 8, 14, 20)
  for (let r = 9; r <= 21; r++) {
    for (const c of [8, 9, 14, 15, 20, 21]) {
      if (pixels[r][c] === primaryIdx) pixels[r][c] = secondaryIdx;
    }
  }
  return { pixels };
}

/** Apply the rili pattern: clear (transparent) mid-section on the body */
function applyRiliPattern(base: SpriteFrame, primaryIdx: number): SpriteFrame {
  const pixels = base.pixels.map(row => [...row]);
  // Transparent midsection: columns 10–19, abdomen rows 12–17
  for (let r = 12; r <= 17; r++) {
    for (let c = 10; c <= 19; c++) {
      if (pixels[r][c] === primaryIdx) pixels[r][c] = 0;
    }
  }
  return { pixels };
}

/** Apply pinto pattern: random white splotches */
function applyPintoPattern(base: SpriteFrame, primaryIdx: number, secondaryIdx: number): SpriteFrame {
  const pixels = base.pixels.map(row => [...row]);
  const splotches = [
    [10,13],[10,14],[11,13],[11,14],[11,15],
    [13,18],[13,19],[14,18],[14,19],
    [16,10],[16,11],[17,10],
    [18,22],[18,23],[19,22],
  ];
  splotches.forEach(([r, c]) => {
    if (pixels[r][c] === primaryIdx) pixels[r][c] = secondaryIdx;
  });
  return { pixels };
}

/** Apply tiger stripe pattern */
function applyStripedPattern(base: SpriteFrame, primaryIdx: number, secondaryIdx: number): SpriteFrame {
  const pixels = base.pixels.map(row => [...row]);
  // Dark vertical stripes along the body
  for (let r = 9; r <= 20; r++) {
    for (const c of [11, 15, 19, 23]) {
      if (pixels[r][c] === primaryIdx) pixels[r][c] = secondaryIdx;
    }
  }
  return { pixels };
}



// ── Build all variant sprites ─────────────────────────────────────────────────

function buildSolidVariant(
  primary: string,
  tailColor: string,
  eyeColor: string,
  legColor: string,
  darkDorsal: string,
  eggColor: string,
): VariantSprite {
  const P=1, S=2, E=3, L=4, D=5, G=6;
  return {
    palette: ['transparent', primary, tailColor, eyeColor, legColor, darkDorsal, eggColor],
    frames: [
      makeIdleA(P,S,E,L,D),
      makeIdleB(P,S,E,L,D),
      makeWalkA(P,S,E,L,D),
      makeWalkB(P,S,E,L,D),
      makeBerried(P,S,E,L,D),
    ],
  };
}

function buildBandedVariant(
  primary: string,
  band: string,
  eyeColor: string,
  legColor: string,
  eggColor: string,
): VariantSprite {
  const P=1, S=2, E=3, L=4, D=5, G=6;
  const base_idle_a = makeIdleA(P,S,E,L,D);
  return {
    palette: ['transparent', primary, band, eyeColor, legColor, primary, eggColor],
    frames: [
      applyBandedPattern(base_idle_a, P, S),
      applyBandedPattern(makeIdleB(P,S,E,L,D), P, S),
      applyBandedPattern(makeWalkA(P,S,E,L,D), P, S),
      applyBandedPattern(makeWalkB(P,S,E,L,D), P, S),
      applyBandedPattern(makeBerried(P,S,E,L,G), P, S),
    ],
  };
}

export const VARIANT_SPRITES: Record<string, VariantSprite> = {
  red_cherry: buildSolidVariant('#e8241a','#c01010','#ff8800','#f06060','#990d0d','#ff6600'),
  fire_red:   buildSolidVariant('#cc0000','#990000','#ff8800','#e04040','#7a0000','#ff6600'),
  yellow_neo: buildSolidVariant('#f5c518','#d4a010','#cc6600','#ffd050','#b08000','#ff8800'),
  orange_pumpkin: buildSolidVariant('#f07800','#c05500','#cc4400','#f09040','#994400','#ff6600'),
  blue_dream: buildSolidVariant('#1a6bb5','#1050a0','#ffffff','#4090cc','#0d3a6e','#ffaa00'),
  black_rose: buildSolidVariant('#1a1a1a','#0d0d0d','#ff4400','#444444','#000000','#ff6600'),
  snowball:   buildSolidVariant('#f0eeee','#dddcdc','#ff4400','#ffffff','#c0bebe','#ffeeee'),
  chocolate_neo: buildSolidVariant('#5c3317','#3d2010','#ff5500','#8c5530','#2e1908','#ff6600'),
  green_jade: buildSolidVariant('#3a7a3a','#2a5a2a','#ffaa00','#50aa50','#1d3d1d','#ffaa00'),
  red_rili:   (() => {
    const P=1, S=2, E=3, L=4, D=5, G=6;
    const base = buildSolidVariant('#dd2211','#aa1100','#ff8800','#ee5555','#880808','#ff6600');
    return {
      ...base,
      palette: ['transparent','#dd2211','#dddddd','#ff8800','#ee5555','#880808','#ff6600'],
      frames: base.frames.map(f => applyRiliPattern(f, P)),
    };
  })(),
  crystal_red:   buildBandedVariant('#d41010','#ffffff','#ff8800','#ff5555','#ff8800'),
  crystal_black: buildBandedVariant('#111111','#ffffff','#ff2200','#555555','#ff8800'),
  blue_bolt:     buildBandedVariant('#1a4fd1','#ffffff','#ff8800','#5588ee','#ff8800'),
  galaxy_pinto:  (() => {
    const P=1, S=2, E=3, L=4, D=5, G=6;
    const base = buildBandedVariant('#1a1a2e','#ffffff','#ff4400','#555588','#ff8800');
    return {
      ...base,
      frames: base.frames.map(f => applyPintoPattern(f, P, S)),
    };
  })(),
  tiger_orange_eye: (() => {
    const P=1, S=2, E=3, L=4, D=5, G=6;
    const base = buildSolidVariant('#1a2d5a','#0d1e40','#e87a00','#334488','#0a1530','#ffaa00');
    return {
      ...base,
      palette: ['transparent','#1a2d5a','#333333','#e87a00','#334488','#0a1530','#ffaa00'],
      frames: base.frames.map(f => applyStripedPattern(f, P, S)),
    };
  })(),
};

export type FrameIndex = 0 | 1 | 2 | 3 | 4;
export const FRAME_IDLE_A: FrameIndex = 0;
export const FRAME_IDLE_B: FrameIndex = 1;
export const FRAME_WALK_A: FrameIndex = 2;
export const FRAME_WALK_B: FrameIndex = 3;
export const FRAME_BERRIED: FrameIndex = 4;
