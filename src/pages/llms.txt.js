import { getCollection } from "astro:content";
import periods from "../../public/data/yueqing-export-ranking/periods.json";
export const prerender = true;
export async function GET() {
 const articles = await getCollection("articles");
 const latest = periods.periods.find(p => p.id === periods.latest);
 const text = `# OXOX 乐清出口数据

> 乐清企业累计出口排行榜、企业档案和外贸月报。最新榜单周期：${latest.label}。

## 数据口径
- 出口数据为年初至所示月份的累计值，不是单月值。
- 金额单位为万美元；金额区间与精准数值分别标注，不可将区间推算为精确金额。
- 企业使用稳定编号关联历史记录；排名变化不代表出口额增长率。
- 未提供的数据不代表零；重复记录按数据说明处理。
- 企业官网、地址和产品资料见企业详情页。SEO 榜单为独立的第三方估算数据。

## 主要页面
- [出口排行榜](https://oxox.cn/)
- [数据来源与口径](https://oxox.cn/about-data/)
- [外贸月报](https://oxox.cn/articles/)
- [SEO 榜单](https://oxox.cn/yueqing-seo/)
- [辅助工具](https://oxox.cn/tools/)
- [Sitemap：全部企业与页面](https://oxox.cn/sitemap.xml)

## 外贸报告
${articles.map(a => `- [${a.data.title}](https://oxox.cn/articles/${a.id}/)`).join("\n")}

## 公开数据
- [累计周期索引](https://oxox.cn/data/yueqing-export-ranking/periods.json)
- [企业索引](https://oxox.cn/data/yueqing-export-ranking/companies.json)
- [最新榜单](https://oxox.cn/data/yueqing-export-ranking/${latest.file})
`;
 return new Response(text, {headers:{"Content-Type":"text/plain; charset=utf-8"}});
}
