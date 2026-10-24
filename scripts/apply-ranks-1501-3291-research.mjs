#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "public/data/yueqing-export-ranking");
const reviewDir = path.join(root, "review/company-enrichment");
const indexFile = "/tmp/shuidi-index-1501-3291.json";
const detailsFile = "/tmp/shuidi-details-1501-3291.json";
const validationFile = "/tmp/shuidi-website-validation-1501-3291.json";
const checkedAt = "2026-10-24";
const firstRank = 1501;
const lastRank = 3291;
const rejectedWebsiteIds = new Set(["YQ003354"]);

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const writeJson = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
};

for (const file of [indexFile, detailsFile, validationFile]) {
  if (!fs.existsSync(file)) throw new Error(`Required research cache is missing: ${file}`);
}

const ranking = readJson(path.join(dataDir, "2026-ytd-07.json")).records
  .filter((record) => Number.isInteger(record.rank) && record.rank >= firstRank && record.rank <= lastRank)
  .sort((a, b) => a.rank - b.rank);
const index = readJson(indexFile);
const details = readJson(detailsFile);
const validation = readJson(validationFile);
const expectedCount = lastRank - firstRank + 1;

if (ranking.length !== expectedCount) {
  throw new Error(`Expected ${expectedCount} ranking rows, received ${ranking.length}`);
}
if (index.length !== expectedCount) {
  throw new Error(`Expected ${expectedCount} search-index rows, received ${index.length}`);
}

const keyOf = (row) => `${row.rank}:${row.id ?? row.company_id}`;
const indexByKey = new Map(index.map((row) => [keyOf(row), row]));
const detailsByKey = new Map(details.map((row) => [keyOf(row), row]));
const validationByKey = new Map(validation.map((row) => [keyOf(row), row]));

for (let position = 0; position < ranking.length; position += 1) {
  const record = ranking[position];
  const indexRow = index[position];
  if (
    !indexRow
    || indexRow.rank !== record.rank
    || indexRow.id !== record.company_id
    || indexRow.name !== record.company_name
  ) {
    throw new Error(
      `Search index is misaligned at #${record.rank}: expected ${record.company_id} ${record.company_name}`,
    );
  }
}

const compactScope = (scope) => {
  const text = String(scope ?? "")
    .replace(/^一般项目[:：]\s*/, "")
    .replace(/[；;]\s*许可项目[:：].*$/s, "")
    .replace(/[（(]除依法须经批准的项目外[^）)]*[）)]/g, "")
    .replace(/[（(]依法须经批准的项目[^）)]*[）)]/g, "")
    .replace(/[。；;\s]+$/g, "")
    .replaceAll("；", "、")
    .trim();
  if (!text || text === "-") return "";
  if (text.length <= 220) return text;
  const items = text.split(/[、，,]/).map((item) => item.trim()).filter(Boolean);
  let result = "";
  for (const item of items) {
    const candidate = result ? `${result}、${item}` : item;
    if (candidate.length > 220) break;
    result = candidate;
  }
  return result || `${text.slice(0, 217)}…`;
};

const records = ranking.map((record) => {
  const key = keyOf(record);
  const indexRow = indexByKey.get(key);
  const detail = detailsByKey.get(key);
  const websiteValidation = validationByKey.get(key);
  const hasExactDetail = Boolean(
    detail?.parsed
    && detail.name === record.company_name
    && detail.address
    && detail.address !== "-"
    && detail.scope
    && detail.scope !== "-",
  );
  const hasVerifiedWebsite = Boolean(
    websiteValidation?.status === "verified"
    && websiteValidation.website
    && websiteValidation.hasName
    && !rejectedWebsiteIds.has(record.company_id),
  );
  const website = hasVerifiedWebsite ? websiteValidation.website : "";
  const source = hasExactDetail ? detail.url : "";
  const populated = Boolean(
    website
    || hasExactDetail
    || detail?.capital && detail.capital !== "-",
  );
  let note;
  if (hasExactDetail && website) {
    note = "工商登记信息按企业全称精确匹配；官网经页面主体、公司全名和内容交叉验证。未确认 Alibaba 国际站。";
  } else if (hasExactDetail) {
    note = "工商登记信息按企业全称精确匹配；未发现能确认属于本企业的独立官网或 Alibaba 国际站。";
  } else if (indexRow?.result === null) {
    note = "公开工商检索未返回同名主体；未用近似名称或同名品牌强行匹配，相关字段留空待人工核对。";
  } else {
    note = "检索到公开记录，但主体信息未达到精确匹配标准；相关字段留空待人工核对。";
  }

  return {
    rank: record.rank,
    id: record.company_id,
    name: record.company_name,
    website,
    website_source: website ? websiteValidation.source : "",
    contact_address: hasExactDetail ? detail.address : "",
    products: hasExactDetail ? compactScope(detail.scope) : "",
    capital: hasExactDetail && detail.capital && detail.capital !== "-" ? detail.capital : "",
    capital_source: source,
    alibaba_url: "",
    alibaba_source: "",
    alibaba_address: "",
    confidence: hasExactDetail ? "medium" : "low",
    note,
    sources: source ? [source] : [],
    checked_at: checkedAt,
    _populated: populated,
  };
});

const targets = [
  {
    directory: path.join(reviewDir, "ranks-1501-2000"),
    from: 1501,
    to: 2000,
  },
  {
    directory: path.join(reviewDir, "ranks-2001-3291"),
    from: 2001,
    to: 3291,
  },
];

let filesWritten = 0;
for (const target of targets) {
  for (let start = target.from; start <= target.to; start += 100) {
    const end = Math.min(start + 99, target.to);
    const file = path.join(target.directory, `research-${start}-${end}.json`);
    if (!fs.existsSync(file)) {
      throw new Error(`Research placeholder is missing: ${file}`);
    }
    const placeholder = readJson(file);
    const expected = ranking.filter((row) => row.rank >= start && row.rank <= end);
    if (
      placeholder.length !== expected.length
      || placeholder.some((row, index) => (
        row.rank !== expected[index].rank
        || row.id !== expected[index].company_id
        || row.name !== expected[index].company_name
      ))
    ) {
      throw new Error(`Research placeholder is misaligned: ${file}`);
    }
    const rows = records
      .filter((row) => row.rank >= start && row.rank <= end)
      .map(({ _populated, ...row }) => row);
    writeJson(file, rows);
    filesWritten += 1;
  }
}

const allRecords = records.map(({ _populated, ...row }) => row);
const summary = {
  records: allRecords.length,
  exactBusinessRecords: allRecords.filter((row) => row.contact_address && row.capital).length,
  addresses: allRecords.filter((row) => row.contact_address).length,
  capital: allRecords.filter((row) => row.capital).length,
  products: allRecords.filter((row) => row.products).length,
  websites: allRecords.filter((row) => row.website).length,
  alibaba: allRecords.filter((row) => row.alibaba_url).length,
  unmatched: allRecords.filter((row) => !row.contact_address).length,
  filesWritten,
};
console.log(JSON.stringify(summary, null, 2));
