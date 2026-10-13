import type { Track } from "../services/types";

// 播放列表和签名地址无关，只存歌曲元数据；播放时才去取地址，
// 这样刷新页面后仍能重新拿到可用的播放地址。
const STORAGE_KEY = "listen-web:playlist";

export function loadPlaylist(): Track[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.filter(
      (t): t is Track =>
        !!t &&
        typeof t === "object" &&
        typeof (t as Track).id === "string" &&
        typeof (t as Track).title === "string" &&
        typeof (t as Track).provider === "string",
    );
  } catch {
    return [];
  }
}

export function savePlaylist(tracks: Track[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tracks));
  } catch {
    // 隐私模式或超出配额，忽略
  }
}