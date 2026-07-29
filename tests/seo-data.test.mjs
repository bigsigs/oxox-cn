import assert from "node:assert/strict";
import test from "node:test";

import seoCompanies from "../src/data/seo-companies.js";

test("SEO snapshot preserves every monitored domain exactly once", () => {
  assert.equal(seoCompanies.length, 41);
  assert.equal(new Set(seoCompanies.map((company) => company.domain)).size, 41);
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
