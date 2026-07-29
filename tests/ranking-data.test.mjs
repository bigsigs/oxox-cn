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
  assert.equal(companies.length, 3431);
  assert.equal(companies[0].company_id, "YQ000001");
  assert.equal(companies[0].company_name, "浙江正泰电器股份有限公司");
  assert.equal(new Set(companies.map((item) => item.company_id)).size, companies.length);
  assert.equal(companies.filter((item) => item.needs_review).length, 3);
});

test("period manifest exposes the latest period and confirmed history", async () => {
  const manifest = await loadJson("public/data/yueqing-export-ranking/periods.json");
  assert.equal(manifest.latest, "2026-ytd-06");
  assert.deepEqual(
    manifest.periods.map((period) => period.id),
    ["2026-ytd-06", "2026-ytd-05", "2026-ytd-04", "2026-ytd-03", "2026-ytd-02", "2025-ytd-12", "2025-ytd-06"],
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

  assert.equal(companies.length, 3431);
  assert.equal(priorChint.company_id, currentChint.company_id);
  assert.ok(byName.get("浙江恒裕智能家具有限公司").aliases.includes("浙江恒裕智能家居有限公司"));
  assert.ok(byName.has("温州上陶进出口有限公司"));
});

test("one period never collapses two different source names into one company ID", async () => {
  for (const file of ["2025-ytd-06.json", "2025-ytd-12.json", "2026-ytd-02.json", "2026-ytd-03.json", "2026-ytd-04.json", "2026-ytd-05.json", "2026-ytd-06.json"]) {
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

  assert.equal(companies.length, 3431);
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

  assert.equal(companies.length, 3431);
  assert.equal(aprilById.get(aliased.company_id).company_name, "神奇电碳集团有限公司");
  assert.notEqual(
    uncertain.company_id,
    march.records.find((record) => record.company_name === "乐清市奥鑫进出口有限公司").company_id,
  );
});

test("2025 Jan-Jun cumulative export ranking preserves both supplied fragments", async () => {
  const data = await loadJson("public/data/yueqing-export-ranking/2025-ytd-06.json");
  assert.equal(data.period.id, "2025-ytd-06");
  assert.equal(data.period.label, "2025年1—6月");
  assert.equal(data.period.type, "year_to_date");
  assert.equal(data.period.metric, "exports");
  assert.equal(data.records.length, 2549);
  assert.deepEqual(
    data.records.map((item) => item.rank),
    Array.from({ length: 2549 }, (_, index) => index + 1),
  );
  assert.equal(data.bands.length, 8);
  assert.equal(data.records.filter((item) => item.source_duplicate).length, 0);
  assert.equal(data.records.find((item) => item.rank === 28).band_label, "区间未提供");
  assert.equal(data.records.find((item) => item.rank === 2291).company_name, "乐清市宇华模具有限公司");
  assert.equal(data.records.at(-1).company_name, "伊发控股集团有限公司");
  assert.match(data.source_note, /出口额区间/);
  assert.doesNotMatch(data.source_note, /进出口额/);
});

test("2025 clear aliases reuse IDs while uncertain names remain separate", async () => {
  const data2025 = await loadJson("public/data/yueqing-export-ranking/2025-ytd-06.json");
  const data2026 = await loadJson("public/data/yueqing-export-ranking/2026-ytd-06.json");
  const currentById = new Map(data2026.records.map((record) => [record.company_id, record]));
  const aliased = data2025.records.find((record) => record.company_name === "温州盛电子有限公司");
  const uncertain = data2025.records.find((record) => record.company_name === "浙江俊威电气有限公司");

  assert.equal(currentById.get(aliased.company_id).company_name, "温州合盛电子有限公司");
  assert.notEqual(
    uncertain.company_id,
    data2026.records.find((record) => record.company_name === "浙江恩威电气有限公司").company_id,
  );
});

test("2025 full-year cumulative export ranking applies all confirmed rank bands", async () => {
  const data = await loadJson("public/data/yueqing-export-ranking/2025-ytd-12.json");
  assert.deepEqual(data.period, {
    id: "2025-ytd-12",
    label: "2025年1—12月",
    type: "year_to_date",
    as_of: "2025-12-31",
    metric: "exports",
  });
  assert.equal(data.records.length, 2992);
  assert.deepEqual(
    data.records.map((item) => item.rank),
    Array.from({ length: 2992 }, (_, index) => index + 1),
  );
  assert.deepEqual(
    data.bands.map(({ label, count }) => ({ label, count })),
    [
      { label: "1300-28000万美元", count: 56 },
      { label: "1000-1300万美元", count: 24 },
      { label: "800-1000万美元", count: 29 },
      { label: "560-800万美元", count: 62 },
      { label: "400-560万美元", count: 62 },
      { label: "300-400万美元", count: 68 },
      { label: "240-300万美元", count: 68 },
      { label: "200-240万美元", count: 60 },
      { label: "170-200万美元", count: 55 },
      { label: "140-170万美元", count: 62 },
      { label: "120-140万美元", count: 69 },
      { label: "100-120万美元", count: 59 },
      { label: "100-110万美元", count: 22 },
      { label: "100万美元以下", count: 2296 },
    ],
  );
  assert.equal(data.records.find((item) => item.rank === 56).band_label, "1300-28000万美元");
  assert.equal(data.records.find((item) => item.rank === 57).band_label, "1000-1300万美元");
  assert.equal(data.records.find((item) => item.rank === 80).band_label, "1000-1300万美元");
  assert.equal(data.records.find((item) => item.rank === 81).band_label, "800-1000万美元");
  assert.equal(data.records.find((item) => item.rank === 696).band_label, "100-110万美元");
  assert.equal(data.records.find((item) => item.rank === 697).band_label, "100万美元以下");
  assert.equal(data.records.at(-1).company_name, "温州市乐淳电子科技有限公司");
  assert.equal(data.records.filter((item) => item.source_duplicate).length, 6);
  assert.match(data.source_note, /累计排名与出口额区间/);
  assert.doesNotMatch(data.source_note, /进出口额/);
});

test("2025 full-year clear OCR aliases reuse stable IDs", async () => {
  const fullYear = await loadJson("public/data/yueqing-export-ranking/2025-ytd-12.json");
  const firstHalf = await loadJson("public/data/yueqing-export-ranking/2025-ytd-06.json");
  const firstHalfById = new Map(firstHalf.records.map((record) => [record.company_id, record]));
  const aliases = [
    ["亚兰电气(浙江)有限公司", "亚杜兰电气（浙江）有限公司"],
    ["乐清市凯发电制造有限公司", "乐清市凯发电气制造有限公司"],
    ["浙江立电表仪器有限公司", "浙江登立电表仪器有限公司"],
  ];

  for (const [source, expected] of aliases) {
    const record = fullYear.records.find((item) => item.company_name === source);
    assert.equal(firstHalfById.get(record.company_id).company_name, expected);
  }
});

test("2026 Jan-Feb cumulative export ranking applies the confirmed rank bands", async () => {
  const data = await loadJson("public/data/yueqing-export-ranking/2026-ytd-02.json");
  assert.deepEqual(data.period, {
    id: "2026-ytd-02",
    label: "2026年1—2月",
    type: "year_to_date",
    as_of: "2026-02-28",
    metric: "exports",
  });
  assert.equal(data.records.length, 2664);
  assert.deepEqual(
    data.records.map((item) => item.rank),
    Array.from({ length: 2664 }, (_, index) => index + 1),
  );
  assert.deepEqual(
    data.bands.map(({ label, count }) => ({ label, count })),
    [
      { label: "270-5500万美元", count: 52 },
      { label: "160-270万美元", count: 55 },
      { label: "100-160万美元", count: 55 },
      { label: "100万美元以下", count: 2502 },
    ],
  );
  assert.equal(data.records.find((item) => item.rank === 52).band_label, "270-5500万美元");
  assert.equal(data.records.find((item) => item.rank === 53).band_label, "160-270万美元");
  assert.equal(data.records.find((item) => item.rank === 107).band_label, "160-270万美元");
  assert.equal(data.records.find((item) => item.rank === 108).band_label, "100-160万美元");
  assert.equal(data.records.find((item) => item.rank === 162).band_label, "100-160万美元");
  assert.equal(data.records.find((item) => item.rank === 163).band_label, "100万美元以下");
  assert.equal(data.records.at(-1).company_name, "乐清临保供应链管理有限公司");
  assert.equal(data.records.filter((item) => item.source_duplicate).length, 0);
  assert.match(data.source_note, /累计排名与出口额区间/);
  assert.doesNotMatch(data.source_note, /进出口额/);
});

test("February clear aliases reuse March IDs while uncertain names stay separate", async () => {
  const february = await loadJson("public/data/yueqing-export-ranking/2026-ytd-02.json");
  const march = await loadJson("public/data/yueqing-export-ranking/2026-ytd-03.json");
  const marchById = new Map(march.records.map((record) => [record.company_id, record]));
  const aliased = february.records.find((record) => record.company_name === "乐清市南顿五金制品有限公司");
  const uncertain = february.records.find((record) => record.company_name === "浙江梧泰电气有限公司");

  assert.equal(marchById.get(aliased.company_id).company_name, "乐清市南颉五金制品有限公司");
  assert.notEqual(
    uncertain.company_id,
    march.records.find((record) => record.company_name === "浙江雷泰电气有限公司").company_id,
  );
});
