import { useEffect, useRef, useState } from "react";
import { getProvider } from "../services";
import type { LyricLine, Track } from "../services/types";
import { formatTime } from "../lib/track";
import { loadNumber, saveNumber } from "../lib/storage";
import Cover from "./Cover";
import LyricView, { MiniLyric } from "./LyricView";
import {
  ChevronDownIcon,
  MuteIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PrevIcon,
  VolumeIcon,
} from "./icons";

type Props = {
  track: Track | null;
  onNext: () => void;
  onPrev: () => void;
  miniLyric: boolean;
  showTrans: boolean;
  showRoma: boolean;
  /** 顶部 App 的提示条，用来把「取地址失败」这类错误也透出到迷你播放条 */
  onNotify?: (text: string) => void;
};

const VOLUME_KEY = "listen-web:volume";

type ProgressProps = {
  currentTime: number;
  duration: number;
  onSeek: (v: number) => void;
};

function Progress({ currentTime, duration, onSeek }: ProgressProps) {
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;
  return (
    <div className="progress">
      <span className="time">{formatTime(currentTime)}</span>
      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={Math.min(currentTime, duration || 0)}
        style={{ "--pct": `${pct}%` } as React.CSSProperties}
        aria-label="播放进度"
        aria-valuetext={`${formatTime(currentTime)} / ${formatTime(duration)}`}
        onChange={(e) => onSeek(Number(e.target.value))}
      />
      <span className="time">{formatTime(duration)}</span>
    </div>
  );
}

type VolumeProps = {
  volume: number;
  muted: boolean;
  onVolume: (v: number) => void;
  onToggleMute: () => void;
};

function VolumeButton({ volume, muted, onVolume, onToggleMute }: VolumeProps) {
  return (
    <div className="volume-wrap">
      <button
        className={`round-btn ${muted ? "is-on" : ""}`}
        onClick={onToggleMute}
        aria-label={muted ? "取消静音" : "静音"}
        aria-pressed={muted}
        title={muted ? "取消静音" : "静音"}
      >
        {muted ? <MuteIcon /> : <VolumeIcon />}
      </button>
      {/* 悬停/聚焦时展开，触屏上直接平铺（见 CSS） */}
      <div className="volume-pop">
        <input
          className="volume"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={muted ? 0 : volume}
          style={{ "--pct": `${(muted ? 0 : volume) * 100}%` } as React.CSSProperties}
          aria-label="音量"
          onChange={(e) => onVolume(Number(e.target.value))}
        />
      </div>
    </div>
  );
}

type ControlsProps = VolumeProps & {
  playing: boolean;
  onToggle: () => void;
  onPrev: () => void;
  onNext: () => void;
};

function Controls({
  playing,
  volume,
  muted,
  onToggle,
  onPrev,
  onNext,
  onVolume,
  onToggleMute,
}: ControlsProps) {
  const icon = playing ? <PauseIcon /> : <PlayIcon />;
  return (
    <div className="controls">
      <button className="round-btn" onClick={onPrev} aria-label="上一首" title="上一首">
        <PrevIcon />
      </button>
      <button
        className="round-btn play"
        onClick={onToggle}
        aria-label={playing ? "暂停" : "播放"}
        title={playing ? "暂停" : "播放"}
      >
        {icon}
      </button>
      <button className="round-btn" onClick={onNext} aria-label="下一首" title="下一首">
        <NextIcon />
      </button>
      <VolumeButton
        volume={volume}
        muted={muted}
        onVolume={onVolume}
        onToggleMute={onToggleMute}
      />
    </div>
  );
}

export default function Player({
  track,
  onNext,
  onPrev,
  miniLyric,
  showTrans,
  showRoma,
  onNotify,
}: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ y: number } | null>(null);

  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(() => loadNumber(VOLUME_KEY, 0.8));
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [lyric, setLyric] = useState<LyricLine[]>([]);
  const [showLyric, setShowLyric] = useState(false);

  // 切歌：src 为空（如酷我签名地址会过期）时向 provider 现取，再播放
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    let cancelled = false;

    setError("");
    setCurrentTime(0);
    setDuration(0);
    setLyric([]);
    setShowLyric(false);

    const start = async () => {
      const provider = getProvider(track.provider);

      // 歌词不阻塞播放，两个请求并行
      if (provider?.getLyric) {
        provider
          .getLyric(track)
          .then((lines) => {
            if (!cancelled) setLyric(lines);
          })
          .catch(() => {});
      }

      const fail = (msg: string) => {
        if (cancelled) return;
        setError(msg);
        // 迷你播放条上没有展示错误的位置，用顶部提示条补一下
        onNotify?.(msg);
      };

      let src = track.src;
      if (!src) {
        if (!provider?.getPlayUrl) {
          fail(`[${track.provider}] 没有可用的播放地址`);
          return;
        }
        try {
          src = await provider.getPlayUrl(track);
        } catch (e) {
          fail(e instanceof Error ? e.message : "获取播放地址失败");
          return;
        }
      }
      // 连点下一首时，丢弃已经过期的请求结果
      if (cancelled) return;
      audio.src = src;
      audio
        .play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false)); // 被浏览器自动播放策略拦截
    };

    void start();
    return () => {
      cancelled = true;
    };
  }, [track, onNotify]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
    saveNumber(VOLUME_KEY, volume);
  }, [volume]);

  // 播放条实测高度写进 --player-h，列表底部就能留出准确的空间
  useEffect(() => {
    const root = document.documentElement;
    const el = barRef.current;
    if (!el) return;
    if (expanded) {
      root.style.setProperty("--player-h", "0px");
      return;
    }
    const apply = () => root.style.setProperty("--player-h", `${el.offsetHeight}px`);
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.removeProperty("--player-h");
    };
  }, [expanded]);

  // 全屏时锁住背景滚动，Esc 收起
  useEffect(() => {
    if (!expanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setExpanded(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [expanded]);

  // 系统媒体控制：锁屏、耳机、键盘媒体键
  const nextRef = useRef(onNext);
  const prevRef = useRef(onPrev);

  // 回调每次渲染都会变，放进 ref 让下面的 effect 不用反复重新注册
  useEffect(() => {
    nextRef.current = onNext;
    prevRef.current = onPrev;
  }, [onNext, onPrev]);

  useEffect(() => {
    const ms = typeof navigator !== "undefined" ? navigator.mediaSession : undefined;
    if (!ms) return;
    const set = (action: MediaSessionAction, handler: MediaSessionActionHandler) => {
      try {
        ms.setActionHandler(action, handler);
      } catch {
        // 浏览器不认识这个 action，忽略
      }
    };
    set("play", () => void audioRef.current?.play().catch(() => {}));
    set("pause", () => audioRef.current?.pause());
    set("previoustrack", () => prevRef.current());
    set("nexttrack", () => nextRef.current());
    set("stop", () => audioRef.current?.pause());
    return () => {
      for (const a of ["play", "pause", "previoustrack", "nexttrack", "stop"] as const) {
        try {
          ms.setActionHandler(a, null);
        } catch {
          // 同上
        }
      }
    };
  }, []);

  useEffect(() => {
    const ms = typeof navigator !== "undefined" ? navigator.mediaSession : undefined;
    if (!ms) return;
    if (!track) {
      ms.metadata = null;
    } else {
      try {
        ms.metadata = new MediaMetadata({
          title: track.title,
          artist: track.artist,
          album: track.album,
          artwork: track.cover ? [{ src: track.cover, sizes: "512x512" }] : [],
        });
      } catch {
        // 封面地址不合法时 Metadata 会抛错，忽略即可
      }
    }
    ms.playbackState = playing ? "playing" : "paused";
  }, [track, playing]);

  useEffect(() => {
    const ms = typeof navigator !== "undefined" ? navigator.mediaSession : undefined;
    if (!ms?.setPositionState) return;
    const audio = audioRef.current;
    try {
      ms.setPositionState({
        duration: Number.isFinite(duration) ? duration : 0,
        playbackRate: audio?.playbackRate ?? 1,
        position: Math.min(currentTime, duration || 0),
      });
    } catch {
      // duration 未知时部分浏览器会抛错，忽略
    }
  }, [currentTime, duration]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  };

  const seek = (v: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = v;
    setCurrentTime(v);
  };

  const setMute = (v: boolean) => {
    setMuted(v);
    const audio = audioRef.current;
    if (audio) audio.muted = v;
  };
  const toggleMute = () => setMute(!muted);

  // 全屏顶部下拉关闭（移动端手势）。按钮区域不接管，否则会吃掉点击。
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    dragRef.current = { y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dy = e.clientY - drag.y;
    if (dy > 0) e.currentTarget.style.transform = `translateY(${dy}px)`;
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;
    e.currentTarget.style.transform = "";
    // 往下拉超过 90px 收起；轻点一下不动
    if (drag && e.clientY - drag.y > 90) setExpanded(false);
  };

  const volumeProps = {
    volume,
    muted,
    onVolume: setVolume,
    onToggleMute: toggleMute,
  };

  const hasLyric = lyric.length > 0;
  // 只要有歌词就允许切换视图，逐字高亮本身就值得看
  const canToggleLyric = hasLyric;
  const lyricMode = showLyric && hasLyric;

  return (
    <>
      {/* 播放条：固定在底部，点封面展开全屏 */}
      <div ref={barRef} className={`player ${expanded ? "player-expanded" : ""}`}>
        <audio
          ref={audioRef}
          preload="metadata"
          playsInline
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onEnded={onNext}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onWaiting={() => setBuffering(true)}
          onPlaying={() => setBuffering(false)}
          onCanPlay={() => setBuffering(false)}
          onError={() => {
            setPlaying(false);
            setBuffering(false);
            const msg = "音频加载失败，试试切到其它数据源";
            setError(msg);
            onNotify?.(msg);
          }}
        />

        {expanded ? (
          <div className="full-inner">
            <div
              className="full-top"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              <span className="full-grip" aria-hidden="true" />
              <button
                className="collapse"
                onClick={() => setExpanded(false)}
                aria-label="收起播放器"
                title="收起"
              >
                <ChevronDownIcon />
              </button>
              <span className="full-label">正在播放</span>
            </div>

            {lyricMode ? (
              <>
                {track && (
                  <button
                    className="full-cover small"
                    onClick={() => setShowLyric(false)}
                    aria-label="切回封面"
                  >
                    <Cover src={track.cover} alt="" />
                  </button>
                )}
                <LyricView
                  lines={lyric}
                  currentTime={currentTime}
                  showTrans={showTrans}
                  showRoma={showRoma}
                />
              </>
            ) : (
              <button
                className="full-cover"
                onClick={() => canToggleLyric && setShowLyric(true)}
                aria-label={canToggleLyric ? "切换到歌词" : "专辑封面"}
              >
                <Cover src={track?.cover} alt="" />
              </button>
            )}

            {/* 歌词模式下不重复显示歌名，把竖向空间全留给歌词 */}
            {!lyricMode && (
              <div className="full-text">
                <div className="full-title">{track?.title ?? "未选择歌曲"}</div>
                <div className="full-sub">
                  {track
                    ? `${track.artist}${track.album ? ` · ${track.album}` : ""}`
                    : "从列表里选一首"}
                </div>
              </div>
            )}

            {canToggleLyric && (
              <button
                className="view-toggle"
                onClick={() => setShowLyric((v) => !v)}
                aria-label={lyricMode ? "显示封面" : "显示歌词"}
              >
                {lyricMode ? "封面" : "歌词"}
              </button>
            )}

            {error && <p className="error">{error}</p>}

            <Progress currentTime={currentTime} duration={duration} onSeek={seek} />
            <Controls
              {...volumeProps}
              playing={playing}
              onToggle={toggle}
              onPrev={onPrev}
              onNext={onNext}
            />
          </div>
        ) : (
          <div className="player-inner">
            {track ? (
              <button
                className="mini-cover"
                onClick={() => setExpanded(true)}
                aria-label="展开全屏播放器"
                title="展开"
              >
                <Cover src={track.cover} alt="" />
              </button>
            ) : (
              <div className="mini-cover placeholder" aria-hidden="true" />
            )}

            <div className="now-text">
              <div className="now-title">{track?.title ?? "未选择歌曲"}</div>
              <div className="now-sub">
                {track
                  ? `${track.artist}${track.album ? ` · ${track.album}` : ""}`
                  : "点击列表里的歌开始播放"}
              </div>
            </div>

            <div className="mini-controls">
              <button className="round-btn" onClick={onPrev} aria-label="上一首" title="上一首">
                <PrevIcon />
              </button>
              <button
                className="round-btn play"
                onClick={toggle}
                aria-label={playing ? "暂停" : "播放"}
                aria-busy={buffering}
              >
                {buffering ? (
                  <span className="spinner" aria-hidden="true" />
                ) : playing ? (
                  <PauseIcon />
                ) : (
                  <PlayIcon />
                )}
              </button>
              <button className="round-btn" onClick={onNext} aria-label="下一首" title="下一首">
                <NextIcon />
              </button>
            </div>

            <Progress currentTime={currentTime} duration={duration} onSeek={seek} />

            {miniLyric && track && (
              <MiniLyric
                lines={lyric}
                currentTime={currentTime}
                showTrans={showTrans}
              />
            )}
          </div>
        )}
      </div>
    </>
  );
}