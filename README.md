# Gridfall

纯静态网页棋牌与休闲游戏合集，无需登录和下载，打开即可游玩。

- 主站：https://play-gridfall.pages.dev/
- 镜像：https://wrm-fw.github.io/Gridfall/

## 收录内容

共 12 个入口、14 种玩法：

| 分类 | 游戏 |
| --- | --- |
| 棋类 | 黑白棋社（五子棋 / 国际连珠 / 围棋）、中国象棋、跳棋、军棋、井字棋 |
| 益智 / 街机 | 2048、扫雷、贪吃蛇、推箱子、俄罗斯方块、跳一跳 |
| 卡牌 | UNO |

单机模式使用本地启发式 AI 与浏览器存储（记录、最高分与设置仅保存在当前设备）。

### 联机对战

黑白棋社、中国象棋和 UNO 支持基于房间码的实时联机（Supabase Realtime），房间状态由房主浏览器内存维护，房主关闭或刷新页面后房间结束。

- **黑白棋社**：前两位加入者分执黑白（开局前可换方），其余进入观战席；掉线后房主在线时可用同一浏览器会话重连。
- **中国象棋**：双人对弈，房主默认执红，支持换方、认输与再来一局。
- **UNO**：3–4 人局，支持 `+2 / +4` 叠加、喊 UNO 与抓漏喊，结束后可由房主开新局。

### 桌面端安装与移动端说明

- **桌面端（Chrome / Edge）**：支持通过浏览器安装为独立窗口应用（Gridfall），已缓存页面可离线打开。
- **iOS / iPadOS**：受限于系统主屏幕独立模式（standalone）的底层兼容 BUG，目前不推荐通过 Safari「添加到主屏幕」使用，请直接在Safari中访问游玩。

## 开发与构建

项目为纯原生 HTML / CSS / JS 静态站点，无前端框架、无 `package.json`、无服务端数据库。

```text
index.html              首页（构建生成）
games/<slug>/index.html 游戏页（构建生成）
tools/                  源模板（src/、design/）与构建脚本（build-*.mjs）
shared/                 联机客户端、公开配置与本地 Three.js
tests/                  自动化测试（Node.js 22+ 与本机 Edge，见 tests/README.md）
docs/development.md     开发与发布约定
_redirects / 404.html   Cloudflare Pages 与 GitHub Pages 路由配置
manifest.webmanifest / pwa.js / sw.js
```

### 本地预览

单机游玩可直接打开 `index.html`；调试联机或 Service Worker 需在根目录启动本地 HTTP 服务（本地无路径重写，请直接访问 `games/<slug>/index.html`）：

```bash
python -m http.server 8080
```

如需接入自己的 Supabase 环境，请修改 `shared/supabase-config.js` 中的 URL 与公开 key 并开启 Realtime，勿提交 `service_role` 或私密凭证。

### 构建与测试

修改 `tools/src/` 或 `tools/design/` 后，运行对应脚本重新生成页面并提交产物（`dist/` 不入库）：

```bash
node tools/build-home.mjs
node tools/build-page.mjs
node tools/build-xiangqi.mjs
node tools/build-minigames.mjs
node tools/build-uno.mjs
node tools/build-dist.mjs
```

常用测试（在 `tests/` 目录执行）：

```bash
cd tests
node run-engine.mjs
node home-test.mjs
node online-core.mjs
node uno-rules.mjs
node safe-area.mjs
node pwa.mjs
```

## 共建与已知限制

欢迎提交新游戏或规则修复，约定见 [CONTRIBUTING.md](CONTRIBUTING.md)；点单新玩法或反馈问题可联系 `3391792088@qq.com`。

- **iOS / iPadOS**：standalone 模式存在无法解决的兼容问题，请使用常规浏览器。
- **无账号与云存档**：本地进度仅存于当前浏览器；联机房间不持久化。
- **AI 棋力有限**：人机对弈均为前端启发式实现。
- **观战范围**：仅黑白棋社支持观战，其余联机游戏暂不支持。
