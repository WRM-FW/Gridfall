# 测试

依赖：Node ≥ 22、本机 Edge（默认 `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`）、联机测试需要网络。

在仓库根目录：

```bash
cd tests

node run-engine.mjs        # 规则/引擎（含围棋 AI），36 项
node local-visual.mjs      # 本地界面与视觉，6 项
node online-core.mjs       # 双浏览器联机核心，7 项
node online-extra.mjs      # 正式连珠/围棋/重连，5 项
node online-swap.mjs       # 正式开局交换分支，4 项
node online-colors.mjs     # 房主/客端申请换方与同意/拒绝，6 项
node home-test.mjs         # 大厅首页、顶栏、封面与深链接，15 项
node live-home.mjs         # 线上首页、封面与「可联机」筛选，8 项
node live-online.mjs       # 线上整局，4 项
node route-test.mjs        # /board-club 路由、刷新、查询、尾斜杠、前进后退、旧入口，9 项
node xiangqi-route.mjs     # /chinese-chess 路由、刷新、尾斜杠、首页卡片，4 项
node xiangqi-online.mjs    # 象棋联机、换方、认输、再来一局、音效已移除，7 项
node minigames-smoke.mjs   # 跳棋/2048/军棋/扫雷/贪吃蛇/推箱子/俄罗斯方块/井字棋/跳一跳/UNO 本地冒烟
node minigames-route.mjs   # /chinese-checkers /2048 /army-chess /minesweeper /snake /sokoban /tetris /tic-tac-toe /jump /uno 路由、刷新、尾斜杠、首页卡片，21 项
node uno-online.mjs        # UNO 3 人房 + 4 人房联机、动作同步、再来一局，2 项
node uno-rules.mjs         # UNO 出牌判定、回合顺序、叠加、UNO/抓 UNO、掉线托管与重连、4 人顺序、初始牌，21 项
node hall-buttons.mjs      # 12 个游戏返回大厅按钮（桌面 + 390px），24 项
node go-bench.mjs --size=9 --low=4 --high=5 --games=20  # 围棋相邻档对抗
node go-smoke.mjs          # 19 路五档 30 手冒烟与耗时
```

- 本地测试读取仓库根目录 `index.html` 与 `games/board-club/index.html`。
- 线上测试默认使用 `https://play-gridfall.pages.dev/board-club`，可用 `APP_URL` 覆盖：
  ```bash
  APP_URL="https://play-gridfall.pages.dev/board-club" node live-online.mjs
  ```
- 截图写入 `tests/shots/`，结果写入 `tests/results/`，两者都不入库。
- 测试会启动无头 Edge 实例并自动关闭；端口占用时换一个未被占用的端口。
- `engine-tests.js` 在页面上下文中执行，直接调用页面内的规则函数。
