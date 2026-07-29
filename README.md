# OXOX 外贸小工具

[oxox.cn](https://oxox.cn/) 的独立导航首页，用于汇总 OXOX 旗下的外贸小工具。

## 本地开发

```sh
npm install
npm run dev
```

## 添加新工具

编辑 `src/data/tools.js`，复制一个工具对象并修改：

- `title`：工具名称
- `description`：一句话说明
- `category`：`image`、`copy` 或 `calculate`
- `url`：工具地址
- `status`：已上线使用 `live`，预告使用 `planned`
- `icon`：对应 `icons` 对象中的图标名称

页面由 Astro 构建为纯静态 HTML，并通过 GitHub Actions 发布到 GitHub Pages。

```sh
npm test
npm run build
```

## 乐清出口排名数据

排名页位于 `/yueqing-export-ranking/`，静态数据保存在
`public/data/yueqing-export-ranking/`：

- `periods.json`：已确认的数据周期和最新周期
- `companies.json`：跨期稳定企业编号、标准名称与别名
- `2026-ytd-06.json`：2026 年 1—6 月累计排名
- `2026-ytd-05.json`：2026 年 1—5 月累计排名
- `2026-ytd-04.json`：2026 年 1—4 月累计排名

导入文本排名时使用 `scripts/import_yueqing_text_ranking.py`。文字识别造成的企业名称差异必须先人工确认，再登记到
`scripts/yueqing-company-aliases.json`；导入器不会自动模糊合并企业。
