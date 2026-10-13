/**
 * 内联图标：统一 24×24 视图、跟随 currentColor，尺寸用 1em 跟随字号。
 * 用 SVG 而不是 ⏮ ▶ ❚❚ 这类字符，各平台字形差异太大，看起来会花。
 */

type IconProps = {
  size?: number;
  className?: string;
};

function Svg({
  size,
  className,
  children,
  ...rest
}: IconProps & { children: React.ReactNode; fill?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size ? `${size}px` : "1em"}
      height={size ? `${size}px` : "1em"}
      className={`icon ${className ?? ""}`}
      fill="currentColor"
      focusable="false"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const PlayIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 5v14l11-7z" />
  </Svg>
);

export const PauseIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6.5 5h3.6v14H6.5zm7.4 0h3.6v14h-3.6z" />
  </Svg>
);

export const PrevIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 6h2.2v12H6zm3.6 6L18 6v12z" />
  </Svg>
);

export const NextIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M15.8 6H18v12h-2.2zM6 18l8.4-6L6 6z" />
  </Svg>
);

export const VolumeIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 9.2v5.6h3.6L11 18.6V5.4L6.6 9.2H3z" />
    <path d="M14.2 8.3v7.4a4 4 0 0 0 2.6-3.7 4 4 0 0 0-2.6-3.7m-.2-2.9v2.1c2.7.9 4.7 3.3 4.7 6.1s-2 5.2-4.7 6.1v2.1c3.8-.9 6.6-4.2 6.6-8.2s-2.8-7.3-6.6-8.2" />
  </Svg>
);

export const MuteIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 9.2v5.6h3.6L11 18.6V5.4L6.6 9.2H3z" />
    <path d="M22.3 9.4 20.9 8l-3 3-3-3-1.4 1.4 3 3-3 3 1.4 1.4 3-3 3 3 1.4-1.4-3-3z" />
  </Svg>
);

export const SearchIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M15.6 14h-.8l-.3-.3a6.6 6.6 0 1 0-.7.7l.3.3v.8l5 5 1.5-1.5-5-5zm-6.1 0a4.5 4.5 0 1 1 4.5-4.5 4.5 4.5 0 0 1-4.5 4.5" />
  </Svg>
);

export const MusicIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3v10.6A4 4 0 1 0 14 17V7h4V3z" />
  </Svg>
);

export const QueueIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 6h12v2H3zm0 5h12v2H3zm0 5h8v2H3zm11-2 6-3.5v7z" />
  </Svg>
);

export const GearIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M19.1 12.9c0-.3.1-.6.1-.9s0-.6-.1-.9l2-1.6a.5.5 0 0 0 .1-.6l-1.9-3.3a.5.5 0 0 0-.6-.2l-2.4 1a8 8 0 0 0-1.6-.9l-.4-2.6a.5.5 0 0 0-.5-.4h-3.8a.5.5 0 0 0-.5.4l-.4 2.6c-.6.2-1.1.5-1.6.9l-2.4-1a.5.5 0 0 0-.6.2L2.7 8.9a.5.5 0 0 0 .1.6l2 1.6a8 8 0 0 0 0 1.8l-2 1.6a.5.5 0 0 0-.1.6l1.9 3.3c.1.2.4.3.6.2l2.4-1c.5.4 1 .7 1.6.9l.4 2.6c0 .2.2.4.5.4h3.8c.3 0 .5-.2.5-.4l.4-2.6c.6-.2 1.1-.5 1.6-.9l2.4 1c.2.1.5 0 .6-.2l1.9-3.3a.5.5 0 0 0-.1-.6zM12 15.6a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2" />
  </Svg>
);

export const ChevronDownIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7.4 8.6 12 13.2l4.6-4.6L18 10l-6 6-6-6z" />
  </Svg>
);

export const CloseIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z" />
  </Svg>
);

export const PlusIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z" />
  </Svg>
);

export const CheckIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9.6 16.2 5.4 12l-1.4 1.4 5.6 5.6L20.2 8.4 18.8 7z" />
  </Svg>
);