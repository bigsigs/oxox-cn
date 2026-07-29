import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("Astro owns all existing public routes", async () => {
  const routes = [
    "src/pages/index.astro",
    "src/pages/product-image-resizer/index.astro",
    "src/pages/webp-converter/index.astro",
    "src/pages/yueqing-export-ranking/index.astro",
    "src/pages/yueqing-seo/index.astro",
  ];

  for (const route of routes) {
    const source = await read(route);
    assert.match(source, /<!doctype html>/i);
  }
});

test("Yueqing SEO observatory is an OXOX-native data page", async () => {
  const [home, page] = await Promise.all([
    read("src/pages/index.astro"),
    read("src/pages/yueqing-seo/index.astro"),
  ]);

  assert.match(home, /href="\/yueqing-seo\/"/);
  assert.match(page, /<Wordmark/);
  assert.match(page, /乐清 SEO 观察台/);
  assert.match(page, /YUEQING SEARCH INTELLIGENCE/);
  assert.match(page, /id="seoSearch"/);
  assert.match(page, /id="seoFilter"/);
  assert.match(page, /id="seoSort"/);
  assert.match(page, /id="seoRows"/);
  assert.match(page, /Semrush/);
  assert.match(page, /Google Search Console/);
  assert.match(page, /第三方估算数据/);
  assert.match(page, /不代表企业真实流量/);
  assert.match(page, /const pageSize = 20/);
  assert.match(page, /\/company-icons\/\$\{company\.domain\}\.png/);
  assert.doesNotMatch(page, /<em>观察台<\/em>/);
  assert.match(page, /<span class="title-accent">观察台<\/span>/);
  assert.match(page, /h1\s*\{[^}]*font:\s*650/s);
  assert.match(page, /\.hero\s*\{[^}]*min-height:\s*440px[^}]*padding:\s*44px 0 58px/s);
  assert.match(page, /\.pagination > button\s*\{[^}]*width:\s*104px/s);
  assert.match(page, /\.pagination > button:first-child\s*\{[^}]*justify-self:\s*start/s);
  assert.match(page, /\.pagination > button:last-child\s*\{[^}]*justify-self:\s*end/s);
  assert.match(page, /rel="nofollow noopener noreferrer"/);
  assert.match(page, /domain\.rel = "nofollow noopener noreferrer"/);
  assert.match(page, /import seoCompanies from "\.\.\/\.\.\/data\/seo-companies\.js"/);
  assert.doesNotMatch(page, /from ["']react["']/);
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
  assert.match(catalogue, /乐清 SEO 观察台/);

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
  assert.match(home, /id="companySuggestions"/);
  assert.match(home, /role="listbox"/);
  assert.match(home, /aria-autocomplete="list"/);
  assert.match(home, /2026-ytd-06\.json/);
  assert.match(home, /suggestCompanies/);
  assert.match(home, /\.company-search:focus-within\s*\{[^}]*z-index:\s*10/s);
  assert.match(home, /\.company-suggestions\s*\{[^}]*position:\s*fixed/s);
  assert.match(home, /document\.body\.append\(suggestionsBox\)/);
  assert.match(home, /suggestionsBox\.contains\(event\.target\)/);
  assert.match(home, /latestRanking\.records\.length/);
  assert.match(home, /latestRanking\.bands\.length/);
  assert.match(home, /periods\.periods\.length/);
  assert.match(home, /辅助工具/);
  assert.doesNotMatch(home, /进出口额/);
});

test("homepage header omits the data explanation shortcut while keeping the section", async () => {
  const home = await read("src/pages/index.astro");
  const headerNav = home.match(/<nav class="header-nav"[\s\S]*?<\/nav>/)?.[0];

  assert.ok(headerNav);
  assert.doesNotMatch(headerNav, /数据说明/);
  assert.doesNotMatch(headerNav, /#data-capabilities/);
  assert.match(home, /<section class="capabilities" id="data-capabilities">/);
});

test("homepage footer credits SIGS with a secure external link", async () => {
  const home = await read("src/pages/index.astro");
  const footer = home.match(/<footer class="shell">[\s\S]*?<\/footer>/)?.[0];

  assert.ok(footer);
  assert.match(footer, /<a href="https:\/\/si\.gs\/"[^>]*>Design by SIGS<\/a>/);
});

test("ranking page labels the source as Jan-Jun cumulative data and hydrates homepage queries", async () => {
  const page = await read("src/pages/yueqing-export-ranking/index.astro");
  assert.match(page, /2026年1—6月累计出口额排名/);
  assert.match(page, /id="rankingSearch"/);
  assert.match(page, /id="rankingTableBody"/);
  assert.match(page, /id="companyDrawer"/);
  assert.match(page, /companies\.length/);
  assert.match(page, /已收录 2026 年 1—5 月、1—4 月、1—3 月、1—2 月及 2025 年全年、1—11 月、1—10 月、1—6 月历史数据/);
  assert.match(page, /data-period-id="2026-ytd-05"/);
  assert.match(page, /data-period-id="2026-ytd-04"/);
  assert.match(page, /data-period-id="2026-ytd-03"/);
  assert.match(page, /data-period-id="2026-ytd-02"/);
  assert.match(page, /data-period-id="2025-ytd-06"/);
  assert.match(page, /data-period-id="2025-ytd-10"/);
  assert.match(page, /data-period-id="2025-ytd-11"/);
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

test("built homepage keeps company search first and surfaces the latest monthly report", async () => {
  const home = await read("dist/index.html");
  const ranking = await read("dist/yueqing-export-ranking/index.html");

  assert.match(home, /LATEST REPORT \/ 最新月报/);
  assert.match(home, /乐清市 2026 年 1—6 月外贸情况分析/);
  assert.match(home, /href="\/articles\/yueqing-foreign-trade-2026-h1\/"/);
  assert.match(home, /href="\/articles\/"/);
  assert.match(ranking, /href="\/articles\/"/);
  assert.ok(home.indexOf('class="company-search"') < home.indexOf("LATEST REPORT / 最新月报"));
});

test("homepage hero contains its rotating decorative orbit without page overflow", async () => {
  const cssFiles = (await readdir(new URL("dist/_astro/", root))).filter((name) => name.endsWith(".css"));
  const css = (await Promise.all(cssFiles.map((name) => read(`dist/_astro/${name}`)))).join("\n");
  assert.match(css, /\.hero\{[^}]*overflow:\s*clip/s);
});

test("mobile homepage search prevents input zoom and follows the visual keyboard viewport", async () => {
  const home = await read("src/pages/index.astro");

  assert.match(home, /@media \(max-width:\s*760px\)[\s\S]*?\.company-search input\s*\{[^}]*font-size:\s*16px/s);
  assert.match(home, /window\.visualViewport/);
  assert.match(home, /visualViewport\?\.addEventListener\("resize",\s*positionSuggestions\)/);
  assert.match(home, /document\.body\.classList\.add\("search-focused"\)/);
  assert.match(home, /searchForm\.scrollIntoView\(\{\s*behavior:\s*"smooth",\s*block:\s*"start"\s*\}\)/);
  assert.match(home, /body\.search-focused\s+\.hero-art\s*\{[^}]*animation:\s*none/s);
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
      'id="companySuggestions"',
      'aria-autocomplete="list"',
      "3,180 条排名记录",
      "11 个出口额区间",
      "已收录 9 个周期",
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
      "3,643",
      "跨期企业档案",
      'id="yearChangeHeading"',
      "较去年同期",
      "已收录 2026 年 1—5 月、1—4 月、1—3 月、1—2 月及 2025 年全年、1—11 月、1—10 月、1—6 月历史数据",
      'data-period-id="2026-ytd-05"',
      'data-period-id="2026-ytd-04"',
      'data-period-id="2026-ytd-03"',
      'data-period-id="2026-ytd-02"',
      'data-period-id="2025-ytd-06"',
      'data-period-id="2025-ytd-10"',
      'data-period-id="2025-ytd-11"',
      'data-period-id="2025-ytd-12"',
      "2026年1—5月累计出口额排名",
      "2026年1—4月累计出口额排名",
      "2026年1—3月累计出口额排名",
      "2026年1—2月累计出口额排名",
      "2025年1—6月累计出口额排名",
      "2025年1—10月累计出口额排名",
      "2025年1—11月累计出口额排名",
      "2025年1—12月累计出口额排名",
    ],
    "dist/yueqing-seo/index.html": [
      "乐清 SEO 观察台",
      "YUEQING SEARCH INTELLIGENCE",
      'id="seoSearch"',
      'id="seoFilter"',
      'id="seoSort"',
      'id="seoRows"',
      "第三方估算数据",
      "Semrush",
      "Google Search Console",
      "Design by SIGS",
    ],
  };

  for (const [path, needles] of Object.entries(expectations)) {
    const html = await read(path);
    for (const needle of needles) assert.ok(html.includes(needle), `${path} is missing ${needle}`);
  }
});
