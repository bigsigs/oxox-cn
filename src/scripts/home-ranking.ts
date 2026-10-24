// @ts-nocheck
import { buildCompanySearchIndex, buildPeriodIndex, filterRanking } from "../lib/ranking-core.js";
import { amountGroups, matchesAmountGroup, rankSignal } from "../lib/home-ranking.js";
const boot = JSON.parse(document.querySelector("#rankingBoot").textContent);
const search = document.querySelector("#rankingSearch");
const periodSelect = document.querySelector("#periodSelect");
const exactShortcut = document.querySelector("#exactPeriodShortcut");
const rows = document.querySelector("#rankingRows");
const more = document.querySelector("#loadMore");
const status = document.querySelector("#rankingStatus");
const error = document.querySelector("#rankingError");
const format = value => new Intl.NumberFormat("zh-CN").format(value);
const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[c]);
const cache = new Map();
const state = { periodId: boot.latest, dataset: null, previousIndex: new Map(), currentIndex: new Map(), hasPrevious: true, searchIndex: new Map(), groups: [], group: "all", filter: "all", limit: 30, ready: false };
const params = new URLSearchParams(location.search);
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
  return `<a class="ranking-row" href="/yueqing-export-ranking/company/${escape(record.company_id)}/" data-rank="${record.rank}"><span class="row-rank ${record.rank <= 3 ? "rank-top" : ""}">${record.rank}</span><span class="company-mark ${meta?.icon && meta?.darkIcon ? "dark-logo" : ""}" aria-hidden="true">${meta?.icon ? `<img src="${escape(meta.icon)}" alt="" width="42" height="42" loading="lazy">` : `<span>${escape(initials)}</span>`}</span><span class="row-company"><b>${escape(record.company_name)}</b>${meta?.domain ? `<span class="company-badge">官网</span>` : ""}<span class="company-subline">${escape(meta?.domain || record.company_id)}</span></span><span class="row-amount">${escape(amountText)}${missingAmount ? "" : "<small>万美元</small>"}</span><span class="row-change ${signal.type}"><span class="mobile-change-label">名次 </span>${signal.label}</span></a>`;
}
function saveUrl() {
  const url = new URL(location.href);
  for (const [key, value] of [["q", search.value.trim()], ["period", state.periodId === boot.latest ? "" : state.periodId], ["filter", state.filter === "all" ? "" : state.filter], ["band", state.group === "all" ? "" : state.group]]) value ? url.searchParams.set(key, value) : url.searchParams.delete(key);
  history.replaceState(null, "", url);
}
function render() {
  if (!state.ready) return;
  let records = filterRanking(state.dataset.records, { query: search.value, searchIndex: state.searchIndex, top: state.filter === "top100" ? 100 : state.filter === "top500" ? 500 : 0 });
  if (state.group !== "all") {
    const group = state.groups.find(g => g.id === state.group);
    if (group) records = records.filter(record => matchesAmountGroup(record, group));
  }
  if (["up", "down"].includes(state.filter)) records = records.filter(record => rankSignal(record, state.currentIndex, state.previousIndex, state.hasPrevious).type === state.filter);
  rows.innerHTML = records.slice(0, state.limit).map(rowMarkup).join("");
  more.hidden = records.length <= state.limit;
  more.disabled = false;
  more.textContent = `显示更多（还有 ${format(Math.max(0, records.length - state.limit))} 条）`;
  document.querySelector("#rankingEmpty").hidden = records.length > 0;
  status.textContent = records.length ? `共 ${format(records.length)} 条记录，已显示 ${format(Math.min(records.length, state.limit))} 条` : "没有匹配的记录";
  document.querySelector("#clearFilters").hidden = !search.value && state.group === "all" && state.filter === "all";
  document.querySelectorAll("#rankTabs [data-filter]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.filter === state.filter)));
  document.querySelectorAll("#distributionLegend button").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.group === state.group)));
  exactShortcut?.setAttribute("aria-pressed", String(state.dataset.period.precision === "exact"));
  saveUrl();
}
function reset() { search.value = ""; state.group = "all"; state.filter = "all"; state.limit = 30; render(); }
async function setPeriod(id) {
  const period = boot.periods.find(p => p.id === id);
  if (!period) return;
  const previous = previousPeriod(period);
  periodSelect.disabled = true;
  if (exactShortcut) exactShortcut.disabled = true;
  more.disabled = true;
  status.textContent = "正在载入所选周期…";
  error.hidden = true;
  try {
    const [dataset, previousData] = await Promise.all([getDataset(id), previous ? getDataset(previous.id) : null]);
    state.periodId = id; state.dataset = dataset; state.hasPrevious = !!previous;
    state.currentIndex = buildPeriodIndex(dataset.records);
    state.previousIndex = buildPeriodIndex(previousData?.records || []);
    state.groups = amountGroups(dataset); state.group = "all"; state.limit = 30; state.ready = true;
    periodSelect.value = id;
    document.querySelector("#statRecords").textContent = format(dataset.records.length);
    document.querySelector("#tabCount").textContent = format(dataset.records.length);
    document.querySelector("#statBands").textContent = dataset.period.precision === "exact" ? "精准" : dataset.bands.length;
    document.querySelector("#statBandLabel").textContent = dataset.period.precision === "exact" ? "源表金额口径" : "出口额区间";
    document.querySelector("#rankingPeriod").textContent = `${period.label} · ${dataset.period.precision === "exact" ? "精准数值，单位：万美元" : "累计出口额区间，非单月数据"}。`;
    document.querySelector("#amountHeading").textContent = dataset.period.precision === "exact" ? "累计出口额（万美元）" : "累计出口额区间";
    document.querySelector("#changeHeading").textContent = previous ? `较 ${previous.label.replace(/^\d{4}年/, "").replace("（精准数值）", "精准").replace("（区间数据）", "区间")}` : "名次变化";
    document.querySelector("#distributionBar").innerHTML = state.groups.map(g => `<button type="button" data-group="${g.id}" style="--segment:${g.color};flex:${g.count}" title="${escape(g.label)} · ${format(g.count)}" aria-label="${escape(g.label)}：${g.count}条记录"></button>`).join("");
    document.querySelector("#distributionLegend").innerHTML = state.groups.map(g => `<button type="button" data-group="${g.id}" style="--segment:${g.color}" aria-pressed="false"><i aria-hidden="true"></i>${escape(g.label)}<b>${format(g.count)}</b></button>`).join("");
    render();
  } catch {
    error.hidden = false;
    status.textContent = state.ready ? "未能切换周期，仍显示上次载入的数据。" : "当前显示前 30 条排名记录";
    periodSelect.value = state.periodId;
  } finally { periodSelect.disabled = false; more.disabled = !state.ready; if (exactShortcut) exactShortcut.disabled = !state.ready; }
}
async function initialize() {
  error.hidden = true;
  try {
    const response = await fetch("/data/yueqing-export-ranking/companies.json");
    if (!response.ok) throw new Error("load");
    state.searchIndex = buildCompanySearchIndex(await response.json());
    state.filter = ["top100", "top500", "up", "down"].includes(params.get("filter")) ? params.get("filter") : "all";
    await setPeriod(boot.periods.some(p => p.id === requestedPeriod) ? requestedPeriod : boot.latest);
    if (state.ready && state.groups.some(g => g.id === params.get("band"))) { state.group = params.get("band"); render(); }
  } catch { error.hidden = false; }
}
search.addEventListener("input", () => { state.limit = 30; render(); });
document.querySelector("#rankingSearchForm").addEventListener("submit", event => { event.preventDefault(); state.limit = 30; render(); document.querySelector(".ranking-section").scrollIntoView({ block: "start" }); });
document.querySelector("#rankTabs").addEventListener("click", event => { const button = event.target.closest("[data-filter]"); if (!button) return; state.filter = button.dataset.filter; state.limit = 30; render(); });
document.querySelector(".distribution").addEventListener("click", event => { const button = event.target.closest("[data-group]"); if (!button || !state.ready) return; state.group = state.group === button.dataset.group ? "all" : button.dataset.group; state.limit = 30; render(); });
exactShortcut?.addEventListener("click", () => { if (!periodSelect.disabled) setPeriod(exactShortcut.dataset.period); });
periodSelect.addEventListener("change", () => setPeriod(periodSelect.value));
more.addEventListener("click", () => { const offset = rows.children.length; state.limit += 30; render(); rows.children[offset]?.focus({ preventScroll: true }); });
document.querySelector("#clearFilters").addEventListener("click", reset);
document.querySelector("[data-reset]").addEventListener("click", reset);
document.querySelector("#retryLoad").addEventListener("click", initialize);
document.addEventListener("keydown", event => { if (event.key === "/" && !event.ctrlKey && !event.metaKey && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement) && !event.target.isContentEditable) { event.preventDefault(); search.focus(); } });
initialize();
