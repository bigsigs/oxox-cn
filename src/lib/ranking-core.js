const normalize = (value) => String(value ?? "").trim().toLocaleLowerCase("zh-CN");

export function filterRanking(records, filters = {}) {
  const query = normalize(filters.query);
  const band = filters.band || "all";
  const top = Number(filters.top) || Infinity;

  return records.filter((record) => {
    if (record.rank > top) return false;
    if (band !== "all" && record.band_id !== band) return false;
    if (!query) return true;

    return normalize(`${record.company_name} ${record.company_id}`).includes(query);
  });
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
