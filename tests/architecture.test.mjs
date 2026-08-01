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

test("every primary indexable route declares a canonical URL and matching structured data", async () => {
  const routes = [
    "src/pages/index.astro",
    "src/pages/articles/index.astro",
    "src/pages/product-image-resizer/index.astro",
    "src/pages/webp-converter/index.astro",
    "src/pages/yueqing-export-ranking/index.astro",
    "src/pages/yueqing-seo/index.astro",
  ];

  for (const route of routes) {
    const source = await read(route);
    assert.match(source, /rel="canonical"/, `${route} should declare a canonical URL`);
    assert.match(source, /application\/ld\+json/, `${route} should publish JSON-LD`);
  }

  assert.match(await read("src/pages/index.astro"), /"@type": "WebSite"/);
  assert.match(await read("src/pages/yueqing-export-ranking/index.astro"), /"@type": "Dataset"/);
  assert.match(await read("src/pages/yueqing-seo/index.astro"), /"@type": "Dataset"/);
  assert.match(await read("src/pages/product-image-resizer/index.astro"), /"@type": "SoftwareApplication"/);
  assert.match(await read("src/pages/webp-converter/index.astro"), /"@type": "SoftwareApplication"/);
  assert.match(await read("src/pages/articles/index.astro"), /"@type": "CollectionPage"/);
});

test("Yueqing SEO observatory is an OXOX-native data page", async () => {
  const [home, page] = await Promise.all([
    read("src/pages/index.astro"),
    read("src/pages/yueqing-seo/index.astro"),
  ]);

  assert.match(home, /href="\/yueqing-seo\/"/);
  assert.match(home, /href="\/yueqing-seo\/">SEO 榜单<\/a>/);
  assert.match(page, /href="\/yueqing-seo\/" aria-current="page">SEO 榜单<\/a>/);
  assert.match(page, /<Wordmark/);
  assert.match(page, /乐清 SEO 榜单/);
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
  assert.match(page, /<span class="title-accent">榜单<\/span>/);
  assert.match(page, /class="leader-stairs"/);
  assert.match(page, /class="leader-icon"/);
  assert.match(page, /company\.icon/);
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
  assert.match(catalogue, /乐清 SEO 榜单/);

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
  assert.match(home, /class="full-ranking-cta"/);
  assert.match(home, /FULL RANKING \/ 完整榜单/);
  assert.match(home, /查看全部 \{formatNumber\(latestRanking\.records\.length\)\} 家企业完整排名/);
  assert.match(home, /查看 \{latestRanking\.period\.label\}完整排名/);
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
  assert.match(page, /id="companyLinks"/);
  assert.match(page, /company-profiles\.json/);
  assert.match(page, /rel="nofollow noopener noreferrer"/);
  assert.match(page, /\["https:", "http:"\]\.includes\(url\.protocol\)/);
  assert.doesNotMatch(page, /进出口额/);
  assert.doesNotMatch(page, /2026年6月出口额排名/);
});

test("company ranking profiles have crawlable static URLs and unique SEO content", async () => {
  const [rankingPage, companyPage, sitemapPage, robots] = await Promise.all([
    read("src/pages/yueqing-export-ranking/index.astro"),
    read("src/pages/yueqing-export-ranking/company/[companyId].astro"),
    read("src/pages/sitemap.xml.js"),
    read("public/robots.txt"),
  ]);

  assert.match(rankingPage, /href="\/yueqing-export-ranking\/company\/\$\{escapeHtml\(record\.company_id\)\}\//);
  assert.match(rankingPage, /event\.preventDefault\(\)/);
  assert.match(rankingPage, /location\.replace\(`\/yueqing-export-ranking\/company\/\$\{companyId\}\//);
  assert.match(rankingPage, /id="drawerProfileLink"/);
  assert.match(rankingPage, /查看完整企业档案/);
  assert.match(rankingPage, /profileLink\.href = `\/yueqing-export-ranking\/company\/\$\{companyId\}\//);
  assert.match(companyPage, /export async function getStaticPaths/);
  assert.match(companyPage, /companies\.map/);
  assert.match(companyPage, /rel="canonical"/);
  assert.match(companyPage, /rel="icon"/);
  assert.match(companyPage, /application\/ld\+json/);
  assert.match(companyPage, /RANKING HISTORY \/ 排名历史/);
  assert.match(companyPage, /rel="nofollow noopener noreferrer"/);
  assert.match(sitemapPage, /yueqing-export-ranking\/company/);
  assert.match(robots, /Sitemap: https:\/\/oxox\.cn\/sitemap\.xml/);

  const builtCompany = await read("dist/yueqing-export-ranking/company/YQ003159/index.html");
  assert.match(builtCompany, /<title>浙江佳博科技股份有限公司出口排名与历史数据｜OXOX<\/title>/);
  assert.match(builtCompany, /<link rel="canonical" href="https:\/\/oxox\.cn\/yueqing-export-ranking\/company\/YQ003159\/">/);
  assert.match(builtCompany, /2026年1—6月累计排名/);
  assert.match(builtCompany, /NO\. 3161/);
  assert.match(builtCompany, /2025年1—6月/);
});

test("curated company profiles keep external links separate from generated ranking data", async () => {
  const [profilesSource, companiesSource] = await Promise.all([
    read("public/data/yueqing-export-ranking/company-profiles.json"),
    read("public/data/yueqing-export-ranking/companies.json"),
  ]);
  const profiles = JSON.parse(profilesSource);
  const companies = JSON.parse(companiesSource);
  const chint = companies.find((item) => item.company_name === "浙江正泰电器股份有限公司");
  const beny = companies.find((item) => item.company_name === "浙江奔一新能源有限公司");
  const kripal = companies.find((item) => item.company_name === "浙江科瑞普电气有限公司");
  const vecas = companies.find((item) => item.company_name === "温州华嘉电器有限公司");
  const tycotiu = companies.find((item) => item.company_name === "浙江泰科天唯电气有限公司");
  const lsp = companies.find((item) => item.company_name === "温州猎雷电气有限公司");
  const geya = companies.find((item) => item.company_name === "浙江格亚电气有限公司");
  const geyaTrading = companies.find((item) => item.company_name === "温州格亚贸易有限公司");
  const company = companies.find((item) => item.company_name === "乐清市名格思进出口有限公司");

  assert.equal(chint?.company_id, "YQ000001");
  assert.equal(profiles.YQ000001.links[0].url, "https://www.chintglobal.com/");
  assert.equal(beny?.company_id, "YQ000011");
  assert.equal(profiles.YQ000011.links[0].url, "https://www.beny.com/");
  assert.equal(kripal?.company_id, "YQ000019");
  assert.equal(profiles.YQ000019.links[0].url, "https://www.kripal.net/");
  assert.equal(vecas?.company_id, "YQ000025");
  assert.equal(profiles.YQ000025.links[0].url, "https://www.vecas.cn/cn/index.html");
  assert.equal(tycotiu?.company_id, "YQ000052");
  assert.equal(profiles.YQ000052.links[0].url, "http://www.chtaike.com.cn/");
  assert.equal(lsp?.company_id, "YQ000454");
  assert.equal(profiles.YQ000454.links[0].url, "https://lsp.global/");
  assert.equal(geya?.company_id, "YQ000102");
  assert.equal(profiles.YQ000102.links[0].url, "https://www.geya.net/");
  assert.equal(geyaTrading?.company_id, "YQ000651");
  assert.equal(profiles.YQ000651.links[0].url, "https://www.geya.net/");
  assert.equal(company?.company_id, "YQ000080");
  assert.deepEqual(profiles.YQ000080.links[0], {
    type: "alibaba_store",
    label: "阿里巴巴国际站",
    url: "https://mggsdtie.en.alibaba.com/",
    domain: "mggsdtie.en.alibaba.com",
    source: "user_provided",
    added_at: "2026-07-30",
  });

  const kinkong = companies.find((item) => item.company_name === "乐清市千工电器有限公司");
  assert.equal(kinkong?.company_id, "YQ000130");
  assert.deepEqual(profiles.YQ000130.links[0], {
    type: "official_website",
    label: "官方网站",
    url: "https://www.kinkong.com/",
    domain: "kinkong.com",
    source: "user_provided",
    added_at: "2026-07-30",
  });
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
      "乐清 SEO 榜单",
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
