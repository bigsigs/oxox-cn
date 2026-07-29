import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("Astro owns all existing public routes", async () => {
  const routes = [
    "src/pages/index.astro",
    "src/pages/product-image-resizer/index.astro",
    "src/pages/webp-converter/index.astro",
    "src/pages/yueqing-export-ranking/index.astro",
  ];

  for (const route of routes) {
    const source = await read(route);
    assert.match(source, /<!doctype html>/i);
  }
});

test("the shared OXOX wordmark is used by every page", async () => {
  const component = await read("src/components/Wordmark.astro");
  assert.match(component, /class="logo-dot dot-warm"/);
  assert.match(component, /class="logo-dot dot-green"/);

  for (const route of [
    "src/pages/index.astro",
    "src/pages/product-image-resizer/index.astro",
    "src/pages/webp-converter/index.astro",
    "src/pages/yueqing-export-ranking/index.astro",
  ]) {
    assert.match(await read(route), /<Wordmark/);
  }
});

test("tool catalogue content comes from one shared data source", async () => {
  const catalogue = await read("src/data/tools.js");
  assert.match(catalogue, /商品图尺寸处理/);
  assert.match(catalogue, /WebP 转换与重命名/);
  assert.match(catalogue, /乐清出口排名/);

  const home = await read("src/pages/index.astro");
  assert.match(home, /import tools from "\.\.\/data\/tools\.js"/);
  assert.match(home, /const liveTools = tools\.filter/);
});

test("homepage makes Yueqing export company search the primary action", async () => {
  const home = await read("src/pages/index.astro");
  assert.match(home, /乐清出口数据/);
  assert.match(home, /查询乐清企业/);
  assert.match(home, /出口排名/);
  assert.match(home, /action="\/yueqing-export-ranking\/"/);
  assert.match(home, /name="q"/);
  assert.match(home, /latestRanking\.records\.length/);
  assert.match(home, /latestRanking\.bands\.length/);
  assert.match(home, /periods\.periods\.length/);
  assert.match(home, /辅助工具/);
  assert.doesNotMatch(home, /进出口额/);
});

test("ranking page labels the source as Jan-Jun cumulative data and hydrates homepage queries", async () => {
  const page = await read("src/pages/yueqing-export-ranking/index.astro");
  assert.match(page, /2026年1—6月累计出口额排名/);
  assert.match(page, /id="rankingSearch"/);
  assert.match(page, /id="rankingTableBody"/);
  assert.match(page, /id="companyDrawer"/);
  assert.match(page, /已收录 2026 年 1—5 月、1—4 月、1—3 月、1—2 月及 2025 年全年、1—6 月历史数据/);
  assert.match(page, /data-period-id="2026-ytd-05"/);
  assert.match(page, /data-period-id="2026-ytd-04"/);
  assert.match(page, /data-period-id="2026-ytd-03"/);
  assert.match(page, /data-period-id="2026-ytd-02"/);
  assert.match(page, /data-period-id="2025-ytd-06"/);
  assert.match(page, /data-period-id="2025-ytd-12"/);
  assert.match(page, /id="periodSelect"/);
  assert.match(page, /function renderRankChange/);
  assert.match(page, /id="yearChangeHeading">较去年同期/);
  assert.match(page, /function renderYearChange/);
  assert.match(page, /去年未收录/);
  assert.match(page, /待导入去年同期/);
  assert.match(page, /2026年1—5月累计出口额排名/);
  assert.match(page, /2026年1—4月累计出口额排名/);
  assert.match(page, /2026年1—3月累计出口额排名/);
  assert.match(page, /2026年1—2月累计出口额排名/);
  assert.match(page, /2025年1—6月累计出口额排名/);
  assert.match(page, /2025年1—12月累计出口额排名/);
  assert.match(page, /new URLSearchParams\(location\.search\)\.get\("q"\)/);
  assert.match(page, /search\.value = initialQuery/);
  assert.doesNotMatch(page, /进出口额/);
  assert.doesNotMatch(page, /2026年6月出口额排名/);
});

test("ranking search exposes pinyin support and uses the requested change colors", async () => {
  const page = await read("src/pages/yueqing-export-ranking/index.astro");
  const home = await read("src/pages/index.astro");

  assert.match(page, /输入企业名称、拼音或企业编号/);
  assert.match(home, /支持企业名称、拼音或企业编号/);
  assert.match(page, /\.rank-change\.up\s*\{\s*color:\s*var\(--orange\);\s*\}/);
  assert.match(page, /\.rank-change\.down\s*\{\s*color:\s*var\(--green\);\s*\}/);
  assert.match(page, /buildCompanySearchIndex/);
  assert.match(page, /companies\.json/);
});

test("homepage keeps utility tools secondary to the export data experience", async () => {
  const home = await read("src/pages/index.astro");
  assert.match(home, /id="auxiliary-tools"/);
  assert.match(home, /\{tool\.title\}/);
  assert.match(home, /\{tool\.description\}/);
  assert.doesNotMatch(home, /data-filter=/);
  assert.doesNotMatch(home, /外贸邮件润色/);
});

test("hero removes the issue number and keeps orbit dots above the copy", async () => {
  const home = await read("src/pages/index.astro");

  assert.doesNotMatch(home, /class="hero-no"/);
  assert.doesNotMatch(home, /NO\.<br>001/);
  assert.match(home, /\.hero-art\s*\{[^}]*z-index:\s*3/s);
  assert.match(home, /\.orbit::before,\s*\.orbit::after\s*\{[^}]*z-index:\s*4/s);
});

test("the production build preserves the current routes and UI hooks", async () => {
  const expectations = {
    "dist/index.html": [
      "查询乐清企业",
      'name="q"',
      'action="/yueqing-export-ranking/"',
      "3,180 条排名记录",
      "11 个出口额区间",
      "已收录 7 个周期",
      'id="auxiliary-tools"',
      'class="footer-mark"',
      "product-image-resizer/",
      "webp-converter/",
    ],
    "dist/product-image-resizer/index.html": [
      "商品图尺寸处理",
      'id="dropZone"',
      'id="editModal"',
      "全部导出 WebP",
    ],
    "dist/webp-converter/index.html": [
      "WebP 转换与重命名",
      'id="dropZone"',
      'id="nameTemplate"',
      'src="/webp-converter/app.js"',
    ],
    "dist/yueqing-export-ranking/index.html": [
      "2026年1—6月累计出口额排名",
      'id="rankingSearch"',
      'id="rankingTableBody"',
      'id="companyDrawer"',
      'id="yearChangeHeading"',
      "较去年同期",
      "已收录 2026 年 1—5 月、1—4 月、1—3 月、1—2 月及 2025 年全年、1—6 月历史数据",
      'data-period-id="2026-ytd-05"',
      'data-period-id="2026-ytd-04"',
      'data-period-id="2026-ytd-03"',
      'data-period-id="2026-ytd-02"',
      'data-period-id="2025-ytd-06"',
      'data-period-id="2025-ytd-12"',
      "2026年1—5月累计出口额排名",
      "2026年1—4月累计出口额排名",
      "2026年1—3月累计出口额排名",
      "2026年1—2月累计出口额排名",
      "2025年1—6月累计出口额排名",
      "2025年1—12月累计出口额排名",
    ],
  };

  for (const [path, needles] of Object.entries(expectations)) {
    const html = await read(path);
    for (const needle of needles) assert.ok(html.includes(needle), `${path} is missing ${needle}`);
  }
});
