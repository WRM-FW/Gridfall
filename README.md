# Gridfall — 棋盘 / 游戏大厅

黑白棋社（五子棋 / 国际连珠 / 围棋）、中国象棋、跳棋、军棋、2048、扫雷、贪吃蛇、推箱子、俄罗斯方块、井字棋、跳一跳、UNO。黑白棋社、中国象棋与 UNO 支持联机；其余为本地或单人。首页是平台大厅，后续继续接入更多游戏。

- 主站（Cloudflare Pages，游戏大厅）：https://play-gridfall.pages.dev/
- GitHub Pages 访问入口：https://wrm-fw.github.io/Gridfall/

`index.html` 是平台首页；所有游戏统一放在 `games/<英文名>/` 下。

## 目录结构

```text
index.html                  平台大厅
404.html                    GitHub Pages 入口回退（新旧 URL → games/）
_redirects                  Cloudflare Pages 路由与旧 URL 301
games/
  board-club/index.html     黑白棋社：五子棋 / 连珠 / 围棋 / 联机
  chinese-chess/index.html  中国象棋
  chinese-checkers/index.html 跳棋
  2048/index.html           2048
  army-chess/index.html     军棋
  minesweeper/index.html    扫雷
  snake/index.html          贪吃蛇
  sokoban/index.html        推箱子
  tetris/index.html         俄罗斯方块
  tic-tac-toe/index.html    井字棋
  jump/index.html           跳一跳（3D，Three.js 已本地化）
  uno/index.html            UNO（3/4 人，人机 + 联机）
assets/covers/              大厅封面
shared/                     supabase.js / supabase-config.js（仅联机懒加载）
tools/                      构建源、设计参考、构建脚本
docs/                       开发与路由文档
tests/                      无头测试
dist/                       部署产物（不入库）
```

## 本地运行

直接打开 `index.html` 即可；游戏页在 `games/<英文名>/index.html`，首页链接在 `file://` 下会自动改成本地路径。

- 单机与本地双人：离线可用。
- 联机：需要网络；页面进入联机模式时才懒加载 `shared/supabase.js` 与 `shared/supabase-config.js`。

## 路由与兼容

游戏页统一在 `games/<英文短名>/`；对外路径使用小写英文 + 连字符（2048 保留数字名，黑白棋社使用 `/board-club`）。Cloudflare Pages 由 `_redirects` 200 代理到对应目录，地址保持无扩展、无尾斜杠；GitHub Pages 由根目录 `404.html` 回退到 `games/<dir>/`。旧的拼音入口与旧 `.html` 文件保留 301 / 回退兼容，查询串与 hash 不丢。

## 构建与部署

```bash
node tools/build-page.mjs       # games/board-club/index.html
node tools/build-xiangqi.mjs    # games/chinese-chess/index.html
node tools/build-minigames.mjs  # 其余 7 款游戏
node tools/build-home.mjs       # index.html
node tools/build-dist.mjs       # dist/：index、404、_redirects、games、shared、assets
npx wrangler pages deploy dist --project-name play-gridfall --branch main
```

GitHub Pages：从 `main` 分支根目录发布，推送后自动更新。

## 联机

- Supabase Realtime Broadcast + Presence；黑白棋社频道 `gridfall-room-<房间码>`，中国象棋频道 `gridfall-xq-room-<房间码>`，UNO 频道 `gridfall-uno-room-<房间码>`（3/4 人）；广播 `state` / `intent` / `ping` / `pong` / `bye` / `reject` 事件。
- 没有数据库表：房间状态由房主保存在内存中，每次变更广播完整快照；双方都离开后房间结束。房主刷新会失去房间权威状态；客端在房主在线时可以凭房间码重连。
- 房主是权威端，落子、禁手、胜负、劫争都按本地规则判定；客户端只渲染快照，未轮到的一方不能落子。
- 黑白棋社房主默认执黑；任一方可在开局前申请换方，由对方同意或拒绝；正式连珠使用自身开局交换步骤。中国象棋房主默认执红（红先），同样支持换方申请。UNO 房主负责洗牌、判定与完整快照，3 人房/4 人房满员后开局。
- 免费版额度内使用，没有引入付费服务；没有使用 service_role 或 secret key。房间码即入场凭证，频道是公共频道，不要把房间码发给无关的人。

## 视觉

- 游戏大厅直接复用项目素材库 `00_Gridfall首页.html` 的蓝色街机大厅设计，并替换为当前真实游戏与联机入口。
- 大厅游戏封面统一使用 `assets/covers/` 下的 1200×600 插画（`snake/sokoban/tetris` 为项目内 SVG），`.gv-cover-img` 以 `object-fit: cover` 填充 168px 高的封面区。
- 黑白棋社对局页复用 `01_木质棋盘陶瓷棋子以及配套UI.html` 的木质棋盘、陶瓷棋子与瓷白/深木 UI，Canvas 绘制。
- 中国象棋复用 `03_中国象棋.html` 的深色 Canvas 棋盘与面板；音效开关与音效代码已移除。
- 跳棋、2048、军棋、扫雷、贪吃蛇、推箱子、俄罗斯方块、井字棋、跳一跳、UNO 直接复用素材库同名文件，仅加固定返回大厅入口与路由，不改动游戏本体视觉。

## 点单 / 共建

- 开发者邮箱：3391792088@qq.com
- 有想做的玩法，可以自己实现单文件小游戏（也可借助 AI 工具辅助），向仓库提交 PR；具体约定与流程见 `CONTRIBUTING.md`。通过后会摆进大厅。

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
node hall-buttons.mjs
node uno-online.mjs
node uno-rules.mjs
```

详见 `tests/README.md`。

## 已验证

- 目录重构后：首页 15/15、线上首页 8/8、`/board-club` 路由 9/9（含旧入口 301）、`/chinese-chess` 路由 4/4、十款小游戏路由 21/21、返回大厅按钮 24/24（桌面 + 390px）、UNO 3/4 人房联机 2/2、UNO 规则与回合 21/21（3 人 + 4 人 + 初始牌）、线上联机整局 4/4、引擎 36/36、本地界面 6/6。
- Cloudflare：九个新 URL 直接访问/刷新、尾斜杠 301、旧 URL 301 均已实测；`/board-club` 的查询参数与联机深链接保持。
- GitHub Pages：首页 12 张卡片、`games/<dir>/` 目录访问、旧/新入口的 404 回退均已实测。
- 贪吃蛇、推箱子、俄罗斯方块本地冒烟通过；三款游戏共用 `../../index.html` 回大厅。
- 中国象棋联机已实测：房主红/客端黑、双向落子同步、换方、认输、再来一局；音效已移除。
- GitHub Pages 联机也实测 4/4：`/Gridfall/games/board-club/` 加载 `shared/supabase.js` 后完成整局同步。

## 已知限制

- 联机房间不持久化；房主刷新/关闭即结束。
- 没有账号体系与房间密码，房间码是唯一凭证。
- 联机用同一台机器上的两个独立浏览器实例验证，未在两台物理设备/移动端实机对弈。
- 围棋 AI 是启发式引擎，五档参数集中在 `tools/src/legacy.html` 的 `GO_LEVELS`。极难档按实测结果保守标为 10–7 级，未按 1 级–业余 2 段标注。
- 纯前端启发式在 13 路/19 路的绝对棋力有限；复杂死活、征子与大型劫争仍可能读错。若需要真正段位棋力，需另行评估 KataGo WASM 等方案。
- 正式连珠人机 AI 不会交换、战绩未按执子分桶、切页时五子棋计时继续走等单机侧历史问题不在本次范围内。
- 中国象棋棋子声为 Web Audio 合成，未使用外部音频文件；未做真机听感的主观评测。