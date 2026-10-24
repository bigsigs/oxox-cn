import { pinyin } from "pinyin-pro";

const normalize = (value) => String(value ?? "").trim().toLocaleLowerCase("zh-CN");
const compact = (value) => normalize(value).replace(/[^\p{Letter}\p{Number}]+/gu, "");
const containsHan = (value) => /\p{Script=Han}/u.test(String(value ?? ""));

function getPinyinTokens(value) {
  const syllables = pinyin(String(value ?? ""), {
    toneType: "none",
    type: "array",
    nonZh: "consecutive",
  }).map(compact).filter(Boolean);

  if (!syllables.length) return [];
  return [
    syllables.join(""),
    syllables.map((syllable) => syllable[0]).join(""),
  ];
}

function getSearchTokens(value, includePinyin = true) {
  const normalized = compact(value);
  const tokens = normalized ? [normalized] : [];
  if (includePinyin && containsHan(value)) tokens.push(...getPinyinTokens(value));
  return [...new Set(tokens.filter(Boolean))];
}

export function buildCompanySearchIndex(companies = []) {
  return new Map(companies.map(c => [c.company_id, {
    names: [c.company_name, ...(c.aliases || []), c.brand_name].filter(Boolean).map(compact),
    domain: normalize(c.domain),
    phonetics: [c.company_name, ...(c.aliases || []), c.brand_name].filter(Boolean).map(getPinyinTokens),
  }]));
}
function matchScore(record, query, index) {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return 0;
  const entry = index.get(record.company_id);
  const names = [compact(record.company_name), ...(entry?.names || [])];
  const id = compact(record.company_id);
  const scores = terms.map(term => {
    const token = compact(term);
    if (!token) return Infinity;
    if (names[0] === token) return 0;
    if (names.includes(token)) return 1;
    if (names.some(name => name.includes(token))) return 2;
    if (entry?.domain && entry.domain.includes(term)) return 3;
    if (id === token || (token.startsWith("yq") && token.length >= 3 && id.startsWith(token))) return 3;
    if (token.length >= 2 && /^[a-z]+$/.test(term)) {
      const phonetics = entry?.phonetics || [getPinyinTokens(record.company_name)];
      if (phonetics.some(([full]) => full?.includes(token))) return 4;
      if (token.length >= 3 && phonetics.some(([, initials]) => initials?.includes(token))) return 5;
    }
    return Infinity;
  });
  return Math.max(...scores);
}
export function filterRanking(records, filters = {}) {
  const index = filters.searchIndex instanceof Map ? filters.searchIndex : new Map();
  return records.filter(record => record.rank <= (Number(filters.top) || Infinity)
    && (!filters.band || filters.band === "all" || record.band_id === filters.band)
    && Number.isFinite(matchScore(record, filters.query, index)));
}
export function suggestCompanies(records, query, options = {}) {
  if (!normalize(query)) return [];
  const index = options.searchIndex instanceof Map ? options.searchIndex : buildCompanySearchIndex(records);
  const seen = new Set();
  return records.map(record => ({ record, score: matchScore(record, query, index) }))
    .filter(item => Number.isFinite(item.score))
    .sort((a,b) => a.score-b.score || a.record.rank-b.record.rank)
    .filter(({record}) => { if(seen.has(record.company_id)) return false; seen.add(record.company_id); return true; })
    .slice(0, Math.min(8, options.limit || 8)).map(item => item.record);
}

export function paginateRanking(records, requestedPage = 1, pageSize = 50) {
  const size = Math.max(1, Number(pageSize) || 50);
  const pageCount = Math.max(1, Math.ceil(records.length / size));
  const page = Math.min(Math.max(1, Number(requestedPage) || 1), pageCount);
  const offset = (page - 1) * size;
  const items = records.slice(offset, offset + size);

  return {
    items,
    page,
    pageCount,
    start: records.length ? offset + 1 : 0,
    end: offset + items.length,
    total: records.length,
  };
}

export function getPageWindow(page, pageCount) {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);

  const pages = new Set([1, pageCount]);
  for (let current = page - 2; current <= page + 2; current += 1) {
    if (current > 1 && current < pageCount) pages.add(current);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const window = [];
  sorted.forEach((current, index) => {
    const previous = sorted[index - 1];
    if (index && current - previous > 1) window.push("…");
    window.push(current);
  });
  return window;
}

export function getCompanyRecords(records, companyId) {
  return records
    .filter((record) => record.company_id === companyId)
    .sort((a, b) => a.rank - b.rank);
}

export function buildPeriodIndex(records) {
  const index = new Map();
  records.forEach((record) => {
    const matches = index.get(record.company_id) || [];
    matches.push(record);
    index.set(record.company_id, matches);
  });
  return index;
}

export function describeRankChange(record, previousIndex) {
  const previous = previousIndex.get(record.company_id) || [];
  if (!previous.length) return { type: "new", delta: null, previousRank: null };
  if (previous.length > 1) return { type: "review", delta: null, previousRank: null };

  const previousRank = previous[0].rank;
  const delta = previousRank - record.rank;
  if (delta === 0) return { type: "flat", delta: 0, previousRank };
  return { type: delta > 0 ? "up" : "down", delta: Math.abs(delta), previousRank };
}
