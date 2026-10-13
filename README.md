# 聆听 · 多源音乐播放器

聚合 **酷我 / 网易云 / QQ音乐** 三个数据源的网页播放器。搜索即点即听，带逐字歌词高亮、
翻译与罗马音，播放列表存在本地，移动端做了专门适配。

React 19 + TypeScript + Vite，没有 UI 框架，样式是一份手写的 `App.css`。

## 功能

| | |
| --- | --- |
| 聚合搜索 | 一个关键词并发搜所有源，单个源失败不影响其它源，失败原因会提示 |
| 播放列表 | 加歌去重、本地持久化、顺序播放，清空 |
| 歌词 | QQ 音乐返回 qrc，逐字按进度横向填充；支持翻译与罗马音开关 |
| 播放条 | 实测高度写入 `--player-h`，列表底部永远留得下；可显示当前歌词 |
| 全屏播放器 | 点封面展开，下拉顶部收起，锁定背景滚动，Esc 也能收 |
| 系统媒体控制 | 接 Media Session，锁屏 / 耳机 / 键盘媒体键可切歌、播放暂停 |
| 界面 | 背景氛围光跟随当前封面主色（取不到像素时退回按歌名算的稳定色） |
| 移动端 | 底部抽屉式浮层、安全区适配、16px 输入框防缩放、下拉收起手势 |

## 开发

```bash
npm install
npm run dev        # 本地开发，/api/* 已配好代理
npm run build      # 类型检查 + 生产构建
npm run lint       # ESLint
npm run preview    # 预览构建产物
```

开发时不需要任何后端：`vite.config.ts` 把 `/api/kuwo`、`/api/163`、`/api/qq`
代理到第三方接口。

## 部署到 GitHub Pages

Pages 是纯静态托管，**Vite 的 `server.proxy` 只在 `npm run dev` 生效**，
所以打包时必须用环境变量把接口指向上游直连地址，否则页面能打开但搜索全部 404。

`.env.production`（已提交）里配好了酷我和网易云的直连地址 —— 选它们是因为
这两个上游会返回 `Access-Control-Allow-Origin: *`，浏览器能直连：

```dotenv
VITE_API_BASE_KUWO=https://oiapi.net/api/Kuwo
VITE_API_BASE_163=https://oiapi.net/api/Music_163
```

推送到 `main` 分支即自动部署，`.github/workflows/deploy.yml` 会构建并发布到 Pages，
线上地址是 `https://<用户名>.github.io/<仓库名>/`。

> **关于 QQ音乐**：默认上游 `cyapi.top` 只提供 HTTP，HTTPS 页面会被浏览器按混合内容
> 拦掉，因此发布版默认不注册这个源（界面上不会出现）。自备了支持 CORS 的 HTTPS 代理后，
> 在 `.env.production` 里补上下面两行即可开启：
>
> ```dotenv
> VITE_API_BASE_QQ=https://your-proxy.example.com/qq_music.php
> VITE_QQ_API_KEY=你的apikey
> ```

> 以上接口都是公开的第三方服务，没有 SLA、随时可能变更或限流，仅供个人学习使用。
> 正式产品请自建后端并加上缓存与鉴权。

## 目录

```
src/
├─ App.tsx                 页面编排：搜索、播放列表、状态
├─ App.css                 全部样式（分 13 节，含移动端适配）
├─ components/
│  ├─ Player.tsx           播放器：音频、歌词、进度、Media Session
│  ├─ LyricView.tsx        歌词滚动视图 + 播放条上的单行歌词
│  ├─ Playlist.tsx         播放列表弹层
│  ├─ Settings.tsx         设置弹层
│  ├─ Cover.tsx            封面：懒加载、淡入、失败占位
│  ├─ icons.tsx            内联 SVG 图标
│  └─ *Store.ts            localStorage 读写
├─ lib/
│  ├─ track.ts             同一首歌的判定、时间格式化
│  ├─ ambient.ts           从封面取主色，驱动背景氛围光
│  └─ storage.ts           安全的 localStorage 数值读写
└─ services/               各数据源实现 + 歌词解析
```

## 加一个新数据源

在 `src/services/` 下实现 `MusicProvider` 接口，然后注册到 `src/services/index.ts` 的
`providers` 数组，UI 上会自动出现对应的切换按钮。

```ts
export const myProvider: MusicProvider = {
  id: "my",
  name: "我的源",
  enabled: true,
  async search({ keyword }) {
    return { tracks: [/* Track[] */] };
  },
  // 可选：src 会过期时，在这里现取播放地址
  async getPlayUrl(track) {
    return "https://...";
  },
  // 可选：返回歌词
  async getLyric(track) {
    return [/* LyricLine[] */];
  },
};
```

## 已知限制

- 歌词解析只覆盖 LRC / qrc 两种格式，实测数据来自 QQ 音乐接口。
- 播放地址由第三方接口直出，部分源会限流或临时失效，失败时界面会提示。
- 移动端锁屏控制依赖 Media Session，桌面浏览器上只有部分实现支持。