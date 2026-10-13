// 统一歌曲结构：所有 provider 必须返回这个
export type Track = {
  id: string;
  title: string;
  artist: string;
  cover: string;
  src: string;
  provider: string; // 来自哪个源，方便调试
  duration?: number; // 秒，可选
  album?: string;
};

// 搜索参数
export type SearchParams = {
  keyword: string;
  page?: number;
  limit?: number;
};

// 搜索返回
export type SearchResult = {
  tracks: Track[];
  total?: number;
  hasMore?: boolean;
};

// 逐字时间轴里的一个字（qrc 才有）
export type LyricWord = {
  text: string;
  time: number; // 秒，绝对时间
  duration: number; // 秒
};

// 一行歌词。words 存在说明能逐字，否则只有整行
export type LyricLine = {
  time: number; // 秒
  text: string;
  duration?: number;
  words?: LyricWord[];
  trans?: string; // 翻译，整行
  roma?: string; // 罗马音，整行
};

// 每个 provider 必须实现这个接口
export interface MusicProvider {
  id: string;
  name: string;
  // 是否在 UI 上可见 / 可切换
  enabled: boolean;
  search(params: SearchParams): Promise<SearchResult>;
  // 可选：获取播放地址（如果搜索返回的 src 会过期）
  getPlayUrl?(track: Track): Promise<string>;
  // 可选：获取歌词，只有部分源支持
  getLyric?(track: Track): Promise<LyricLine[]>;
}
