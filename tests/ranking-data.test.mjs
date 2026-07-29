import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);
const loadJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));

test("2026 Jan-Jun cumulative ranking keeps every source row", async () => {
  const data = await loadJson("public/data/yueqing-export-ranking/2026-ytd-06.json");
  assert.equal(data.period.id, "2026-ytd-06");
  assert.equal(data.period.label, "2026年1—6月");
  assert.equal(data.period.type, "year_to_date");
  assert.equal(data.records.length, 3180);
  assert.deepEqual(
    data.records.map((item) => item.rank),
    Array.from({ length: 3180 }, (_, index) => index + 1),
  );
  assert.equal(data.bands.length, 11);
  assert.equal(data.records.filter((item) => item.source_duplicate).length, 4);
});

test("company registry uses stable IDs and records source-name conflicts", async () => {
  const companies = await loadJson("public/data/yueqing-export-ranking/companies.json");
  assert.equal(companies.length, 3178);
  assert.equal(companies[0].company_id, "YQ000001");
  assert.equal(companies[0].company_name, "浙江正泰电器股份有限公司");
  assert.equal(new Set(companies.map((item) => item.company_id)).size, companies.length);
  assert.equal(companies.filter((item) => item.needs_review).length, 2);
});

test("period manifest exposes only the confirmed cumulative period", async () => {
  const manifest = await loadJson("public/data/yueqing-export-ranking/periods.json");
  assert.equal(manifest.latest, "2026-ytd-06");
  assert.deepEqual(manifest.periods.map((period) => period.id), ["2026-ytd-06"]);
});
