/**
 * 把 dist/ 发布到 GitHub Pages（gh-pages 分支方式）。
 *
 *   npm run deploy
 *
 * 没用 Actions 工作流：往 .github/workflows/ 推文件需要额外的 workflow scope，
 * 而 gh-pages 分支只需要普通 repo 权限，本地跑一次就能生效。
 * 改完代码重新跑一次即可更新线上。
 *
 * 可用环境变量：
 *   PAGES_REPO   目标仓库，默认从 git remote 推断
 *   PAGES_BRANCH 分支名，默认 gh-pages
 */
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const DIST = resolve("dist");
const BRANCH = process.env.PAGES_BRANCH || "gh-pages";

if (!existsSync(join(DIST, "index.html"))) {
  console.error("dist/index.html 不存在，先执行 npm run build");
  process.exit(1);
}

const git = (cwd, ...args) =>
  execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

function guessRepo() {
  if (process.env.PAGES_REPO) return process.env.PAGES_REPO;
  try {
    const url = git(process.cwd(), "remote", "get-url", "origin").trim();
    const m = url.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
    if (m) return `${m[1]}/${m[2]}`;
  } catch {
    // 没有 remote 就走下面的兜底
  }
  throw new Error("无法确定目标仓库，请设置 PAGES_REPO 环境变量");
}

const repo = guessRepo();

// 在临时目录里单独初始化一个仓库，避免污染工作区
const tmp = mkdtempSync(join(tmpdir(), "pages-"));
try {
  cpSync(DIST, tmp, { recursive: true });
  // Pages 默认会用 Jekyll 处理分支，_ 开头的目录会被丢掉，这里明确关掉
  writeFileSync(join(tmp, ".nojekyll"), "");

  git(tmp, "init", "-b", BRANCH);
  git(tmp, "add", "-A");
  git(tmp, "commit", "-q", "-m", "deploy: 更新 GitHub Pages");
  git(tmp, "remote", "add", "origin", `https://github.com/${repo}.git`);
  git(tmp, "push", "--force", "origin", BRANCH);

  const [owner, name] = repo.split("/");
  console.log(`已发布到 https://${owner}.github.io/${name}/`);
  console.log("首次启用可能需要 1-2 分钟，仓库 Settings → Pages 里能看到状态。");
} finally {
  rmSync(tmp, { recursive: true, force: true });
}