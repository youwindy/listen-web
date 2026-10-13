// 歌词滚动视图 + 紧凑条上的单行滚动歌词
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { activeLineIndex } from "../services/lyric";
import { createTween, type Tween } from "../lib/tween";
import type { LyricLine } from "../services/types";

type Props = {
  lines: LyricLine[];
  currentTime: number;
  showTrans: boolean;
  showRoma: boolean;
};

/** 减弱动效时直接落位，不做补间 */
const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function LyricView({
  lines,
  currentTime,
  showTrans,
  showRoma,
}: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const tweenRef = useRef<Tween | null>(null);
  const prevLinesRef = useRef<LyricLine[] | null>(null);

  const active = useMemo(
    () => activeLineIndex(lines, currentTime),
    [lines, currentTime],
  );

  // 高亮行滚到中间。用 layout effect 避免先渲染再跳一下。
  //
  // 两个要点：
  // 1. 只移动 transform，不动 scrollTop —— 歌词区本身不滚动，
  //    上下渐隐的遮罩就不用跟着内容每帧重画。
  // 2. 用视口坐标算差值再叠回当前位移。别用 offsetTop 之类的：
  //    .lyric-track 的 offsetParent / .lyric 的内边距都会混进结果，
  //    算出来的位置会差出一整个 padding 的量。
  useLayoutEffect(() => {
    const box = boxRef.current;
    const track = trackRef.current;
    if (!box || !track) return;

    const tween = (tweenRef.current ??= createTween(track));

    // 换歌时直接落到对应行，不要从上一首的位置慢慢滑过去
    const switched = prevLinesRef.current !== lines;
    prevLinesRef.current = lines;
    const snap = switched || prefersReducedMotion();

    const el =
      active >= 0 ? (track.children[active] as HTMLElement | undefined) : undefined;
    if (!el) {
      tween.to(0, snap);
      return;
    }

    // lineRect 已经包含当前位移，所以「差值 + 当前位移」就是目标
    const boxRect = box.getBoundingClientRect();
    const lineRect = el.getBoundingClientRect();
    const delta =
      lineRect.top + lineRect.height / 2 - (boxRect.top + boxRect.height / 2);
    tween.to(tween.current() + delta, snap);
  }, [active, lines]);

  if (!lines.length) {
    return <div className="lyric-empty">暂无歌词</div>;
  }

  return (
    <div className="lyric" ref={boxRef}>
      <div className="lyric-track" ref={trackRef}>
        {lines.map((line, i) => {
          const isActive = i === active;
          const trans = showTrans ? line.trans : undefined;
          const roma = showRoma ? line.roma : undefined;
          return (
            <div
              key={`${line.time}-${i}`}
              className={`lyric-line ${isActive ? "active" : ""} ${
                i < active ? "past" : ""
              }`}
            >
              {line.words?.length ? (
                // 只有当前行需要逐字进度，其余行交给 CSS 用纯色渲染，
                // 免得每帧重画几百个 background-clip: text
                <LineWords line={line} currentTime={isActive ? currentTime : null} />
              ) : (
                line.text
              )}
              {roma && <div className="lyric-sub roma">{roma}</div>}
              {trans && <div className="lyric-sub trans">{trans}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 有逐字时间轴时，当前行按进度做横向填充。currentTime 为 null 表示非当前行，不做渐变。
function LineWords({
  line,
  currentTime,
}: {
  line: LyricLine;
  currentTime: number | null;
}) {
  return (
    <span className="lyric-words">
      {line.words!.map((w, i) => (
        <span
          key={`${w.time}-${i}`}
          className="w"
          style={
            currentTime === null
              ? undefined
              : ({
                  // 字内进度 0~1：没到就是 0，已经过去就是 1
                  "--p": `${
                    (currentTime <= w.time
                      ? 0
                      : Math.min(1, (currentTime - w.time) / w.duration)) * 100
                  }%`,
                } as React.CSSProperties)
          }
        >
          {w.text}
        </span>
      ))}
    </span>
  );
}

// 紧凑播放条里的单行歌词：跟着播放换行，超出宽度时横向滚动。
// 优先显示翻译（听不懂原歌词时有用），没有翻译再显示原文。
export function MiniLyric({
  lines,
  currentTime,
  showTrans,
}: {
  lines: LyricLine[];
  currentTime: number;
  showTrans: boolean;
}) {
  const idx = useMemo(
    () => activeLineIndex(lines, currentTime),
    [lines, currentTime],
  );
  const wrapRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [scroll, setScroll] = useState(0);

  const line = idx >= 0 ? lines[idx] : undefined;
  const text = line ? (showTrans && line.trans ? line.trans : line.text) : "";

  // 只有真的超出宽度才滚，滚动距离和时长按超出量算，短句不会原地抽搐
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const track = trackRef.current;
    if (!wrap || !track) {
      setScroll(0);
      return;
    }
    const over = track.scrollWidth - wrap.clientWidth;
    setScroll(over > 2 ? over : 0);
  }, [text]);

  return (
    <div className="mini-lyric" ref={wrapRef}>
      {text && (
        <div
          key={`${line!.time}-${text}`}
          className={`mini-lyric-track ${showTrans && line!.trans ? "is-trans" : ""}`}
          ref={trackRef}
          style={
            scroll
              ? ({
                  "--dist": `${scroll}px`,
                  "--dur": `${Math.max(6, scroll / 22)}s`,
                } as React.CSSProperties)
              : undefined
          }
        >
          {text}
        </div>
      )}
    </div>
  );
}