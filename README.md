# Gridfall

浏览器里的棋牌与休闲游戏合集。无需下载、无需账号，打开网页就能玩；其中 3 款游戏支持多人联机，整个站点也可以安装为独立应用。

- 主站（Cloudflare Pages）：https://play-gridfall.pages.dev/
- 镜像（GitHub Pages）：https://wrm-fw.github.io/Gridfall/
- 开源仓库：https://github.com/WRM-FW/Gridfall

## 玩家指南

### Gridfall 是什么

Gridfall 目前收录 12 个入口、14 种玩法，按类型分为：

| 类型 | 内容 |
| --- | --- |
| 棋类 | 黑白棋社（五子棋 / 国际连珠 / 围棋）、中国象棋、跳棋、军棋、井字棋 |
| 益智 / 街机 | 2048、扫雷、贪吃蛇、推箱子、俄罗斯方块、跳一跳 |
| 卡牌 | UNO |

多数棋类提供人机对弈，部分支持同屏双人；具体模式以进入游戏后的选项为准。黑白棋社、中国象棋和 UNO 支持联网对战。

### 开始游玩

1. 打开主站或镜像地址，在首页选择游戏，也可以按「可联机 / 棋类 / 益智 / 街机 / 牌类」筛选或直接搜索。
2. 进入游戏后选择人机、同屏双人或联机模式。
3. 不需要注册；棋局记录、最高分与界面偏好只保存在当前浏览器。

### 联机对战

联机入口位于对应游戏页面内。常见流程：

1. 房主创建房间，得到 6 位房间码。
2. 其他玩家输入房间码加入。
3. 人数满足要求后由房主开局。

各游戏规则：

- **黑白棋社**：房主和第一个加入的成员是正式玩家；之后加入的成员进入观战席，只能看不能下。房主默认执黑，开局前可申请换方。观战者不会占用或继承正式席位；玩家掉线后，房主在线时可用同一浏览器会话重新加入。
- **中国象棋**：两名玩家，房主默认执红；开局前可申请换方，支持认输和再来一局。
- **UNO**：3 人或 4 人房，满员后由房主开局；支持 +2/+4 叠加规则、喊 UNO 与抓 UNO，结束后可由房主开新局。

联机需要网络。房间状态只保存在房主浏览器中，不写入服务器；房主关闭或刷新页面后房间结束。房间码是加入房间的唯一凭证，请只发给你信任的人。

### 安装为应用

Gridfall 支持 PWA：

- Chrome / Edge：使用地址栏中的安装图标，或「更多工具 → 应用 → 安装此站点为应用」。
- iPhone / iPad：在 Safari 中分享 → 添加到主屏幕。
- 安装后的应用名称是 **Gridfall**，以独立窗口运行，并适配 iOS 刘海屏、灵动岛和横竖屏安全区域。
- 已缓存的页面可以离线打开；联机、首次进入新页面等仍需网络。暂不支持推送通知。

### 数据与限制

- 没有账号体系，也没有云端存档；清除浏览器数据会丢失本地记录。
- 观战功能目前只在黑白棋社提供。
- 人机对弈使用浏览器内的启发式引擎，棋力有限，不依赖云端算力。

## 开发者指南

### 技术栈

| 层 | 实现 |
| --- | --- |
| 前端 | 原生 HTML / CSS / JavaScript，无前端框架、无运行时构建依赖 |
| 图形与声音 | Canvas 2D；跳一跳使用本地打包的 Three.js；音效通过 Web Audio 合成 |
| 联机 | Supabase Realtime 的 Broadcast + Presence，客户端库随项目本地提供 |
| 数据存储 | 无服务端数据库；房间状态在房主内存中，偏好/最高分/会话标识使用浏览器存储 |
| PWA | Web App Manifest、Service Worker、离线应用外壳 |
| 构建 | Node.js ESM 脚本生成静态页面与部署产物 |
| 部署 | Cloudflare Pages 主站；GitHub Pages 静态镜像 |
| 测试 | Node.js + 无头 Edge（通过 CDP 驱动） |

### 整体架构

```text
浏览器
├─ Gridfall 首页（静态页面）
├─ games/<slug>/index.html（独立游戏页面）
│  ├─ 本地规则与 AI
│  └─ 联机模式：Supabase Realtime
│       房主：保存权威状态，校验操作，广播完整快照
│       客人：发送操作意图，渲染快照
└─ PWA：manifest + Service Worker
静态托管：Cloudflare Pages / GitHub Pages
```

关键设计：

- **纯静态前端**：没有自建应用服务器，所有单机规则、AI 和渲染都在浏览器内运行。
- **房主权威联机**：房主负责规则判定和状态维护，广播快照；客人只发送动作意图，不能直接改状态。Presence 用于维护房间成员与观战者身份。
- **无数据库**：联机不创建数据表、不使用账号；以房间码隔离的公共 Realtime 频道承载通信。房主离开后房间结束。
- **静态路由**：Cloudflare Pages 使用 `_redirects` 把无扩展路径映射到对应游戏目录；GitHub Pages 使用根目录 `404.html` 回退。两种部署都支持刷新、复制链接和前进后退。
- **PWA**：Service Worker 预缓存首页与基础资源；页面导航网络优先，静态资源在后台更新；跨域请求（Supabase、字体等）不拦截。
- **移动端适配**：CSS 使用安全区变量处理 iOS 主屏幕应用的顶部、左右与横屏布局。

### 主要模块

| 模块 | 职责 |
| --- | --- |
| 首页 | 游戏入口、分类筛选、搜索、玩法介绍与站点导航 |
| 黑白棋社 | 五子棋、国际连珠、围棋的规则、AI、同屏双人与双人联机（含观战） |
| 中国象棋 | 象棋规则、AI、同屏双人与双人联机、换方/认输/再来一局 |
| UNO | 3/4 人机与联机、牌组与特殊牌规则、UNO/抓 UNO、叠加设置 |
| 小游戏 | 跳棋、军棋、2048、扫雷、贪吃蛇、推箱子、俄罗斯方块、井字棋、跳一跳 |
| 共享层 | Supabase 客户端与公开配置、Three.js、PWA 注册与安全区支持 |
| 构建工具 | 从源模板生成首页与游戏页面，并产出静态部署目录 |
| 测试 | 规则、联机、路由、命名、安全区、PWA 与视觉回归测试 |

项目结构：

```text
index.html                  首页
games/<slug>/index.html     各游戏页面
shared/                     联机客户端、公开配置与本地第三方库
tools/                      页面生成源与构建脚本
tests/                      无头浏览器测试
manifest.webmanifest        PWA 清单
sw.js                       Service Worker
pwa.js                      Service Worker 注册
```

### 本地开发

需要 Node.js 22 或更高版本。只玩单机时直接打开 `index.html` 即可；联机和 PWA 需要 HTTP 环境：

```bash
# 在仓库根目录
python -m http.server 8080
# 打开 http://localhost:8080/
```

本地没有 Cloudflare 的路径重写，请直接访问 `games/<slug>/index.html` 或对应目录。

联机默认使用仓库内的公开 Supabase 配置。如果你 fork 项目或使用自己的环境，请替换 `shared/supabase-config.js` 中的项目 URL 与 publishable/anon key，并在 Supabase 项目中启用 Realtime。不要提交 service_role 或 secret key。

**构建**：首页和游戏页由 Node 脚本生成，生成结果会提交到仓库。修改 `tools/` 下的源后重新构建：

```bash
node tools/build-home.mjs       # 首页
node tools/build-page.mjs       # 黑白棋社
node tools/build-xiangqi.mjs    # 中国象棋
node tools/build-minigames.mjs  # 跳棋、军棋、2048、扫雷、贪吃蛇、推箱子、俄罗斯方块、井字棋、跳一跳
node tools/build-uno.mjs        # UNO
node tools/build-dist.mjs       # 生成 dist/ 部署产物
```

**测试**：测试需要 Node.js 22+ 与本机 Edge，联机用例需要网络。完整清单见 `tests/README.md`，常用入口：

```bash
cd tests
node run-engine.mjs
node home-test.mjs
node online-core.mjs
node uno-rules.mjs
node safe-area.mjs
node pwa.mjs
```

### 部署

- **Cloudflare Pages**：`dist/` 是部署产物，包含首页、游戏、共享资源、PWA 文件与路由规则。

  ```bash
  node tools/build-dist.mjs
  npx wrangler pages deploy dist --project-name play-gridfall --branch main
  ```

- **GitHub Pages**：从 `main` 分支根目录发布，推送后自动更新。
- **访问地址**：Cloudflare `https://play-gridfall.pages.dev/`；GitHub Pages `https://wrm-fw.github.io/Gridfall/`。
- **仓库**：https://github.com/WRM-FW/Gridfall。

### 参与共建

欢迎提交新游戏、规则修正或体验改进，流程与文件约定见 [CONTRIBUTING.md](CONTRIBUTING.md)；想点单新玩法也可以邮件联系 3391792088@qq.com。

### 已知限制

- 没有账号、权限或云端存档；联机房间码就是访问凭证，频道为公共频道。
- 房间不持久化，房主刷新或关闭后结束；掉线重连需要同一浏览器会话。
- 观战只支持黑白棋社；UNO 和中国象棋为纯双人/多人对局，没有观战席。
- AI 为纯前端启发式实现，围棋等复杂局面的棋力有限。
- PWA 离线能力限于已缓存页面，联机功能必须联网。