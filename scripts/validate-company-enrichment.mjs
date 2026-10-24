#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "public/data/yueqing-export-ranking");
const reviewDir = path.join(root, "review/company-enrichment");
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));

const ranking = readJson(path.join(dataDir, "2026-ytd-07.json")).records;
const companies = readJson(path.join(dataDir, "companies.json"));
const profiles = readJson(path.join(dataDir, "company-profiles.json"));
const checklist = readJson(path.join(reviewDir, "top500-review.json"));
const top1000Checklist = readJson(path.join(reviewDir, "top1000-review.json"));
const lowerReviewDir = path.join(reviewDir, "ranks-501-1000");
const lowerChecklist = readJson(path.join(lowerReviewDir, "review-501-1000.json"));
const missingLowerChecklist = readJson(path.join(lowerReviewDir, "missing-501-1000.json"));
const pendingLowerChecklist = readJson(path.join(lowerReviewDir, "pending-501-1000.json"));
const top1500Checklist = readJson(path.join(reviewDir, "top1500-review.json"));
const ranks1001To1500Dir = path.join(reviewDir, "ranks-1001-1500");
const ranks1001To1500Checklist = readJson(path.join(ranks1001To1500Dir, "review-1001-1500.json"));
const missing1001To1500Checklist = readJson(path.join(ranks1001To1500Dir, "missing-1001-1500.json"));
const pending1001To1500Checklist = readJson(path.join(ranks1001To1500Dir, "pending-1001-1500.json"));

const errors = [];
const assert = (condition, message) => {
  if (!condition) errors.push(message);
};
const validUrl = (value) => {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};
const host = (value) => new URL(value).hostname.replace(/^www\./, "").toLowerCase();
const thirdPartyDomains = [
  "1688.com",
  "alibaba.com",
  "boyuan.com",
  "cnpp.cn",
  "cnverify.com",
  "huangye88.com",
  "jdzj.com",
  "maigoo.com",
  "qcc.com",
  "qichacha.com",
  "shuidi.cn",
  "shuididp.cn",
  "tendata.com",
  "ybw.cn",
  "zhaopin.com",
  "zhipin.com",
];
const isThirdParty = (value) => {
  const domain = host(value);
  return thirdPartyDomains.some((item) => domain === item || domain.endsWith(`.${item}`));
};

const top500 = ranking
  .filter((record) => Number.isInteger(record.rank) && record.rank >= 1 && record.rank <= 500)
  .sort((a, b) => a.rank - b.rank);
const top1000 = ranking
  .filter((record) => Number.isInteger(record.rank) && record.rank >= 1 && record.rank <= 1000)
  .sort((a, b) => a.rank - b.rank);
const top1500 = ranking
  .filter((record) => Number.isInteger(record.rank) && record.rank >= 1 && record.rank <= 1500)
  .sort((a, b) => a.rank - b.rank);
const ids = new Set(companies.map((company) => company.company_id));

assert(top500.length === 500, `Top 500 source has ${top500.length} rows`);
assert(checklist.length === 500, `checklist has ${checklist.length} rows`);
assert(new Set(top500.map((record) => record.rank)).size === 500, "Top 500 ranks must be unique");
assert(new Set(top500.map((record) => record.company_id)).size === 500, "Top 500 company IDs must be unique");
assert(new Set(checklist.map((row) => row.rank)).size === 500, "checklist ranks must be unique");
assert(new Set(checklist.map((row) => row.company_id)).size === 500, "checklist company IDs must be unique");
assert(top1000.length === 1000, `Top 1000 source has ${top1000.length} rows`);
assert(top1000Checklist.length === 1000, `Top 1000 checklist has ${top1000Checklist.length} rows`);
assert(lowerChecklist.length === 500, `lower checklist has ${lowerChecklist.length} rows`);
assert(new Set(top1000.map((record) => record.rank)).size === 1000, "Top 1000 ranks must be unique");
assert(new Set(top1000Checklist.map((row) => row.rank)).size === 1000, "Top 1000 checklist ranks must be unique");
assert(top1500.length === 1500, `Top 1500 source has ${top1500.length} rows`);
assert(top1500Checklist.length === 1500, `Top 1500 checklist has ${top1500Checklist.length} rows`);
assert(ranks1001To1500Checklist.length === 500, `ranks 1001-1500 checklist has ${ranks1001To1500Checklist.length} rows`);
assert(new Set(top1500.map((record) => record.rank)).size === 1500, "Top 1500 ranks must be unique");
assert(new Set(top1500Checklist.map((row) => row.rank)).size === 1500, "Top 1500 checklist ranks must be unique");

top500.forEach((record, index) => {
  const row = checklist[index];
  assert(row, `ranking #${record.rank}: missing checklist row`);
  if (!row) return;
  assert(row.rank === record.rank, `ranking #${record.rank}: checklist rank mismatch`);
  assert(row.company_id === record.company_id, `ranking #${record.rank}: checklist ID mismatch`);
  assert(row.company_name === record.company_name, `ranking #${record.rank}: checklist name mismatch`);
  assert(ids.has(row.company_id), `${row.company_id}: not in stable company registry`);
  for (const field of ["website", "alibaba_url"]) {
    if (row[field]) assert(validUrl(row[field]), `${row.company_id}: invalid ${field} ${row[field]}`);
  }
  if (row.website) {
    assert(!isThirdParty(row.website), `${row.company_id}: third-party directory used as website ${row.website}`);
    assert(!host(row.website).includes("alibaba.com"), `${row.company_id}: Alibaba URL used as website`);
  }
  if (row.alibaba_url) {
    assert(host(row.alibaba_url).endsWith("alibaba.com"), `${row.company_id}: Alibaba field is not Alibaba`);
    assert(!host(row.alibaba_url).endsWith("1688.com"), `${row.company_id}: 1688 domestic store used as Alibaba`);
  }
});

top1000.forEach((record, index) => {
  const row = top1000Checklist[index];
  assert(row, `ranking #${record.rank}: missing Top 1000 checklist row`);
  if (!row) return;
  assert(row.rank === record.rank, `ranking #${record.rank}: Top 1000 checklist rank mismatch`);
  assert(row.company_id === record.company_id, `ranking #${record.rank}: Top 1000 checklist ID mismatch`);
  assert(row.company_name === record.company_name, `ranking #${record.rank}: Top 1000 checklist name mismatch`);
  assert(ids.has(row.company_id), `${row.company_id}: Top 1000 ID not in stable company registry`);
  for (const field of ["website", "alibaba_url"]) {
    if (row[field]) assert(validUrl(row[field]), `${row.company_id}: invalid Top 1000 ${field} ${row[field]}`);
  }
  if (row.website) {
    assert(!isThirdParty(row.website), `${row.company_id}: Top 1000 third-party website ${row.website}`);
    assert(!host(row.website).includes("alibaba.com"), `${row.company_id}: Top 1000 Alibaba URL used as website`);
  }
  if (row.alibaba_url) {
    assert(host(row.alibaba_url).endsWith("alibaba.com"), `${row.company_id}: Top 1000 Alibaba field is not Alibaba`);
    assert(!host(row.alibaba_url).endsWith("1688.com"), `${row.company_id}: Top 1000 1688 URL used as Alibaba`);
  }
});

top1000.slice(500).forEach((record, index) => {
  const row = lowerChecklist[index];
  assert(row, `ranking #${record.rank}: missing lower checklist row`);
  if (!row) return;
  assert(row.rank === record.rank, `ranking #${record.rank}: lower checklist rank mismatch`);
  assert(row.company_id === record.company_id, `ranking #${record.rank}: lower checklist ID mismatch`);
  assert(row.company_name === record.company_name, `ranking #${record.rank}: lower checklist name mismatch`);
});

top1500.forEach((record, index) => {
  const row = top1500Checklist[index];
  assert(row, `ranking #${record.rank}: missing Top 1500 checklist row`);
  if (!row) return;
  assert(row.rank === record.rank, `ranking #${record.rank}: Top 1500 checklist rank mismatch`);
  assert(row.company_id === record.company_id, `ranking #${record.rank}: Top 1500 checklist ID mismatch`);
  assert(row.company_name === record.company_name, `ranking #${record.rank}: Top 1500 checklist name mismatch`);
  assert(ids.has(row.company_id), `${row.company_id}: Top 1500 ID not in stable company registry`);
  for (const field of ["website", "alibaba_url"]) {
    if (row[field]) assert(validUrl(row[field]), `${row.company_id}: invalid Top 1500 ${field} ${row[field]}`);
  }
  if (row.website) {
    assert(!isThirdParty(row.website), `${row.company_id}: Top 1500 third-party website ${row.website}`);
    assert(!host(row.website).includes("alibaba.com"), `${row.company_id}: Top 1500 Alibaba URL used as website`);
  }
  if (row.alibaba_url) {
    assert(host(row.alibaba_url).endsWith("alibaba.com"), `${row.company_id}: Top 1500 Alibaba field is not Alibaba`);
    assert(!host(row.alibaba_url).endsWith("1688.com"), `${row.company_id}: Top 1500 1688 URL used as Alibaba`);
  }
});

top1500.slice(1000).forEach((record, index) => {
  const row = ranks1001To1500Checklist[index];
  assert(row, `ranking #${record.rank}: missing ranks 1001-1500 checklist row`);
  if (!row) return;
  assert(row.rank === record.rank, `ranking #${record.rank}: ranks 1001-1500 rank mismatch`);
  assert(row.company_id === record.company_id, `ranking #${record.rank}: ranks 1001-1500 ID mismatch`);
  assert(row.company_name === record.company_name, `ranking #${record.rank}: ranks 1001-1500 name mismatch`);
});

const hasBusinessData = (row) => Boolean(
  row.website
  || row.alibaba_url
  || row.address
  || row.registered_capital
  || row.main_products,
);
const expectedMissingLower = lowerChecklist.filter((row) => !hasBusinessData(row));
const expectedPendingLower = lowerChecklist.filter((row) => hasBusinessData(row) && (
  row.confidence !== "high"
  || row.status === "部分字段待复核"
  || /待核|待复|需|冲突|仅|泛化|未确认|目录|catalog/i.test(row.note)
));
assert(
  JSON.stringify(missingLowerChecklist) === JSON.stringify(expectedMissingLower),
  "missing-501-1000.json is stale or incomplete",
);
assert(
  JSON.stringify(pendingLowerChecklist) === JSON.stringify(expectedPendingLower),
  "pending-501-1000.json is stale or incomplete",
);
const expectedMissing1001To1500 = ranks1001To1500Checklist.filter((row) => !hasBusinessData(row));
const expectedPending1001To1500 = ranks1001To1500Checklist.filter((row) => hasBusinessData(row) && (
  row.confidence !== "high"
  || row.status === "部分字段待复核"
  || /待核|待复|需|冲突|仅|泛化|未确认|目录|catalog/i.test(row.note)
));
assert(
  JSON.stringify(missing1001To1500Checklist) === JSON.stringify(expectedMissing1001To1500),
  "missing-1001-1500.json is stale or incomplete",
);
assert(
  JSON.stringify(pending1001To1500Checklist) === JSON.stringify(expectedPending1001To1500),
  "pending-1001-1500.json is stale or incomplete",
);
for (const id of ["YQ000488", "YQ000499", "YQ000516", "YQ000517", "YQ000714", "YQ000716", "YQ000717", "YQ000726", "YQ000753"]) {
  assert(top1000Checklist.some((row) => row.company_id === id), `${id}: lower-rank research row is missing`);
}
assert(
  lowerChecklist.filter((row) => row.company_id === "YQ000488").length === 2,
  "YQ000488 must remain on both source ranks 527 and 528",
);

const sourceIds = new Set();
for (const file of fs.readdirSync(reviewDir)) {
  if (!/^(top100-review|top100-supplemental)\.json$/.test(file)) continue;
  for (const row of readJson(path.join(reviewDir, file))) {
    sourceIds.add(row["企业ID"] ?? row.id);
  }
}
const top500ResearchDir = path.join(reviewDir, "top500");
const canonicalResearchFiles = [
  "research-101-233.json",
  "research-234-366.json",
  "research-367-500.json",
];
for (const file of canonicalResearchFiles.filter((name) => fs.existsSync(path.join(top500ResearchDir, name)))) {
  const rows = readJson(path.join(top500ResearchDir, file));
  for (const row of rows) sourceIds.add(row.id);
}
for (const row of checklist.filter((item) => item.status !== "待检索")) {
  assert(sourceIds.has(row.company_id), `${row.company_id}: researched checklist row has no source research record`);
}

const researchFiles = fs.readdirSync(ranks1001To1500Dir)
  .filter((name) => /^research-\d{4}-\d{4}\.json$/.test(name))
  .sort();
const researchRows = researchFiles.flatMap((name) => readJson(path.join(ranks1001To1500Dir, name)));
const researchById = new Map(researchRows.map((row) => [row.id, row]));
assert(researchRows.length === 500, `ranks 1001-1500 research has ${researchRows.length} rows`);
assert(new Set(researchRows.map((row) => row.rank)).size === 500, "ranks 1001-1500 research ranks must be unique");
assert(new Set(researchRows.map((row) => row.id)).size === 500, "ranks 1001-1500 research IDs must be unique");
top1500.slice(1000).forEach((record, index) => {
  const row = researchRows[index];
  assert(row, `ranking #${record.rank}: missing ranks 1001-1500 research row`);
  if (!row) return;
  assert(row.rank === record.rank, `ranking #${record.rank}: research rank mismatch`);
  assert(row.id === record.company_id, `ranking #${record.rank}: research ID mismatch`);
  assert(row.name === record.company_name, `ranking #${record.rank}: research name mismatch`);
});

const genericDirectoryHome = (value) => {
  try {
    const url = new URL(value);
    return url.hostname.replace(/^www\./, "") === "shuidi.cn"
      && !url.pathname.replace(/\/+$/, "");
  } catch {
    return true;
  }
};
const rejectedResearchUrls = [
  /lc-electric\.com/i,
  /cnsipule\.com/i,
  /jinxuandq\.com/i,
  /yeestor\.com/i,
  /cn-sanai\.com/i,
  /ctdlkj\.com/i,
  /cablestie\.com/i,
  /kableclip\.en\.alibaba\.com/i,
  /\/\/www\.yh9\.cn\/?/i,
  /\/\/www\.jiebao\.com\/?/i,
];
for (const row of researchRows) {
  assert(Array.isArray(row.sources), `${row.id}: sources must be an array`);
  for (const source of row.sources) {
    assert(validUrl(source), `${row.id}: invalid research source ${source}`);
    assert(!genericDirectoryHome(source), `${row.id}: generic directory homepage source ${source}`);
    assert(!rejectedResearchUrls.some((pattern) => pattern.test(source)), `${row.id}: rejected source ${source}`);
  }
  const populatedFields = ["website", "alibaba_url", "contact_address", "capital", "products"]
    .filter((field) => row[field]);
  if (populatedFields.length) {
    assert(row.confidence === "high" || row.confidence === "medium", `${row.id}: populated research row has low confidence`);
    assert(row.sources.length > 0, `${row.id}: populated research row has no source`);
  }
  if (!populatedFields.length) {
    assert(row.confidence === "low", `${row.id}: empty research row must be low confidence`);
  }
  if (row.website) {
    assert(validUrl(row.website), `${row.id}: invalid research website ${row.website}`);
    assert(!isThirdParty(row.website), `${row.id}: third-party research website ${row.website}`);
    assert(!rejectedResearchUrls.some((pattern) => pattern.test(row.website)), `${row.id}: rejected website ${row.website}`);
  }
  if (row.alibaba_url) {
    assert(host(row.alibaba_url).endsWith("alibaba.com"), `${row.id}: research Alibaba field is not Alibaba`);
  }
}

const researchChecklist = new Map(ranks1001To1500Checklist.map((row) => [row.company_id, row]));
const expectResearchChecklist = (id, predicate, message) => {
  const row = researchChecklist.get(id);
  assert(row && predicate(row), `${id}: ${message}`);
};
expectResearchChecklist(
  "YQ001074",
  (row) => row.website === "https://www.kinbarlock.com/" && row.address && row.main_products,
  "Baofeng lock website, address and products must survive enrichment",
);
expectResearchChecklist(
  "YQ001071",
  (row) => row.website === "https://www.yqfx.com/"
    && row.alibaba_url === "https://fxdq.en.alibaba.com/company_profile.html"
    && !row.address
    && !row.registered_capital,
  "Fuxin website and Alibaba store must survive while unverified address and capital remain blank",
);
expectResearchChecklist(
  "YQ001030",
  (row) => row.website === "https://www.delixi.com/"
    && !row.address
    && !row.registered_capital,
  "Delixi must use the user-confirmed website and omit conflicting exact fields",
);
expectResearchChecklist(
  "YQ001114",
  (row) => !row.website && !row.alibaba_url && !row.address && !row.main_products,
  "Langchen must not inherit the mismatched lc-electric data",
);
expectResearchChecklist(
  "YQ001152",
  (row) => !row.website && row.main_products.includes("电能表"),
  "Blue Sky must omit the unverified website while retaining verified product scope",
);
expectResearchChecklist(
  "YQ001321",
  (row) => row.website === "http://www.chinasanai.com/"
    && !row.address
    && !row.registered_capital,
  "Sanai must use only the verified website and products",
);
expectResearchChecklist(
  "YQ001410",
  (row) => row.website === "http://www.daming.com/"
    && row.address
    && row.registered_capital.includes("40000.10")
    && row.main_products,
  "Daming must retain its public-company website, address, capital and products",
);
expectResearchChecklist(
  "YQ001353",
  (row) => !row.website && !row.address && !row.registered_capital && !row.main_products,
  "Renhe must remain blank until its source URL and business fields can be reverified",
);
expectResearchChecklist(
  "YQ002632",
  (row) => row.website === "https://cn.giant-electric.com/"
    && !row.address
    && row.registered_capital.includes("3500"),
  "Zhegui must retain its verified website and capital without a generic address",
);

const checklistById = new Map(checklist.map((row) => [row.company_id, row]));
const expectChecklist = (id, predicate, message) => {
  const row = checklistById.get(id);
  assert(row && predicate(row), `${id}: ${message}`);
};
expectChecklist(
  "YQ000081",
  (row) => row.website === "https://kaseey.com/"
    && row.alibaba_url === "https://suppliers.alibaba.com/yueqing-kaseey-electric-co-ltd_2881268908"
    && row.address === "浙江省温州市乐清市乐清经济开发区纬十九路77-8号",
  "Kaseey website, Alibaba store and exact address must survive enrichment",
);
expectChecklist(
  "YQ000042",
  (row) => row.registered_capital.includes("502,433,125"),
  "Tengen capital must use the latest corporate disclosure",
);
expectChecklist(
  "YQ000010",
  (row) => row.registered_capital.includes("193,880,696")
    && !row.registered_capital.includes("193,880,696.00万元"),
  "Yihua capital must use the annual-report amount and reject the mislabelled unit",
);
expectChecklist(
  "YQ000018",
  (row) => !row.website,
  "Changcheng Trading must not inherit the unverified CNC group website",
);
expectChecklist("YQ000043", (row) => row.website.includes("korlen.com"), "Korlen website is missing");
expectChecklist("YQ000071", (row) => row.website.includes("chunsheng.com"), "Chunsheng website is missing");
expectChecklist("YQ000090", (row) => Boolean(row.registered_capital), "Jiaju capital is missing");
expectChecklist(
  "YQ000098",
  (row) => row.website === "https://www.wzjh.cc/"
    && row.registered_capital.includes("1580")
    && row.address.includes("永兴二路10号"),
  "Jinhong website, capital and exact address must survive enrichment",
);
expectChecklist(
  "YQ000107",
  (row) => row.address.includes("纬十九路307号A幢二楼")
    && row.registered_capital.includes("30")
    && row.main_products.includes("逆变器"),
  "Socome registered address, capital and product scope must survive enrichment",
);
expectChecklist(
  "YQ000113",
  (row) => row.registered_capital.includes("5100"),
  "Hongtai capital is missing",
);
expectChecklist(
  "YQ000133",
  (row) => row.address.includes("经七路477号")
    && row.registered_capital.includes("20266.66"),
  "Helonex exact address and capital are missing",
);
expectChecklist(
  "YQ000162",
  (row) => row.registered_capital.includes("1180"),
  "Galaxy Fuse capital is missing",
);
expectChecklist(
  "YQ000169",
  (row) => row.address.includes("象阳工业区")
    && row.registered_capital.includes("588")
    && row.main_products.includes("LED"),
  "Hongbao Lighting registered data must survive enrichment",
);
expectChecklist(
  "YQ000249",
  (row) => !row.website.includes("radin.cn"),
  "Leidun Import & Export must not inherit Radin data",
);
expectChecklist(
  "YQ000252",
  (row) => !row.website && !row.main_products,
  "Shoufa Import & Export must not inherit unrelated SUNTREE data",
);
expectChecklist(
  "YQ000516",
  (row) => !row.website.includes("cnbrdq.com")
    && row.address.includes("七里港镇金东村")
    && row.registered_capital.includes("500")
    && row.main_products.includes("配电开关控制设备"),
  "YQ000516 must retain its exact-name CNVerify record without inheriting the unrelated cnbrdq.com website",
);
for (const id of [
  "YQ000109",
  "YQ000118",
  "YQ000127",
  "YQ000149",
  "YQ000158",
  "YQ000171",
  "YQ000183",
  "YQ000189",
  "YQ000206",
  "YQ000212",
  "YQ000237",
  "YQ000240",
  "YQ000246",
  "YQ000262",
  "YQ000291",
  "YQ000300",
  "YQ000321",
  "YQ000342",
  "YQ000366",
  "YQ000379",
  "YQ000384",
]) {
  expectChecklist(
    id,
    (row) => !row.address
      || !/^(浙江省|浙江省温州市)?乐清市[。.]?$/.test(row.address.trim())
      || /只确认到乐清市|仅到乐清市/.test(row.note),
    "generic city-only address must not be displayed",
  );
}

const seenSources = new Set();
for (const [id, profile] of Object.entries(profiles)) {
  assert(ids.has(id), `${id}: profile has no stable company identity`);
  assert(profile && typeof profile === "object" && !Array.isArray(profile), `${id}: profile must be an object`);
  assert(Array.isArray(profile.links ?? []), `${id}: links must be an array`);
  for (const link of profile.links ?? []) {
    const key = `${id}\t${link.type}\t${link.url}`;
    assert(!seenSources.has(key), `${id}: duplicate link ${link.url}`);
    seenSources.add(key);
    assert(["official_website", "official_website_alt", "alibaba_store"].includes(link.type), `${id}: unsupported link type ${link.type}`);
    assert(validUrl(link.url), `${id}: invalid stored link ${link.url}`);
    if (["official_website", "official_website_alt"].includes(link.type)) {
      assert(!isThirdParty(link.url), `${id}: third-party domain stored as official link ${link.url}`);
    }
    if (link.type === "alibaba_store") {
      assert(host(link.url).endsWith("alibaba.com"), `${id}: invalid Alibaba store ${link.url}`);
      assert(!host(link.url).endsWith("1688.com"), `${id}: domestic 1688 store in Alibaba field`);
    }
  }
  for (const field of [
    "registered_capital",
    "main_products",
    "registered_address",
    "contact_address",
    "alibaba_address",
  ]) {
    const value = profile.details?.[field];
    if (!value) continue;
    assert(typeof value === "string" && value.trim().length > 1, `${id}: empty ${field}`);
    const fieldSource = profile.details?.field_sources?.[field]?.url;
    assert(fieldSource, `${id}: ${field} has no source URL`);
    if (fieldSource) assert(validUrl(fieldSource), `${id}: ${field} has invalid source URL`);
  }
  if (profile.details?.registered_capital) {
    const value = profile.details.registered_capital;
    assert(/(?:人民币|万元|亿元|美元|港元|\d元)|未注明币种/.test(value), `${id}: capital lacks a currency/unit or explicit caveat`);
    if (!/(?:人民币|万元|亿元|美元|港元|\d元)/.test(value)) {
      assert(/未注明币种/.test(value), `${id}: capital lacks an explicit unit and caveat`);
    }
    assert(!/(?:省|市|区|县|镇|街道|路|村|号|室|楼|园区)/.test(value)
      || /(?:人民币|万元|亿元|美元|港元)/.test(value), `${id}: capital appears to be an address`);
  }
}

if (errors.length) {
  console.error(errors.slice(0, 100).join("\n"));
  console.error(`\n${errors.length} validation error(s)`);
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    top500: top500.length,
    top1000: top1000.length,
    top1500: top1500.length,
    profiles: Object.keys(profiles).length,
    checklist: checklist.length,
    lowerChecklist: lowerChecklist.length,
    lowerMissing: missingLowerChecklist.length,
    lowerPending: pendingLowerChecklist.length,
    ranks1001To1500: ranks1001To1500Checklist.length,
    ranks1001To1500Missing: missing1001To1500Checklist.length,
    ranks1001To1500Pending: pending1001To1500Checklist.length,
    researched: checklist.filter((row) => row.status !== "待检索").length,
    websites: checklist.filter((row) => row.website).length,
    alibaba: checklist.filter((row) => row.alibaba_url).length,
    alibabaAddresses: checklist.filter((row) => row.alibaba_address).length,
    addresses: checklist.filter((row) => row.address).length,
    capital: checklist.filter((row) => row.registered_capital).length,
    products: checklist.filter((row) => row.main_products).length,
  }, null, 2));
}
