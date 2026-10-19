// Generative artwork for the hero and the gallery. No dependencies; everything is drawn on <canvas>.
// Each piece is deterministic for a seed, so "remix" just picks a new seed.

const TAU = Math.PI * 2;

export const PALETTES = [
  ["#ff5a3d", "#f6c945", "#f36aa0", "#7c5cff"],
  ["#4ee1a0", "#00a7c2", "#2563eb", "#f6c945"],
  ["#f36aa0", "#7c5cff", "#00a7c2", "#fff8ec"],
  ["#ff5a3d", "#fff8ec", "#f6c945", "#4ee1a0"],
  ["#7c5cff", "#4ee1a0", "#fff8ec", "#ff5a3d"],
];

/** Small seeded random number generator (mulberry32). */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 2D value noise in the range 0..1, smooth, seeded. */
export function makeNoise(rand) {
  const perm = new Uint8Array(512);
  const vals = new Float32Array(256);
  for (let i = 0; i < 256; i += 1) {
    perm[i] = i;
    vals[i] = rand();
  }
  for (let i = 255; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < 256; i += 1) perm[i + 256] = perm[i];
  const fade = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const a = vals[perm[(xi & 255) + perm[yi & 255]]];
    const b = vals[perm[((xi + 1) & 255) + perm[yi & 255]]];
    const c = vals[perm[(xi & 255) + perm[(yi + 1) & 255]]];
    const d = vals[perm[((xi + 1) & 255) + perm[(yi + 1) & 255]]];
    const u = fade(xf);
    const v = fade(yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}

/** Sizes a canvas to its CSS size (capped pixel ratio) and returns the 2D context and size. */
export function fitCanvas(canvas, maxDpr = 1.75) {
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  const w = Math.max(1, Math.round(canvas.clientWidth));
  const h = Math.max(1, Math.round(canvas.clientHeight));
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

/* ------------------------------------------------------------------ the hero: a living flow field */

export class FlowField {
  constructor(canvas, { seed = 7, count = 900, background = "10,10,12" } = {}) {
    this.canvas = canvas;
    this.count = count;
    this.background = background;
    this.pointer = { x: -9999, y: -9999, active: false };
    this.running = false;
    this.raf = 0;
    this.reseed(seed);
  }

  reseed(seed) {
    this.seed = seed;
    const rand = rng(seed);
    this.rand = rand;
    this.noise = makeNoise(rand);
    this.palette = PALETTES[Math.floor(rand() * PALETTES.length)];
    this.scale = 0.0016 + rand() * 0.0022;
    this.swirl = 1.4 + rand() * 2.4;
    this.t = rand() * 100;
    this.resize();
  }

  resize() {
    const { ctx, w, h } = fitCanvas(this.canvas);
    this.ctx = ctx;
    this.w = w;
    this.h = h;
    ctx.fillStyle = `rgb(${this.background})`;
    ctx.fillRect(0, 0, w, h);
    this.particles = Array.from({ length: this.count }, () => this.spawn());
  }

  spawn() {
    return {
      x: this.rand() * this.w,
      y: this.rand() * this.h,
      px: 0,
      py: 0,
      life: 80 + this.rand() * 220,
      color: this.palette[Math.floor(this.rand() * this.palette.length)],
    };
  }

  step() {
    const { ctx, w, h, noise, scale, swirl } = this;
    ctx.fillStyle = `rgba(${this.background},0.032)`;
    ctx.fillRect(0, 0, w, h);
    ctx.lineWidth = 1.25;
    this.t += 0.0016;
    for (const p of this.particles) {
      p.px = p.x;
      p.py = p.y;
      const n = noise(p.x * scale + this.t, p.y * scale - this.t);
      let a = n * TAU * swirl;
      let dx = Math.cos(a);
      let dy = Math.sin(a);
      if (this.pointer.active) {
        const ox = p.x - this.pointer.x;
        const oy = p.y - this.pointer.y;
        const d2 = ox * ox + oy * oy;
        if (d2 < 22000) {
          const d = Math.sqrt(d2) + 0.001;
          const f = (1 - d / 148) * 2.4;
          // swirl around the cursor and push away a little
          dx += (-oy / d) * f + (ox / d) * f * 0.5;
          dy += (ox / d) * f + (oy / d) * f * 0.5;
        }
      }
      p.x += dx * 1.5;
      p.y += dy * 1.5;
      p.life -= 1;
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = 0.78;
      ctx.beginPath();
      ctx.moveTo(p.px, p.py);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      if (p.life <= 0 || p.x < -10 || p.x > w + 10 || p.y < -10 || p.y > h + 10) Object.assign(p, this.spawn());
    }
    ctx.globalAlpha = 1;
  }

  /** Paints a finished frame without animating (used for reduced motion and tiles). */
  paintStill(steps = 260) {
    for (let i = 0; i < steps; i += 1) this.step();
  }

  loop = () => {
    if (!this.running) return;
    this.step();
    this.raf = requestAnimationFrame(this.loop);
  };

  start() {
    if (this.running) return;
    this.running = true;
    this.raf = requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }
}

/* ------------------------------------------------------------------ gallery pieces (drawn once) */

function ground(ctx, w, h, rand) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#0d0d11");
  g.addColorStop(1, rand() > 0.5 ? "#15121c" : "#101820");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function drawRings(ctx, w, h, rand, pal) {
  ground(ctx, w, h, rand);
  const noise = makeNoise(rand);
  const cx = w * (0.35 + rand() * 0.3);
  const cy = h * (0.35 + rand() * 0.3);
  const rings = 46;
  ctx.lineWidth = 1.2;
  for (let i = 0; i < rings; i += 1) {
    ctx.strokeStyle = pal[i % pal.length];
    ctx.globalAlpha = 0.25 + (i / rings) * 0.6;
    ctx.beginPath();
    for (let a = 0; a <= TAU + 0.05; a += 0.05) {
      const r = 8 + i * (Math.min(w, h) / 70) + (noise(Math.cos(a) * 1.4 + i * 0.12, Math.sin(a) * 1.4) - 0.5) * 38;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (a === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawVoxels(ctx, w, h, rand, pal) {
  ground(ctx, w, h, rand);
  const noise = makeNoise(rand);
  const s = Math.max(14, Math.min(w, h) / 11);
  const tw = s;
  const th = s * 0.5;
  const cols = Math.ceil(w / tw) + 4;
  const rows = Math.ceil(h / th) + 8;
  for (let gy = -2; gy < rows; gy += 1) {
    for (let gx = -2; gx < cols; gx += 1) {
      const n = noise(gx * 0.2, gy * 0.2);
      if (n < 0.34) continue;
      const hgt = Math.floor((n - 0.34) * 7) + 1;
      const ox = gx * tw + (gy % 2 ? tw / 2 : 0);
      const oy = gy * th * 0.5 - hgt * th * 0.8;
      const c = pal[Math.floor(n * 10) % pal.length];
      // top
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(ox + tw / 2, oy + th / 2);
      ctx.lineTo(ox, oy + th);
      ctx.lineTo(ox - tw / 2, oy + th / 2);
      ctx.closePath();
      ctx.fill();
      // left and right faces
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath();
      ctx.moveTo(ox - tw / 2, oy + th / 2);
      ctx.lineTo(ox, oy + th);
      ctx.lineTo(ox, oy + th + hgt * th * 0.8);
      ctx.lineTo(ox - tw / 2, oy + th / 2 + hgt * th * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.beginPath();
      ctx.moveTo(ox + tw / 2, oy + th / 2);
      ctx.lineTo(ox, oy + th);
      ctx.lineTo(ox, oy + th + hgt * th * 0.8);
      ctx.lineTo(ox + tw / 2, oy + th / 2 + hgt * th * 0.8);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawLissajous(ctx, w, h, rand, pal) {
  ground(ctx, w, h, rand);
  const cx = w / 2;
  const cy = h / 2;
  const ax = w * 0.42;
  const ay = h * 0.42;
  const a = 2 + Math.floor(rand() * 4);
  const b = 3 + Math.floor(rand() * 5);
  ctx.lineWidth = 1.1;
  for (let k = 0; k < 34; k += 1) {
    ctx.strokeStyle = pal[k % pal.length];
    ctx.globalAlpha = 0.18 + (k / 34) * 0.55;
    ctx.beginPath();
    const phase = k * 0.11;
    for (let t = 0; t <= TAU; t += 0.012) {
      const x = cx + Math.sin(a * t + phase) * ax;
      const y = cy + Math.sin(b * t) * ay * (1 - k * 0.012);
      if (t === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawOrbs(ctx, w, h, rand, pal) {
  ground(ctx, w, h, rand);
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 9; i += 1) {
    const x = rand() * w;
    const y = rand() * h;
    const r = (0.18 + rand() * 0.38) * Math.max(w, h);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, pal[i % pal.length] + "cc");
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.globalCompositeOperation = "source-over";
  // fine grain, like film
  for (let i = 0; i < (w * h) / 40; i += 1) {
    ctx.fillStyle = `rgba(255,255,255,${rand() * 0.07})`;
    ctx.fillRect(rand() * w, rand() * h, 1, 1);
  }
}

function drawHalftone(ctx, w, h, rand, pal) {
  ground(ctx, w, h, rand);
  const noise = makeNoise(rand);
  const step = Math.max(9, Math.min(w, h) / 24);
  for (let y = step / 2; y < h; y += step) {
    for (let x = step / 2; x < w; x += step) {
      const n = noise(x * 0.012, y * 0.012);
      const r = Math.pow(n, 1.6) * step * 0.62;
      ctx.fillStyle = pal[Math.floor(n * 8) % pal.length];
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
    }
  }
}

function drawFlowStill(ctx, w, h, rand, pal, canvas) {
  const ff = new FlowField(canvas, { seed: Math.floor(rand() * 1e9), count: 420 });
  ff.palette = pal;
  ff.paintStill(150);
}

export const ART_STYLES = [
  { name: "Flow field", draw: drawFlowStill, flow: true },
  { name: "Rings", draw: drawRings },
  { name: "Voxel terrain", draw: drawVoxels },
  { name: "Lissajous", draw: drawLissajous },
  { name: "Light leak", draw: drawOrbs },
  { name: "Halftone", draw: drawHalftone },
];

/** Draws one gallery piece into a canvas for a seed. */
export function drawPiece(canvas, styleIndex, seed) {
  const style = ART_STYLES[styleIndex % ART_STYLES.length];
  const rand = rng(seed);
  const pal = PALETTES[Math.floor(rand() * PALETTES.length)];
  if (style.flow) {
    style.draw(null, 0, 0, rand, pal, canvas);
    return;
  }
  const { ctx, w, h } = fitCanvas(canvas, 1.5);
  style.draw(ctx, w, h, rand, pal);
}
