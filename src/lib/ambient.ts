import { useEffect } from "react";
import { trackKey } from "./track";
import type { Track } from "../services/types";

/**
 * 从封面图里取一个主色，喂给 CSS 的 --live，让背景氛围光跟着歌曲变。
 *
 * 大部分封面服务器不带 CORS 头，取不到像素时会退回按歌名/来源算出的
 * 固定色相 —— 保证氛围光永远有变化，且永远不会因为图片失败而报错。
 */

const SAMPLE = 24; // 采样边长，够用且很便宜
const cache = new Map<string, string>();
const DEFAULT_ACCENT = "#7c5cff";

type RGB = { r: number; g: number; b: number };

function rgbToHsl({ r, g, b }: RGB) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };

  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  return { h: h * 360, s, l };
}

/** 按字符串生成一个稳定、偏冷/偏紫的色相，保证在深色背景上不刺眼 */
export function seedAccent(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(h, 31) + seed.charCodeAt(i)) >>> 0;
  }
  // 200°~355°：蓝 → 靛 → 紫 → 品红，避开黄绿
  const hue = 200 + (h % 156);
  return `hsl(${hue} 74% 64%)`;
}

function sampleCover(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // 不带这个，canvas 会被污染，getImageData 直接抛异常
    img.crossOrigin = "anonymous";
    img.referrerPolicy = "no-referrer";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = SAMPLE;
        canvas.height = SAMPLE;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) throw new Error("no canvas context");
        ctx.drawImage(img, 0, 0, SAMPLE, SAMPLE);

        const { data } = ctx.getImageData(0, 0, SAMPLE, SAMPLE);
        let r = 0;
        let g = 0;
        let b = 0;
        let n = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 200) continue;
          const px = rgbToHsl({ r: data[i], g: data[i + 1], b: data[i + 2] });
          // 黑白封面（很多老歌）没有信息量，跳过
          if (px.s < 0.16 || px.l < 0.1 || px.l > 0.88) continue;
          // 饱和的像素更有代表性
          const w = 1 + px.s;
          r += data[i] * w;
          g += data[i + 1] * w;
          b += data[i + 2] * w;
          n += w;
        }
        if (!n) throw new Error("no vivid pixel");

        const { h, s, l } = rgbToHsl({ r: r / n, g: g / n, b: b / n });
        // 太灰就补一点饱和度，避免背景显得脏
        resolve(`hsl(${Math.round(h)} ${Math.round(Math.max(0.45, s) * 100)}% ${Math.round(Math.min(0.68, Math.max(0.5, l)) * 100)}%)`);
      } catch (e) {
        reject(e instanceof Error ? e : new Error("sample failed"));
      }
    };
    img.onerror = () => reject(new Error("cover load failed"));
    img.src = url;
  });
}

export async function coverAccent(url: string, seed: string): Promise<string> {
  const hit = cache.get(url);
  if (hit) return hit;

  let color = seedAccent(seed);
  try {
    color = await sampleCover(url);
  } catch {
    // 图片跨域取不到像素，用兜底色即可
  }
  cache.set(url, color);
  return color;
}

/** 把当前歌曲的主色写进根节点的 --live，背景氛围光跟着变 */
export function useLiveAccent(track: Track | null) {
  const cover = track?.cover ?? "";
  const seed = track ? trackKey(track) : "";

  useEffect(() => {
    const root = document.documentElement;
    if (!cover) {
      root.style.setProperty("--live", DEFAULT_ACCENT);
      return;
    }
    let alive = true;
    void coverAccent(cover, seed).then((color) => {
      if (alive) root.style.setProperty("--live", color);
    });
    return () => {
      alive = false;
    };
  }, [cover, seed]);
}