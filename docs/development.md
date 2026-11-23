# 开发与 Git 工作流

## 唯一云端目标

- 远程仓库：https://github.com/WRM-FW/Gridfall
- 默认分支：`main`
- 所有开发改动最终都提交并推送到该仓库；不要添加其他 push remote，也不要向其他仓库同步。
- 不强制推送 `main`；需要试验时在本地分支完成后合并回 `main`。

## 提交与推送

1. 改完一个完整改动后先本地构建、测试。
2. `git status` 确认不包含凭据、临时文件或 `tests/shots` / `tests/results`。
3. 提交并推送：
   ```bash
   git add <files>
   git commit -m "<what changed and why>"
   git push origin main
   ```
4. 推送后验证 Cloudflare Pages 与 GitHub Pages；只推送不等于部署验证完成。

## 源文件与生成文件

- `index.html`（游戏大厅）和 `play.html`（对局页）是生成文件，同时是部署产物，必须提交。
- 源在 `tools/`：
  - `tools/design/home-reference.html`：大厅视觉参考
  - `tools/design/board-reference.html`：木质陶瓷对局视觉参考
  - `tools/src/legacy.html`：旧单页，作为引擎提取来源
  - `tools/src/markup.html`、`extra.css`、`visual.js`、`online.js`、`deeplink.js`
  - `tools/build-page.mjs`、`tools/build-home.mjs`、`tools/build-dist.mjs`
- 修改界面请改 `tools/src` 或 `tools/design` 后重新构建，不要只手改生成文件；如果确实直接修了生成文件，下一次构建会覆盖。
- 构建：
  ```bash
  node tools/build-page.mjs   # 生成 play.html
  node tools/build-home.mjs   # 生成 index.html
  node tools/build-dist.mjs   # 生成 dist/（部署用）
  ```
- `dist/` 不入库；部署：
  ```bash
  npx wrangler pages deploy dist --project-name play-gridfall --branch main
  ```

## 测试

- 测试在 `tests/`，需要 Node ≥ 22 和本机 Edge。
- 详见 `tests/README.md`；提交前至少跑引擎、首页和联机核心。
- 截屏与结果分别写到 `tests/shots/`、`tests/results/`，均被忽略。

## 凭据

- 客户端只允许 publishable key（`supabase-config.js`，公开）。
- 不要提交 `.env*`、`.secrets/`、service_role/secret key 或数据库密码。
- 本地配置放在仓库外的 `.env.local` 或 `.secrets/`；`.gitignore` 已覆盖。

## 部署目标

- 主站：Cloudflare Pages 项目 `play-gridfall` → https://play-gridfall.pages.dev/
- 镜像：GitHub Pages → https://wrm-fw.github.io/Gridfall/
- `gridfall.pages.dev` 属于其他项目，不使用。

## 扩展新游戏

1. 新建独立游戏页（或扩展 `play.html` 的深链接）。
2. 在 `index.html` 的游戏网格加一张 `game-card`：`data-status`、`data-name`、标签、链接；筛选和搜索会自动纳入。
3. 同步更新玩法一览与「即将推出」；补充对应测试。
