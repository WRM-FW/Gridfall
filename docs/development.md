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
- 大厅封面在 `assets/covers/`（1200×600 PNG）；新增或替换封面后重新构建 `index.html` 与 `dist/`，并确认 `tools/build-dist.mjs` 已复制该目录。
- 源在 `tools/`：
  - `tools/design/home-reference.html`：大厅视觉参考
  - `tools/design/board-reference.html`：木质陶瓷对局视觉参考
  - `tools/design/xiangqi-reference.html`：中国象棋视觉与引擎参考
  - `tools/src/legacy.html`：旧单页，作为引擎提取来源
  - `tools/design/tiaoqi-reference.html`、`2048-reference.html`、`junqi-reference.html`、`saolei-reference.html`：四款小游戏参考
  - `tools/src/markup.html`、`extra.css`、`visual.js`、`online.js`、`deeplink.js`、`xiangqi-online.js`
  - `tools/build-page.mjs`、`tools/build-home.mjs`、`tools/build-xiangqi.mjs`、`tools/build-minigames.mjs`、`tools/build-dist.mjs`
- 修改界面请改 `tools/src` 或 `tools/design` 后重新构建，不要只手改生成文件；如果确实直接修了生成文件，下一次构建会覆盖。
- 构建：
  ```bash
  node tools/build-page.mjs   # 生成 play.html
  node tools/build-home.mjs   # 生成 index.html
  node tools/build-xiangqi.mjs # 生成 xiangqi.html
  node tools/build-minigames.mjs # 生成 tiaoqi / game2048 / junqi / saolei
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

## 围棋 AI 难度

- 五档参数集中在 `tools/src/legacy.html` 的 `GO_LEVELS`；改一档不影响其他档。
- 引擎分支：`novice`（局部/漏看）、`basic`（局部快评）、`eval`（全盘评估）、`search`/`deep`（应手搜索）。
- 对抗测试：`node tests/go-bench.mjs --size=9 --low=4 --high=5 --games=20`；19 路冒烟：`node tests/go-smoke.mjs`。
- 当前实测未达到“极难对普通 ≥85%”的目标，界面标注已下调为保守范围。

## 点单 / 社区共建

- 开发者邮箱：3391792088@qq.com
- 贡献流程见仓库根目录 `CONTRIBUTING.md`：自己开发或借助 AI 辅助做单文件小游戏、首页卡片、拼音首字母路由、测试与 PR。
- 新游戏合并后按现有部署流程验证 Cloudflare Pages 与 GitHub Pages。

## 扩展新游戏

1. 新建独立游戏页（或扩展 `play.html` 的深链接）。
2. 在 `index.html` 的游戏网格加一张 `game-card`：`data-status`、`data-name`、标签、链接；筛选和搜索会自动纳入。
3. 同步更新玩法一览与「即将推出」；补充对应测试。

## 游戏入口路由

- 规则：游戏中文名的汉语拼音首字母，全部大写，直接作为主域名下的一级路径；不使用子域名。
- 每个入口必须是可刷新、可复制、可前进/后退的真实 URL，不依赖前端内存路由。
- 当前已上线：
  - 黑白棋社：`/HBQS`（Cloudflare Pages `_redirects` 200 代理到 `play.html`，地址保持 `/HBQS`；`/HBQS/` 301 到 `/HBQS`；GitHub Pages 用 `HBQS/index.html`（以 `/HBQS/` 访问）回退到 `play.html`）
- 预留命名（后续上线时按同一规则创建入口与 `_redirects`）：
  | 游戏 | 路径 |
  | --- | --- |
    | 国际象棋 | `/GJXQ` |
  | 跳棋 | `/TQ` |
  | 军棋 | `/JQ` |
  | 扫雷 | `/SL` |
  | 卡牌 | `/KP` |
  | 四子棋 | `/SZQ` |
- 新增入口步骤：生成本地入口页或确定承载页 → 在 `_redirects` 加 `200` 代理 → 加斜杠 `301` 到无斜杠 → 加 GitHub Pages 回退目录（如需镜像）→ 首页卡片指向该路径 → 更新 `tests/route-test.mjs` 或同等路由测试。
