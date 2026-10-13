import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  // 用相对路径，产物放在任意子目录（GitHub Pages 的 /<repo>/）都能正常加载
  base: "./",
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  server: {
    // 只在 npm run dev 生效；静态部署要用 .env.production 里的直连地址
    proxy: {
      "/api/kuwo": {
        target: "https://oiapi.net",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/kuwo/, "/api/Kuwo"),
      },
      "/api/163": {
        target: "https://oiapi.net",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/163/, "/api/Music_163"),
      },
      "/api/qq": {
        target: "http://cyapi.top",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/qq/, "/API/qq_music.php"),
      },
    },
  },
});
