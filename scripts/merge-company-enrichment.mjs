#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "public/data/yueqing-export-ranking");
const reviewDir = path.join(root, "review/company-enrichment");
const top500Dir = path.join(reviewDir, "top500");
const ranks501To1000Dir = path.join(reviewDir, "ranks-501-1000");
const ranks1001To1500Dir = path.join(reviewDir, "ranks-1001-1500");
const ranks1501To2000Dir = path.join(reviewDir, "ranks-1501-2000");
const ranks2001To3291Dir = path.join(reviewDir, "ranks-2001-3291");
const checkedAt = "2026-10-24";
const staleFieldUrls = new Map([
  ["YQ000022", new Set([
    "https://www.21food.cn/hot/key1032639.html",
    "https://www.atopchem.com/",
  ])],
  ["YQ000249", new Set([
    "https://www.radin.cn/",
  ])],
  ["YQ000516", new Set([
    "https://www.cnbrdq.com/pro_ok.asp?id=74",
    "https://wenzhou.11467.com/leqing/qiligangzhen/",
  ])],
]);
const genericProductionAddressIds = new Set([
  "YQ000067",
  "YQ000095",
  "YQ000366",
  "YQ000379",
  "YQ000384",
]);

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const writeJson = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
};

const ranking = readJson(path.join(dataDir, "2026-ytd-07.json")).records;
const top1500 = ranking
  .filter((record) => Number.isInteger(record.rank) && record.rank >= 1 && record.rank <= 1500)
  .sort((a, b) => a.rank - b.rank);
const top3291 = ranking
  .filter((record) => Number.isInteger(record.rank) && record.rank >= 1 && record.rank <= 3291)
  .sort((a, b) => a.rank - b.rank);

if (top1500.length !== 1500) {
  throw new Error(`Expected 1500 ranking records, received ${top1500.length}`);
}
if (top3291.length !== 3291) {
  throw new Error(`Expected 3291 ranking records, received ${top3291.length}`);
}
const top1000 = top1500.slice(0, 1000);

const top100Review = readJson(path.join(reviewDir, "top100-review.json"));
const top100Supplemental = readJson(path.join(reviewDir, "top100-supplemental.json"));
const researchFiles = [
  "research-101-233.json",
  "research-234-366.json",
  "research-367-500.json",
].filter((name) => fs.existsSync(path.join(top500Dir, name)));
const research = researchFiles.flatMap((name) => {
  const rows = readJson(path.join(top500Dir, name));
  if (!Array.isArray(rows)) throw new Error(`${name} must contain an array`);
  return rows;
});
const lowerResearchFiles = [
  "research-501-600.json",
  "research-601-700.json",
  "research-701-800.json",
  "research-801-900.json",
  "research-901-1000.json",
];
const lowerResearch = lowerResearchFiles.flatMap((name) => {
  const rows = readJson(path.join(ranks501To1000Dir, name));
  if (!Array.isArray(rows)) throw new Error(`${name} must contain an array`);
  return rows;
});
const expectedLowerResearch = top1000.filter((record) => record.rank >= 501);
if (lowerResearch.length !== expectedLowerResearch.length) {
  throw new Error(`Expected 500 ranking records for ranks 501-1000, received ${lowerResearch.length}`);
}
for (let index = 0; index < expectedLowerResearch.length; index += 1) {
  const expected = expectedLowerResearch[index];
  const row = lowerResearch[index];
  if (row.rank !== expected.rank || row.id !== expected.company_id || row.name !== expected.company_name) {
    throw new Error(
      `Ranks 501-1000 row ${index + 1} is misaligned: expected #${expected.rank} ${expected.company_id} ${expected.company_name}`,
    );
  }
}
research.push(...lowerResearch.map((row) => ({
  ...row,
  role: "rank501_to_1000",
})));
const ranks1001To1500Files = [
  "research-1001-1100.json",
  "research-1101-1200.json",
  "research-1201-1300.json",
  "research-1301-1400.json",
  "research-1401-1500.json",
];
const ranks1001To1500Research = ranks1001To1500Files.flatMap((name) => {
  const rows = readJson(path.join(ranks1001To1500Dir, name));
  if (!Array.isArray(rows)) throw new Error(`${name} must contain an array`);
  return rows;
});
const expectedRanks1001To1500Research = top1500.filter((record) => record.rank >= 1001);
if (ranks1001To1500Research.length !== expectedRanks1001To1500Research.length) {
  throw new Error(
    `Expected 500 ranking records for ranks 1001-1500, received ${ranks1001To1500Research.length}`,
  );
}
for (let index = 0; index < expectedRanks1001To1500Research.length; index += 1) {
  const expected = expectedRanks1001To1500Research[index];
  const row = ranks1001To1500Research[index];
  if (row.rank !== expected.rank || row.id !== expected.company_id || row.name !== expected.company_name) {
    throw new Error(
      `Ranks 1001-1500 row ${index + 1} is misaligned: expected #${expected.rank} ${expected.company_id} ${expected.company_name}`,
    );
  }
}
research.push(...ranks1001To1500Research.map((row) => ({
  ...row,
  role: "rank1001_to_1500",
})));
const ranks1501To3291Files = [
  {
    directory: ranks1501To2000Dir,
    from: 1501,
    to: 2000,
  },
  {
    directory: ranks2001To3291Dir,
    from: 2001,
    to: 3291,
  },
].flatMap(({ directory, from, to }) => {
  const files = [];
  for (let start = from; start <= to; start += 100) {
    files.push({
      directory,
      name: `research-${start}-${Math.min(start + 99, to)}.json`,
    });
  }
  return files;
});
const ranks1501To3291Research = ranks1501To3291Files.flatMap(({ directory, name }) => {
  const rows = readJson(path.join(directory, name));
  if (!Array.isArray(rows)) throw new Error(`${name} must contain an array`);
  return rows;
});
const expectedRanks1501To3291Research = top3291.filter((record) => record.rank >= 1501);
if (ranks1501To3291Research.length !== expectedRanks1501To3291Research.length) {
  throw new Error(
    `Expected 1791 ranking records for ranks 1501-3291, received ${ranks1501To3291Research.length}`,
  );
}
for (let index = 0; index < expectedRanks1501To3291Research.length; index += 1) {
  const expected = expectedRanks1501To3291Research[index];
  const row = ranks1501To3291Research[index];
  if (row.rank !== expected.rank || row.id !== expected.company_id || row.name !== expected.company_name) {
    throw new Error(
      `Ranks 1501-3291 row ${index + 1} is misaligned: expected #${expected.rank} ${expected.company_id} ${expected.company_name}`,
    );
  }
}
research.push(...ranks1501To3291Research.map((row) => ({
  ...row,
  role: "rank1501_to_3291",
})));
research.push(...top100Supplemental.map((row) => ({
  ...row,
  role: "top100_supplemental",
})));
const currentMarketingSites = [
  ["YQ000018", "https://www.cncele.com/"],
];
const reviewedWebsiteOverrides = new Map([
  ["YQ000593", "https://www.chintelc.com/"],
  ["YQ000679", "https://www.chinaweipeng.cn/"],
]);

const byId = new Map();
const mergeResearchRows = (base, incoming) => {
  const merged = { ...(base ?? {}) };
  for (const [key, value] of Object.entries(incoming)) {
    const isEmpty = value == null || value === "" || (Array.isArray(value) && value.length === 0);
    if (!isEmpty) merged[key] = value;
  }
  return merged;
};
const overlayResearchRows = (base, incoming) => {
  const merged = { ...(base ?? {}) };
  for (const [key, value] of Object.entries(incoming)) {
    if (value != null) merged[key] = value;
  }
  return merged;
};
for (const row of top100Review) {
  byId.set(row["企业ID"], { source: "top100", row });
}
for (const row of research) {
  const rowKey = `${row.rank}:${row.id}`;
  const existing = byId.get(rowKey);
  if (!existing) {
    byId.set(rowKey, { source: "research", row });
    continue;
  }
  if (existing.source === "research") {
    byId.set(rowKey, {
      source: "research",
      row: row.role === "top100_supplemental"
        ? overlayResearchRows(existing.row, row)
        : mergeResearchRows(existing.row, row),
    });
    continue;
  }
  if (row.role === "top100_supplemental") {
    byId.set(rowKey, {
      source: "top100+research",
      row: {
        ...existing.row,
        contact_address: row.contact_address || existing.row["官网联系地址"] || "",
        products: row.products || existing.row["主营产品"] || "",
        capital: row.capital || existing.row["注册资本"] || "",
        alibaba_address: row.alibaba_address || existing.row["Alibaba店铺地址"] || "",
      },
      research: row,
    });
    continue;
  }
  byId.set(rowKey, {
    source: "top100+research",
    row: {
      ...row,
      ...existing.row,
      contact_address: existing.row["官网联系地址"] || row.contact_address || "",
      products: existing.row["主营产品"] || row.products || "",
      capital: existing.row["注册资本"] || row.capital || "",
      alibaba_address: existing.row["Alibaba店铺地址"] || row.alibaba_address || "",
    },
    research: existing.research
      ? row.role === "top100_supplemental"
        ? overlayResearchRows(existing.research, row)
        : mergeResearchRows(existing.research, row)
      : row,
  });
}

const validHttpUrl = (value) => {
  try {
    return value instanceof URL && ["http:", "https:"].includes(value.protocol);
  } catch {
    return false;
  }
};

const normalizeUrl = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    if (!validHttpUrl(url)) return null;
    return url.href;
  } catch {
    return null;
  }
};
const explicitUrlOrNull = (value) => {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!/^https?:\/\//i.test(text)) return null;
  return normalizeUrl(text);
};

const urlsFrom = (value) => {
  if (Array.isArray(value)) return value.flatMap(urlsFrom);
  if (typeof value !== "string") return [];
  return value
    .split(/\s*\|\s*|\s*[；;]\s*/)
    .map(normalizeUrl)
    .filter(Boolean);
};

const sourceObjects = (value) => {
  const seen = new Set();
  return urlsFrom(value)
    .filter((url) => {
      if (seen.has(url)) return false;
      seen.add(url);
      return true;
    })
    .map((url) => {
      const host = new URL(url).hostname.replace(/^www\./, "");
      const label = /alibaba\.com$/i.test(host)
        ? "Alibaba 国际站公开资料"
        : /(gov\.cn|cninfo\.com\.cn|sse\.com\.cn|szse\.cn|neeq\.com\.cn)$/i.test(host)
          ? "监管或企业公告"
          : "企业公开资料";
      return { label, url };
    });
};

const domainOf = (url) => new URL(url).hostname.replace(/^www\./, "");
const cleanText = (value) => typeof value === "string" ? value.trim() : "";
const isGenericAddress = (value) => {
  const text = cleanText(value);
  return !text
    || /^(浙江省|浙江省温州市|浙江省乐清市|温州市|乐清市)[。.]?$/.test(text)
    || /具体(?:门牌|地址).{0,6}(?:未|不详)/.test(text)
    || /未公开.{0,8}地址/.test(text);
};
const isSpeculativeProduct = (value) => {
  const text = cleanText(value);
  return !text
    || /(?:由公司名称|名称及行业|公司名称含|行业目录).{0,8}推断/.test(text)
    || /^(进出口贸易|电气产品|工具类|运动用品|智能装备|科技\/电商服务)[。.\s]*$/.test(text)
    || /具体(?:产品|品类).{0,8}(?:未公开|未获得)/.test(text);
};
const looksLikeAddress = (value) => {
  const text = cleanText(value);
  return /(?:省|市|区|县|镇|街道|路|村|号|室|楼|园区|工业园)/.test(text);
};
const looksLikeCapital = (value) => {
  const text = cleanText(value);
  return /(?:人民币|万元|亿元|美元|港元|\d[\d,.]+(?:万|亿)?元)/.test(text)
    && !looksLikeAddress(text);
};
const isThirdPartyWebsite = (url) => {
  const host = domainOf(url).toLowerCase();
  return [
    "1688.com",
    "alibaba.com",
    "boyuan.com",
    "jdzj.com",
    "ybw.cn",
    "huangye88.com",
    "zhaopin.com",
    "zhipin.com",
    "cnpp.cn",
    "maigoo.com",
    "shuidi.cn",
    "shuididp.cn",
    "tendata.com",
    "cnverify.com",
    "qcc.com",
    "qichacha.com",
  ].some((domain) => host === domain || host.endsWith(`.${domain}`));
};
const isAlibabaStore = (url) => {
  const host = domainOf(url).toLowerCase();
  return host === "alibaba.com"
    || host.endsWith(".alibaba.com")
    || host === "suppliers.alibaba.com";
};
const hasWebsiteIdentityConflict = (row) => /未验证|主体不同|主体不确定|主体不一致|名称不一致|名称不完全一致|待人工确认|需人工复核|主体可能|可能为同名|同名主体/.test(
  `${cleanText(row.website_source)} ${cleanText(row.website_relation)} ${cleanText(row.note)}`,
);
const isReliableResearchWebsite = (row, url) =>
  (row.confidence === "high"
    || (row.confidence === "medium" && /官网.{0,80}(?:完整名称|主体|对应|一致)/.test(cleanText(row.note)))
    || (row.confidence === "medium" && cleanText(row.website_relation))
    || (row.confidence === "medium" && /(?:子公司|品牌关联|品牌运营|贸易主体|同名商标)/.test(
      `${cleanText(row.website_source)} ${cleanText(row.website_relation)} ${cleanText(row.note)}`,
    )))
    || (row.confidence === "medium"
      && /官网.{0,20}(?:英文站|页面).{0,80}(?:有限公司|Corporation|Company|Co\.?,?\s*Ltd)/i.test(
        cleanText(row.note),
      ))
  && !isThirdPartyWebsite(url)
  && !isAlibabaStore(url)
  && !hasWebsiteIdentityConflict(row);

const isAcceptableResearchAddress = (row, value) => {
  if (isGenericAddress(value)) return false;
  return row.confidence === "high"
    || (row.confidence === "medium" && /浙江省|乐清市|温州/.test(cleanText(value)));
};

const isAcceptableResearchProducts = (row, value) => {
  if (isSpeculativeProduct(value)) return false;
  return row.confidence === "high"
    || (row.confidence === "medium" && !/待进一步核实|需进一步核实/.test(cleanText(value)));
};

const bestResearchSource = (row, preference = []) => {
  const sources = urlsFrom(row.sources);
  return sources.find((url) => preference.some((domain) => domainOf(url).endsWith(domain)))
    ?? sources[0]
    ?? null;
};

const top100WebsiteSources = (row) => {
  const declared = urlsFrom(row["资料来源"]);
  return declared.length ? declared : [];
};

const profiles = readJson(path.join(dataDir, "company-profiles.json"));
const companies = readJson(path.join(dataDir, "companies.json"));
const companyNames = new Map(companies.map((company) => [company.company_id, company.company_name]));

const ensureProfile = (id) => {
  profiles[id] ??= {};
  profiles[id].links ??= [];
  profiles[id].details ??= {};
  return profiles[id];
};

const addLink = (profile, type, label, rawUrl, source) => {
  const url = normalizeUrl(rawUrl);
  if (!url) return false;
  const existing = profile.links.find((link) => normalizeUrl(link.url) === url);
  if (existing) {
    if (source && !existing.source) existing.source = source;
    return false;
  }
  profile.links.push({
    type,
    label,
    url,
    domain: domainOf(url),
    source,
    added_at: checkedAt,
  });
  return true;
};

const addSources = (details, sources) => {
  details.sources ??= [];
  const existing = new Set(details.sources.map((source) => normalizeUrl(source.url)).filter(Boolean));
  for (const source of sources) {
    if (!existing.has(source.url)) {
      details.sources.push(source);
      existing.add(source.url);
    }
  }
};

const setDetails = (details, field, value, sourceUrl, sourceType = "public_source", options = {}) => {
  const text = cleanText(value);
  if (!text) {
    if (!options.clear || !details[field]) return false;
    delete details[field];
    if (details.field_sources) delete details.field_sources[field];
    return true;
  }
  if (details[field] && !options.replace) return false;
  details[field] = text;
  if (sourceUrl) {
    details.field_sources ??= {};
    details.field_sources[field] = {
      url: sourceUrl,
      checked_at: checkedAt,
      source_type: sourceType,
    };
  }
  return true;
};

const standardRows = [];
let mergedProfiles = 0;
let websiteCount = 0;
let alibabaCount = 0;
let addressCount = 0;
let capitalCount = 0;
let productCount = 0;

for (const record of top3291) {
  const entry = byId.get(`${record.rank}:${record.company_id}`);
  const topRow = entry?.source === "top100" || entry?.source === "top100+research"
    ? entry.row
    : null;
  const researchRow = entry?.source === "research"
    ? entry.row
    : entry?.research ?? null;
  const profile = ensureProfile(record.company_id);
  const details = profile.details;
  const before = JSON.stringify(profile);
  const isSupplementalTop100 = researchRow?.role === "top100_supplemental";
  const isLowerRankResearch = researchRow?.role === "rank501_to_1000";
  const isTop1500Research = isLowerRankResearch || researchRow?.role === "rank1001_to_1500";
  const isRanks1501To3291Research = researchRow?.role === "rank1501_to_3291";
  const rejectedUrls = staleFieldUrls.get(record.company_id) ?? new Set();
  if (researchRow && hasWebsiteIdentityConflict(researchRow)) {
    for (const url of urlsFrom(researchRow.website)) {
      rejectedUrls.add(url);
    }
    profile.links = profile.links.filter((link) =>
      !["official_website", "official_website_alt"].includes(link.type)
      || !rejectedUrls.has(normalizeUrl(link.url)));
  }
  for (const [field, fieldSource] of Object.entries(details.field_sources ?? {})) {
    if (rejectedUrls.has(normalizeUrl(fieldSource.url))) {
      delete details[field];
      delete details.field_sources[field];
    }
  }
  if (genericProductionAddressIds.has(record.company_id)) {
    delete details.contact_address;
    if (details.field_sources) delete details.field_sources.contact_address;
  }
  if (rejectedUrls.size) {
    if (details.sources) {
      details.sources = details.sources.filter((source) => !rejectedUrls.has(normalizeUrl(source.url)));
      if (!details.sources.length) delete details.sources;
    }
    if (record.company_id !== "YQ000249") {
      for (const key of ["source_note", "confidence", "checked_at", "legal_name"]) delete details[key];
    }
  }
  if (record.company_id === "YQ000096") {
    profile.links = profile.links.filter((link) =>
      link.type !== "alibaba_store"
      || !/wenzhou-dongtian|dongtian-import/i.test(link.url));
  }
  if (record.company_id === "YQ000252") {
    profile.links = profile.links.filter((link) =>
      !["official_website", "official_website_alt"].includes(link.type)
      || domainOf(link.url) !== "chinasuntree.com");
    delete details.main_products;
    if (details.field_sources) delete details.field_sources.main_products;
  }
  if (record.company_id === "YQ000123") {
    delete details.alibaba_address;
    if (details.field_sources) delete details.field_sources.alibaba_address;
    if (details.source_note) {
      details.source_note = "官网、地址、产品、注册资本均有企业、招聘或国际站公开资料；Alibaba 链接已核验对应本企业国际站店铺。";
    }
  }
  if (record.company_id === "YQ000430") {
    delete details.alibaba_address;
    if (details.field_sources) delete details.field_sources.alibaba_address;
  }
  for (const [id, url] of currentMarketingSites) {
    if (id !== record.company_id) continue;
    profile.links = profile.links.filter((link) =>
      !(link.type === "official_website" && link.url === url)
      && !(link.type === "alibaba_store" && /metomfg\.1688\.com/.test(link.url)));
  }
  if (record.company_id === "YQ000008") {
    details.field_sources ??= {};
    details.field_sources.registered_capital ??= {
      url: "https://www.fangdatools.com/upload/file/20250605/17491109316990263.pdf",
      checked_at: details.checked_at,
      source_type: "company_public_document",
    };
    details.field_sources.registered_address ??= {
      url: "https://www.chachazhan.com/company/01HDBYC0TGYWADV6BCNKMMEJXE",
      checked_at: details.checked_at,
      source_type: "company_registry_mirror",
    };
  }

  const existingWebsiteLinks = profile.links.filter((link) =>
    ["official_website", "official_website_alt"].includes(link.type));
  const existingAlibabaLinks = profile.links.filter((link) => link.type === "alibaba_store");
  let website = existingWebsiteLinks[0]?.url ?? "";
  let alibaba = existingAlibabaLinks[0]?.url ?? "";
  let alibabaAddress = "";
  let address = "";
  let registeredAddress = "";
  let capital = "";
  let products = "";
  let note = "";
  let confidence = "";
  let sources = [];

  if (researchRow?.role === "rank1001_to_1500") {
    website = urlsFrom(researchRow.website).filter((url) => isReliableResearchWebsite(researchRow, url))[0] ?? "";
    alibaba = urlsFrom(researchRow.alibaba_url).filter(isAlibabaStore)[0] ?? "";
    profile.links = profile.links.filter((link) =>
      link.type !== "official_website"
      && link.type !== "official_website_alt"
      && link.type !== "alibaba_store");
  }

  if ((topRow && topRow["状态"] !== "待核实") || researchRow) {
    const legacy = topRow ?? {};
    const supplementalWebsites = researchRow
      ? urlsFrom(researchRow.website).filter((url) => isReliableResearchWebsite(researchRow, url))
      : [];
    const reviewedWebsite = reviewedWebsiteOverrides.get(record.company_id);
    const supplementalAlibabaUrls = researchRow
      ? urlsFrom(researchRow.alibaba_url)
        .filter(isAlibabaStore)
        .filter((url) => !domainOf(url).toLowerCase().endsWith("1688.com"))
      : [];
    const websites = [
      ...urlsFrom(legacy["官网"]),
      ...supplementalWebsites,
      ...(reviewedWebsite ? [reviewedWebsite] : []),
    ].filter((url, index, all) => all.indexOf(url) === index);
    const alibabaUrls = [
      ...urlsFrom(legacy["Alibaba店铺"]),
      ...supplementalAlibabaUrls,
    ].filter((url, index, all) => all.indexOf(url) === index);
    website = websites[0] ?? "";
    alibaba = alibabaUrls[0] ?? "";
    alibabaAddress = cleanText(researchRow?.alibaba_address)
      || cleanText(legacy["Alibaba店铺地址"])
      || (researchRow && isAcceptableResearchAddress(researchRow, researchRow.alibaba_address)
        ? cleanText(researchRow.alibaba_address)
        : "");
    address = cleanText(researchRow?.contact_address)
      || cleanText(legacy["官网联系地址"])
      || (researchRow && isAcceptableResearchAddress(researchRow, researchRow.contact_address)
        ? cleanText(researchRow.contact_address)
        : "");
    registeredAddress = cleanText(legacy["注册地址（既有资料）"]);
    capital = cleanText(researchRow?.capital)
      || cleanText(legacy["注册资本"])
      || (researchRow && ["high", "medium"].includes(researchRow.confidence) && looksLikeCapital(researchRow.capital)
        ? cleanText(researchRow.capital)
        : "");
    products = cleanText(researchRow?.products)
      || cleanText(legacy["主营产品"])
      || (researchRow && isAcceptableResearchProducts(researchRow, researchRow.products)
        ? cleanText(researchRow.products)
        : "");
    if (isTop1500Research) {
      address = isAcceptableResearchAddress(researchRow, researchRow.contact_address)
        ? cleanText(researchRow.contact_address)
        : "";
      capital = ["high", "medium"].includes(researchRow.confidence) && looksLikeCapital(researchRow.capital)
        ? cleanText(researchRow.capital)
        : "";
      products = isAcceptableResearchProducts(researchRow, researchRow.products)
        ? cleanText(researchRow.products)
        : "";
    } else if (isRanks1501To3291Research) {
      address = isAcceptableResearchAddress(researchRow, researchRow.contact_address)
        ? cleanText(researchRow.contact_address)
        : "";
      capital = looksLikeCapital(researchRow.capital)
        ? cleanText(researchRow.capital)
        : "";
      products = isAcceptableResearchProducts(researchRow, researchRow.products)
        ? cleanText(researchRow.products)
        : "";
    }
    const researchNote = cleanText(researchRow?.note);
    const legacyNote = cleanText(legacy["待核对说明"]);
    const researchIsAtLeastLegacy = !legacyNote
      || !isRanks1501To3291Research
      || researchRow?.confidence === "high"
      || legacyNote !== "公开资料不足";
    note = isRanks1501To3291Research
      ? researchIsAtLeastLegacy ? researchNote : legacyNote
      : researchNote || legacyNote;
    confidence = isRanks1501To3291Research
      ? researchIsAtLeastLegacy ? researchRow?.confidence : legacy["状态"]
      : researchRow?.confidence || legacy["状态"];
    sources = [
      ...sourceObjects(legacy["资料来源"]),
      ...sourceObjects(legacy["待核对检索来源"]),
      ...sourceObjects(researchRow?.sources),
    ].filter((source, index, all) => all.findIndex((candidate) => candidate.url === source.url) === index);

    const websiteSource = top100WebsiteSources(legacy).find((url) => !isThirdPartyWebsite(url))
      ?? bestResearchSource(researchRow ?? {}, ["chint.com", "hefengele.com", "menred-ess.cn"])
      ?? normalizeUrl(website);
    const addressSource = bestResearchSource(researchRow ?? {}, ["gov.cn", "cninfo", "sina", "qixin"])
      ?? websiteSource
      ?? sources[0]?.url
      ?? null;
    const lowerCapitalSource = isTop1500Research || isRanks1501To3291Research
      ? explicitUrlOrNull(researchRow?.capital_source)
      : null;
    const capitalSource = lowerCapitalSource
      ?? bestResearchSource(researchRow ?? {}, ["cninfo", "sina", "szse", "gov.cn"])
      ?? addressSource
      ?? sources[0]?.url
      ?? null;
    const productSource = bestResearchSource(researchRow ?? {}, ["chint.com", "hefengele.com", "menred-ess.cn", "conshion.com"])
      ?? websiteSource
      ?? sources[0]?.url
      ?? null;
    websites.forEach((url, index) => {
      addLink(
        profile,
        index === 0 ? "official_website" : "official_website_alt",
        index === 0 ? "官方网站" : "企业官网（其他域名）",
        url,
        "company_review_verified",
      );
    });
    if (alibaba) addLink(profile, "alibaba_store", "Alibaba 国际站", alibaba, "alibaba_company_profile_verified");
    const detailSource = websiteSource ?? sources[0]?.url ?? null;
    const supplementalOptions = isRanks1501To3291Research
      ? { replace: false, clear: false }
      : {
        replace: isSupplementalTop100 || researchRow?.role === "rank1001_to_1500",
        clear: true,
      };
    setDetails(details, "contact_address", address, addressSource ?? detailSource, "public_company_record", supplementalOptions);
    setDetails(details, "registered_address", registeredAddress, detailSource, "company_filing", supplementalOptions);
    setDetails(
      details,
      "alibaba_address",
      alibabaAddress,
      normalizeUrl(alibaba) ?? sources[0]?.url ?? null,
      "alibaba_company_profile",
      supplementalOptions,
    );
    setDetails(details, "registered_capital", capital, capitalSource ?? detailSource, "company_website_or_filing", supplementalOptions);
    setDetails(details, "main_products", products, productSource ?? detailSource, "company_website", supplementalOptions);
  }

  const replaceTop1500ResearchDetails = researchRow?.role === "rank1001_to_1500";
  if (note && (!details.source_note || isSupplementalTop100 || replaceTop1500ResearchDetails)) {
    details.source_note = note;
  }
  if (confidence && (!details.confidence || isSupplementalTop100 || replaceTop1500ResearchDetails)) {
    details.confidence = confidence;
  }
  if (replaceTop1500ResearchDetails) {
    details.sources = sources;
    details.field_sources ??= {};
    for (const field of Object.keys(details.field_sources)) {
      if (!details[field]) delete details.field_sources[field];
    }
  } else if (sources.length) {
    addSources(details, sources);
  }
  const hasAny = Object.keys(profile.links).length > 0
    || details.sources?.length > 0
    || Object.keys(details.field_sources ?? {}).length > 0;
  if (hasAny) {
    details.checked_at ??= checkedAt;
    if (!details.legal_name && (website || alibaba || address || capital || products)) {
      details.legal_name = record.company_name;
    }
  } else {
    delete profiles[record.company_id];
  }

  if (JSON.stringify(profile) !== before) mergedProfiles++;

  const finalProfile = profiles[record.company_id] ?? { links: [], details: {} };
  const finalLinks = finalProfile.links ?? [];
  const finalDetails = finalProfile.details ?? {};
  const finalWebsite = finalLinks.find((link) =>
    ["official_website", "official_website_alt"].includes(link.type) && validHttpUrl(new URL(link.url)))?.url ?? "";
  const finalAlibaba = finalLinks.find((link) =>
    link.type === "alibaba_store" && validHttpUrl(new URL(link.url)))?.url ?? "";
  const finalAlibabaAddress = finalDetails.alibaba_address ?? "";
  const finalAddress = finalDetails.registered_address
    || finalDetails.contact_address
    || finalDetails.operating_address
    || "";
  const finalCapital = finalDetails.registered_capital ?? "";
  const finalProducts = finalDetails.main_products ?? "";
  if (finalWebsite) websiteCount++;
  if (finalAlibaba) alibabaCount++;
  if (finalAddress) addressCount++;
  if (finalCapital) capitalCount++;
  if (finalProducts) productCount++;

  const researched = Boolean(entry);
  const highConfidence = (topRow && topRow["状态"] !== "待核实")
    || researchRow?.confidence === "high";
  standardRows.push({
    rank: record.rank,
    company_id: record.company_id,
    company_name: record.company_name ?? companyNames.get(record.company_id),
    status: !researched
      ? "待检索"
      : highConfidence
        ? "已核实或高可信"
        : researchRow?.confidence === "medium"
          ? "部分字段待复核"
          : "公开资料不足",
    website: finalWebsite,
    alibaba_url: finalAlibaba,
    alibaba_address: finalAlibabaAddress,
    address: finalAddress,
    registered_capital: finalCapital,
    main_products: finalProducts,
    logo: finalProfile.details?.logo ?? "",
    checked_at: finalDetails.checked_at ?? "",
    confidence: finalDetails.confidence ?? researchRow?.confidence ?? "",
    note: finalDetails.source_note ?? note,
    source_urls: (finalDetails.sources ?? []).map((source) => source.url),
  });
}

const sortedProfiles = Object.fromEntries(
  Object.entries(profiles)
    .map(([id, profile]) => {
      if (profile.details) {
        for (const key of ["source_note", "confidence"]) {
          delete profile.details[key];
        }
        for (const key of ["main_products", "industry", "company_type", "status"]) {
          if (typeof profile.details[key] === "string") {
            profile.details[key] = profile.details[key]
              .replace(/[（(]\s*官网产品页[，,]\s*具体系列待核对\s*[）)]/g, "（官网产品页）")
              .replace(/待核对/g, "未提供");
          }
        }
      }
      if (profile.links?.length) {
        for (const link of profile.links) {
          if (link.source === "company_review_verified") delete link.source;
        }
      } else if (profile.links) {
        delete profile.links;
      }
      if (profile.details && Object.keys(profile.details).length === 0) delete profile.details;
      return [id, profile];
    })
    .filter(([, profile]) => Object.keys(profile).length > 0)
    .sort(([a], [b]) => a.localeCompare(b)),
);
writeJson(path.join(dataDir, "company-profiles.json"), sortedProfiles);

const columns = [
  ["rank", "排名"],
  ["company_id", "企业ID"],
  ["company_name", "企业名称"],
  ["status", "核对状态"],
  ["website", "官网"],
  ["alibaba_url", "Alibaba国际站"],
  ["alibaba_address", "Alibaba店铺地址"],
  ["address", "地址"],
  ["registered_capital", "注册资金"],
  ["main_products", "主营产品"],
  ["logo", "Logo"],
  ["confidence", "置信度"],
  ["checked_at", "检查日期"],
  ["note", "核对说明"],
  ["source_urls", "资料来源"],
];

const top500Rows = standardRows.slice(0, 500);
const top1000Rows = standardRows.slice(0, 1000);
const lowerRows = standardRows.slice(500, 1000);
const newLowerRows = standardRows.slice(1000, 1500);
const ranks1501To2000Rows = standardRows.slice(1500, 2000);
const ranks2001To3291Rows = standardRows.slice(2000);
writeJson(path.join(reviewDir, "top1000-review.json"), top1000Rows);
writeJson(path.join(ranks501To1000Dir, "review-501-1000.json"), lowerRows);
writeJson(path.join(reviewDir, "top1500-review.json"), standardRows.slice(0, 1500));
writeJson(path.join(ranks1001To1500Dir, "review-1001-1500.json"), newLowerRows);
writeJson(path.join(reviewDir, "top3291-review.json"), standardRows);
writeJson(path.join(ranks1501To2000Dir, "review-1501-2000.json"), ranks1501To2000Rows);
writeJson(path.join(ranks2001To3291Dir, "review-2001-3291.json"), ranks2001To3291Rows);

const csvEscape = (value) => {
  const text = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
};
const reviewCsv = (rows) => [
  columns.map(([, label]) => csvEscape(label)).join(","),
  ...rows.map((row) => columns.map(([key]) => csvEscape(row[key])).join(",")),
].join("\n");
fs.writeFileSync(path.join(reviewDir, "top1000-review.csv"), `${reviewCsv(top1000Rows)}\n`);
fs.writeFileSync(path.join(ranks501To1000Dir, "review-501-1000.csv"), `${reviewCsv(lowerRows)}\n`);
fs.writeFileSync(path.join(reviewDir, "top1500-review.csv"), `${reviewCsv(standardRows.slice(0, 1500))}\n`);
fs.writeFileSync(path.join(ranks1001To1500Dir, "review-1001-1500.csv"), `${reviewCsv(newLowerRows)}\n`);
fs.writeFileSync(path.join(reviewDir, "top3291-review.csv"), `${reviewCsv(standardRows)}\n`);
fs.writeFileSync(path.join(ranks1501To2000Dir, "review-1501-2000.csv"), `${reviewCsv(ranks1501To2000Rows)}\n`);
fs.writeFileSync(path.join(ranks2001To3291Dir, "review-2001-3291.csv"), `${reviewCsv(ranks2001To3291Rows)}\n`);

const hasBusinessData = (row) => Boolean(
  row.website
  || row.alibaba_url
  || row.address
  || row.registered_capital
  || row.main_products,
);
const missingLowerRows = lowerRows.filter((row) => !hasBusinessData(row));
const partialLowerRows = lowerRows.filter((row) => hasBusinessData(row) && (
  row.confidence !== "high"
  || row.status === "部分字段待复核"
  || /待核|待复|需|冲突|仅|泛化|未确认|目录|catalog/i.test(row.note)
));
const compactColumns = [
  ["rank", "排名"],
  ["company_id", "企业ID"],
  ["company_name", "企业名称"],
  ["status", "核对状态"],
  ["available_fields", "已有字段"],
  ["confidence", "置信度"],
  ["note", "核对说明"],
  ["source_urls", "资料来源"],
];
const compactCsv = (rows) => [
  compactColumns.map(([, label]) => csvEscape(label)).join(","),
  ...rows.map((row) => compactColumns.map(([key]) => csvEscape(key === "available_fields"
    ? [
      row.website && "官网",
      row.alibaba_url && "Alibaba",
      row.address && "地址",
      row.registered_capital && "注册资金",
      row.main_products && "主营产品",
    ].filter(Boolean).join(" | ")
    : row[key])).join(",")),
].join("\n");
fs.writeFileSync(path.join(ranks501To1000Dir, "missing-501-1000.csv"), `${compactCsv(missingLowerRows)}\n`);
fs.writeFileSync(path.join(ranks501To1000Dir, "pending-501-1000.csv"), `${compactCsv(partialLowerRows)}\n`);
writeJson(path.join(ranks501To1000Dir, "missing-501-1000.json"), missingLowerRows);
writeJson(path.join(ranks501To1000Dir, "pending-501-1000.json"), partialLowerRows);
const missingMarkdown = [
  "# 501–1000 名尚无业务字段企业",
  "",
  `检索日期：${checkedAt}。以下 ${missingLowerRows.length} 家企业在官网、Alibaba 国际站、地址、注册资金和主营产品五项中均没有可写入的可靠公开资料。`,
  "",
  "| 排名 | 企业ID | 企业名称 | 检索状态 |",
  "| ---: | --- | --- | --- |",
  ...missingLowerRows.map((row) => (
    `| ${row.rank} | ${row.company_id} | ${row.company_name.replaceAll("|", "\\|")} | ${row.note.replaceAll("|", "\\|")} |`
  )),
  "",
].join("\n");
fs.writeFileSync(path.join(ranks501To1000Dir, "missing-501-1000.md"), missingMarkdown);

const missingNewLowerRows = newLowerRows.filter((row) => !hasBusinessData(row));
const partialNewLowerRows = newLowerRows.filter((row) => hasBusinessData(row) && (
  row.confidence !== "high"
  || row.status === "部分字段待复核"
  || /待核|待复|需|冲突|仅|泛化|未确认|目录|catalog/i.test(row.note)
));
fs.writeFileSync(
  path.join(ranks1001To1500Dir, "missing-1001-1500.csv"),
  `${compactCsv(missingNewLowerRows)}\n`,
);
fs.writeFileSync(
  path.join(ranks1001To1500Dir, "pending-1001-1500.csv"),
  `${compactCsv(partialNewLowerRows)}\n`,
);
writeJson(path.join(ranks1001To1500Dir, "missing-1001-1500.json"), missingNewLowerRows);
writeJson(path.join(ranks1001To1500Dir, "pending-1001-1500.json"), partialNewLowerRows);
const missingNewMarkdown = [
  "# 1001–1500 名尚无业务字段企业",
  "",
  `检索日期：${checkedAt}。以下 ${missingNewLowerRows.length} 家企业在官网、Alibaba 国际站、地址、注册资金和主营产品五项中均没有可写入的可靠公开资料。`,
  "",
  "| 排名 | 企业ID | 企业名称 | 检索状态 |",
  "| ---: | --- | --- | --- |",
  ...missingNewLowerRows.map((row) => (
    `| ${row.rank} | ${row.company_id} | ${row.company_name.replaceAll("|", "\\|")} | ${row.note.replaceAll("|", "\\|")} |`
  )),
  "",
].join("\n");
fs.writeFileSync(
  path.join(ranks1001To1500Dir, "missing-1001-1500.md"),
  missingNewMarkdown,
);

const missingRanks1501To2000Rows = ranks1501To2000Rows.filter((row) => !hasBusinessData(row));
const pendingRanks1501To2000Rows = ranks1501To2000Rows.filter((row) => hasBusinessData(row) && (
  row.confidence !== "high"
  || row.status === "部分字段待复核"
  || /待核|待复|需|冲突|仅|泛化|未确认|目录|catalog/i.test(row.note)
));
writeJson(path.join(ranks1501To2000Dir, "missing-1501-2000.json"), missingRanks1501To2000Rows);
writeJson(path.join(ranks1501To2000Dir, "pending-1501-2000.json"), pendingRanks1501To2000Rows);
fs.writeFileSync(
  path.join(ranks1501To2000Dir, "missing-1501-2000.csv"),
  `${compactCsv(missingRanks1501To2000Rows)}\n`,
);
fs.writeFileSync(
  path.join(ranks1501To2000Dir, "pending-1501-2000.csv"),
  `${compactCsv(pendingRanks1501To2000Rows)}\n`,
);
const missingRanks1501To2000Markdown = [
  "# 1501–2000 名尚无业务字段企业",
  "",
  `检索日期：${checkedAt}。以下 ${missingRanks1501To2000Rows.length} 家企业在官网、Alibaba 国际站、地址、注册资金和主营产品五项中均没有可写入的可靠公开资料。`,
  "",
  "| 排名 | 企业ID | 企业名称 | 检索状态 |",
  "| ---: | --- | --- | --- |",
  ...missingRanks1501To2000Rows.map((row) => (
    `| ${row.rank} | ${row.company_id} | ${row.company_name.replaceAll("|", "\\|")} | ${row.note.replaceAll("|", "\\|")} |`
  )),
  "",
].join("\n");
fs.writeFileSync(
  path.join(ranks1501To2000Dir, "missing-1501-2000.md"),
  missingRanks1501To2000Markdown,
);

const missingRanks2001To3291Rows = ranks2001To3291Rows.filter((row) => !hasBusinessData(row));
const pendingRanks2001To3291Rows = ranks2001To3291Rows.filter((row) => hasBusinessData(row) && (
  row.confidence !== "high"
  || row.status === "部分字段待复核"
  || /待核|待复|需|冲突|仅|泛化|未确认|目录|catalog/i.test(row.note)
));
writeJson(path.join(ranks2001To3291Dir, "missing-2001-3291.json"), missingRanks2001To3291Rows);
writeJson(path.join(ranks2001To3291Dir, "pending-2001-3291.json"), pendingRanks2001To3291Rows);
fs.writeFileSync(
  path.join(ranks2001To3291Dir, "missing-2001-3291.csv"),
  `${compactCsv(missingRanks2001To3291Rows)}\n`,
);
fs.writeFileSync(
  path.join(ranks2001To3291Dir, "pending-2001-3291.csv"),
  `${compactCsv(pendingRanks2001To3291Rows)}\n`,
);
const missingRanks2001To3291Markdown = [
  "# 2001–3291 名尚无业务字段企业",
  "",
  `检索日期：${checkedAt}。以下 ${missingRanks2001To3291Rows.length} 家企业在官网、Alibaba 国际站、地址、注册资金和主营产品五项中均没有可写入的可靠公开资料。`,
  "",
  "| 排名 | 企业ID | 企业名称 | 检索状态 |",
  "| ---: | --- | --- | --- |",
  ...missingRanks2001To3291Rows.map((row) => (
    `| ${row.rank} | ${row.company_id} | ${row.company_name.replaceAll("|", "\\|")} | ${row.note.replaceAll("|", "\\|")} |`
  )),
  "",
].join("\n");
fs.writeFileSync(
  path.join(ranks2001To3291Dir, "missing-2001-3291.md"),
  missingRanks2001To3291Markdown,
);

const missingAllRows = standardRows.filter((row) => !hasBusinessData(row));
const pendingAllRows = standardRows.filter((row) => hasBusinessData(row) && (
  row.confidence !== "high"
  || row.status === "部分字段待复核"
  || /待核|待复|需|冲突|仅|泛化|未确认|目录|catalog/i.test(row.note)
));
writeJson(path.join(reviewDir, "top3291-missing.json"), missingAllRows);
writeJson(path.join(reviewDir, "top3291-pending.json"), pendingAllRows);
fs.writeFileSync(path.join(reviewDir, "top3291-missing.csv"), `${compactCsv(missingAllRows)}\n`);
fs.writeFileSync(path.join(reviewDir, "top3291-pending.csv"), `${compactCsv(pendingAllRows)}\n`);
const missingAllMarkdown = [
  "# 全部 3,291 名尚无业务字段企业",
  "",
  `检索日期：${checkedAt}。以下 ${missingAllRows.length} 家企业在官网、Alibaba 国际站、地址、注册资金和主营产品五项中均没有可写入的可靠公开资料。`,
  "",
  "| 排名 | 企业ID | 企业名称 | 检索状态 |",
  "| ---: | --- | --- | --- |",
  ...missingAllRows.map((row) => (
    `| ${row.rank} | ${row.company_id} | ${row.company_name.replaceAll("|", "\\|")} | ${row.note.replaceAll("|", "\\|")} |`
  )),
  "",
].join("\n");
fs.writeFileSync(path.join(reviewDir, "top3291-missing.md"), missingAllMarkdown);

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
})[character]);
const logoSrc = (row) => row.logo || "";
const statusKey = (row) => {
  if (row.status === "已核实或高可信") return "verified";
  if (row.status === "部分字段待复核") return "partial";
  return "low";
};
const summary = {
  companies: top500Rows.length,
  researched: top500Rows.filter((row) => row.status !== "待检索").length,
  highConfidence: top500Rows.filter((row) => row.status === "已核实或高可信").length,
  websites: top500Rows.filter((row) => row.website).length,
  alibaba: top500Rows.filter((row) => row.alibaba_url).length,
  addresses: top500Rows.filter((row) => row.address).length,
  capital: top500Rows.filter((row) => row.registered_capital).length,
  products: top500Rows.filter((row) => row.main_products).length,
};
const htmlForRows = (rows, title, description) => {
  const tableRows = rows.map((row) => `<tr data-status="${statusKey(row)}">
  <td>${row.rank}</td>
  <td><code>${escapeHtml(row.company_id)}</code></td>
  <td>${escapeHtml(row.company_name)}</td>
  <td>${escapeHtml(row.status)}</td>
  <td>${row.website ? `<a href="${escapeHtml(row.website)}">${escapeHtml(domainOf(row.website))}</a>` : ""}</td>
  <td>${row.alibaba_url ? `<a href="${escapeHtml(row.alibaba_url)}">${escapeHtml(domainOf(row.alibaba_url))}</a>` : ""}</td>
  <td>${escapeHtml(row.alibaba_address)}</td>
  <td>${escapeHtml(row.address)}</td>
  <td>${escapeHtml(row.registered_capital)}</td>
  <td>${escapeHtml(row.main_products)}</td>
  <td>${row.logo ? `<img src="${escapeHtml(logoSrc(row))}" alt="" width="32" height="32" loading="lazy">` : ""}</td>
  <td>${escapeHtml(row.note)}</td>
</tr>`).join("\n");
  const pageSummary = {
    companies: rows.length,
    researched: rows.filter((row) => row.status !== "待检索").length,
    highConfidence: rows.filter((row) => row.status === "已核实或高可信").length,
    websites: rows.filter((row) => row.website).length,
    alibaba: rows.filter((row) => row.alibaba_url).length,
    addresses: rows.filter((row) => row.address).length,
    capital: rows.filter((row) => row.registered_capital).length,
    products: rows.filter((row) => row.main_products).length,
  };
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    :root{color-scheme:light;--ink:#1e2421;--muted:#66706b;--line:#dfe4e1;--paper:#f7f8f6;--panel:#fff;--accent:#255f46}
    *{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:13px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC",sans-serif}
    main{max-width:1600px;margin:0 auto;padding:36px 28px 80px}h1{font-size:30px;letter-spacing:-.03em;margin:0 0 8px}.lede{color:var(--muted);margin:0 0 24px}
    .stats{display:grid;grid-template-columns:repeat(7,minmax(100px,1fr));gap:10px;margin:0 0 20px}.stat{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:12px}.stat b{display:block;font-size:22px}.stat span{color:var(--muted);font-size:11px}
    .tools{display:flex;flex-wrap:wrap;gap:8px;align-items:center;position:sticky;top:0;z-index:3;background:var(--paper);padding:12px 0}.tools input{width:min(440px,100%);border:1px solid var(--line);border-radius:8px;padding:10px 12px;font:inherit;background:#fff}.tools button{border:1px solid var(--line);border-radius:8px;padding:8px 11px;background:#fff;color:var(--ink2);font:inherit;cursor:pointer}.tools button[aria-pressed="true"]{background:var(--accent);color:#fff;border-color:var(--accent)}.tools span{color:var(--muted)}
    .table-wrap{overflow:auto;border:1px solid var(--line);border-radius:10px;background:#fff}table{width:100%;border-collapse:collapse;min-width:1500px}th,td{text-align:left;vertical-align:top;padding:9px 10px;border-bottom:1px solid var(--line)}th{position:sticky;top:54px;background:#f0f3f1;font-size:11px;color:var(--muted);z-index:1}td:nth-child(4){white-space:nowrap}td:nth-child(8),td:nth-child(9),td:nth-child(10){min-width:180px}a{color:var(--accent)}code{font-size:11px;color:var(--muted)}tr:hover{background:#f8faf9}td img{display:block;object-fit:contain;border:1px solid var(--line);border-radius:6px;background:#fff;padding:3px}
    @media(max-width:900px){main{padding:24px 14px}.stats{grid-template-columns:repeat(2,1fr)}h1{font-size:24px}}
  </style>
</head>
<body>
<main>
  <h1>${title}</h1>
  <p class="lede">${description}</p>
  <section class="stats">
    <div class="stat"><b>${pageSummary.companies}</b><span>覆盖企业</span></div>
    <div class="stat"><b>${pageSummary.researched}</b><span>已检索</span></div>
    <div class="stat"><b>${pageSummary.highConfidence}</b><span>高可信</span></div>
    <div class="stat"><b>${pageSummary.websites}</b><span>有效官网</span></div>
    <div class="stat"><b>${pageSummary.alibaba}</b><span>Alibaba 国际站</span></div>
    <div class="stat"><b>${pageSummary.addresses}</b><span>地址</span></div>
    <div class="stat"><b>${pageSummary.products}</b><span>主营产品</span></div>
  </section>
  <div class="tools">
    <input id="filter" type="search" placeholder="搜索排名、企业、ID、地址或产品">
    <button type="button" data-filter="all" aria-pressed="true">全部</button>
    <button type="button" data-filter="verified" aria-pressed="false">高可信</button>
    <button type="button" data-filter="partial" aria-pressed="false">待复核</button>
    <button type="button" data-filter="low" aria-pressed="false">公开资料不足</button>
    <span id="count"></span>
  </div>
  <div class="table-wrap"><table><thead><tr>${columns.slice(0, 12).map(([, label]) => `<th>${escapeHtml(label)}</th>`).join("")}<th>核对说明</th></tr></thead><tbody>${tableRows}</tbody></table></div>
</main>
<script>
  const filter = document.querySelector("#filter");
  const rows = [...document.querySelectorAll("tbody tr")];
  const count = document.querySelector("#count");
  const buttons = [...document.querySelectorAll("[data-filter]")];
  let activeStatus = "all";
  const update = () => {
    const query = filter.value.trim().toLowerCase();
    let visible = 0;
    for (const row of rows) {
      const statusMatches = activeStatus === "all" || row.dataset.status === activeStatus;
      const show = statusMatches && (!query || row.textContent.toLowerCase().includes(query));
      row.hidden = !show;
      if (show) visible++;
    }
    count.textContent = visible + " / " + rows.length;
  };
  filter.addEventListener("input", update);
  for (const button of buttons) {
    button.addEventListener("click", () => {
      activeStatus = button.dataset.filter;
      for (const item of buttons) item.setAttribute("aria-pressed", String(item === button));
      update();
    });
  }
  update();
</script>
</body>
</html>
`;
};
fs.writeFileSync(
  path.join(reviewDir, "top1000-review.html"),
  htmlForRows(
    top1000Rows,
    "OXOX Top 1000 企业资料核对清单",
    "2026 年 1–7 月累计出口榜前 1000 名。空白表示检索后仍没有可写入的可靠证据，“候选”资料不进入生产页面。",
  ),
);
fs.writeFileSync(
  path.join(reviewDir, "top1500-review.html"),
  htmlForRows(
    standardRows.slice(0, 1500),
    "OXOX Top 1500 企业资料核对清单",
    "2026 年 1–7 月累计出口榜前 1500 名。空白表示检索后仍没有可写入的可靠证据，“候选”资料不进入生产页面。",
  ),
);
fs.writeFileSync(
  path.join(reviewDir, "top3291-review.html"),
  htmlForRows(
    standardRows,
    "OXOX 全部 3,291 名企业资料核对清单",
    "2026 年 1–7 月累计出口榜全部 3,291 条排名记录。空白表示检索后仍没有可写入的可靠证据，“候选”资料不进入生产页面。",
  ),
);
const dehuiRow = standardRows.find((row) => row.company_id === "YQ000220");
const dehuiReviewPath = path.join(reviewDir, "top500-review.html");
const dehuiReviewHtml = fs.readFileSync(dehuiReviewPath, "utf8");
const dehuiReviewStart = dehuiReviewHtml.indexOf("<code>YQ000220</code>");
if (dehuiRow && dehuiReviewStart >= 0) {
  const rowStart = dehuiReviewHtml.lastIndexOf("<tr", dehuiReviewStart);
  const rowEnd = dehuiReviewHtml.indexOf("</tr>", dehuiReviewStart);
  if (rowStart >= 0 && rowEnd >= 0) {
    const rowHtml = `<tr data-status="${statusKey(dehuiRow)}">
  <td>${dehuiRow.rank}</td>
  <td><code>${escapeHtml(dehuiRow.company_id)}</code></td>
  <td>${escapeHtml(dehuiRow.company_name)}</td>
  <td>${escapeHtml(dehuiRow.status)}</td>
  <td><a href="${escapeHtml(dehuiRow.website)}">${escapeHtml(domainOf(dehuiRow.website))}</a></td>
  <td></td>
  <td></td>
  <td>${escapeHtml(dehuiRow.address)}</td>
  <td>${escapeHtml(dehuiRow.registered_capital)}</td>
  <td>${escapeHtml(dehuiRow.main_products)}</td>
  <td></td>
  <td>${escapeHtml(dehuiRow.note)}</td>
</tr>`;
    fs.writeFileSync(
      dehuiReviewPath,
      `${dehuiReviewHtml.slice(0, rowStart)}${rowHtml}${dehuiReviewHtml.slice(rowEnd + 5)}`,
    );
  }
}
fs.writeFileSync(
  path.join(ranks1501To2000Dir, "review-1501-2000.html"),
  htmlForRows(
    ranks1501To2000Rows,
    "OXOX 1501–2000 名企业资料核对清单",
    "2026 年 1–7 月累计出口榜第 1501–2000 名。空白表示检索后仍没有可写入的可靠证据。",
  ),
);
fs.writeFileSync(
  path.join(ranks2001To3291Dir, "review-2001-3291.html"),
  htmlForRows(
    ranks2001To3291Rows,
    "OXOX 2001–3291 名企业资料核对清单",
    "2026 年 1–7 月累计出口榜第 2001–3291 名。空白表示检索后仍没有可写入的可靠证据。",
  ),
);

console.log(JSON.stringify({
  ...summary,
  researchRows: research.length,
  mergedProfiles,
}, null, 2));
