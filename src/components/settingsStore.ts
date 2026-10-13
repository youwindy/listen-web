export type Settings = {
  miniLyric: boolean; // 紧凑播放条显示歌词
  showTrans: boolean; // 歌词视图显示翻译
  showRoma: boolean; // 歌词视图显示罗马音
};

const STORAGE_KEY = "listen-web:settings";

export const DEFAULT_SETTINGS: Settings = {
  miniLyric: true,
  showTrans: true,
  showRoma: false,
};

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const data = JSON.parse(raw) as Partial<Settings>;
    return {
      miniLyric:
        typeof data.miniLyric === "boolean"
          ? data.miniLyric
          : DEFAULT_SETTINGS.miniLyric,
      showTrans:
        typeof data.showTrans === "boolean"
          ? data.showTrans
          : DEFAULT_SETTINGS.showTrans,
      showRoma:
        typeof data.showRoma === "boolean"
          ? data.showRoma
          : DEFAULT_SETTINGS.showRoma,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // 隐私模式或超出配额，忽略
  }
}