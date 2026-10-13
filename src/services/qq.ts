import type {
  LyricLine,
  MusicProvider,
  SearchParams,
  SearchResult,
  Track,
} from "./types";
import { attachSub, parseLyric, type RawLyric } from "./lyric";
import { API_BASE, QQ_API_KEY, QQ_BASE } from "./config";

interface QQResponse {
  code: number;
  list: {
    id: string;
    name: string;
    cover: string;
    artists: string;
  }[];
}

type QQPlayResponse = {
  url?: string;
  duration?: number;
  album?: { name?: string };
  artists?: { name: string }[];
  lyric?: RawLyric;
};

async function fetchPlay(mid: string): Promise<QQPlayResponse> {
  const res = await fetch(
    `${API_BASE.qq}/play?apikey=${QQ_API_KEY}&mid=${mid}&type=json`,
  );
  if (!res.ok) {
    throw new Error(`QQ音乐获取播放地址失败: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// play 的响应里同时带 url 和 lyric，缓存歌词，getLyric 就不用再发一次请求
let cached: { mid: string; lines: LyricLine[] } | null = null;

function toLines(lyric: RawLyric | undefined): LyricLine[] {
  const main = parseLyric(lyric);
  if (!main.length) return [];
  // 翻译和罗马音按时间对齐挂上去，没有的字段就不挂
  return attachSub(attachSub(main, lyric?.trans, "lrc"), lyric?.roma, "qrc");
}

export const qqProvider: MusicProvider = {
  id: "qq",
  name: "QQ音乐",
  // 静态部署下只有配了 VITE_API_BASE_QQ 才启用：
  // 默认上游 cyapi.top 只有 HTTP，HTTPS 页面会被浏览器按混合内容拦掉，
  // 摆在界面上也只会让人点到必然失败的选项。
  enabled: import.meta.env.DEV || Boolean(QQ_BASE),
  async search({ keyword }: SearchParams): Promise<SearchResult> {
    const res = await fetch(
      `${API_BASE.qq}?apikey=${QQ_API_KEY}&msg=${encodeURIComponent(keyword)}&num=20&type=json`,
    );
    if (!res.ok) {
      throw new Error(`QQ音乐搜索失败: ${res.status} ${res.statusText}`);
    }
    const json: QQResponse = await res.json();
    if (!json.list || json.list.length === 0) {
      throw new Error("QQ音乐搜索失败");
    }
    return {
      tracks: json.list.map((item) => ({
        id: item.id,
        title: item.name,
        artist: item.artists,
        cover: item.cover,
        provider: "qq",
        src: "",
      })),
      hasMore: false,
    };
  },

  async getPlayUrl(track: Track): Promise<string> {
    const json = await fetchPlay(track.id);
    if (!json.url) {
      throw new Error("QQ音乐获取播放地址失败");
    }
    // 顺手把歌词存下，getLyric 直接读
    cached = {
      mid: track.id,
      lines: toLines(json.lyric),
    };
    return json.url;
  },

  async getLyric(track: Track): Promise<LyricLine[]> {
    if (cached?.mid === track.id) return cached.lines;
    // 没走过 getPlayUrl（比如搜索后不播、直接看歌词），补一次请求
    try {
      const json = await fetchPlay(track.id);
      const lines = toLines(json.lyric);
      cached = { mid: track.id, lines };
      return lines;
    } catch {
      return [];
    }
  },
};