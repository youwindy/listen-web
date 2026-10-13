/**
 * 各数据源的接口地址。
 *
 * 本地开发时走 vite.config.ts 里的 server.proxy —— 那个代理只存在于
 * `npm run dev`，静态部署（GitHub Pages）根本没有代理能力，
 * 所以打包发布时必须用环境变量指向上游直连地址，否则页面能打开但搜索全 404。
 *
 * 默认值保持 /api/*，本地开发行为和之前完全一致。
 */

/** QQ 音乐的上游：没有显式配置地址时，静态部署下不可用（上游只有 HTTP） */
export const QQ_BASE = import.meta.env.VITE_API_BASE_QQ;

export const API_BASE = {
  kuwo: import.meta.env.VITE_API_BASE_KUWO || "/api/kuwo",
  netease: import.meta.env.VITE_API_BASE_163 || "/api/163",
  qq: QQ_BASE || "/api/qq",
} as const;

export const QQ_API_KEY =
  import.meta.env.VITE_QQ_API_KEY ||
  "62ccfd8be755cc5850046044c6348d6cac5ef31bd5874c1352287facc06f94c4";