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
  assert.match(home, /define:vars=\{\{ tools \}\}/);
});

test("ranking page labels the source as Jan-Jun cumulative data", async () => {
  const page = await read("src/pages/yueqing-export-ranking/index.astro");
  assert.match(page, /2026年1—6月累计出口额排名/);
  assert.match(page, /id="rankingSearch"/);
  assert.match(page, /id="rankingTableBody"/);
  assert.match(page, /id="companyDrawer"/);
  assert.match(page, /已收录 1—5 月和 1—4 月累计排名/);
  assert.match(page, /data-period-id="2026-ytd-05"/);
  assert.match(page, /data-period-id="2026-ytd-04"/);
  assert.match(page, /id="periodSelect"/);
  assert.match(page, /function renderRankChange/);
  assert.match(page, /2026年1—5月累计出口额排名/);
  assert.match(page, /2026年1—4月累计出口额排名/);
  assert.doesNotMatch(page, /2026年6月出口额排名/);
});

test("tool cards switch the green active state on hover and keyboard focus", async () => {
  const home = await read("src/pages/index.astro");

  assert.match(home, /\.tool-card\.active-card/);
  assert.match(home, /data-default-active/);
  assert.match(home, /function setActiveCard\(card\)/);
  assert.match(home, /card\.addEventListener\("pointerenter"/);
  assert.match(home, /card\.addEventListener\("focusin"/);
  assert.match(home, /grid\.addEventListener\("pointerleave"/);
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
      "让外贸工作",
      'id="toolGrid"',
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
      "已收录 1—5 月和 1—4 月累计排名",
      'data-period-id="2026-ytd-05"',
      'data-period-id="2026-ytd-04"',
      "2026年1—5月累计出口额排名",
      "2026年1—4月累计出口额排名",
    ],
  };

  for (const [path, needles] of Object.entries(expectations)) {
    const html = await read(path);
    for (const needle of needles) assert.ok(html.includes(needle), `${path} is missing ${needle}`);
  }
});
