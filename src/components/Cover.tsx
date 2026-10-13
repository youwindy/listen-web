import { useState } from "react";
import { MusicIcon } from "./icons";

/**
 * 统一封面：懒加载 + 淡入 + 加载失败/无封面时的占位。
 * 列表里几十张图同时出现时，loading="lazy" 能省掉不少流量和解码开销。
 */
export default function Cover({
  src,
  alt = "",
  className = "",
}: {
  src?: string;
  alt?: string;
  className?: string;
}) {
  const [state, setState] = useState<"loading" | "ready" | "error">(
    src ? "loading" : "error",
  );
  // src 变了要重置，否则换歌后一直显示上一次的错误占位
  const key = src ?? "";
  const [lastKey, setLastKey] = useState(key);
  if (lastKey !== key) {
    setLastKey(key);
    setState(src ? "loading" : "error");
  }

  return (
    <span className={`cover ${className}`}>
      {/* 占位图垫在下面，图片没加载出来时也能看到，不会是空白方块 */}
      {state !== "ready" && (
        <span className="cover-fallback" aria-hidden="true">
          <MusicIcon />
        </span>
      )}
      {src && (
        <img
          key={key}
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={state === "ready" ? "is-ready" : ""}
          onLoad={() => setState("ready")}
          onError={() => setState("error")}
        />
      )}
    </span>
  );
}