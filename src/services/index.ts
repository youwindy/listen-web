import type { MusicProvider, SearchParams, SearchResult, Track } from "./types";
import { kuwoProvider } from "./kuwo";
import { neteaseProvider } from "./163";
import { qqProvider } from "./qq";
// 注册表：以后加新源只改这里
export const providers: MusicProvider[] = [
  kuwoProvider,
  neteaseProvider,
  qqProvider,
];

export function getProvider(id: string): MusicProvider | undefined {
  return providers.find((p) => p.id === id);
}

// 界面上展示用的名字：优先取注册名（如「网易云」），没注册就退回原始 id
export function providerName(id: string): string {
  return getProvider(id)?.name ?? id;
}

// 用某个源搜索
export async function searchWith(
  providerId: string,
  params: SearchParams,
): Promise<SearchResult> {
  const p = getProvider(providerId);
  if (!p) throw new Error(`未知数据源：${providerId}`);
  return p.search(params);
}

// 聚合搜索：多个源同时搜，容忍单个源失败。
// 返回值里带上失败的源，界面可以提示「网易云没搜到」而不是整片空白。
export async function searchAll(
  params: SearchParams,
  providerIds?: string[],
): Promise<{ tracks: Track[]; failures: { id: string; reason: string }[] }> {
  const list = providerIds
    ? providers.filter((p) => providerIds.includes(p.id))
    : providers.filter((p) => p.enabled);

  const results = await Promise.allSettled(list.map((p) => p.search(params)));

  const tracks: Track[] = [];
  const failures: { id: string; reason: string }[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      tracks.push(...r.value.tracks);
    } else {
      failures.push({ id: list[i].id, reason: String(r.reason?.message ?? r.reason) });
      console.warn(`[${list[i].id}] 搜索失败：`, r.reason);
    }
  });
  return { tracks, failures };
}

export type { MusicProvider, SearchParams, SearchResult, Track };
