# 共建 Gridfall

大厅的「下一款游戏，由你点单」是长期入口：欢迎开发者自己实现一款单文件小游戏（也可以借助 AI 工具辅助），按下面的流程提交 Pull Request（PR）。

## 联系

- 邮箱：3391792088@qq.com
- 仓库：https://github.com/WRM-FW/Gridfall
- 已有开发与构建说明：`docs/development.md`

## 约定

- 单文件 HTML，优先零依赖、离线可玩；需要网络的功能要说明。
- 页面加一个固定的「← 首页」入口，链接到 `../../index.html`（游戏页位于 `games/<slug>/`）。
- 路径使用小写英文 + 连字符，例如跳棋 `/chinese-checkers`、军棋 `/army-chess`；2048 保留 `/2048`。游戏页放在 `games/<slug>/index.html`，不要放在仓库根目录。
- 在 `index.html` 的游戏网格加一张上线卡，链接写对应路由；`_redirects` 加 200 代理与尾斜杠 301，`404.html` 加 GitHub Pages 回退映射。
- 改动尽量小，不推翻现有单文件结构与视觉语言；新增游戏请附本地测试或截图证据。

## PR 流程

1. Fork `WRM-FW/Gridfall`，在分支里完成游戏页、首页卡片、路由和说明。
2. 本地打开 `index.html` 与游戏页自测；有条件时跑 `tests/` 下相关测试。
3. 提交 PR，写清游戏名、路由、玩法、测试方式和截图。
4. 审核通过后合并到 `main`，Cloudflare Pages 与 GitHub Pages 会更新。

## 自己开发或借助 AI 辅助

可以完全自己写，也可以让 AI 工具读取本仓库的 `docs/development.md`、`tools/`、`tests/`，按既有模式生成单文件游戏、首页卡片和路由。无论用哪种方式，提交前都请自己检查规则、版权与视觉一致性；遇到问题先邮件沟通。
