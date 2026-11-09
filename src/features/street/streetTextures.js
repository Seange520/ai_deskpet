import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';

// Procedural, dependency-free surface textures for the Forge Street block.
// They are intentionally low-frequency and near-white so material colour still
// drives the palette; detail comes through map * colour and the bump channel.
const TILE = 256;
const cache = new Map();

function paint(kind) {
  const canvas = document.createElement('canvas');
  canvas.width = TILE;
  canvas.height = TILE;
  const ctx = canvas.getContext('2d');
  const rnd = mulberry(kind.length * 977 + 13);

  if (kind === 'brick') {
    ctx.fillStyle = '#cfc8bb';
    ctx.fillRect(0, 0, TILE, TILE);
    const rowH = 32;
    const brickW = 62;
    for (let row = 0; row < TILE / rowH; row++) {
      const y = row * rowH;
      const offset = row % 2 ? brickW / 2 : 0;
      for (let x = -brickW; x < TILE + brickW; x += brickW) {
        const jitter = Math.floor(rnd() * 10) - 5;
        const v = 232 + jitter;
        ctx.fillStyle = `rgb(${v},${v - 4},${v - 12})`;
        ctx.fillRect(x + offset + 2, y + 2, brickW - 4, rowH - 4);
        ctx.fillStyle = 'rgba(110,104,96,0.08)';
        ctx.fillRect(x + offset + 2, y + rowH - 6, brickW - 4, 3);
      }
    }
  } else if (kind === 'concrete') {
    ctx.fillStyle = '#e9e6df';
    ctx.fillRect(0, 0, TILE, TILE);
    for (let i = 0; i < 900; i++) {
      const v = 208 + Math.floor(rnd() * 40);
      ctx.fillStyle = `rgba(${v},${v},${v - 6},${0.05 + rnd() * 0.12})`;
      const s = 1 + rnd() * 5;
      ctx.fillRect(rnd() * TILE, rnd() * TILE, s, s);
    }
    ctx.strokeStyle = 'rgba(120,120,120,0.08)';
    ctx.lineWidth = 1;
    for (let y = 42; y < TILE; y += 72) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(TILE, y + (rnd() - 0.5) * 2);
      ctx.stroke();
    }
  } else if (kind === 'ribbed') {
    for (let y = 0; y < TILE; y += 8) {
      const bright = y % 16 === 0 ? 240 : 206;
      ctx.fillStyle = `rgb(${bright},${bright},${bright})`;
      ctx.fillRect(0, y, TILE, 8);
      ctx.fillStyle = 'rgba(60,60,60,0.16)';
      ctx.fillRect(0, y + 6, TILE, 2);
    }
    ctx.fillStyle = 'rgba(70,70,70,0.10)';
    ctx.fillRect(0, 0, 3, TILE);
    ctx.fillRect(125, 0, 3, TILE);
    for (let i = 0; i < 22; i++) {
      ctx.fillStyle = `rgba(140,132,118,${0.05 + rnd() * 0.08})`;
      ctx.beginPath();
      ctx.arc(rnd() * TILE, rnd() * TILE, 2 + rnd() * 9, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'wood') {
    ctx.fillStyle = '#e3d3b8';
    ctx.fillRect(0, 0, TILE, TILE);
    for (let x = 0; x < TILE; x += 4) {
      const v = 196 + Math.floor(rnd() * 34);
      ctx.fillStyle = `rgba(${v},${v - 22},${v - 58},0.24)`;
      ctx.fillRect(x, 0, 2 + rnd() * 2, TILE);
    }
    ctx.strokeStyle = 'rgba(96,74,48,0.30)';
    ctx.lineWidth = 2;
    for (let y = 0; y < TILE; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(TILE, y);
      ctx.stroke();
    }
  } else {
    // canvas / tarp
    ctx.fillStyle = '#e7e0d4';
    ctx.fillRect(0, 0, TILE, TILE);
    ctx.strokeStyle = 'rgba(150,140,124,0.16)';
    ctx.lineWidth = 1;
    for (let i = 0; i < TILE; i += 6) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, TILE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(TILE, i);
      ctx.stroke();
    }
  }
  return canvas;
}

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function surfaceTexture(kind) {
  if (cache.has(kind)) return cache.get(kind);
  const texture = new CanvasTexture(paint(kind));
  texture.name = `street-surface-${kind}`;
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.anisotropy = 4;
  cache.set(kind, texture);
  return texture;
}
