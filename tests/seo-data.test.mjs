import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import test from "node:test";

import seoCompanies from "../src/data/seo-companies.js";

test("SEO page identifies the current Semrush snapshot", async () => {
  const page = await import("node:fs/promises").then(({ readFile }) =>
    readFile(new URL("../src/pages/yueqing-seo/index.astro", import.meta.url), "utf8"),
  );
  assert.match(page, /const snapshotDate = "2026-10-25"/);
  assert.match(page, /数据来源为 Semrush/);
  assert.match(page, /COMPETITIVE SIGNALS \/ 竞争信号 · 2026\.10\.25/);
  assert.doesNotMatch(page, /pulse-card|summary-strip|TRAFFIC TOP 3|监测站点总流量|SNAPSHOT \/ 数据快照/);
});

test("SEO snapshot preserves every monitored domain exactly once", () => {
  assert.equal(seoCompanies.length, 61);
  assert.equal(new Set(seoCompanies.map((company) => company.domain)).size, 61);
  assert.ok(seoCompanies.some((company) => company.domain === "industrialmonitordirect.com"));
  assert.ok(seoCompanies.some((company) => company.domain === "electricaltechnology.org"));
  assert.ok(!seoCompanies.some((company) => company.domain === "tools.viox.com"));
  assert.ok(!seoCompanies.some((company) => company.domain === "usfull.com"));
  assert.ok(seoCompanies.every((company) => company.traffic > 0));
  for (const domain of ["ohele.com", "cangopower.com", "yocl.com", "tormin.com", "cnsoltree.com", "ritoks.com", "talemod.com", "tpkele.com"]) {
    assert.ok(!seoCompanies.some((company) => company.domain === domain), `${domain} has zero traffic`);
  }
});

test("SEO snapshot records the metrics required by the observatory", () => {
  for (const company of seoCompanies) {
    assert.ok(company.brand);
    assert.ok(company.company_name);
    assert.match(company.domain, /^[a-z0-9.-]+\.[a-z]+$/);
    for (const key of ["traffic", "trafficChange", "keywords", "keywordsChange", "mentions"]) {
      assert.equal(typeof company[key], "number", `${company.domain} is missing ${key}`);
    }
    assert.ok(company.aiVisibility === null || typeof company.aiVisibility === "number");
    assert.ok(company.backlinks === null || typeof company.backlinks === "number");
    assert.ok(company.backlinksChange === null || typeof company.backlinksChange === "number");
  }
});

test("SEO snapshot uses the prepared company names and local icons", async () => {
  assert.equal(seoCompanies.find((company) => company.domain === "grlgroup.com")?.brand, "GRL Electric");
  assert.equal(
    seoCompanies.find((company) => company.domain === "chayo.tech")?.brand,
    "Changyou Technology (Zhejiang) Co., Ltd.",
  );
  assert.equal(seoCompanies.find((company) => company.domain === "chintglobal.com")?.mentions, 1387);
  assert.equal(seoCompanies.find((company) => company.domain === "viox.com")?.traffic, 54000);
  assert.equal(seoCompanies.find((company) => company.domain === "wosomelec.com")?.backlinks, 1880);
  assert.equal(seoCompanies.find((company) => company.domain === "wosomelec.com")?.backlinksChange, 264.34);
  assert.equal(seoCompanies.find((company) => company.domain === "industrialmonitordirect.com")?.backlinksChange, 1.32);

  for (const company of seoCompanies) {
    await access(new URL(`../public/company-icons/${company.domain}.png`, import.meta.url));
  }
});
