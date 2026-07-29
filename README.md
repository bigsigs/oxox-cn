# OXOX 外贸小工具

[oxox.cn](https://oxox.cn/) 的独立导航首页，用于汇总 OXOX 旗下的外贸小工具。

## 添加新工具

编辑 `index.html` 底部的 `tools` 数组，复制一个工具对象并修改：

- `title`：工具名称
- `description`：一句话说明
- `category`：`image`、`copy` 或 `calculate`
- `url`：工具地址
- `status`：已上线使用 `live`，预告使用 `planned`
- `icon`：对应 `icons` 对象中的图标名称

这是一个无构建依赖的纯静态站点，直接打开 `index.html` 即可预览。
