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
  assert.equal(companies.length, 3180);
  assert.equal(companies[0].company_id, "YQ000001");
  assert.equal(companies[0].company_name, "浙江正泰电器股份有限公司");
  assert.equal(new Set(companies.map((item) => item.company_id)).size, companies.length);
  assert.equal(companies.filter((item) => item.needs_review).length, 2);
});

test("period manifest exposes the latest period and confirmed history", async () => {
  const manifest = await loadJson("public/data/yueqing-export-ranking/periods.json");
  assert.equal(manifest.latest, "2026-ytd-06");
  assert.deepEqual(manifest.periods.map((period) => period.id), ["2026-ytd-06", "2026-ytd-05"]);
});

test("2026 Jan-May cumulative ranking combines all 3067 supplied rows", async () => {
  const data = await loadJson("public/data/yueqing-export-ranking/2026-ytd-05.json");
  assert.equal(data.period.id, "2026-ytd-05");
  assert.equal(data.period.label, "2026年1—5月");
  assert.equal(data.period.type, "year_to_date");
  assert.equal(data.records.length, 3067);
  assert.deepEqual(
    data.records.map((item) => item.rank),
    Array.from({ length: 3067 }, (_, index) => index + 1),
  );
  assert.equal(data.bands.length, 9);
  assert.equal(data.records.filter((item) => item.source_duplicate).length, 4);
});

test("cross-period aliases reuse stable company IDs without forced fuzzy matches", async () => {
  const companies = await loadJson("public/data/yueqing-export-ranking/companies.json");
  const previous = await loadJson("public/data/yueqing-export-ranking/2026-ytd-05.json");
  const current = await loadJson("public/data/yueqing-export-ranking/2026-ytd-06.json");
  const byName = new Map(companies.map((company) => [company.company_name, company]));
  const priorChint = previous.records.find((record) => record.company_name === "浙江正泰电器股份有限公司");
  const currentChint = current.records.find((record) => record.company_name === "浙江正泰电器股份有限公司");

  assert.equal(companies.length, 3180);
  assert.equal(priorChint.company_id, currentChint.company_id);
  assert.ok(byName.get("浙江恒裕智能家具有限公司").aliases.includes("浙江恒裕智能家居有限公司"));
  assert.ok(byName.has("温州上陶进出口有限公司"));
});

test("one period never collapses two different source names into one company ID", async () => {
  for (const file of ["2026-ytd-05.json", "2026-ytd-06.json"]) {
    const data = await loadJson(`public/data/yueqing-export-ranking/${file}`);
    const namesById = new Map();
    data.records.forEach((record) => {
      const names = namesById.get(record.company_id) || new Set();
      names.add(record.company_name);
      namesById.set(record.company_id, names);
    });
    const collisions = [...namesById.entries()].filter(([, names]) => names.size > 1);
    assert.deepEqual(collisions, [], `${file} contains an unsafe company merge`);
  }
});
