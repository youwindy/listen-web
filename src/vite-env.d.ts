/**
 * 注入的构建期环境变量声明。
 * https://vite.dev/guide/env-and-mode.html
 */

interface ImportMetaEnv {
  /** 酷我接口前缀，如 https://oiapi.net/api/Kuwo */
  readonly VITE_API_BASE_KUWO?: string;
  /** 网易云接口前缀，如 https://oiapi.net/api/Music_163 */
  readonly VITE_API_BASE_163?: string;
  /** QQ音乐接口前缀（需自备支持 CORS 的 HTTPS 服务） */
  readonly VITE_API_BASE_QQ?: string;
  /** QQ音乐 apikey */
  readonly VITE_QQ_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}