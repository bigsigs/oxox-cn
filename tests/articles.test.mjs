import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const sectionHeadings = [
  "一、外贸进出口情况概况",
  "二、外贸企业情况",
  "三、出口产品情况",
  "四、出口市场情况",
  "五、外贸进口情况",
];

test("article center publishes both monthly reports in period order", async () => {
  const html = await read("dist/articles/index.html");
  const h1Title = "乐清市 2026 年 1—6 月外贸情况分析";
  const mayTitle = "乐清市 2026 年 1—5 月外贸情况分析";

  assert.ok(html.indexOf(h1Title) < html.indexOf(mayTitle));
  assert.match(html, /月报/);
  assert.match(html, /href="\/articles\/yueqing-foreign-trade-2026-h1\/"/);
  assert.match(html, /href="\/articles\/yueqing-foreign-trade-2026-jan-may\/"/);
});

test("January-June report preserves its confirmed data contract", async () => {
  const html = await read("dist/articles/yueqing-foreign-trade-2026-h1/index.html");

  assert.match(html, /乐清市 2026 年 1—6 月外贸情况分析/);
  assert.match(html, /核心看点/);
  for (const heading of sectionHeadings) assert.ok(html.includes(heading), heading);
  assert.equal((html.match(/<table/g) || []).length, 3);
  assert.match(html, /2026 年 1—6 月主要出口贸易国（地区）情况表/);
  assert.match(html, /1—6 月出口额/);
  assert.match(html, /180\.9 亿元/);
  assert.match(html, /175\.9 亿元/);
  assert.match(html, /122\.66 亿元/);
  assert.match(html, /203 个国家（地区）/);
  assert.doesNotMatch(html, /数据来源|整理：|作者：/);
});

test("January-May report preserves its intentionally mixed country-table label", async () => {
  const html = await read("dist/articles/yueqing-foreign-trade-2026-jan-may/index.html");

  assert.match(html, /乐清市 2026 年 1—5 月外贸情况分析/);
  assert.match(html, /核心看点/);
  for (const heading of sectionHeadings) assert.ok(html.includes(heading), heading);
  assert.equal((html.match(/<table/g) || []).length, 4);
  assert.match(html, /2026 年 1—5 月主要出口贸易国（地区）情况表/);
  assert.match(html, /1—4 月出口额/);
  assert.match(html, /同比下降 2\.06%/);
  assert.match(html, /农产品、塑料制品、铁合金/);
  assert.match(html, /2,789 家/);
  assert.doesNotMatch(html, /数据来源|整理：|作者：/);
});

test("article UI exposes structured data and the confirmed trend colors", async () => {
  const html = await read("dist/articles/yueqing-foreign-trade-2026-h1/index.html");
  const cssFiles = (await readdir(new URL("dist/_astro/", root))).filter((name) => name.endsWith(".css"));
  const css = (await Promise.all(cssFiles.map((name) => read(`dist/_astro/${name}`)))).join("\n");

  assert.match(html, /"@type":"Article"/);
  assert.match(html, /"@type":"BreadcrumbList"/);
  assert.match(css, /\.trend-up[^{]*\{[^}]*color:\s*var\(--orange\)/s);
  assert.match(css, /\.trend-down[^{]*\{[^}]*color:\s*var\(--green\)/s);
  assert.match(css, /\.data-table-wrap[^{]*\{[^}]*overflow-x:\s*auto/s);
  assert.doesNotMatch(html, /"author"|"publisher"/);
});
