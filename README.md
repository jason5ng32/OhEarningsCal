# OhEarningsCal

<a href="https://trendshift.io/repositories/8148" target="_blank"><img src="https://trendshift.io/api/badge/repositories/8148" alt="jason5ng32%2FOhEarningsCal | Trendshift" style="width: 250px; height: 55px;" width="250" height="55"/></a>

这个项目本来是我自用的一个小工具，功能是，将我关注的美股公司的财报日程，自动导入到我的日历（比如 Google Calendar）中。

啊，我就是不喜欢打开炒股 app 看，我就是喜欢在日历中看。

或许这个工具对你也有用，所以我把它开源了。

## 直接使用

打开 [https://earnings.beavern.com/](https://earnings.beavern.com/)，找到已经生成的 ics 文件，复制链接，然后在你的日历软件中，添加一个新的日历，输入这个链接，就可以了。

备注：仅仅包含美国市场的财报日历。日历内容只包含当天前后 30 天的，再多其实没有意义。

## ics 清单

| 文件 | 内容 |
| --- | --- |
| `all.ics` | 所有上市公司财报 |
| `nasdaq100.ics` | 纳斯达克 100 成分股 |
| `sp500.ics` | 标普 500 成分股 |
| `dow30.ics` | 道琼斯 30 成分股 |
| `customstock.ics` | 自定义关注列表（来自环境变量 `CUSTOM_STOCKS`） |
| `selected.ics` | 上面 4 个的合集 |

## 自己部署

1. Fork 这个项目
2. 在 GitHub 项目的 **Settings → Pages** 把 **Source** 改成 **GitHub Actions**
3. 在 **Settings → Secrets and variables → Actions → Variables** 里设置：
   - `SHOULD_GEN_SELECTED` = `true` / `false`
   - `SHOULD_GEN_ALL` = `true` / `false`
   - `CUSTOM_STOCKS` = 逗号分隔的 ticker 列表，例如 `PDD,BABA,TCEHY`（留空则不生成 customstock.ics）
4. 等首次 schedule 触发，或在 Actions 里手动 dispatch 一次 `Update earnings calendar`

## 自动化

| Workflow | 触发 | 做什么 |
| --- | --- | --- |
| `earnings.yml` | 每天 04:34 / 16:34 UTC | 拉财报数据 → 生成 ics → 部署到 GitHub Pages |
| `indices.yml` | 每周一 06:17 UTC | 从 Wikipedia 刷新指数成分股，提交到 `data/indices/` |

财报日期数据缓存在 GitHub Actions cache 里，不进 git——`main` 分支永远只承载源代码和指数成分股。

## 本地开发

```sh
npm install
cp .env.example .env   # 编辑环境变量

npm run fetch:indices  # 首次跑 / 想刷新指数成分股
npm run fetch          # 拉过去 1 天 + 未来 30 天财报到 data/earnings/
npm run gen            # 生成 docs/ics/*.ics
npm run dev            # 起本地服务器，访问 http://localhost:18302
```

本地 dev 服务器的额外端点（方便调试）：

- `GET /dev/fetch` — 触发一次 `fetch`
- `GET /dev/fetch-indices` — 触发一次 `fetch:indices`
- `GET /dev/gen` — 触发一次 `gen`

## 目录结构

```
src/
├── lib/        # 工具函数（日期、路径、HTTP、文件 IO）
├── config/     # 环境变量与各 index 的元信息
├── fetch/      # 拉数据：财报（Nasdaq）、指数成分股（Wikipedia）
├── process/    # 清洗 + 去重财报数据
├── generate/   # 生成 .ics 文件
├── cli/        # 各命令的入口（fetch / fetch-indices / gen）
└── server.js   # 本地调试服务器
data/
├── earnings/   # 每日财报 JSON 缓存（.gitignore，跨 run 用 GH Actions cache）
└── indices/    # 指数成分股，每周自动更新（进 git）
docs/
├── index.html  # GitHub Pages 静态页
├── CNAME
└── ics/        # 生成的 ics 文件（.gitignore，build 时产生）
```
