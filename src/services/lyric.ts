// 歌词解析：从 QQ 实际返回的数据验证过几种格式
// text  = "[00:42.69]你真的希望你能厘清"
// qrc   = '<Lyric_1 LyricContent="…[247,3326]唯(247,311)一(558,487)…"/>'
// trans = 翻译，逐行 LRC，行数和 text 一致，占位行是 "//"
// roma  = 罗马音，格式同 qrc
import type { LyricLine, LyricWord } from "./types";

// QQ play 接口的 lyric 字段
export type RawLyric = {
  text?: string;
  qrc?: string;
  trans?: string;
  roma?: string;
};

// 翻译里的占位符，这几行对应主歌词的歌名/词曲作者
const PLACEHOLDER = /^\/+\s*$/;

// 取出行首所有 [mm:ss.xx]，并剥掉这些标签只留正文
function scanTimeTags(line: string): { times: number[]; body: string } {
  const times: number[] = [];
  let body = "";
  let cursor = 0;
  const re = /\[(\d+):(\d+(?:\.\d+)?)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    times.push(Number(m[1]) * 60 + Number(m[2]));
    body += line.slice(cursor, m.index);
    cursor = m.index + m[0].length;
  }
  body += line.slice(cursor);
  return { times, body };
}

// 整行歌词。元数据行（[ti:] [ar:] [by:xxx] [offset:0] [kana:1…]）不含时间戳，会被跳过
export function parseLrc(text: string): LyricLine[] {
  const lines: LyricLine[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const { times, body } = scanTimeTags(raw);
    if (!times.length) continue;
    const content = body.trim();
    if (!content) continue;
    // 一行多个时间戳时，每个时间戳各出一行
    for (const time of times) {
      lines.push({ time, text: content });
    }
  }
  return lines.sort((a, b) => a.time - b.time);
}

// qrc 里的字和行文本可能带 & < > 这类实体
function decodeEntities(s: string) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&amp;/g, "&");
}

// [247,3326]唯(247,311)一(558,487) - (1046,487)告(1533,488)…
// 行首是 [起始ms,时长ms]，字后面跟 (起始ms,时长ms)，时间都是绝对毫秒
export function parseQrc(xml: string): LyricLine[] {
  const attr = xml.match(/LyricContent="([\s\S]*?)"\s*\/>/);
  if (!attr) return [];

  const content = decodeEntities(attr[1])
    .replace(/\r/g, "")
    .replace(/<br\s*\/?>/gi, "");

  const lines: LyricLine[] = [];
  for (const raw of content.split("\n")) {
    const head = raw.match(/^\[(\d+),(\d+)\](.*)$/);
    if (!head) continue;

    const words: LyricWord[] = [];
    const wordRe = /([^[]*?)\((\d+),(\d+)\)/g;
    let w: RegExpExecArray | null;
    while ((w = wordRe.exec(head[3]))) {
      if (!w[1]) continue;
      words.push({
        text: w[1],
        time: Number(w[2]) / 1000,
        duration: Number(w[3]) / 1000,
      });
    }

    const text = words.map((x) => x.text).join("");
    if (!text.trim()) continue;

    lines.push({
      time: Number(head[1]) / 1000,
      duration: Number(head[2]) / 1000,
      text,
      words,
    });
  }
  return lines.sort((a, b) => a.time - b.time);
}

// 有 qrc 且解析出逐字就用逐字，否则退回整行
export function parseLyric(lyric: RawLyric | null | undefined): LyricLine[] {
  if (!lyric) return [];
  if (lyric.qrc) {
    const lines = parseQrc(lyric.qrc);
    if (lines.some((l) => l.words?.length)) return lines;
  }
  return lyric.text ? parseLrc(lyric.text) : [];
}

// 把翻译/罗马音挂到主歌词上。
// 实测接口返回的 trans 和 text 行数严格一致、时间戳几乎相同（个别差几十毫秒），
// 所以优先按行号一一对应；行数不一致时才退回按时间就近匹配。
// 内容是 // 占位符的（对应歌名、词曲作者那几行）不挂。
export function attachSub(
  lines: LyricLine[],
  sub: string | undefined,
  kind: "qrc" | "lrc",
): LyricLine[] {
  if (!sub || !lines.length) return lines;

  const parsed = kind === "qrc" ? parseQrc(sub) : parseLrc(sub);
  if (!parsed.length) return lines;

  const has = (s: LyricLine | undefined) =>
    !!s && !!s.text.trim() && !PLACEHOLDER.test(s.text);

  if (parsed.length === lines.length) {
    return lines.map((line, i) => {
      const s = parsed[i];
      return has(s) ? { ...line, [FIELD[kind]]: s.text } : line;
    });
  }

  const byTime = new Map<number, LyricLine>();
  for (const s of parsed) {
    if (has(s)) byTime.set(Math.round(s.time * 100), s);
  }

  return lines.map((line) => {
    const hit =
      byTime.get(Math.round(line.time * 100)) ?? nearest(byTime, line.time);
    return has(hit) ? { ...line, [FIELD[kind]]: hit!.text } : line;
  });
}

const FIELD = { qrc: "roma", lrc: "trans" } as const;

function nearest(
  byTime: Map<number, LyricLine>,
  time: number,
): LyricLine | undefined {
  let best: LyricLine | undefined;
  let bestDiff = 0.12; // 120ms 之内才算同一行
  for (const [t, line] of byTime) {
    const diff = Math.abs(t / 100 - time);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = line;
    }
  }
  return best;
}

// 找出当前时间该高亮第几行。二分，播放中每次 timeupdate 都会调
export function activeLineIndex(lines: LyricLine[], time: number) {
  let lo = 0;
  let hi = lines.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].time <= time) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}