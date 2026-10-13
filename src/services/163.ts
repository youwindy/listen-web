import type { MusicProvider, SearchParams, SearchResult, Track } from "./types";
import { API_BASE } from "./config";

interface NeteaseResponse {
  code: number;
  message: string;
  data?: {
    name: string;
    picurl: string;
    id: number;
    singers: { name: string }[];
    url?: string;
  }[];
}
export const neteaseProvider: MusicProvider = {
  id: "163",
  name: "网易云",
  enabled: true,
  async search({
    keyword,
    page = 1,
    limit = 20,
  }: SearchParams): Promise<SearchResult> {
    const res = await fetch(
      `${API_BASE.netease}?name=${encodeURIComponent(keyword)}&limit=${limit}&page=${page}`,
    );
    const json: NeteaseResponse = await res.json();
    if (!json.data || json.data.length === 0) {
      throw new Error(json.message || "网易云搜索失败");
    }
    const list: Track[] = json.data.map((item) => ({
      id: "" + item.id,
      title: item.name,
      artist: item.singers.map((s) => s.name).join(", "),
      cover: item.picurl || "https://picsum.photos/200",
      src: "",
      provider: "163",
    }));
    return {
      tracks: list,
      total: json.data.length,
      hasMore: json.data.length === limit,
    };
  },

  async getPlayUrl(track: Track): Promise<string> {
    const res = await fetch(`${API_BASE.netease}?id=${track.id}`);
    const json: NeteaseResponse = await res.json();
    if (!json.data || json.data.length === 0 || !json.data[0].url) {
      throw new Error(json.message || "网易云获取播放地址失败");
    }
    return json.data[0].url;
  },
};
