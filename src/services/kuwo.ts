import type { MusicProvider, SearchParams, SearchResult, Track } from "./types";
import { API_BASE } from "./config";

interface KuwoResponse {
  code: number;
  message: string;
  data?: {
    song: string;
    singer: string;
    picture: string;
    rid: string;
    album: string;
  }[];
}

// 带 n 参数时 data 是单个对象，多了 url
interface KuwoPlayResponse {
  code: number;
  message: string;
  data?: {
    song: string;
    singer: string;
    picture: string;
    rid: string;
    album: string;
    url: string;
  };
}
const limit = 20;

export const kuwoProvider: MusicProvider = {
  id: "kuwo",
  name: "酷我",
  enabled: true,

  async search({ keyword, page = 1 }: SearchParams): Promise<SearchResult> {
    const res = await fetch(
      `${API_BASE.kuwo}?msg=${encodeURIComponent(keyword)}&limit=${limit}&page=${page}&br=2`,
    );
    if (!res.ok) {
      throw new Error(`酷我搜索失败: ${res.status} ${res.statusText}`);
    }
    const json: KuwoResponse = await res.json();
    if (!json.data || json.data.length === 0) {
      throw new Error(json.message || "酷我搜索失败");
    }

    const d = json.data;

    const list = d.map((item, index) => ({
      // 用 JSON 编码，搜索词里带 "-" 时不会错位
      id: JSON.stringify([keyword, page, index]),
      title: item.song,
      artist: item.singer,
      cover: item.picture || "https://picsum.photos/200",
      src: "",
      provider: "kuwo",
      album: item.album,
    }));

    // 接口一次只返回一首，如果你要多次搜索累积，自己扩展
    return { tracks: list, hasMore: false };
  },

  async getPlayUrl(track: Track): Promise<string> {
    const [keyword, page, index] = JSON.parse(track.id) as [
      string,
      number,
      number,
    ];
    // 接口参数名是 msg 不是 keyword，n 从 1 开始
    const res = await fetch(
      `${API_BASE.kuwo}?msg=${encodeURIComponent(keyword)}&n=${index + 1}&limit=${limit}&page=${page}&br=2`,
    );
    if (!res.ok) {
      throw new Error(`酷我获取播放地址失败: ${res.status} ${res.statusText}`);
    }
    const json: KuwoPlayResponse = await res.json();
    const url = json.data?.url;
    if (!url) {
      throw new Error(json.message || "酷我未返回播放地址");
    }
    return url;
  },
};
