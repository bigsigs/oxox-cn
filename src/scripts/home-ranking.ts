// @ts-nocheck
import { buildCompanySearchIndex, buildPeriodIndex, filterRanking, suggestCompanies } from "../lib/ranking-core.js";
import { amountGroups, matchesAmountGroup, rankSignal } from "../lib/home-ranking.js";
import { initializeMenuSelect } from "./menu-select";
initializeMenuSelect();
const boot = JSON.parse(document.querySelector("#rankingBoot").textContent);
const search = document.querySelector("#rankingSearch");
const suggestions = document.querySelector("#rankingSuggestions");
const periodSelect = document.querySelector("#periodSelect");
const exactShortcut = document.querySelector("#exactPeriodShortcut");
const rows = document.querySelector("#rankingRows");
const more = document.querySelector("#loadMore");
const status = document.querySelector("#rankingStatus");
const error = document.querySelector("#rankingError");
const sourceGapNote = document.querySelector("#sourceGapNote");
const returnKey = "oxox-ranking-return";
const navigationEntry = performance.getEntriesByType("navigation")[0];
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
const format = value => new Intl.NumberFormat("zh-CN").format(value);
const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[c]);
const cache = new Map();
const state = { periodId: boot.latest, dataset: null, previousIndex: new Map(), currentIndex: new Map(), hasPrevious: true, searchIndex: new Map(), groups: [], group: "all", filter: "all", page: 1, pageSize: 30, ready: false, activeSuggestion: -1, pageUrl: "" };
let cleanCanvasUrl = "";

function normalizedUrl(value = location.href) {
  const url = new URL(value, location.origin);
  url.searchParams.delete("restore");
  return `${url.pathname}${url.search}${url.hash}`;
}
function readRestorePoint({ force = false } = {}) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(returnKey) || "null");
    if (!saved || typeof saved.url !== "string" || normalizedUrl(saved.url) !== normalizedUrl()) return null;
    const explicitRestore = new URLSearchParams(location.search).has("restore");
    const browserBack = navigationEntry?.type === "back_forward";
    return force || explicitRestore || browserBack ? saved : null;
  } catch {
    return null;
  }
}
let savedReturn = readRestorePoint();
const params = new URLSearchParams(location.search);

function saveRestorePoint(extra = {}) {
  if (!state.ready) return;
  try {
    const previous = JSON.parse(sessionStorage.getItem(returnKey) || "null");
    const retained = previous?.url === state.pageUrl ? previous : {};
    sessionStorage.setItem(returnKey, JSON.stringify({
      ...retained,
      // pagehide can fire after the destination URL has replaced the ranking URL.
      // Keep the last rendered ranking URL so leaving the page cannot overwrite it.
      url: state.pageUrl,
      periodId: state.periodId,
      query: search.value,
      filter: state.filter,
      group: state.group,
      page: state.page,
      scrollY: window.scrollY,
      savedAt: Date.now(),
      ...extra,
    }));
  } catch {}
}
function restoreScroll(saved) {
  const target = Array.from(rows.querySelectorAll("a")).find(link => link.getAttribute("href") === saved.href);
  const top = target && Number.isFinite(Number(saved.top))
    ? window.scrollY + target.getBoundingClientRect().top - Number(saved.top)
    : Number(saved.scrollY) || 0;
  window.scrollTo({ left: 0, top, behavior: "instant" });
}
async function restoreSavedState(saved) {
  if (!saved || !state.ready) return;
  state.page = Math.max(1, Math.floor(Number(saved.page)) || 1);
  state.group = state.groups.some(group => group.id === saved.group) ? saved.group : "all";
  state.filter = ["top100", "top500", "up", "down"].includes(saved.filter) ? saved.filter : "all";
  if (typeof saved.query === "string" && saved.query !== search.value) search.value = saved.query;
  render();
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  restoreScroll(saved);
}

rows.addEventListener("click", event => {
  const link = event.target.closest("a.ranking-row");
  if (!link) return;
  saveRestorePoint({
    clickedRank: Number(link.dataset.rank),
    href: link.getAttribute("href"),
    top: link.getBoundingClientRect().top,
  });
});

const requestedPeriod = params.get("period");
search.value = params.get("q") || "";
const previousPeriod = period => boot.periods.find(p => p.as_of < period.as_of && p.as_of.slice(0, 4) === period.as_of.slice(0, 4));
const getDataset = id => {
  if (!cache.has(id)) {
    const period = boot.periods.find(p => p.id === id);
    cache.set(id, fetch(`/data/yueqing-export-ranking/${period.file}`).then(response => {
      if (!response.ok) throw new Error("load");
      return response.json();
    }).catch(reason => { cache.delete(id); throw reason; }));
  }
  return cache.get(id);
};
function rowMarkup(record) {
  const meta = boot.companyMeta[record.company_id];
  const initials = record.company_name.replace(/^(浙江|温州|乐清)(市)?/, "").slice(0, 2);
  const signal = rankSignal(record, state.currentIndex, state.previousIndex, state.hasPrevious);
  const amount = record.amount_label || record.band_label;
  const exact = state.dataset.period.precision === "exact";
  const missingAmount = amount === "未提供";
  const amountText = exact ? format(record.amount_usd_10k) : amount.replace(/万(?:美元|美金)$/, "");
  return `<a class="ranking-row" href="/yueqing-export-ranking/company/${escape(record.company_id)}/" data-rank="${record.rank}"><span class="row-rank ${record.rank <= 3 ? "rank-top" : ""}">${record.rank}</span><span class="company-mark ${meta?.icon && meta?.darkIcon ? "dark-logo" : ""}" aria-hidden="true">${meta?.icon ? `<img src="${escape(meta.icon)}" alt="" width="42" height="42" loading="lazy">` : `<span>${escape(initials)}</span>`}</span><span class="row-company"><b>${escape(record.company_name)}</b>${meta?.domain ? `<span class="company-badge">${escape(meta.websiteBadge || "官网")}</span>` : ""}<span class="company-subline">${escape(meta?.domain || record.company_id)}</span></span><span class="row-amount">${escape(amountText)}${missingAmount ? "" : "<small>万美元</small>"}</span><span class="row-change ${signal.type}"><span class="mobile-change-label">名次 </span>${signal.label}</span></a>`;
}
function canvasUrl() {
  const url = new URL(cleanCanvasUrl || location.href, location.origin);
  for (const [key, value] of [
    ["q", search.value.trim()],
    ["period", state.periodId === boot.latest ? "" : state.periodId],
    ["filter", state.filter === "all" ? "" : state.filter],
    ["band", state.group === "all" ? "" : state.group],
    ["page", state.page > 1 ? String(state.page) : ""],
  ]) value ? url.searchParams.set(key, value) : url.searchParams.delete(key);
  url.searchParams.delete("restore");
  return url;
}
function saveUrl() {
  if (!state.ready) return;
  const url = canvasUrl();
  cleanCanvasUrl = state.pageUrl = `${url.pathname}${url.search}${url.hash}`;
  history.replaceState(history.state, "", url);
}
function closeSuggestions() {
  suggestions.hidden = true;
  state.activeSuggestion = -1;
  search.setAttribute("aria-expanded", "false");
  search.removeAttribute("aria-activedescendant");
}
function selectSuggestion(record) {
  search.value = record.company_name;
  state.page = 1;
  closeSuggestions();
  render();
  saveRestorePoint({ focus: "search" });
  document.querySelector(".ranking-section").scrollIntoView({ block: "start" });
}
function renderSuggestions() {
  if (!state.ready || !search.value.trim()) return closeSuggestions();
  const matches = suggestCompanies(state.dataset.records, search.value, { searchIndex: state.searchIndex, limit: 6 });
  if (!matches.length) return closeSuggestions();
  suggestions.innerHTML = matches.map((record, index) => `<button type="button" role="option" id="rankingSuggestion${index}" data-company-id="${escape(record.company_id)}" aria-selected="${index === state.activeSuggestion}"><span class="suggestion-rank">#${record.rank}</span><span><b class="suggestion-name">${escape(record.company_name)}</b><small class="suggestion-note">${escape(boot.companyMeta[record.company_id]?.domain || record.company_id)}</small></span><span class="suggestion-arrow" aria-hidden="true">↗</span></button>`).join("");
  suggestions.hidden = false;
  search.setAttribute("aria-expanded", "true");
}
function render() {
  if (!state.ready) return;
  let records = filterRanking(state.dataset.records, { query: search.value, searchIndex: state.searchIndex, top: state.filter === "top100" ? 100 : state.filter === "top500" ? 500 : 0 });
  if (state.group !== "all") {
    const group = state.groups.find(item => item.id === state.group);
    if (group) records = records.filter(record => matchesAmountGroup(record, group));
  }
  if (["up", "down"].includes(state.filter)) records = records.filter(record => rankSignal(record, state.currentIndex, state.previousIndex, state.hasPrevious).type === state.filter);
  const pages = Math.max(1, Math.ceil(records.length / state.pageSize));
  state.page = Math.min(state.page, pages);
  const start = (state.page - 1) * state.pageSize;
  rows.innerHTML = records.slice(start, start + state.pageSize).map(rowMarkup).join("");
  more.hidden = records.length <= state.pageSize;
  const visiblePages = [...new Set([1, pages, state.page - 1, state.page, state.page + 1,
    ...(state.page === 1 ? [2, 3] : []), ...(state.page === pages ? [pages - 2, pages - 1] : [])])]
    .filter(page => page >= 1 && page <= pages).sort((a, b) => a - b);
  const pageButton = (page, label = String(page), extra = "") => `<button type="button" class="ranking-page${page === state.page && !extra ? " is-active" : ""}" data-page="${page}" aria-label="${extra || `第 ${page} 页`}"${page === state.page && !extra ? ' aria-current="page"' : ""}${extra && (page < 1 || page > pages) ? " disabled" : ""}>${label}</button>`;
  more.innerHTML = pageButton(state.page - 1, "‹", "上一页") + visiblePages.map((page, index) =>
    `${index && page - visiblePages[index - 1] > 1 ? '<span class="ranking-page-gap" aria-hidden="true">…</span>' : ""}${pageButton(page)}`
  ).join("") + pageButton(state.page + 1, "›", "下一页");
  document.querySelector("#rankingEmpty").hidden = records.length > 0;
  status.textContent = records.length ? `共 ${format(records.length)} 条记录，第 ${format(state.page)} / ${format(pages)} 页` : "没有匹配的记录";
  document.querySelector("#clearFilters").hidden = !search.value && state.group === "all" && state.filter === "all";
  document.querySelectorAll("#rankTabs [data-filter]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.filter === state.filter)));
  document.querySelectorAll("#distributionLegend button").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.group === state.group)));
  exactShortcut?.setAttribute("aria-pressed", String(state.dataset.period.precision === "exact"));
  saveUrl();
  renderSuggestions();
}
function reset() {
  search.value = "";
  state.group = "all";
  state.filter = "all";
  state.page = 1;
  render();
}
async function setPeriod(id, options = {}) {
  const period = boot.periods.find(item => item.id === id);
  if (!period) return;
  const previous = previousPeriod(period);
  periodSelect.disabled = true;
  if (exactShortcut) exactShortcut.disabled = true;
  more.setAttribute("aria-busy", "true");
  status.textContent = "正在载入所选周期…";
  error.hidden = true;
  try {
    const [dataset, previousData] = await Promise.all([getDataset(id), previous ? getDataset(previous.id) : null]);
    state.periodId = id;
    state.dataset = dataset;
    state.hasPrevious = !!previous;
    state.currentIndex = buildPeriodIndex(dataset.records);
    state.previousIndex = buildPeriodIndex(previousData?.records || []);
    state.groups = amountGroups(dataset);
    state.group = state.groups.some(group => group.id === options.group) ? options.group : "all";
    state.page = Math.max(1, Math.floor(Number(options.page)) || 1);
    state.ready = true;
    periodSelect.value = id;
    document.querySelector("#statRecords").textContent = format(dataset.records.length);
    document.querySelector("#tabCount").textContent = format(dataset.records.length);
    document.querySelector("#statBands").textContent = dataset.period.precision === "exact" ? "精准" : dataset.bands.length;
    document.querySelector("#statBandLabel").textContent = dataset.period.precision === "exact" ? "源表金额口径" : "出口额区间";
    document.querySelector("#rankingPeriod").textContent = `${period.label} · ${dataset.period.precision === "exact" ? "精准数值，单位：万美元" : "累计出口额区间，非单月数据"}。`;
    sourceGapNote.hidden = id !== "2026-ytd-08";
    document.querySelector("#amountHeading").textContent = dataset.period.precision === "exact" ? "累计出口额（万美元）" : "累计出口额区间";
    document.querySelector("#changeHeading").textContent = previous ? `较 ${previous.label.replace(/^\d{4}年/, "").replace("（精准数值）", "精准").replace("（区间数据）", "区间")}` : "名次变化";
    document.querySelector("#distributionBar").innerHTML = state.groups.map(group => `<button type="button" data-group="${group.id}" style="--segment:${group.color};flex:${group.count}" title="${escape(group.label)} · ${format(group.count)}" aria-label="${escape(group.label)}：${group.count}条记录"></button>`).join("");
    document.querySelector("#distributionLegend").innerHTML = state.groups.map(group => `<button type="button" data-group="${group.id}" style="--segment:${group.color}" aria-pressed="false"><i aria-hidden="true"></i>${escape(group.label)}<b>${format(group.count)}</b></button>`).join("");
    render();
  } catch {
    error.hidden = false;
    status.textContent = state.ready ? "未能切换周期，仍显示上次载入的数据。" : "当前显示前 30 条排名记录";
    periodSelect.value = state.periodId;
  } finally {
    periodSelect.disabled = false;
    more.removeAttribute("aria-busy");
    if (exactShortcut) exactShortcut.disabled = !state.ready;
  }
}
async function initialize() {
  error.hidden = true;
  try {
    const response = await fetch("/data/yueqing-export-ranking/companies.json");
    if (!response.ok) throw new Error("load");
    state.searchIndex = buildCompanySearchIndex((await response.json()).map(company => ({ ...company, ...boot.companyMeta[company.company_id] })));
    const restore = readRestorePoint();
    const filter = params.get("filter") || restore?.filter;
    state.filter = ["top100", "top500", "up", "down"].includes(filter) ? filter : "all";
    const periodId = restore?.periodId && boot.periods.some(period => period.id === restore.periodId)
      ? restore.periodId
      : boot.periods.some(period => period.id === requestedPeriod) ? requestedPeriod : boot.latest;
    await setPeriod(periodId, {
      group: params.get("band") || restore?.group,
      page: restore?.page || params.get("page"),
    });
    if (restore) {
      await restoreSavedState(restore);
      if (restore.focus === "search") search.focus({ preventScroll: true });
    }
  } catch {
    error.hidden = false;
  }
}

search.addEventListener("input", () => {
  state.page = 1;
  state.activeSuggestion = -1;
  render();
});
search.addEventListener("focus", renderSuggestions);
search.addEventListener("keydown", event => {
  const options = [...suggestions.querySelectorAll("[role=option]")];
  if (event.key === "Escape") return closeSuggestions();
  if (!options.length) return;
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    const delta = event.key === "ArrowDown" ? 1 : -1;
    state.activeSuggestion = (state.activeSuggestion + delta + options.length) % options.length;
    options.forEach((option, index) => option.setAttribute("aria-selected", String(index === state.activeSuggestion)));
    search.setAttribute("aria-activedescendant", options[state.activeSuggestion].id);
  } else if (event.key === "Enter" && state.activeSuggestion >= 0) {
    event.preventDefault();
    const record = state.dataset.records.find(item => item.company_id === options[state.activeSuggestion].dataset.companyId);
    if (record) selectSuggestion(record);
  }
});
document.querySelector("#rankingSearchForm").addEventListener("submit", event => {
  event.preventDefault();
  state.page = 1;
  closeSuggestions();
  render();
  document.querySelector(".ranking-section").scrollIntoView({ block: "start" });
});
document.querySelector("#rankTabs").addEventListener("click", event => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  state.filter = button.dataset.filter;
  state.page = 1;
  render();
});
document.querySelector(".distribution").addEventListener("click", event => {
  const button = event.target.closest("[data-group]");
  if (!button || !state.ready) return;
  state.group = state.group === button.dataset.group ? "all" : button.dataset.group;
  state.page = 1;
  render();
});
exactShortcut?.addEventListener("click", () => {
  if (!periodSelect.disabled) setPeriod(exactShortcut.dataset.period);
});
periodSelect.addEventListener("change", () => setPeriod(periodSelect.value));
more.addEventListener("click", event => {
  const button = event.target.closest("[data-page]");
  if (!button || button.disabled || periodSelect.disabled) return;
  state.page = Number(button.dataset.page) || 1;
  render();
  document.querySelector(".ranking-board").scrollIntoView({ block: "start" });
  saveRestorePoint();
  rows.querySelector("a")?.focus({ preventScroll: true });
});
document.querySelector("#clearFilters").addEventListener("click", reset);
document.querySelector("[data-reset]").addEventListener("click", reset);
document.querySelector("#retryLoad").addEventListener("click", initialize);
document.addEventListener("keydown", event => {
  if (event.key === "/" && !event.ctrlKey && !event.metaKey && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement) && !event.target.isContentEditable) {
    event.preventDefault();
    search.focus();
  }
});
document.addEventListener("click", event => {
  if (!(event.target instanceof Node) || !event.target.closest(".ranking-search")) closeSuggestions();
});
suggestions.addEventListener("click", event => {
  const option = event.target.closest("[data-company-id]");
  if (!option) return;
  const record = state.dataset.records.find(item => item.company_id === option.dataset.companyId);
  if (record) selectSuggestion(record);
});
window.addEventListener("scroll", () => saveRestorePoint(), { passive: true });
window.addEventListener("pagehide", () => saveRestorePoint());
window.addEventListener("pageshow", async event => {
  if (!event.persisted) return;
  const restored = readRestorePoint({ force: true });
  if (!restored) return;
  savedReturn = restored;
  if (state.ready) await restoreSavedState(restored);
  else initialize();
});
initialize();
