import { useEffect, useRef, useState } from "react";
import type { Settings } from "./settingsStore";
import { GearIcon } from "./icons";

const ROWS: { key: keyof Settings; label: string }[] = [
  { key: "miniLyric", label: "播放条显示歌词" },
  { key: "showTrans", label: "歌词显示翻译" },
  { key: "showRoma", label: "歌词显示罗马音" },
];

const GROUPS: { title: string | null; keys: (keyof Settings)[] }[] = [
  { title: null, keys: ["miniLyric"] },
  { title: "歌词", keys: ["showTrans", "showRoma"] },
];

export default function SettingsPanel({
  settings,
  onChange,
}: {
  settings: Settings;
  onChange: (s: Settings) => void;
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // 点外面关闭（移动端另有遮罩，这里主要是桌面端）
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  const labelOf = (key: keyof Settings) =>
    ROWS.find((r) => r.key === key)?.label ?? key;

  return (
    <div className="settings" ref={panelRef}>
      <button
        className="icon-btn gear"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="设置"
        title="设置"
      >
        <GearIcon />
      </button>

      {open && (
        <>
          <div className="scrim" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="popover settings-pop" role="dialog" aria-label="设置">
            <div className="settings-head">设置</div>
            {GROUPS.map((group) => (
              <div key={group.title ?? "main"}>
                {group.title && <div className="settings-head sub">{group.title}</div>}
                {group.keys.map((key) => (
                  <label className="settings-row" key={key}>
                    <span>{labelOf(key)}</span>
                    <input
                      className="switch"
                      type="checkbox"
                      checked={settings[key]}
                      onChange={(e) =>
                        onChange({ ...settings, [key]: e.target.checked })
                      }
                    />
                  </label>
                ))}
              </div>
            ))}
            <div className="settings-head sub">快捷键</div>
            <div className="settings-row hint">
              <span>聚焦搜索框</span>
              <kbd>/</kbd>
            </div>
          </div>
        </>
      )}
    </div>
  );
}