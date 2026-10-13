import { useEffect, useRef, useState } from "react";
import type { Track } from "../services/types";
import { providerName } from "../services";
import { indexOfTrack } from "../lib/track";
import Cover from "./Cover";
import { CloseIcon, MusicIcon, QueueIcon } from "./icons";

export default function Playlist({
  tracks,
  playing,
  onPlay,
  onRemove,
  onClear,
}: {
  tracks: Track[];
  playing: Track | null;
  onPlay: (t: Track) => void;
  onRemove: (index: number) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const total = tracks.length;
  const current = indexOfTrack(tracks, playing);

  // 点外面关闭（移动端另有遮罩，这里主要是桌面端）
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  return (
    <div className="queue" ref={wrapRef}>
      <button
        className="queue-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`播放列表，${total} 首`}
      >
        <span className="queue-icon" aria-hidden="true">
          <QueueIcon />
        </span>
        <span className="queue-label">播放列表</span>
        <span className="queue-count">{total}</span>
      </button>

      {open && (
        <>
          <div className="scrim" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="popover queue-pop" role="dialog" aria-label="播放列表">
            <div className="queue-head">
              <span>播放列表{total > 0 && ` · ${total} 首`}</span>
              <div className="queue-head-actions">
                {total > 0 && (
                  <button className="link danger" onClick={onClear}>
                    清空
                  </button>
                )}
                <button
                  className="link icon"
                  onClick={() => setOpen(false)}
                  aria-label="关闭播放列表"
                >
                  <CloseIcon />
                </button>
              </div>
            </div>

            {total === 0 ? (
              <p className="queue-empty">
                <span aria-hidden="true">
                  <MusicIcon />
                </span>
                播放列表还是空的
                <br />
                在搜索结果里点「+」把歌加进来
              </p>
            ) : (
              <ul className="queue-list">
                {tracks.map((t, i) => (
                  <li
                    key={`${t.provider}-${t.id}-${i}`}
                    className={i === current ? "is-active" : ""}
                  >
                    <span className="queue-no">{i + 1}</span>
                    <button
                      className="queue-item"
                      onClick={() => onPlay(t)}
                      aria-current={i === current ? "true" : undefined}
                    >
                      <Cover src={t.cover} alt="" className="queue-cover" />
                      <span className="queue-info">
                        <span className="queue-title">{t.title}</span>
                        <span className="queue-artist">
                          <span className="queue-artist-name">{t.artist}</span>
                          <span className="tag">{providerName(t.provider)}</span>
                        </span>
                      </span>
                    </button>
                    <button
                      className="queue-remove"
                      onClick={() => onRemove(i)}
                      aria-label={`从播放列表删除 ${t.title}`}
                      title="移除"
                    >
                      <CloseIcon />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}