import type { PhotoStyle, RatioKey } from '@/types';

export const RATIO: Record<RatioKey, [number, number]> = {
  '3:4': [3, 4],
  '4:5': [4, 5],
  '1:1': [1, 1],
};

const OUT_WIDTH = 1200;
const THUMB_WIDTH = 360;
const DUP_DISTANCE = 6;
export const DARK_LIMIT = 60;
export const BLUR_LIMIT = 15;

export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('encode failed'))), type, quality);
  });
}

const lum = (d: Uint8ClampedArray, i: number) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];

export function analyze(bmp: ImageBitmap) {
  const hctx = createCanvas(9, 8).getContext('2d', { willReadFrequently: true })!;
  hctx.drawImage(bmp, 0, 0, 9, 8);
  const hp = hctx.getImageData(0, 0, 9, 8).data;
  let hash = '';
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const i = (y * 9 + x) * 4;
      hash += lum(hp, i) > lum(hp, i + 4) ? '1' : '0';
    }
  }

  const size = 128;
  const ctx = createCanvas(size, size).getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(bmp, 0, 0, size, size);
  const px = ctx.getImageData(0, 0, size, size).data;
  const g = new Float32Array(size * size);
  let total = 0;
  for (let i = 0; i < g.length; i++) {
    g[i] = lum(px, i * 4);
    total += g[i];
  }
  let sum = 0;
  let sq = 0;
  let n = 0;
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      const c = y * size + x;
      const lap = 4 * g[c] - g[c - 1] - g[c + 1] - g[c - size] - g[c + size];
      sum += lap;
      sq += lap * lap;
      n++;
    }
  }
  const mean = sum / n;
  return { hash, brightness: total / g.length, sharpness: sq / n - mean * mean };
}

export function hashDistance(a: string, b: string): number {
  let diff = 0;
  for (let k = 0; k < a.length; k++) if (a[k] !== b[k]) diff++;
  return diff;
}

export function duplicateMap(
  list: { id: string; nurseryId: string; hash: string; addedAt: string }[],
): Map<string, string> {
  const result = new Map<string, string>();
  const sorted = [...list].sort((a, b) => a.addedAt.localeCompare(b.addedAt));
  sorted.forEach((a, i) => {
    for (let j = 0; j < i; j++) {
      const b = sorted[j];
      if (a.nurseryId !== b.nurseryId) continue;
      if (hashDistance(a.hash, b.hash) <= DUP_DISTANCE) {
        result.set(a.id, b.id);
        break;
      }
    }
  });
  return result;
}

export async function makeThumb(bmp: ImageBitmap): Promise<Blob> {
  const s = Math.min(1, THUMB_WIDTH / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * s);
  const h = Math.round(bmp.height * s);
  const c = createCanvas(w, h);
  c.getContext('2d')!.drawImage(bmp, 0, 0, w, h);
  return toBlob(c, 'image/jpeg', 0.8);
}

export interface Crop {
  zoom: number;
  offsetX: number;
  offsetY: number;
  brightness: number;
  contrast: number;
  saturation: number;
  shadows: number;
  highlights: number;
}

export const DEFAULT_STYLE: PhotoStyle = {
  exposure: 0,
  brightness: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  temperature: 0,
  tint: 0,
  vibrance: 0,
  saturation: 0,
  sharpness: 0,
};

const clamp8 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

function applyStyleToPixels(d: Uint8ClampedArray, s: PhotoStyle): void {
  const n = d.length;
  const hasLum = s.exposure || s.brightness || s.contrast || s.highlights || s.shadows || s.whites || s.blacks || s.temperature || s.tint || s.vibrance || s.saturation;
  if (!hasLum) return;
  const expF = Math.pow(2, s.exposure / 100);
  const brightF = 1 + s.brightness / 100;
  const conF = 1 + s.contrast / 100;
  const tempR = s.temperature / 100;
  const tempB = -s.temperature / 100;
  const tintG = -s.tint / 100;
  const vibF = 1 + s.vibrance / 100;
  const satF = 1 + s.saturation / 100;
  for (let i = 0; i < n; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2];
    r *= expF; g *= expF; b *= expF;
    r *= brightF; g *= brightF; b *= brightF;
    let l = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const c = conF;
    r = (r / 255 - 0.5) * c + 0.5; g = (g / 255 - 0.5) * c + 0.5; b = (b / 255 - 0.5) * c + 0.5;
    r *= 255; g *= 255; b *= 255;
    l = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    if (s.highlights) {
      const hW = l * l;
      const f = 1 + (s.highlights / 100) * hW;
      r *= f; g *= f; b *= f;
    }
    if (s.shadows) {
      const sW = (1 - l) * (1 - l);
      const f = 1 + (s.shadows / 100) * sW;
      r *= f; g *= f; b *= f;
    }
    if (s.whites) {
      const wW = Math.max(0, (l - 0.5) * 2);
      const f = 1 + (s.whites / 100) * wW;
      r *= f; g *= f; b *= f;
    }
    if (s.blacks) {
      const bW = Math.max(0, (0.5 - l) * 2);
      const f = 1 + (s.blacks / 100) * bW;
      r *= f; g *= f; b *= f;
    }
    if (s.temperature) {
      r *= 1 + tempR; b *= 1 + tempB;
    }
    if (s.tint) {
      g *= 1 + tintG;
    }
    if (s.vibrance) {
      const mx = Math.max(r, g, b);
      const mn = Math.min(r, g, b);
      const sat = (mx - mn) / 255;
      const v = vibF + (1 - sat) * (s.vibrance / 100);
      const avg = (r + g + b) / 3;
      r = avg + (r - avg) * v; g = avg + (g - avg) * v; b = avg + (b - avg) * v;
    }
    if (s.saturation) {
      const avg = (r + g + b) / 3;
      r = avg + (r - avg) * satF; g = avg + (g - avg) * satF; b = avg + (b - avg) * satF;
    }
    d[i] = clamp8(r); d[i + 1] = clamp8(g); d[i + 2] = clamp8(b);
  }
}

function applySharpness(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number): void {
  if (!amount) return;
  const src = ctx.getImageData(0, 0, w, h);
  const dst = ctx.createImageData(w, h);
  const s = src.data;
  const o = dst.data;
  const k = amount / 100;
  const c = 1 + 4 * k;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      for (let ch = 0; ch < 3; ch++) {
        const i = idx + ch;
        if (x === 0 || x === w - 1 || y === 0 || y === h - 1) { o[i] = s[i]; continue; }
        const v = s[i] * c
          - k * s[i - 4] - k * s[i + 4]
          - k * s[i - w * 4] - k * s[i + w * 4];
        o[i] = clamp8(v);
      }
      o[idx + 3] = s[idx + 3];
    }
  }
  ctx.putImageData(dst, 0, 0);
}

export function applyStyle(canvas: HTMLCanvasElement, style: PhotoStyle): void {
  const ctx = canvas.getContext('2d')!;
  const { width: w, height: h } = canvas;
  const hasLum = style.exposure || style.brightness || style.contrast || style.highlights || style.shadows || style.whites || style.blacks || style.temperature || style.tint || style.vibrance || style.saturation;
  if (hasLum) {
    const img = ctx.getImageData(0, 0, w, h);
    applyStyleToPixels(img.data, style);
    ctx.putImageData(img, 0, 0);
  }
  applySharpness(ctx, w, h, style.sharpness);
}

export function drawPortrait(
  canvas: HTMLCanvasElement,
  photo: ImageBitmap,
  frame: ImageBitmap | null,
  crop: Crop,
): void {
  const W = canvas.width;
  const H = canvas.height;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  const scale = Math.max(W / photo.width, H / photo.height) * crop.zoom;
  const dw = photo.width * scale;
  const dh = photo.height * scale;
  const x = (W - dw) / 2 - (crop.offsetX * (dw - W)) / 2;
  const y = (H - dh) / 2 - (crop.offsetY * (dh - H)) / 2;
  ctx.imageSmoothingQuality = 'high';
  ctx.filter = `brightness(${crop.brightness}) contrast(${crop.contrast}) saturate(${crop.saturation})`;
  ctx.drawImage(photo, x, y, dw, dh);
  ctx.filter = 'none';

  if (crop.shadows !== 1 || crop.highlights !== 1) {
    const imgData = ctx.getImageData(0, 0, W, H);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const sAdj = (crop.shadows - 1) * (1 - lum);
      const hAdj = (crop.highlights - 1) * lum;
      const factor = 1 + sAdj + hAdj;
      d[i] = Math.max(0, Math.min(255, r * factor));
      d[i + 1] = Math.max(0, Math.min(255, g * factor));
      d[i + 2] = Math.max(0, Math.min(255, b * factor));
    }
    ctx.putImageData(imgData, 0, 0);
  }

  if (frame) ctx.drawImage(frame, 0, 0, W, H);
}

export async function renderOutput(
  photo: ImageBitmap,
  frame: ImageBitmap,
  crop: Crop,
  ratio: RatioKey,
  quality: number,
  style: PhotoStyle,
): Promise<Blob> {
  const [rw, rh] = RATIO[ratio];
  const canvas = createCanvas(OUT_WIDTH, Math.round((OUT_WIDTH * rh) / rw));
  drawPortrait(canvas, photo, frame, crop);
  applyStyle(canvas, style);
  return toBlob(canvas, 'image/jpeg', quality);
}
