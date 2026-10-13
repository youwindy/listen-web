/**
 * 歌词滚动用的补间动画。
 *
 * 不用原生 scrollTo({ behavior: "smooth" })，三个原因：
 *   1. 时长和曲线是浏览器定的，改不了；
 *   2. 中途换目标会从头再起一段动画，连点切歌时能看出「弹一下」；
 *   3. 它改的是 scrollTop，走主线程的滚动路径，每帧还要重画遮罩。
 *
 * 这里改成给元素写 translate3d：整段动画在合成层上跑，
 * 并且新动画从当前插值位置接着走，不会跳。
 */

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

/** 起步快、收尾稳，比线性顺 */
const easeOutQuint = (t: number) => 1 - (1 - t) ** 5;

export type Tween = {
  /** 移动到 y；immediate 为 true 时直接落位（首帧、换歌、减弱动效时用） */
  to(y: number, immediate?: boolean): void;
  /** 当前插值位置 */
  current(): number;
  stop(): void;
};

export function createTween(el: HTMLElement): Tween {
  let value = 0;
  let raf = 0;
  let from = 0;
  let to = 0;
  let started = 0;

  const paint = (y: number) => {
    value = y;
    el.style.transform = `translate3d(0, ${-y}px, 0)`;
  };

  // 离得越远给的时间稍长，但封顶，免得跳过好几行时拖沓
  const duration = () => clamp(240 + Math.abs(to - from) * 0.32, 240, 560);

  const frame = (now: number) => {
    const p = clamp((now - started) / duration(), 0, 1);
    paint(from + (to - from) * easeOutQuint(p));
    if (p < 1) raf = requestAnimationFrame(frame);
    else raf = 0;
  };

  return {
    current: () => value,
    stop() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    },
    to(y, immediate = false) {
      const next = Math.max(0, y);
      if (raf) cancelAnimationFrame(raf);
      raf = 0;

      // 差一像素以内就当已经到了，省掉一段看不出来的动画尾巴
      if (immediate || Math.abs(next - value) < 1) {
        paint(next);
        return;
      }

      from = value;
      to = next;
      started = performance.now();
      raf = requestAnimationFrame(frame);
    },
  };
}