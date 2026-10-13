import type { Track } from "../services/types";

/** React key：跨源唯一 */
export const trackKey = (t: Track) => `${t.provider}-${t.id}`;

/**
 * 判断两首歌是不是同一首。
 * 有些源（酷我）把搜索词和序号编进了 id，同一首歌在新结果里排到别的位置时
 * id 会变，所以 id 对不上再退回比歌名 + 歌手。
 */
export function sameTrack(a: Track | null, b: Track | null): boolean {
  if (!a || !b) return false;
  if (a.provider !== b.provider) return false;
  if (a.id === b.id) return true;
  return a.title === b.title && a.artist === b.artist;
}

/** 在列表里找出某首歌的下标，找不到返回 -1 */
export function indexOfTrack(list: Track[], t: Track | null): number {
  if (!t) return -1;
  return list.findIndex((x) => sameTrack(x, t));
}

/** 秒 -> mm:ss */
export function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "00:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}