# 共建 Gridfall 游戏大厅

大厅的「下一款游戏，由你点单」是长期入口：欢迎用 AI Agent 做一款单文件小游戏，按下面的流程提交 Pull Request（PR）。

## 联系

- 邮箱：3391792088@qq.com
- 仓库：https://github.com/WRM-FW/Gridfall
- 已有开发与构建说明：`docs/development.md`

## 约定

- 单文件 HTML，优先零依赖、离线可玩；需要网络的功能要说明。
- 页面加一个固定的「← 游戏大厅」入口，链接到 `./index.html`。
- 路径按游戏中文名的汉语拼音首字母大写直接追加在主域名后，例如跳棋 `/TQ`；数字名可用 `/2048` 这类特例。
- 在 `index.html` 的游戏网格加一张上线卡，链接写对应路由；路由加 `_redirects` 200 代理与尾斜杠 301，GitHub Pages 目录回退按需补。
- 改动尽量小，不推翻现有单文件结构与视觉语言；新增游戏请附本地测试或截图证据。

## PR 流程

1. Fork `WRM-FW/Gridfall`，在分支里完成游戏页、首页卡片、路由和说明。
2. 本地打开 `index.html` 与游戏页自测；有条件时跑 `tests/` 下相关测试。
3. 提交 PR，写清游戏名、路由、玩法、测试方式和截图。
4. 审核通过后合并到 `main`，Cloudflare Pages 与 GitHub Pages 会更新。

## 用 AI Agent 开发

可以直接让 AI Agent 读取本仓库的 `docs/development.md`、`tools/`、`tests/`，按既有模式生成单文件游戏、首页卡片和路由，再提交 PR。遇到规则、版权或视觉问题请先邮件沟通。
