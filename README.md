# Gridfall — 棋盘 / 游戏大厅

黑白棋社（五子棋 / 国际连珠 / 围棋）、中国象棋、跳棋、军棋、2048、扫雷。黑白棋社与中国象棋支持单机/本地/联机；跳棋、军棋为本地对弈；2048、扫雷为单人。首页是平台大厅，后续继续接入更多游戏。

- 游戏大厅（Cloudflare Pages，主站）：https://play-gridfall.pages.dev/
- 黑白棋社：https://play-gridfall.pages.dev/HBQS
- 中国象棋：https://play-gridfall.pages.dev/ZGXQ
- 跳棋：https://play-gridfall.pages.dev/TQ
- 2048：https://play-gridfall.pages.dev/2048
- 军棋：https://play-gridfall.pages.dev/JQ
- 扫雷：https://play-gridfall.pages.dev/SL
- GitHub Pages：https://wrm-fw.github.io/Gridfall/ （`/Gridfall/HBQS/`→`play.html`，`/Gridfall/ZGXQ/`→`xiangqi.html`，`TQ/`、`2048/`、`JQ/`、`SL/` 各自回退到对应页面）

`index.html` 是平台首页；`/HBQS` 黑白棋社、`/ZGXQ` 中国象棋、`/TQ` 跳棋、`/2048` 2048、`/JQ` 军棋、`/SL` 扫雷均为固定入口，200 代理到各自页面；地址保持无扩展路径。`gridfall.pages.dev` 已被其他项目占用，因此主站使用 `play-gridfall.pages.dev`。

## 本地运行

直接打开 `index.html`（或 `play.html`）即可，无需构建、无需安装依赖。

- 单机与本地双人：离线可用。
- 联机：需要网络；页面进入联机模式时才懒加载 `supabase.js` 与 `supabase-config.js`。

## 文件

| 文件 | 说明 |
| --- | --- |
| `index.html` | 游戏大厅首页：品牌入口、迷你棋盘、游戏卡片、筛选/搜索、玩法一览、后续游戏规划 |
| `/HBQS` | 黑白棋社的固定入口（`_redirects` 200 代理到 `play.html`） |
| `play.html` | 黑白棋社对局页：五子棋（普通/连珠，含 RIF 正式开局）、围棋（9/13/19 路）、联机 |
| `xiangqi.html` | 中国象棋：人机、双人、联机，Canvas 棋盘与木质落子音效 |
| `tiaoqi.html` | 跳棋：六角星棋盘，人机/双人 |
| `game2048.html` | 2048：单人数字合并 |
| `junqi.html` | 军棋：暗棋陆战棋，人机/双人 |
| `saolei.html` | 扫雷：单人，三档难度/自定义 |
| `_redirects` | Cloudflare Pages 路由：六个游戏入口 200 代理，尾斜杠 301 |
| `assets/covers/` | 大厅游戏封面（1200×600 PNG；`connect4.png` 为四子棋预留） |
| `CONTRIBUTING.md` | 点单与社区共建：AI Agent 开发、PR 流程、开发者邮箱 |
| `HBQS/index.html` | GitHub Pages 的入口回退，跳转到 `play.html` |
| `ZGXQ/index.html` | GitHub Pages 的入口回退，跳转到 `xiangqi.html` |
| `TQ/2048/JQ/SL/index.html` | GitHub Pages 的入口回退 |
| `tools/` | 构建源、设计参考与构建脚本 |
| `tests/` | 无头测试 |
| `supabase.js` | 内置 `@supabase/supabase-js` UMD，仅联机时加载 |
| `supabase-config.js` | Supabase URL 与 publishable key（客户端公开 key，不含 service_role） |

## 联机

- Supabase Realtime Broadcast + Presence；黑白棋社频道 `gridfall-room-<房间码>`，中国象棋频道 `gridfall-xq-room-<房间码>`；广播 `state` / `intent` / `ping` / `pong` / `bye` / `reject` 事件。
- 没有数据库表：房间状态由房主保存在内存中，每次变更广播完整快照；双方都离开后房间结束。房主刷新会失去房间权威状态；客端在房主在线时可以凭房间码重连。
- 房主是权威端，落子、禁手、胜负、劫争都按本地规则判定；客户端只渲染快照，未轮到的一方不能落子。
- 黑白棋社房主默认执黑；任一方可在开局前申请换方，由对方同意或拒绝；正式连珠使用自身开局交换步骤。中国象棋房主默认执红（红先），同样支持换方申请。
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
- 大厅游戏封面统一使用 `assets/covers/` 下的 1200×600 插画，`.gv-cover-img` 以 `object-fit: cover` 填充 168px 高的封面区；“已上线 / 规划中 / 持续上新”徽标仍由页面叠加。
- 黑白棋社对局页复用 `01_木质棋盘陶瓷棋子以及配套UI.html` 的木质棋盘、陶瓷棋子与瓷白/深木 UI，Canvas 绘制。
- 中国象棋复用 `03_中国象棋.html` 的深色 Canvas 棋盘与面板；落子音效改为 Web Audio 合成的木质拍盘声。
- 跳棋、2048、军棋、扫雷直接复用素材库同名文件，仅加固定返回大厅入口与路由，不改动游戏本体视觉。

## 入口命名

游戏中文名的汉语拼音首字母大写，直接追加在主域名后；不使用子域名。当前线上与预留：

| 游戏 | 路径 |
| --- | --- |
| 黑白棋社 | `/HBQS`（已上线） |
| 中国象棋 | `/ZGXQ`（已上线） |
| 跳棋 | `/TQ`（已上线） |
| 2048 | `/2048`（已上线） |
| 军棋 | `/JQ`（已上线） |
| 扫雷 | `/SL`（已上线） |
| 国际象棋 | `/GJXQ` |
| 卡牌 | `/KP` |
| 四子棋 | `/SZQ` |

新增游戏时：首页加一张卡片，创建对应入口并加同样规则的路由；详见 `docs/development.md`。

## 点单 / 共建

- 开发者邮箱：3391792088@qq.com
- 有想做的玩法，可以让 AI Agent 做一个单文件小游戏，向仓库提交 PR；具体约定与流程见 `CONTRIBUTING.md`。通过后会摆进大厅。

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
node route-test.mjs
node online-colors.mjs
node xiangqi-route.mjs
node xiangqi-online.mjs
node minigames-smoke.mjs
node minigames-route.mjs
```

详见 `tests/README.md`。

## 已验证

- 引擎规则测试 31/31；本地界面 5/5；联机核心 7/7；联机扩展 5/5；线上核心 4/4；线上正式连珠交换 4/4；首页与深链接 12/12；换方 6/6；/HBQS 路由 7/7；/ZGXQ 路由 4/4；象棋联机 7/7；跳棋/2048/军棋/扫雷路由 9/9。
- 线上用两个独立浏览器实例完成整局五子棋、Renju 正式开局（不交换/交换）、围棋 9 路双停数子、再来一局、认输、掉线重连。
- `/HBQS` 与 `/ZGXQ` 已实测：直接访问、刷新、尾斜杠 301、首页进入与浏览器前进/后退；`/HBQS` 的查询参数也已验证。
- 中国象棋联机已实测：房主红/客端黑、双向落子同步、换方、认输、再来一局、音效开关。
- 跳棋/军棋加载与布阵、2048 键盘移动、扫雷首击展开均已本地实测；四个入口线上已测直接访问/刷新/尾斜杠/首页卡片。

## 已知限制

- 联机房间不持久化；房主刷新/关闭即结束。
- 没有账号体系与房间密码，房间码是唯一凭证。
- 联机用同一台机器上的两个独立浏览器实例验证，未在两台物理设备/移动端实机对弈。
- 正式连珠人机 AI 不会交换、战绩未按执子分桶、切页时五子棋计时继续走等单机侧历史问题不在本次范围内。
- 中国象棋棋子声为 Web Audio 合成，未使用外部音频文件；未做真机听感的主观评测。