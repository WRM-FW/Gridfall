# 共建 Gridfall

欢迎提交单文件小游戏、规则修复或体验优化。

## 联系与参考

- 邮箱：3391792088@qq.com
- 开发说明：`docs/development.md`
- 测试清单：`tests/README.md`

> `tools/` 迭代较快，源文件与构建入口请以 `tools/` 目录实际内容为准。

## 基本约定

1. **单文件、零运行时依赖**：游戏放在 `games/<slug>/index.html`，目录名使用小写英文与连字符（如 `chinese-checkers`，`2048` 保持数字），勿放在仓库根目录。优先离线可玩，涉及联网功能需在 PR 中说明。
2. **返回入口**：游戏页保留固定的「← 首页」入口，链接到 `../../index.html`。
3. **构建与路由同步**：修改 `tools/` 后需运行对应 `node tools/build-*.mjs` 并提交生成的 HTML（不提交 `dist/`）。新增游戏需同步更新首页卡片、`_redirects` 和 `404.html`。
4. **凭证规范**：客户端只保留公开的 Supabase `publishable/anon` key（`shared/supabase-config.js`），严禁提交 `.env*`、`.secrets/` 或私密密钥。
5. **移动端边界**：以常规手机浏览器正常显示为准。

## PR 流程

1. Fork 本仓库并新建分支完成改动。
2. 在本地 HTTP 服务（如 `python -m http.server 8080`）下自测，按需运行 `tests/` 下相关用例。
3. 提交 PR，注明游戏名称、路由、玩法说明及自测截图或结果。
4. 合并到 `main` 后，Cloudflare Pages 与 GitHub Pages 会自动更新。