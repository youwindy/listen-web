import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Track } from "./services/types";
import { providerName, providers, searchAll, searchWith } from "./services";
import Cover from "./components/Cover";
import Player from "./components/Player";
import Playlist from "./components/Playlist";
import SettingsPanel from "./components/Settings";
import { loadPlaylist, savePlaylist } from "./components/playlistStore";
import { loadSettings, saveSettings } from "./components/settingsStore";
import { useLiveAccent } from "./lib/ambient";
import { indexOfTrack, sameTrack, trackKey } from "./lib/track";
import {
  CheckIcon,
  CloseIcon,
  MusicIcon,
  PlusIcon,
  SearchIcon,
} from "./components/icons";
import "./App.css";

// "__all__" 表示聚合所有源
const ALL = "__all__";

export default function App() {
  const [source, setSource] = useState<string>(ALL);
  const [keyword, setKeyword] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playing, setPlaying] = useState<Track | null>(null);
  const [playlist, setPlaylist] = useState<Track[]>(() => loadPlaylist());
  const [settings, setSettings] = useState(() => loadSettings());
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const composingRef = useRef(false); // 中文输入法组字中，此时回车不算提交
  const toastSeq = useRef(0);

  useLiveAccent(playing);

  useEffect(() => {
    savePlaylist(playlist);
  }, [playlist]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 1900);
    return () => clearTimeout(id);
  }, [toast]);

  // 快捷键：/ 或 Ctrl/Cmd+K 聚焦搜索框
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        return;
      }
      const el = e.target as HTMLElement | null;
      const typing =
        !!el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable);
      if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const notify = useCallback((text: string) => {
    setToast({ id: ++toastSeq.current, text });
  }, []);

  // 高亮跟着真正在放的那首走，重新搜索后仍然对得上
  const index = indexOfTrack(tracks, playing);

  // 播放列表内的歌按顺序播放，所以 next/prev 在 playlist 上走
  const at = indexOfTrack(playlist, playing);

  const step = useCallback(
    (delta: number) => {
      const list = playlist.length ? playlist : tracks;
      if (!list.length) return;
      const from = list === playlist ? at : index;
      const base = from >= 0 ? from : delta > 0 ? -1 : 0;
      setPlaying(list[(base + delta + list.length) % list.length]);
    },
    [playlist, tracks, at, index],
  );

  const addToPlaylist = (t: Track) => {
    let added = false;
    setPlaylist((prev) => {
      // 不允许重复：已在列表里就只提示，不追加
      if (prev.some((x) => sameTrack(x, t))) return prev;
      added = true;
      return [...prev, t];
    });
    notify(added ? `已添加：${t.title}` : `已在播放列表：${t.title}`);
  };

  const removeFromPlaylist = (i: number) => {
    setPlaylist((prev) => prev.filter((_, idx) => idx !== i));
  };

  const clearPlaylist = () => {
    setPlaylist([]);
    notify("播放列表已清空");
  };

  // 搜索会换掉 tracks 里的对象，如果还在放同一首，复用旧对象，
  // 让 Player 的切歌 effect 不会重新加载、进度不丢
  const reconcile = (prev: Track | null, list: Track[]): Track | null => {
    if (!prev) return null;
    return list.find((t) => sameTrack(t, prev)) ?? prev;
  };

  const handleSearch = async () => {
    const q = keyword.trim();
    if (!q || loading) return;
    setLoading(true);
    setError("");
    setSearched(true);
    try {
      let next: Track[] = [];
      if (source === ALL) {
        const result = await searchAll({ keyword: q });
        next = result.tracks;
        // 一首都没有，说明所有源都挂了，把失败的源名带上
        if (!next.length && result.failures.length) {
          const names = result.failures.map((f) => providerName(f.id)).join("、");
          throw new Error(`${names}都没有返回结果，换个关键词或稍后再试`);
        }
      } else {
        next = (await searchWith(source, { keyword: q })).tracks;
      }
      // 只换列表，不动正在播放的歌曲
      setTracks(next);
      setPlaying((prev) => reconcile(prev, next));
      if (!next.length) setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "搜索失败");
      setTracks([]);
    } finally {
      setLoading(false);
    }
  };

  // 聚合搜索时顺手统计每个源给了几首，展示在结果数旁边
  const breakdown = useMemo(() => {
    if (source !== ALL || !tracks.length) return [];
    const map = new Map<string, number>();
    for (const t of tracks) map.set(t.provider, (map.get(t.provider) ?? 0) + 1);
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id, n]) => `${providerName(id)} ${n}`);
  }, [source, tracks]);

  const enabledProviders = useMemo(() => providers.filter((p) => p.enabled), []);

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <div className="brand-logo" aria-hidden="true">
            <MusicIcon />
          </div>
          <div className="brand-text">
            <h1>聆听</h1>
            <p className="subtitle">多源聚合 · 搜索即点即听</p>
          </div>
        </div>
        <div className="top-actions">
          <Playlist
            tracks={playlist}
            playing={playing}
            onPlay={setPlaying}
            onRemove={removeFromPlaylist}
            onClear={clearPlaylist}
          />
          <SettingsPanel settings={settings} onChange={setSettings} />
        </div>
      </header>

      <div className="search">
        <div className="search-field">
          <input
            ref={inputRef}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onCompositionStart={() => {
              composingRef.current = true;
            }}
            onCompositionEnd={() => {
              composingRef.current = false;
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              // 输入法选词时的回车不能触发搜索
              if (composingRef.current || e.nativeEvent.isComposing) return;
              e.preventDefault();
              void handleSearch();
            }}
            placeholder="搜索歌名、歌手..."
            enterKeyHint="search"
            type="search"
            aria-label="搜索关键词"
            autoComplete="off"
            spellCheck={false}
          />
          {keyword && (
            <button
              className="search-clear"
              onClick={() => {
                setKeyword("");
                inputRef.current?.focus();
              }}
              aria-label="清空搜索词"
            >
              <CloseIcon />
            </button>
          )}
        </div>

        <button
          className="search-go"
          onClick={() => void handleSearch()}
          disabled={loading || !keyword.trim()}
        >
          {/* 图标位固定宽度，按钮不会因为文案长短来回跳 */}
          <span className="search-go-icon" aria-hidden="true">
            {loading ? <span className="spinner" /> : <SearchIcon />}
          </span>
          {loading ? "搜索中" : "搜索"}
        </button>
      </div>

      <div className="chips" role="group" aria-label="数据源">
        <button
          className="chip"
          aria-pressed={source === ALL}
          onClick={() => setSource(ALL)}
        >
          全部源
        </button>
        {enabledProviders.map((p) => (
          <button
            key={p.id}
            className="chip"
            aria-pressed={source === p.id}
            onClick={() => setSource(p.id)}
          >
            {p.name}
          </button>
        ))}
      </div>

      {error && (
        <p className="error" role="alert">
          <span>{error}</span>
          <button className="retry" onClick={() => void handleSearch()}>
            重试
          </button>
        </p>
      )}

      {!error && !loading && tracks.length > 0 && (
        <p className="count">
          <b>{tracks.length}</b> 首结果
          {breakdown.length > 1 && (
            <>
              <span className="dot" aria-hidden="true" />
              <span>{breakdown.join(" · ")}</span>
            </>
          )}
        </p>
      )}

      {loading && (
        <ul className="list" aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="skeleton-row">
              <div className="skeleton skeleton-cover" />
              <div className="skeleton-lines">
                <i className="skeleton" style={{ width: `${52 + ((i * 13) % 34)}%` }} />
                <i className="skeleton" style={{ width: `${30 + ((i * 17) % 26)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {!loading && !error && tracks.length === 0 && (
        <div className="empty">
          {searched ? (
            <>
              <div className="empty-icon" aria-hidden="true">
                <SearchIcon />
              </div>
              没找到「{keyword.trim()}」相关歌曲
              <small>换个关键词，或者切换到其它数据源再试试</small>
            </>
          ) : (
            <>
              <div className="empty-icon" aria-hidden="true">
                <MusicIcon />
              </div>
              还没有结果
              <small>试试搜索「周杰伦」「告白气球」</small>
            </>
          )}
        </div>
      )}

      <ul className="list">
        {tracks.map((t, i) => {
          const added = playlist.some((x) => sameTrack(x, t));
          const active = i === index;
          return (
            <li key={trackKey(t)} className={`track ${active ? "is-active" : ""}`}>
              <button
                className="track-main"
                onClick={() => setPlaying(t)}
                aria-current={active ? "true" : undefined}
              >
                <Cover src={t.cover} alt="" />
                <span className="track-meta">
                  <span className="track-title">{t.title}</span>
                  <span className="track-sub">
                    <span className="track-artist">{t.artist}</span>
                    {t.album && <span className="track-album">· {t.album}</span>}
                    <span className="tag">{providerName(t.provider)}</span>
                  </span>
                </span>
                {active && (
                  <span className="bars" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                )}
              </button>
              <button
                className={`add ${added ? "added" : ""}`}
                onClick={() => addToPlaylist(t)}
                aria-label={added ? `${t.title} 已在播放列表` : `添加 ${t.title} 到播放列表`}
                title={added ? "已在播放列表" : "添加到播放列表"}
              >
                {added ? <CheckIcon /> : <PlusIcon />}
              </button>
            </li>
          );
        })}
      </ul>

      {toast && (
        <div className="toast" key={toast.id} role="status" aria-live="polite">
          {toast.text}
        </div>
      )}

      <Player
        track={playing}
        onNext={() => step(1)}
        onPrev={() => step(-1)}
        miniLyric={settings.miniLyric}
        showTrans={settings.showTrans}
        showRoma={settings.showRoma}
        onNotify={notify}
      />
    </div>
  );
}