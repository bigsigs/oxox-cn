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
  assert.equal(companies.length, 3188);
  assert.equal(companies[0].company_id, "YQ000001");
  assert.equal(companies[0].company_name, "浙江正泰电器股份有限公司");
  assert.equal(new Set(companies.map((item) => item.company_id)).size, companies.length);
  assert.equal(companies.filter((item) => item.needs_review).length, 2);
});

test("period manifest exposes the latest period and confirmed history", async () => {
  const manifest = await loadJson("public/data/yueqing-export-ranking/periods.json");
  assert.equal(manifest.latest, "2026-ytd-06");
  assert.deepEqual(
    manifest.periods.map((period) => period.id),
    ["2026-ytd-06", "2026-ytd-05", "2026-ytd-04", "2026-ytd-03"],
  );
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

  assert.equal(companies.length, 3188);
  assert.equal(priorChint.company_id, currentChint.company_id);
  assert.ok(byName.get("浙江恒裕智能家具有限公司").aliases.includes("浙江恒裕智能家居有限公司"));
  assert.ok(byName.has("温州上陶进出口有限公司"));
});

test("one period never collapses two different source names into one company ID", async () => {
  for (const file of ["2026-ytd-03.json", "2026-ytd-04.json", "2026-ytd-05.json", "2026-ytd-06.json"]) {
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

test("2026 Jan-Apr cumulative ranking joins both supplied text segments", async () => {
  const data = await loadJson("public/data/yueqing-export-ranking/2026-ytd-04.json");
  assert.equal(data.period.id, "2026-ytd-04");
  assert.equal(data.period.label, "2026年1—4月");
  assert.equal(data.period.type, "year_to_date");
  assert.equal(data.records.length, 2951);
  assert.deepEqual(
    data.records.map((item) => item.rank),
    Array.from({ length: 2951 }, (_, index) => index + 1),
  );
  assert.equal(data.bands.length, 7);
  assert.equal(data.records.filter((item) => item.source_duplicate).length, 2);
  assert.equal(data.records.at(-1).company_name, "中天钻头有限公司");
});

test("April aliases reuse IDs while uncertain names remain separate companies", async () => {
  const companies = await loadJson("public/data/yueqing-export-ranking/companies.json");
  const april = await loadJson("public/data/yueqing-export-ranking/2026-ytd-04.json");
  const may = await loadJson("public/data/yueqing-export-ranking/2026-ytd-05.json");
  const mayById = new Map(may.records.map((record) => [record.company_id, record]));
  const aliased = april.records.find((record) => record.company_name === "乐清市点火电力电子科技有限公司");
  const uncertain = april.records.find((record) => record.company_name === "浙江三思电气有限公司");

  assert.equal(companies.length, 3188);
  assert.equal(mayById.get(aliased.company_id).company_name, "乐清市点火力电子科技有限公司");
  assert.notEqual(
    uncertain.company_id,
    april.records.find((record) => record.company_name === "浙江三迪电气有限公司").company_id,
  );
});

test("2026 Jan-Mar cumulative ranking joins both supplied text segments", async () => {
  const data = await loadJson("public/data/yueqing-export-ranking/2026-ytd-03.json");
  assert.equal(data.period.id, "2026-ytd-03");
  assert.equal(data.period.label, "2026年1—3月");
  assert.equal(data.period.type, "year_to_date");
  assert.equal(data.records.length, 2810);
  assert.deepEqual(
    data.records.map((item) => item.rank),
    Array.from({ length: 2810 }, (_, index) => index + 1),
  );
  assert.equal(data.bands.length, 5);
  assert.equal(data.records.filter((item) => item.source_duplicate).length, 0);
  assert.equal(data.records.at(-1).company_name, "乐清临保供应链管理有限公司");
});

test("March aliases reuse IDs while uncertain names remain separate companies", async () => {
  const companies = await loadJson("public/data/yueqing-export-ranking/companies.json");
  const march = await loadJson("public/data/yueqing-export-ranking/2026-ytd-03.json");
  const april = await loadJson("public/data/yueqing-export-ranking/2026-ytd-04.json");
  const aprilById = new Map(april.records.map((record) => [record.company_id, record]));
  const aliased = march.records.find((record) => record.company_name === "神奇电磁集团有限公司");
  const uncertain = march.records.find((record) => record.company_name === "乐清市鑫众进出口有限公司");

  assert.equal(companies.length, 3188);
  assert.equal(aprilById.get(aliased.company_id).company_name, "神奇电碳集团有限公司");
  assert.notEqual(
    uncertain.company_id,
    march.records.find((record) => record.company_name === "乐清市奥鑫进出口有限公司").company_id,
  );
});
