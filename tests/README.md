# 测试

依赖：Node ≥ 22、本机 Edge（默认 `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`）、联机测试需要网络。

在仓库根目录：

```bash
cd tests

node run-engine.mjs        # 规则/引擎，31 项
node local-visual.mjs      # 本地界面与视觉，5 项
node online-core.mjs       # 双浏览器联机核心，7 项
node online-extra.mjs      # 正式连珠/围棋/重连，5 项
node online-swap.mjs       # 正式开局交换分支，4 项
node online-colors.mjs     # 房主/客端申请换方与同意/拒绝，6 项
node home-test.mjs         # 大厅首页与深链接，9 项
node live-home.mjs         # 线上首页，5 项
node live-online.mjs       # 线上整局，4 项
node route-test.mjs        # /HBQS 路由、刷新、查询、尾斜杠、前进后退，7 项
node xiangqi-route.mjs     # /ZGXQ 路由、刷新、尾斜杠、首页卡片，4 项
node xiangqi-online.mjs    # 象棋联机、换方、认输、再来一局、音效开关，7 项
node minigames-smoke.mjs   # 跳棋/2048/军棋/扫雷本地交互冒烟
node minigames-route.mjs   # /TQ /2048 /JQ /SL 路由、刷新、尾斜杠、首页卡片，9 项
```

- 本地测试读取仓库根目录的 `index.html` / `play.html`。
- 线上测试默认使用 `https://play-gridfall.pages.dev/play.html`，可用 `APP_URL` 覆盖：
  ```bash
  APP_URL="https://play-gridfall.pages.dev/play.html" node live-online.mjs
  ```
- 截图写入 `tests/shots/`，结果写入 `tests/results/`，两者都不入库。
- 测试会启动无头 Edge 实例并自动关闭；端口占用时换一个未被占用的端口。
- `engine-tests.js` 在页面上下文中执行，直接调用页面内的规则函数。
