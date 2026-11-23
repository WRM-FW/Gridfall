# Gridfall — 棋盘 / 游戏大厅

五子棋、国际连珠、围棋三张棋盘，支持单机人机、本地双人和联机开房。首页是平台大厅，后续会继续接入更多不同类型的游戏。

- 游戏大厅（Cloudflare Pages，主站）：https://play-gridfall.pages.dev/
- GitHub Pages：https://wrm-fw.github.io/Gridfall/

两处部署的是同一份文件：`index.html` 是首页，`play.html` 是对局页。`gridfall.pages.dev` 已被其他项目占用，因此主站使用 `play-gridfall.pages.dev`。

## 本地运行

直接打开 `index.html`（或 `play.html`）即可，无需构建、无需安装依赖。

- 单机与本地双人：离线可用。
- 联机：需要网络；页面进入联机模式时才懒加载 `supabase.js` 与 `supabase-config.js`。

## 文件

| 文件 | 说明 |
| --- | --- |
| `index.html` | 游戏大厅首页：品牌入口、迷你棋盘、游戏卡片、筛选/搜索、玩法一览、后续游戏规划 |
| `play.html` | 对局页：五子棋（普通/连珠，含 RIF 正式开局）、围棋（9/13/19 路）、联机 |
| `supabase.js` | 内置 `@supabase/supabase-js` UMD，仅联机时加载 |
| `supabase-config.js` | Supabase URL 与 publishable key（客户端公开 key，不含 service_role） |

## 联机

- Supabase Realtime Broadcast + Presence，每个房间一个公共频道 `gridfall-room-<6位房间码>`；广播 `state` / `intent` / `ping` / `pong` / `bye` / `reject` 事件。
- 没有数据库表：房间状态由房主保存在内存中，每次变更广播完整快照；双方都离开后房间结束。房主刷新会失去房间权威状态；客端在房主在线时可以凭房间码重连。
- 房主是权威端，落子、禁手、胜负、劫争都按本地规则判定；客户端只渲染快照，未轮到的一方不能落子。
- 免费版额度内使用，没有引入付费服务；没有使用 service_role 或 secret key。房间码即入场凭证，频道是公共频道，不要把房间码发给无关的人。

## 部署

Cloudflare Pages（主站）：

```bash
npx wrangler pages deploy <包含 index.html / play.html / supabase.js / supabase-config.js 的目录> \
  --project-name play-gridfall --branch main
```

GitHub Pages：从 `main` 分支根目录发布，推送后自动更新。

## 视觉

- 游戏大厅直接复用项目素材库 `00_Gridfall首页.html` 的蓝色街机大厅设计，并替换为当前真实游戏与联机入口。
- 对局页复用 `01_木质棋盘陶瓷棋子以及配套UI.html` 的木质棋盘、陶瓷棋子与瓷白/深木 UI，Canvas 绘制。

## 测试

```bash
cd tests
node run-engine.mjs
node local-visual.mjs
node online-core.mjs
node online-extra.mjs
node online-swap.mjs
node home-test.mjs
node live-home.mjs
node live-online.mjs
```

详见 `tests/README.md`。

## 已验证

- 引擎规则测试 31/31；本地界面 5/5；联机核心 7/7；联机扩展 5/5；线上核心 4/4；线上正式连珠交换 4/4；首页与深链接 9/9。
- 线上用两个独立浏览器实例完成整局五子棋、Renju 正式开局（不交换/交换）、围棋 9 路双停数子、再来一局、认输、掉线重连。

## 已知限制

- 联机房间不持久化；房主刷新/关闭即结束。
- 没有账号体系与房间密码，房间码是唯一凭证。
- 联机用同一台机器上的两个独立浏览器实例验证，未在两台物理设备/移动端实机对弈。
- 正式连珠人机 AI 不会交换、战绩未按执子分桶、切页时五子棋计时继续走等单机侧历史问题不在本次范围内。