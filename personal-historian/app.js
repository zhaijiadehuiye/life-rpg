/* Personal Historian · 自我历史学
 * A small, local-first research notebook. Original text and every revision
 * stay in the user's IndexedDB; analysis is a separate, replaceable layer.
 */

const DB_NAME = "personal-historian-db";
const DB_VERSION = 1;
const DB_STORE = "workspace";
const STATE_KEY = "current";
const APP_VERSION = "0.1";

let state = null;
let currentView = "today";
let timelineRange = "month";
let timelineSearch = "";
let selectedTags = [];
let storageMode = "IndexedDB";
let saveTimer = null;

const root = document.getElementById("app-root");
const dialog = document.getElementById("app-dialog");
const dialogInner = document.getElementById("dialog-inner");

const NAV_LABELS = {
  today: "TODAY",
  timeline: "TIMELINE",
  patterns: "PATTERNS",
  hypotheses: "HYPOTHESES",
  experiments: "EXPERIMENTS",
  predictions: "PREDICTIONS",
  reviews: "REVIEWS",
  archive: "ARCHIVE"
};

const uid = (prefix = "id") => {
  if (window.crypto && crypto.randomUUID) return `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
};

const nowISO = () => new Date().toISOString();
const dateISO = (value = new Date()) => {
  const d = value instanceof Date ? value : new Date(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const dateOffset = (days) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return dateISO(d);
};
const clamp = (number, min, max) => Math.min(max, Math.max(min, number));
const esc = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");
const textPreview = (value = "", length = 110) => {
  const text = String(value).replace(/\s+/g, " ").trim();
  return text.length > length ? `${text.slice(0, length)}…` : text;
};
const fmtDate = (value, options = {}) => {
  if (!value) return "—";
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  return new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric", ...options }).format(date);
};
const fmtDateLong = (value) => fmtDate(value, { year: "numeric", weekday: "short" });
const fmtDateTime = (value) => new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
const monthLabel = (value = new Date()) => new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long" }).format(new Date(value));

function openDatabase() {
  return new Promise((resolve) => {
    if (!window.indexedDB) {
      storageMode = "本机备份";
      resolve(null);
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { storageMode = "本机备份"; resolve(null); };
  });
}

let dbPromise = openDatabase();
async function readStoredState() {
  const db = await dbPromise;
  if (!db) {
    try { const raw = localStorage.getItem(`${DB_NAME}:${STATE_KEY}`); return raw ? JSON.parse(raw) : null; } catch { return null; }
  }
  return new Promise((resolve) => {
    const tx = db.transaction(DB_STORE, "readonly");
    const request = tx.objectStore(DB_STORE).get(STATE_KEY);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => resolve(null);
  });
}

async function writeStoredState(nextState) {
  const db = await dbPromise;
  if (!db) { localStorage.setItem(`${DB_NAME}:${STATE_KEY}`, JSON.stringify(nextState)); return; }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).put(nextState, STATE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function normalizeState(input) {
  const safe = input && typeof input === "object" ? input : {};
  return {
    schemaVersion: 1, appVersion: APP_VERSION, createdAt: safe.createdAt || nowISO(), updatedAt: safe.updatedAt || nowISO(), seeded: Boolean(safe.seeded),
    entries: Array.isArray(safe.entries) ? safe.entries : [], hypotheses: Array.isArray(safe.hypotheses) ? safe.hypotheses : [], evidence: Array.isArray(safe.evidence) ? safe.evidence : [],
    experiments: Array.isArray(safe.experiments) ? safe.experiments : [], predictions: Array.isArray(safe.predictions) ? safe.predictions : [], reviews: Array.isArray(safe.reviews) ? safe.reviews : [], backups: Array.isArray(safe.backups) ? safe.backups : []
  };
}

function factsFromText(text) {
  const normalized = String(text).replace(/\r/g, "").trim();
  const sentences = normalized.split(/(?<=[。！？.!?])\s*|\n+/).map((item) => item.trim()).filter(Boolean);
  const candidates = sentences.filter((sentence) => sentence.length > 2).slice(0, 5);
  if (candidates.length) return candidates.map((sentence) => sentence.replace(/^[\-•*]\s*/, ""));
  return normalized ? [normalized] : ["原始记录尚未包含可观察事件。"];
}

function analysisForText(text) {
  const clean = String(text).trim();
  const sentences = clean.split(/(?<=[。！？.!?])\s*|\n+/).map((item) => item.trim()).filter(Boolean);
  const interpretation = sentences.find((sentence) => /(我|自己).*(差|不行|拖延|懒|没用|不能|无法|坚持|失败|焦虑|废)/.test(sentence));
  const narrative = sentences.find((sentence) => /(一直|总是|永远|任何|从来|注定|每次)/.test(sentence));
  const alternatives = [];
  if (/(学|项目|编程|写|工作|任务|做)/.test(clean)) alternatives.push("启动成本偏高，任务的第一步可能还不够小。");
  if (/(视频|手机|刷|游戏|短视频|分心)/.test(clean)) alternatives.push("即时奖励更强，注意力转移可能是环境与反馈速度共同造成的。");
  if (/(睡|熬夜|疲|困|5小时|六小时|6小时)/.test(clean)) alternatives.push("睡眠不足或主观精力下降，可能影响启动与持续时间。");
  if (/(人|社交|见|聊天|拒绝|尴尬)/.test(clean)) alternatives.push("社交情境的预期压力可能抬高了回避成本。");
  if (!alternatives.length) alternatives.push("还需要更多跨情境记录，才能判断是任务、环境还是状态变量在起作用。", "目前没有足够证据区分多个可能原因。");
  return {
    facts: factsFromText(clean), interpretation: interpretation || "原文暂未提出明确的自我解释。", narrative: narrative || "原文暂未形成关于自己的长期叙事。", alternatives: alternatives.slice(0, 4),
    cannotConclude: ["不能根据一次记录判断稳定的人格特征。", "不能把相关性直接当成因果关系。", "目前还不知道哪一个变量最关键，需要继续收集证据。"], analyzedAt: nowISO(), model: "local-structured-analysis-v0", promptVersion: "facts-claims-2026-10"
  };
}

function createEntry(date, text, tags = [], metadata = {}) {
  const timestamp = new Date(`${date}T12:00:00`).toISOString();
  return { id: uid("entry"), createdAt: timestamp, updatedAt: timestamp, date, originalText: text, currentText: text, revisions: [{ id: uid("rev"), createdAt: timestamp, text, kind: "original", note: "首次保存的原始材料" }], tags, metadata, analysis: analysisForText(text), events: factsFromText(text).map((fact) => ({ id: uid("event"), text: fact, createdAt: timestamp })) };
}

function seedState() {
  const e1 = createEntry(dateOffset(0), "今天本来准备学 Python，结果刷了三个小时视频。下午想做游戏，打开项目十分钟又关掉了。我执行力很差。", ["学习", "注意力"], { sleepHours: 5.2, completedTasks: 0, focus: 1 });
  const e2 = createEntry(dateOffset(-1), "昨晚睡了五个半小时。上午处理了两件小事，下午打开游戏项目后感觉任务太大，很快转去看视频。", ["睡眠", "项目"], { sleepHours: 5.5, completedTasks: 2, focus: 2 });
  const e3 = createEntry(dateOffset(-3), "今天起床后先骑车二十分钟，再用番茄钟完成了一个小页面。任务拆小以后，比预想中容易开始。", ["运动", "学习"], { sleepHours: 7.4, completedTasks: 3, focus: 4 });
  const e4 = createEntry(dateOffset(-7), "本周有一次在图书馆完成了四十分钟 Python 练习。安静环境和明确的题目让开始变得容易。", ["学习", "环境"], { sleepHours: 7.1, completedTasks: 2, focus: 4 });
  const h1 = { id: "H-014", title: "反馈周期长的任务更容易失去动力", description: "我可能不是不能学习，而是对反馈周期较长、第一步不清晰的任务更容易失去动力。", createdAt: new Date(`${dateOffset(-7)}T13:00:00`).toISOString(), updatedAt: nowISO(), confidence: 68, status: "Active", confidenceHistory: [{ date: dateOffset(-7), confidence: 40, reason: "第一次提出竞争解释" }, { date: dateOffset(-3), confidence: 55, reason: "小任务与安静环境带来正向证据" }, { date: dateOffset(0), confidence: 68, reason: "最近记录中多次出现启动困难" }], supportingEvidence: [], opposingEvidence: [] };
  const h2 = { id: "H-009", title: "睡眠低于六小时会降低第二天的完成率", description: "睡眠可能是启动与持续完成任务的状态变量之一，但目前仍有环境与任务大小的混杂。", createdAt: new Date(`${dateOffset(-14)}T12:00:00`).toISOString(), updatedAt: nowISO(), confidence: 54, status: "Weak", confidenceHistory: [{ date: dateOffset(-14), confidence: 35, reason: "提出可检验假设" }, { date: dateOffset(-1), confidence: 54, reason: "低睡眠日期的完成任务更少" }], supportingEvidence: [], opposingEvidence: [] };
  const evidence = [
    { id: "E-021", hypothesisId: h1.id, entryId: e1.id, type: "support", note: "打开项目十分钟后停止，原文同时提到任务与视频的反馈差异。", createdAt: e1.createdAt },
    { id: "E-033", hypothesisId: h1.id, entryId: e3.id, type: "support", note: "拆小任务后完成了一个页面，支持‘启动条件’比能力标签更有解释力。", createdAt: e3.createdAt },
    { id: "E-042", hypothesisId: h1.id, entryId: e4.id, type: "against", note: "在图书馆完成了较长练习，说明长任务并非在所有环境都失败。", createdAt: e4.createdAt },
    { id: "E-051", hypothesisId: h2.id, entryId: e1.id, type: "support", note: "低睡眠当天计划任务未完成。", createdAt: e1.createdAt },
    { id: "E-057", hypothesisId: h2.id, entryId: e3.id, type: "against", note: "睡眠较好时完成度更高，但当天同时改变了环境与任务大小。", createdAt: e3.createdAt }
  ];
  h1.supportingEvidence = ["E-021", "E-033"]; h1.opposingEvidence = ["E-042"]; h2.supportingEvidence = ["E-051"]; h2.opposingEvidence = ["E-057"];
  return normalizeState({ schemaVersion: 1, appVersion: APP_VERSION, seeded: true, createdAt: e4.createdAt, updatedAt: nowISO(), entries: [e1, e2, e3, e4], hypotheses: [h1, h2], evidence,
    experiments: [{ id: "X-003", title: "起床后一小时内完成 20 分钟学习", question: "我是不是在早上更适合开始需要长期反馈的任务？", status: "Active", startDate: dateOffset(-2), endDate: dateOffset(5), durationDays: 7, metrics: ["是否完成", "专注度 1–5", "抗拒度 1–5", "睡眠小时"], observations: [{ id: "O-01", date: dateOffset(-2), completed: true, focus: 4, resistance: 2, sleepHours: 7.2, note: "先骑车，再做小题目。" }, { id: "O-02", date: dateOffset(-1), completed: false, focus: 2, resistance: 4, sleepHours: 5.5, note: "醒来后直接看视频。" }], conclusion: "", createdAt: new Date(`${dateOffset(-2)}T09:00:00`).toISOString() }],
    predictions: [{ id: "P-018", text: "未来 30 天完成一个可玩的 Python 小项目", probability: 0.6, dueDate: dateOffset(22), status: "Open", result: null, createdAt: new Date(`${dateOffset(-8)}T12:00:00`).toISOString() }, { id: "P-012", text: "下周至少运动三次", probability: 0.7, dueDate: dateOffset(-2), status: "Resolved", result: false, createdAt: new Date(`${dateOffset(-15)}T12:00:00`).toISOString() }, { id: "P-009", text: "本周完成两次 Python 练习", probability: 0.7, dueDate: dateOffset(-5), status: "Resolved", result: true, createdAt: new Date(`${dateOffset(-18)}T12:00:00`).toISOString() }, { id: "P-005", text: "七天内连续三天早起学习", probability: 0.7, dueDate: dateOffset(-20), status: "Resolved", result: false, createdAt: new Date(`${dateOffset(-28)}T12:00:00`).toISOString() }, { id: "P-002", text: "这个月完成一次线下社交活动", probability: 0.5, dueDate: dateOffset(-30), status: "Resolved", result: true, createdAt: new Date(`${dateOffset(-42)}T12:00:00`).toISOString() }], reviews: [], backups: [] });
}

async function persist(message = "已保存到本机") {
  if (!state) return;
  state.updatedAt = nowISO();
  const indicator = document.getElementById("save-indicator");
  if (indicator) indicator.classList.add("saving");
  try {
    await writeStoredState(state);
    if (indicator) { indicator.classList.remove("saving"); indicator.innerHTML = `<span class="save-dot"></span>${esc(message)}`; }
  } catch (error) { showToast("保存失败，请先导出一份备份", true); console.error(error); }
}

function showToast(message, isError = false) {
  const region = document.getElementById("toast-region"); const item = document.createElement("div"); item.className = "toast"; item.textContent = message; if (isError) item.style.background = "#8b4b4b"; region.appendChild(item); setTimeout(() => item.remove(), 2600);
}
function sortedEntries() { return [...(state?.entries || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); }
function sortedHypotheses() { return [...(state?.hypotheses || [])].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)); }
function latestEntry() { return sortedEntries()[0] || null; }
function entryById(id) { return state.entries.find((entry) => entry.id === id); }
function hypothesisById(id) { return state.hypotheses.find((hypothesis) => hypothesis.id === id); }
function statusClass(status = "Active") { return `status-${String(status).toLowerCase()}`; }
function confidenceChart(history = []) {
  if (!history.length) return "";
  const width = 500, height = 120, padX = 26, padY = 16;
  const points = history.map((point, index) => { const x = history.length === 1 ? width / 2 : padX + index * ((width - padX * 2) / (history.length - 1)); const y = height - padY - (clamp(Number(point.confidence), 0, 100) / 100) * (height - padY * 2); return { x, y, value: point.confidence }; });
  const path = points.map((point, i) => `${i ? "L" : "M"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
  const dots = points.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="3.5" fill="#26765d" /><text x="${point.x}" y="${point.y - 9}" text-anchor="middle">${point.value}%</text>`).join("");
  return `<svg class="confidence-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="置信度随时间变化"><line x1="${padX}" y1="${padY}" x2="${width - padX}" y2="${padY}" stroke="#e1e7ee" /><line x1="${padX}" y1="${height / 2}" x2="${width - padX}" y2="${height / 2}" stroke="#e1e7ee" /><line x1="${padX}" y1="${height - padY}" x2="${width - padX}" y2="${height - padY}" stroke="#e1e7ee" /><text x="2" y="${padY + 3}">100</text><text x="8" y="${height / 2 + 3}">50</text><text x="15" y="${height - padY + 3}">0</text><path d="${path}" fill="none" stroke="#26765d" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />${dots}</svg>`;
}

function render() {
  if (!state) return;
  document.querySelectorAll(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === currentView));
  document.getElementById("breadcrumb-current").textContent = NAV_LABELS[currentView];
  document.getElementById("nav-today-count").textContent = state.entries.length;
  document.getElementById("nav-hypothesis-count").textContent = state.hypotheses.filter((h) => h.status !== "Archived").length;
  document.getElementById("nav-experiment-count").textContent = state.experiments.filter((x) => x.status === "Active").length;
  const views = { today: renderToday, timeline: renderTimeline, patterns: renderPatterns, hypotheses: renderHypotheses, experiments: renderExperiments, predictions: renderPredictions, reviews: renderReviews, archive: renderArchive };
  root.innerHTML = views[currentView](); bindPageEvents();
}

function pageHead(eyebrow, title, description, actions = "") { return `<div class="page-head"><div><p class="eyebrow">${esc(eyebrow)}</p><h1>${esc(title)}</h1><p class="page-description">${esc(description)}</p></div>${actions ? `<div class="page-meta">${actions}</div>` : ""}</div>`; }

function renderToday() {
  const latest = latestEntry(); const actions = `<span><strong>${state.entries.length}</strong> 条原始记录</span>${state.seeded ? `<button class="button button-secondary button-small" data-action="clear-demo">清空演示数据</button>` : ""}`; const analysis = latest?.analysis; const recent = sortedEntries().slice(0, 4);
  return `${pageHead("FIELD NOTES / TODAY", "今天实际上发生了什么？", "先保存原始材料，再区分事实、解释与尚未知道的部分。", actions)}<div class="today-grid"><section class="card compose-card"><div class="card-topline"><span class="label">Original entry</span><span class="quiet-label">${fmtDateLong(new Date())}</span></div><textarea id="entry-composer" class="entry-textarea" placeholder="写下实际发生的事。可以是几句话，也可以是一段未经整理的现场记录。\n\n先记录，不急着解释自己。">${esc(window.entryDraft || "")}</textarea><div class="compose-footer"><div class="quick-tags" aria-label="快速标签">${["学习", "工作", "睡眠", "社交", "运动", "注意力"].map((tag) => `<button class="tag-chip ${selectedTags.includes(tag) ? "selected" : ""}" data-action="toggle-tag" data-tag="${esc(tag)}">#${esc(tag)}</button>`).join("")}</div><button class="button button-primary" data-action="save-entry">保存原始记录 <span>⌘↵</span></button></div><div class="analysis-footnote"><span class="info-dot">i</span>保存动作先写入原文，再生成独立分析。原文不会被 AI 覆盖。</div></section><section class="card analysis-card"><div class="analysis-head"><div><div class="analysis-kicker">EVIDENCE SPLIT</div><h2>证据拆解</h2></div><div class="analysis-model">${analysis ? `${esc(analysis.model)}<br />${fmtDateTime(analysis.analyzedAt)}` : "等待一条记录"}</div></div>${analysis ? renderAnalysis(analysis) : `<div class="empty-analysis">保存第一条记录后，这里会把原文拆成可观察事实、用户解释、竞争解释和“目前不能推出”。</div>`}</section></div><div class="below-grid"><section class="card section-card"><div class="section-header"><div><h2 class="section-title">最近原始材料</h2><p class="section-subtitle">时间线只引用当时的记录，不用后来的信息改写过去。</p></div><button class="text-button" data-view="timeline">查看全部 →</button></div><div class="entry-mini-list">${recent.length ? recent.map(renderEntryMini).join("") : `<div class="empty-analysis">还没有原始材料。</div>`}</div></section><section class="card section-card"><div class="section-header"><div><h2 class="section-title">研究状态</h2><p class="section-subtitle">当前积累的可追溯对象</p></div></div><div class="mini-metric-list"><div class="mini-metric"><span class="mini-metric-label">可观察事实</span><span class="mini-metric-value">${state.entries.reduce((sum, entry) => sum + (entry.analysis?.facts?.length || 0), 0)} <small>条</small></span></div><div class="mini-metric"><span class="mini-metric-label">Active hypotheses</span><span class="mini-metric-value">${state.hypotheses.filter((h) => h.status === "Active").length} <small>条</small></span></div><div class="mini-metric"><span class="mini-metric-label">正在进行的实验</span><span class="mini-metric-value">${state.experiments.filter((x) => x.status === "Active").length} <small>个</small></span></div><div class="mini-metric"><span class="mini-metric-label">本机保存方式</span><span class="mini-metric-value" style="font-size:15px">${esc(storageMode)}</span></div></div></section></div>`;
}

function renderAnalysis(analysis) {
  const list = (items) => `<ul class="analysis-list">${items.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>`;
  return `<div class="analysis-block"><div class="analysis-title"><span class="block-mark">F</span>Observed facts / 可观察事实</div>${list(analysis.facts || [])}</div><div class="analysis-block"><div class="analysis-title interpretation"><span class="block-mark">C</span>Claim / 用户解释</div><p class="analysis-quote">${esc(analysis.interpretation || "目前没有明确解释。")}</p></div><div class="analysis-block"><div class="analysis-title interpretation"><span class="block-mark">N</span>Narrative / 更大的叙事</div><p class="analysis-quote">${esc(analysis.narrative || "目前没有明确叙事。")}</p></div><div class="analysis-block"><div class="analysis-title alternatives"><span class="block-mark">A</span>Alternative explanations / 竞争解释</div>${list(analysis.alternatives || [])}</div><div class="analysis-block"><div class="analysis-title"><span class="block-mark">?</span>What we cannot conclude yet</div>${list(analysis.cannotConclude || [])}</div>`;
}
function renderEntryMini(entry) { return `<div class="entry-mini"><div class="entry-date"><strong>${fmtDate(entry.date)}</strong>${entry.revisions?.length || 1} 个版本</div><div class="entry-preview"><p>${esc(textPreview(entry.currentText || entry.originalText))}</p><div class="entry-meta">${(entry.tags || []).map((tag) => `<span class="tiny-tag">#${esc(tag)}</span>`).join("")}<button class="text-button" data-action="view-entry" data-id="${esc(entry.id)}">打开证据 →</button></div></div></div>`; }

function withinTimelineRange(entry, range) { const days = Math.floor((Date.now() - new Date(entry.createdAt).getTime()) / 86400000); if (range === "day") return days < 1; if (range === "week") return days < 7; if (range === "quarter") return days < 92; if (range === "year") return days < 365; return days < 31; }
function renderTimeline() {
  const entries = sortedEntries().filter((entry) => withinTimelineRange(entry, timelineRange) && (!timelineSearch || `${entry.currentText} ${(entry.tags || []).join(" ")}`.toLowerCase().includes(timelineSearch.toLowerCase())));
  return `${pageHead("PERSONAL HISTORY", "时间线", "按日、周、月、季度和年回看当时的证据。过去的文字保持在过去。", `<span><strong>${state.entries.length}</strong> 条记录</span>`)}<div class="toolbar"><div class="segmented">${[["day", "日"], ["week", "周"], ["month", "月"], ["quarter", "季度"], ["year", "年"]].map(([value, label]) => `<button class="segment ${timelineRange === value ? "active" : ""}" data-action="timeline-range" data-range="${value}">${label}</button>`).join("")}</div><input class="search-box" id="timeline-search" value="${esc(timelineSearch)}" placeholder="搜索原始材料或标签" /></div><div class="timeline-list">${entries.length ? entries.map(renderTimelineCard).join("") : `<div class="empty-state"><strong>这段时间还没有记录</strong><span>把今天实际发生的事写下来，它会成为下一次回看的原始材料。</span></div>`}</div>`;
}
function renderTimelineCard(entry) { const facts = entry.analysis?.facts || []; return `<article class="timeline-card" data-action="view-entry" data-id="${esc(entry.id)}"><div class="timeline-card-top"><span class="timeline-date">${fmtDateLong(entry.date)}</span><span class="timeline-kind">ORIGINAL ENTRY · ${entry.revisions?.length || 1} VERSION${(entry.revisions?.length || 1) > 1 ? "S" : ""}</span></div><p class="timeline-original">${esc(entry.currentText || entry.originalText)}</p><div class="timeline-foot"><span class="timeline-fact-count">${facts.length} 条可观察事实${entry.analysis?.interpretation ? " · 已区分解释" : ""}</span><div class="timeline-tags">${(entry.tags || []).map((tag) => `<span class="tiny-tag">#${esc(tag)}</span>`).join("")}</div></div></article>`; }

function patternStats() {
  const entries = sortedEntries().filter((entry) => (Date.now() - new Date(entry.createdAt).getTime()) < 30 * 86400000); const withSleep = entries.filter((entry) => Number.isFinite(Number(entry.metadata?.sleepHours))); const low = withSleep.filter((entry) => Number(entry.metadata.sleepHours) < 6); const rested = withSleep.filter((entry) => Number(entry.metadata.sleepHours) >= 6); const completion = (rows) => rows.length ? rows.reduce((sum, entry) => sum + Number(entry.metadata.completedTasks || 0), 0) / rows.length : 0; const taskAvg = withSleep.length ? withSleep.reduce((sum, entry) => sum + Number(entry.metadata.completedTasks || 0), 0) / withSleep.length : 0; return { entries, withSleep, low, rested, lowAvg: completion(low), restedAvg: completion(rested), taskAvg };
}
function renderPatterns() {
  const stats = patternStats(); const sample = stats.withSleep.length; const lowHeight = clamp(stats.lowAvg * 30, 8, 100); const restedHeight = clamp(stats.restedAvg * 30, 8, 100); const tags = stats.entries.flatMap((entry) => entry.tags || []).reduce((map, tag) => { map[tag] = (map[tag] || 0) + 1; return map; }, {}); const topTag = Object.entries(tags).sort((a, b) => b[1] - a[1])[0];
  return `${pageHead("LONGITUDINAL SIGNALS", "长期模式", "把重复出现的条件整理出来，同时把样本量、相关性和混杂变量放在结论旁边。", `<span><strong>${sample}</strong> 条带有状态数据</span>`)}<div class="data-grid"><div class="stat-card"><div class="stat-label">近 30 天记录</div><div class="stat-value">${stats.entries.length}</div><div class="stat-foot">原始材料，不是评分</div></div><div class="stat-card"><div class="stat-label">平均完成任务数</div><div class="stat-value">${stats.taskAvg.toFixed(1)}</div><div class="stat-foot">每条带状态记录</div></div><div class="stat-card"><div class="stat-label">最常见标签</div><div class="stat-value">${topTag ? `#${esc(topTag[0])}` : "—"}</div><div class="stat-foot">出现 ${topTag ? topTag[1] : 0} 次</div></div></div><div class="pattern-layout"><div><article class="pattern-card"><div class="analysis-kicker">PATTERN CANDIDATE · P-001</div><h3>睡眠低于六小时的日期，第二天完成度更低</h3><p class="pattern-summary">${sample ? `在 ${sample} 条带睡眠数据的记录中，低于 6 小时的 ${stats.low.length} 天平均完成 ${stats.lowAvg.toFixed(1)} 个任务；睡眠至少 6 小时的 ${stats.rested.length} 天平均完成 ${stats.restedAvg.toFixed(1)} 个任务。` : "加入睡眠和完成情况后，这里会自动计算候选模式。"}</p><div class="evidence-meter"><span style="width:${sample ? clamp((stats.lowAvg / Math.max(stats.lowAvg + stats.restedAvg, 1)) * 100, 8, 92) : 35}%"></span><em style="width:${sample ? clamp((stats.restedAvg / Math.max(stats.lowAvg + stats.restedAvg, 1)) * 100, 8, 92) : 65}%"></em></div><div class="meter-labels"><span>低睡眠 · ${stats.lowAvg.toFixed(1)} 完成</span><span>充足睡眠 · ${stats.restedAvg.toFixed(1)} 完成</span></div><div class="confounder-list"><span class="confounder">混杂：任务大小</span><span class="confounder">混杂：环境</span><span class="confounder">仅表示相关性</span></div></article><article class="pattern-card"><div class="analysis-kicker">REPEATED CONDITION · P-002</div><h3>“任务变小 + 环境安静”与更容易开始同时出现</h3><p class="pattern-summary">近期记录中有 ${stats.entries.filter((entry) => (entry.tags || []).includes("环境") || (entry.currentText || "").includes("拆小")).length} 条提到环境或任务拆分。这个模式值得通过实验分开测试。</p><div class="meter-labels"><span>样本量：${stats.entries.length} 条</span><span>置信度：有限</span></div></article></div><article class="pattern-card"><div class="analysis-kicker">OBSERVATION LOG</div><h3>任务完成度与状态变量</h3><div class="bar-chart"><div class="bar-column"><div class="bar" style="height:${lowHeight}%"></div><span class="bar-label">低睡眠</span></div><div class="bar-column"><div class="bar" style="height:${restedHeight}%"></div><span class="bar-label">充足睡眠</span></div><div class="bar-column"><div class="bar" style="height:${clamp(stats.taskAvg * 20, 8, 100)}%"></div><span class="bar-label">总体均值</span></div><div class="bar-column"><div class="bar" style="height:${clamp((stats.entries.filter((e) => (e.tags || []).includes("运动")).length / Math.max(stats.entries.length, 1)) * 100, 8, 100)}%"></div><span class="bar-label">运动日</span></div></div><p class="chart-legend">当前图表只展示记录中已有的描述性统计，不推断因果。</p></article></div></div>`;
}

function renderHypotheses() {
  const hypotheses = sortedHypotheses(); return `${pageHead("CLAIMS UNDER TEST", "个人假设库", "每条假设都可以被支持、反驳、重写或归档。过去的置信度不会被覆盖。", `<button class="button button-primary button-small" data-action="new-hypothesis">+ 新建假设</button>`)}<div class="hypothesis-grid">${hypotheses.length ? hypotheses.map(renderHypothesisCard).join("") : `<div class="empty-state" style="grid-column:1/-1"><strong>还没有假设</strong><span>从一条重复出现的解释开始，而不是给自己贴标签。</span></div>`}</div>`;
}
function renderHypothesisCard(hypothesis) { const supporting = (hypothesis.supportingEvidence || []).length; const opposing = (hypothesis.opposingEvidence || []).length; return `<article class="hypothesis-card" data-action="view-hypothesis" data-id="${esc(hypothesis.id)}"><div class="hypothesis-top"><span class="hypothesis-id">${esc(hypothesis.id)}</span><span class="status-badge ${statusClass(hypothesis.status)}">${esc(hypothesis.status)}</span></div><h3>${esc(hypothesis.title)}</h3><p>${esc(hypothesis.description)}</p><div class="confidence-row"><span>当前置信度</span><span class="confidence-value">${clamp(Number(hypothesis.confidence), 0, 100)}%</span></div><div class="confidence-track"><span style="width:${clamp(Number(hypothesis.confidence), 0, 100)}%"></span></div><div class="hypothesis-foot"><span>${hypothesis.confidenceHistory?.length || 0} 次判断记录</span><span class="hypothesis-evidence"><span class="score-good">+${supporting}</span><span style="color:var(--red)">−${opposing}</span></span></div></article>`; }

function renderExperiments() {
  const experiments = state.experiments || []; return `${pageHead("MINIMUM VIABLE EXPERIMENTS", "人生实验", "把“我是不是……”转成一段有限时间、可观察、可以反驳的小实验。", `<button class="button button-primary button-small" data-action="new-experiment">+ 设计实验</button>`)}<div class="experiment-list">${experiments.length ? experiments.map(renderExperimentCard).join("") : `<div class="empty-state"><strong>还没有实验</strong><span>选择一个具体变量，先测试七天。</span></div>`}</div>`;
}
function renderExperimentCard(experiment) { const observations = experiment.observations || []; const total = Number(experiment.durationDays || 7); const progress = clamp((observations.length / total) * 100, 0, 100); const active = experiment.status === "Active"; return `<article class="experiment-card"><div class="experiment-head"><div><div class="analysis-kicker">${esc(experiment.id)} · ${esc(experiment.status.toUpperCase())}</div><h3>${esc(experiment.title)}</h3></div><span class="status-badge ${active ? "status-active" : "status-supported"}">${active ? "进行中" : "已分析"}</span></div><p class="experiment-question">问题：${esc(experiment.question)}</p><div class="experiment-meta"><span class="meta-pill">${fmtDate(experiment.startDate)} — ${fmtDate(experiment.endDate)}</span><span class="meta-pill">记录 ${observations.length}/${total} 天</span><span class="meta-pill">${(experiment.metrics || []).join(" · ")}</span></div><div class="experiment-progress"><div class="progress-track"><span style="width:${progress}%"></span></div><div class="progress-caption"><span>收集观察</span><span>${Math.round(progress)}%</span></div></div>${experiment.conclusion ? `<div class="dialog-note">${esc(experiment.conclusion)}</div>` : ""}<div class="experiment-actions">${active ? `<button class="button button-soft button-small" data-action="new-observation" data-id="${esc(experiment.id)}">+ 记录观察</button>` : ""}<button class="button button-secondary button-small" data-action="view-experiment" data-id="${esc(experiment.id)}">查看实验记录</button>${observations.length >= 2 && active ? `<button class="button button-secondary button-small" data-action="analyze-experiment" data-id="${esc(experiment.id)}">分析现有数据</button>` : ""}</div></article>`; }

function predictionStats() { const resolved = (state.predictions || []).filter((prediction) => prediction.status === "Resolved" && typeof prediction.result === "boolean"); const brier = resolved.length ? resolved.reduce((sum, prediction) => sum + Math.pow(Number(prediction.probability) - (prediction.result ? 1 : 0), 2), 0) / resolved.length : null; const buckets = [0.5, 0.6, 0.7, 0.8, 0.9].map((probability) => { const rows = resolved.filter((prediction) => Math.round(Number(prediction.probability) * 10) / 10 === probability); return { probability, rows, actual: rows.length ? rows.filter((row) => row.result).length / rows.length : null }; }).filter((bucket) => bucket.rows.length); return { resolved, brier, buckets }; }
function renderPredictions() {
  const stats = predictionStats(); const predictions = [...(state.predictions || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); return `${pageHead("PROBABILISTIC SELF-KNOWLEDGE", "自我预测", "给未来一个概率，到期后记录结果。长期看的是校准，而不是预测时的自信。", `<button class="button button-primary button-small" data-action="new-prediction">+ 新建预测</button>`)}<div class="data-grid"><div class="stat-card"><div class="stat-label">已结算预测</div><div class="stat-value">${stats.resolved.length}</div><div class="stat-foot">结果已记录</div></div><div class="stat-card"><div class="stat-label">Brier Score</div><div class="stat-value">${stats.brier === null ? "—" : stats.brier.toFixed(2)}</div><div class="stat-foot">越低越好</div></div><div class="stat-card"><div class="stat-label">总体实际发生率</div><div class="stat-value">${stats.resolved.length ? `${Math.round(stats.resolved.filter((p) => p.result).length / stats.resolved.length * 100)}%` : "—"}</div><div class="stat-foot">不是人格结论</div></div></div><div class="below-grid" style="margin-top:0"><section><div class="prediction-list">${predictions.length ? predictions.map(renderPredictionCard).join("") : `<div class="empty-state"><strong>还没有预测</strong><span>给一个未来事件写下概率，并留下当时的理由。</span></div>`}</div></section><section class="card section-card"><div class="section-header"><div><h2 class="section-title">Calibration</h2><p class="section-subtitle">同一概率档位，实际发生了多少？</p></div></div>${stats.buckets.length ? `<table class="calibration-table"><thead><tr><th>预测概率</th><th>样本</th><th>实际发生</th></tr></thead><tbody>${stats.buckets.map((bucket) => `<tr><td>${Math.round(bucket.probability * 100)}%</td><td>${bucket.rows.length}</td><td class="${bucket.actual >= bucket.probability ? "score-good" : ""}">${Math.round(bucket.actual * 100)}%</td></tr>`).join("")}</tbody></table><p class="safety-note">校准需要更多样本。四五次预测只能作为提示，不能当作稳定特征。</p>` : `<div class="empty-analysis">完成一些有结果的预测后，这里会显示概率校准。</div>`}</section></div>`;
}
function renderPredictionCard(prediction) { const probability = Math.round(Number(prediction.probability) * 100); const resolved = prediction.status === "Resolved"; return `<article class="prediction-card"><div class="prediction-head"><div><div class="analysis-kicker">${esc(prediction.id)} · ${resolved ? "RESOLVED" : "OPEN"}</div><h3>${esc(prediction.text)}</h3></div><div class="probability-wrap"><div class="probability-ring" style="--probability:${probability}%"><strong>${probability}%</strong></div></div></div><p class="prediction-copy">截止 ${fmtDateLong(prediction.dueDate)} · ${resolved ? `结果：${prediction.result ? "发生" : "未发生"}` : "到期后再判断"}</p><div class="prediction-meta"><span class="meta-pill">记录于 ${fmtDate(prediction.createdAt)}</span>${resolved ? `<span class="prediction-result ${prediction.result ? "" : "failed"}">${prediction.result ? "命中" : "落空"}</span>` : `<button class="button button-soft button-small" data-action="resolve-prediction" data-id="${esc(prediction.id)}">记录结果</button>`}</div></article>`; }

function reviewData() { const currentMonth = dateISO(new Date()).slice(0, 7); const entries = sortedEntries().filter((entry) => String(entry.date).startsWith(currentMonth)); const tags = entries.flatMap((entry) => entry.tags || []).reduce((map, tag) => { map[tag] = (map[tag] || 0) + 1; return map; }, {}); const topTags = Object.entries(tags).sort((a, b) => b[1] - a[1]).slice(0, 3); const evidence = state.evidence.filter((item) => entries.some((entry) => entry.id === item.entryId)); const supported = evidence.filter((item) => item.type === "support").length; const against = evidence.filter((item) => item.type === "against").length; const nextVariable = topTags[0]?.[0] === "睡眠" ? "把睡眠时长与任务大小分开记录" : topTags[0]?.[0] === "学习" ? "把学习任务的第一步写到 20 分钟以内" : "记录开始任务前的睡眠与环境条件"; return { currentMonth, entries, topTags, evidence, supported, against, nextVariable }; }
function renderReviews() { const data = reviewData(); const openPredictions = state.predictions.filter((prediction) => prediction.status === "Open").length; return `${pageHead("PERIODIC SYNTHESIS", "复盘", "复盘是对证据的重新编目，不是给过去的自己写一封鸡汤信。", `<button class="button button-primary button-small" data-action="save-review">保存本月复盘</button>`)}<div class="review-layout"><div><section class="review-section"><h3><span>01</span>这个月发生了什么？</h3><p>${data.entries.length ? `本月保存了 ${data.entries.length} 条原始记录，最常出现的工作材料是 ${data.topTags.map(([tag, count]) => `#${esc(tag)}（${count}）`).join("、")}。时间线中保留了每次记录时的原始措辞与版本历史。` : "本月还没有足够记录。先从一条具体事实开始。"}</p></section><section class="review-section"><h3><span>02</span>哪些模式重复出现？</h3><ul><li>启动困难多发生在任务边界不清晰、即时反馈较弱的场景。</li><li>睡眠与环境可能同时影响完成度，目前仍存在混杂变量。</li><li>能够完成的小任务，通常有明确的第一步和有限时长。</li></ul></section><section class="review-section"><h3><span>03</span>假设得到怎样的证据？</h3><p>本月关联了 ${data.evidence.length} 条证据：支持 ${data.supported} 条，反对 ${data.against} 条。每条证据都指向具体 Entry，不能脱离原文单独解释。</p></section><section class="review-section"><h3><span>04</span>下个月最值得测试的一个变量</h3><p><strong>${esc(data.nextVariable)}</strong>。把它写成可观察的记录字段，先测试七天，再更新相关假设。</p></section></div><aside class="review-aside"><div class="analysis-kicker" style="color:#93b2c8">MONTHLY NOTE</div><h3>${esc(monthLabel())}</h3><p>当前研究状态的一个切面。它会随着新记录变化，但不会修改已经保存的判断。</p><div class="review-stat"><span>原始记录</span><strong>${data.entries.length}</strong></div><div class="review-stat"><span>假设得到的证据</span><strong>${data.evidence.length}</strong></div><div class="review-stat"><span>待结算预测</span><strong>${openPredictions}</strong></div><div class="review-stat"><span>本机保存</span><strong>ON</strong></div></aside></div>`; }

function renderArchive() { const backups = [...(state.backups || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); return `${pageHead("SOURCE ARCHIVE", "档案与迁移", "你的数据比这个界面更重要。导出可以在任何时候发生，JSON 可以完整重新导入。", `<span><strong>${state.entries.length}</strong> 条原始材料 · ${esc(storageMode)}</span>`)}<div class="archive-grid"><section class="archive-card"><div class="section-header"><div><h2 class="section-title">Export / Import</h2><p class="section-subtitle">导出包含原文、修订、证据、假设历史、实验观察和预测结果。</p></div></div><div class="archive-actions"><button class="archive-action" data-action="export-json"><strong>导出 JSON</strong><span>完整可迁移数据</span></button><button class="archive-action" data-action="export-markdown"><strong>导出 Markdown</strong><span>可读的研究档案</span></button><button class="archive-action" data-action="export-csv"><strong>导出 CSV</strong><span>原始记录表格</span></button><button class="archive-action" data-action="import-json"><strong>导入 JSON</strong><span>替换当前本机档案</span></button><button class="archive-action" data-action="create-backup"><strong>建立快照</strong><span>保留当前版本</span></button><button class="archive-action" data-action="delete-all"><strong>删除全部数据</strong><span>不可撤销，请先导出</span></button></div><p class="safety-note">本版本的数据只保存在浏览器的 IndexedDB。换设备前请导出 JSON；正式版可以在这里接入 PostgreSQL / Supabase 同步。</p></section><section class="archive-card"><div class="section-header"><div><h2 class="section-title">Snapshots</h2><p class="section-subtitle">本机快照不会替代导出，只是额外的恢复点。</p></div></div><div class="backup-list">${backups.length ? backups.map((backup) => `<div class="backup-row"><div><strong>${fmtDateTime(backup.createdAt)}</strong><br /><span>${backup.entryCount} entries · ${backup.hypothesisCount} hypotheses</span></div><button class="text-button" data-action="restore-backup" data-id="${esc(backup.id)}">恢复</button></div>`).join("") : `<div class="empty-analysis">还没有手动快照。</div>`}</div></section></div>`; }
function closeDialog() { if (dialog.open) dialog.close(); }
function showDialog(content) { dialogInner.innerHTML = content; if (!dialog.open) dialog.showModal(); }
function dialogShell(title, subtitle, body) { return `<div class="dialog-head"><div><h2>${esc(title)}</h2><p>${esc(subtitle)}</p></div><button class="dialog-close" data-action="close-dialog" aria-label="关闭">×</button></div>${body}`; }

function showEntryDetail(entryId) {
  const entry = entryById(entryId); if (!entry) return;
  const revisions = entry.revisions || [{ createdAt: entry.createdAt, text: entry.originalText, kind: "original" }];
  showDialog(dialogShell("原始记录与版本", `${fmtDateLong(entry.date)} · ${entry.tags?.map((tag) => `#${tag}`).join(" ") || "无标签"}`, `<div class="analysis-kicker">ORIGINAL ENTRY</div><p class="dialog-note">初始原文在 ${fmtDateTime(revisions[0].createdAt)} 保存。后续编辑只会产生新的 revision，不会删除这段文字。</p><div class="revision-list">${revisions.map((revision, index) => `<div class="revision-row"><div class="revision-date">${index === 0 ? "ORIGINAL" : `REVISION ${index}`} · ${fmtDateTime(revision.createdAt)}</div><p>${esc(revision.text)}</p></div>`).join("")}</div><div class="dialog-divider"></div><form id="revision-form" data-entry-id="${esc(entry.id)}"><div class="form-field"><label class="form-label" for="revision-text">添加一个修订版本</label><textarea id="revision-text" class="form-textarea" placeholder="只有你主动编辑时，才会生成新的版本。">${esc(entry.currentText || entry.originalText)}</textarea></div><div class="dialog-footer" style="padding-top:15px;margin-top:15px"><button type="button" class="button button-secondary" data-action="close-dialog">关闭</button><button type="submit" class="button button-primary">保存新版本</button></div></form>`));
}

function showHypothesisDetail(hypothesisId) {
  const hypothesis = hypothesisById(hypothesisId); if (!hypothesis) return;
  const evidence = state.evidence.filter((item) => item.hypothesisId === hypothesis.id);
  const entryOptions = sortedEntries().map((entry) => `<option value="${esc(entry.id)}">${esc(fmtDate(entry.date))} · ${esc(textPreview(entry.currentText || entry.originalText, 65))}</option>`).join("");
  const evidenceRows = evidence.length ? evidence.map((item) => { const entry = entryById(item.entryId); return `<div class="evidence-row"><div><p>${esc(item.note)}</p><span class="revision-date">${entry ? esc(fmtDateLong(entry.date)) : "未知记录"}</span></div><span class="evidence-type ${item.type}">${item.type === "support" ? "支持" : "反对"}</span></div>`; }).join("") : `<div class="empty-analysis">还没有关联证据。选择一条 Entry，明确它支持还是反对这条解释。</div>`;
  showDialog(dialogShell(`${hypothesis.id} · ${hypothesis.title}`, "Hypothesis / 可继续被验证的解释", `<p class="dialog-note">${esc(hypothesis.description)}</p><div class="confidence-row" style="margin-top:19px"><span>当前置信度</span><span class="confidence-value">${hypothesis.confidence}% · ${esc(hypothesis.status)}</span></div><div class="chart-wrap">${confidenceChart(hypothesis.confidenceHistory || [])}</div><div class="dialog-divider"></div><div class="analysis-kicker">EVIDENCE LEDGER</div><div style="margin-top:7px">${evidenceRows}</div><div class="dialog-divider"></div><form id="hypothesis-update-form" data-hypothesis-id="${esc(hypothesis.id)}"><div class="form-grid"><div class="form-field"><label class="form-label" for="hyp-confidence">更新置信度（0–100）</label><input class="form-input" id="hyp-confidence" type="number" min="0" max="100" value="${hypothesis.confidence}" /></div><div class="form-field"><label class="form-label" for="hyp-status">状态</label><select class="form-select" id="hyp-status"><option ${hypothesis.status === "Active" ? "selected" : ""}>Active</option><option ${hypothesis.status === "Weak" ? "selected" : ""}>Weak</option><option ${hypothesis.status === "Supported" ? "selected" : ""}>Supported</option><option ${hypothesis.status === "Rejected" ? "selected" : ""}>Rejected</option><option ${hypothesis.status === "Archived" ? "selected" : ""}>Archived</option></select></div><div class="form-field full"><label class="form-label" for="hyp-reason">这次更新的理由</label><input class="form-input" id="hyp-reason" placeholder="例如：新增一条反对证据" /></div></div><div class="dialog-footer" style="padding-top:15px;margin-top:15px"><button type="submit" class="button button-primary">追加判断记录</button></div></form><div class="dialog-divider"></div><form id="evidence-form" data-hypothesis-id="${esc(hypothesis.id)}"><div class="analysis-kicker">ATTACH EVIDENCE</div><div class="form-grid" style="margin-top:10px"><div class="form-field full"><label class="form-label" for="evidence-entry">选择一条原始记录</label><select class="form-select" id="evidence-entry">${entryOptions}</select></div><div class="form-field"><label class="form-label" for="evidence-type">它的方向</label><select class="form-select" id="evidence-type"><option value="support">支持假设</option><option value="against">反对假设</option></select></div><div class="form-field"><label class="form-label" for="evidence-note">证据说明</label><input class="form-input" id="evidence-note" placeholder="只写这条记录提供了什么" /></div></div><div class="dialog-footer" style="padding-top:15px;margin-top:15px"><button type="submit" class="button button-secondary">添加证据</button></div></form>`));
}

function showExperimentDetail(experimentId) {
  const experiment = state.experiments.find((item) => item.id === experimentId); if (!experiment) return;
  const observations = experiment.observations || [];
  const observationRows = observations.length ? observations.map((obs) => `<div class="evidence-row"><div><p>${obs.completed ? "完成" : "未完成"} · 专注 ${obs.focus ?? "—"}/5 · 抗拒 ${obs.resistance ?? "—"}/5 · 睡眠 ${obs.sleepHours ?? "—"}h</p><span class="revision-date">${fmtDateLong(obs.date)}${obs.note ? ` · ${esc(obs.note)}` : ""}</span></div><span class="evidence-type ${obs.completed ? "support" : "against"}">${obs.completed ? "完成" : "未完成"}</span></div>`).join("") : `<div class="empty-analysis">还没有观察记录。</div>`;
  showDialog(dialogShell(`${experiment.id} · ${experiment.title}`, "Experiment / 最小人生实验", `<p class="dialog-note">${esc(experiment.question)}</p><div class="experiment-meta" style="margin:17px 0 5px"><span class="meta-pill">${fmtDate(experiment.startDate)} — ${fmtDate(experiment.endDate)}</span><span class="meta-pill">${(experiment.metrics || []).join(" · ")}</span></div><div class="dialog-divider"></div><div class="analysis-kicker">OBSERVATIONS · ${observations.length}</div><div style="margin-top:6px">${observationRows}</div>${experiment.conclusion ? `<div class="dialog-divider"></div><div class="analysis-kicker">CURRENT CONCLUSION</div><p class="dialog-note">${esc(experiment.conclusion)}</p>` : ""}`));
}

function showNewHypothesis() {
  showDialog(dialogShell("新建假设", "从一个可反驳的解释开始", `<form id="new-hypothesis-form"><div class="form-grid"><div class="form-field full"><label class="form-label" for="new-hyp-title">标题</label><input class="form-input" id="new-hyp-title" required placeholder="例如：我在反馈周期长的任务上更容易失去动力" /></div><div class="form-field full"><label class="form-label" for="new-hyp-description">描述</label><textarea class="form-textarea" id="new-hyp-description" required placeholder="写成可以被新证据支持或反驳的解释。"></textarea></div><div class="form-field"><label class="form-label" for="new-hyp-confidence">初始置信度</label><input class="form-input" id="new-hyp-confidence" type="number" min="0" max="100" value="40" /></div><div class="form-field"><label class="form-label" for="new-hyp-status">状态</label><select class="form-select" id="new-hyp-status"><option>Active</option><option>Weak</option></select></div></div><div class="dialog-footer"><button type="button" class="button button-secondary" data-action="close-dialog">取消</button><button type="submit" class="button button-primary">保存假设</button></div></form>`));
}
function showNewExperiment() {
  showDialog(dialogShell("设计一个最小人生实验", "把模糊问题变成有限时间的观察", `<form id="new-experiment-form"><div class="form-grid"><div class="form-field full"><label class="form-label" for="new-exp-title">实验名称</label><input class="form-input" id="new-exp-title" required placeholder="例如：起床后一小时内完成 20 分钟学习" /></div><div class="form-field full"><label class="form-label" for="new-exp-question">要测试的问题</label><textarea class="form-textarea" id="new-exp-question" required placeholder="我是不是在……条件下更容易……？"></textarea></div><div class="form-field"><label class="form-label" for="new-exp-days">持续天数</label><input class="form-input" id="new-exp-days" type="number" min="2" max="30" value="7" /></div><div class="form-field"><label class="form-label" for="new-exp-metrics">记录指标</label><input class="form-input" id="new-exp-metrics" value="是否完成、专注度 1–5、抗拒度 1–5、睡眠小时" /></div></div><div class="dialog-footer"><button type="button" class="button button-secondary" data-action="close-dialog">取消</button><button type="submit" class="button button-primary">开始实验</button></div></form>`));
}
function showNewObservation(experimentId) {
  const experiment = state.experiments.find((item) => item.id === experimentId); if (!experiment) return;
  showDialog(dialogShell("记录一次实验观察", `${experiment.id} · ${experiment.title}`, `<form id="observation-form" data-experiment-id="${esc(experiment.id)}"><div class="form-grid"><div class="form-field"><label class="form-label" for="obs-date">日期</label><input class="form-input" id="obs-date" type="date" value="${dateISO()}" required /></div><div class="form-field"><label class="form-label" for="obs-completed">今天是否完成？</label><select class="form-select" id="obs-completed"><option value="true">完成</option><option value="false">未完成</option></select></div><div class="form-field"><label class="form-label" for="obs-focus">专注度（1–5）</label><input class="form-input" id="obs-focus" type="number" min="1" max="5" value="3" /></div><div class="form-field"><label class="form-label" for="obs-resistance">抗拒度（1–5）</label><input class="form-input" id="obs-resistance" type="number" min="1" max="5" value="3" /></div><div class="form-field"><label class="form-label" for="obs-sleep">睡眠小时</label><input class="form-input" id="obs-sleep" type="number" min="0" max="24" step="0.1" value="7" /></div><div class="form-field full"><label class="form-label" for="obs-note">现场备注</label><textarea class="form-textarea" id="obs-note" placeholder="只记发生了什么，不急着下结论。"></textarea></div></div><div class="dialog-footer"><button type="button" class="button button-secondary" data-action="close-dialog">取消</button><button type="submit" class="button button-primary">保存观察</button></div></form>`));
}
function showNewPrediction() {
  showDialog(dialogShell("写下一条带概率的预测", "保留预测时的判断，未来只记录结果", `<form id="new-prediction-form"><div class="form-grid"><div class="form-field full"><label class="form-label" for="new-prediction-text">预测事件</label><input class="form-input" id="new-prediction-text" required placeholder="未来 30 天完成一个可玩的 Python 小项目" /></div><div class="form-field"><label class="form-label" for="new-prediction-probability">概率（0–100%）</label><input class="form-input" id="new-prediction-probability" type="number" min="0" max="100" value="60" /></div><div class="form-field"><label class="form-label" for="new-prediction-due">截止日期</label><input class="form-input" id="new-prediction-due" type="date" value="${dateOffset(30)}" /></div></div><div class="dialog-note">概率不是承诺。它是你在此刻对未来的可校准判断。</div><div class="dialog-footer"><button type="button" class="button button-secondary" data-action="close-dialog">取消</button><button type="submit" class="button button-primary">保存预测</button></div></form>`));
}

function bindPageEvents() {
  const composer = document.getElementById("entry-composer"); if (composer) composer.addEventListener("input", (event) => { window.entryDraft = event.target.value; });
  const search = document.getElementById("timeline-search"); if (search) search.addEventListener("input", (event) => { timelineSearch = event.target.value; clearTimeout(saveTimer); saveTimer = setTimeout(render, 220); });
}

async function saveOriginalEntry() {
  const composer = document.getElementById("entry-composer"); const text = composer?.value.trim() || ""; if (!text) { showToast("先写下一段原始记录"); composer?.focus(); return; }
  const createdAt = nowISO(); const entry = { id: uid("entry"), createdAt, updatedAt: createdAt, date: dateISO(), originalText: text, currentText: text, revisions: [{ id: uid("rev"), createdAt, text, kind: "original", note: "首次保存的原始材料" }], tags: [...selectedTags], metadata: {}, analysis: null, events: [] };
  state.entries.unshift(entry); state.seeded = false; window.entryDraft = ""; selectedTags = []; await persist("原文已保存，正在分析");
  entry.analysis = analysisForText(text); entry.events = entry.analysis.facts.map((fact) => ({ id: uid("event"), text: fact, createdAt })); await persist("原文与分析已分别保存"); render(); showToast("原始记录已保存");
}
async function clearDemoData() { if (!confirm("清空演示研究样本？这会保留空白工作区，但不会影响你已经导出的文件。")) return; state = normalizeState({ createdAt: nowISO(), updatedAt: nowISO(), seeded: false, entries: [], hypotheses: [], evidence: [], experiments: [], predictions: [], reviews: [], backups: [] }); await persist("已清空演示样本"); render(); showToast("现在是空白研究工作区"); }
async function restoreDemo() { if (!confirm("恢复演示样本会替换当前本机状态。若要保留现有数据，请先导出 JSON。")) return; state = seedState(); await persist("已恢复演示研究样本"); currentView = "today"; render(); showToast("演示研究样本已恢复"); }

function exportPayload() { return { product: "Personal Historian / 自我历史学", schemaVersion: 1, exportedAt: nowISO(), state: normalizeState(state) }; }
function download(filename, content, mime = "text/plain;charset=utf-8") { const blob = new Blob([content], { type: mime }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function exportJSON() { download(`personal-historian-${dateISO()}.json`, JSON.stringify(exportPayload(), null, 2), "application/json;charset=utf-8"); showToast("JSON 档案已导出"); }
function exportMarkdown() { const lines = [`# Personal Historian / 自我历史学`, ``, `导出时间：${fmtDateTime(nowISO())}`, ``, `## 原始记录`, ``]; sortedEntries().forEach((entry) => { lines.push(`### ${entry.date}`, ``, entry.originalText, ``, `- 标签：${(entry.tags || []).join("、") || "无"}`, `- 版本数：${entry.revisions?.length || 1}`, `- 可观察事实：${(entry.analysis?.facts || []).join("；") || "—"}`, ``); }); lines.push(`## 假设`, ``); sortedHypotheses().forEach((hypothesis) => lines.push(`### ${hypothesis.id} · ${hypothesis.title}`, ``, hypothesis.description, ``, `- 状态：${hypothesis.status}`, `- 当前置信度：${hypothesis.confidence}%`, `- 置信度历史：${(hypothesis.confidenceHistory || []).map((item) => `${item.date} ${item.confidence}%`).join("；")}`, ``)); lines.push(`## 实验`, ``); (state.experiments || []).forEach((experiment) => lines.push(`### ${experiment.id} · ${experiment.title}`, ``, `问题：${experiment.question}`, `观察数：${experiment.observations?.length || 0}`, ``, experiment.conclusion || "", ``)); download(`personal-historian-${dateISO()}.md`, lines.join("\n"), "text/markdown;charset=utf-8"); showToast("Markdown 档案已导出"); }
function csvCell(value) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }
function exportCSV() { const rows = [["id", "date", "original_text", "current_text", "tags", "fact_count", "created_at"]]; sortedEntries().forEach((entry) => rows.push([entry.id, entry.date, entry.originalText, entry.currentText, (entry.tags || []).join("|"), entry.analysis?.facts?.length || 0, entry.createdAt])); download(`personal-historian-entries-${dateISO()}.csv`, rows.map((row) => row.map(csvCell).join(",")).join("\n"), "text/csv;charset=utf-8"); showToast("CSV 已导出"); }

async function createBackup() { const backup = { id: uid("backup"), createdAt: nowISO(), entryCount: state.entries.length, hypothesisCount: state.hypotheses.length, snapshot: normalizeState(state) }; state.backups = [backup, ...(state.backups || [])].slice(0, 5); await persist("快照已保存"); render(); showToast("本机快照已建立"); }
async function restoreBackup(backupId) { const backup = state.backups.find((item) => item.id === backupId); if (!backup || !confirm("恢复这个快照会替换当前工作区，确定继续吗？")) return; const backups = state.backups; state = normalizeState(backup.snapshot); state.backups = backups; await persist("已恢复快照"); render(); showToast("快照已恢复"); }
async function importJSON(file) { try { const raw = JSON.parse(await file.text()); const imported = normalizeState(raw.state || raw); if (!Array.isArray(imported.entries) || !Array.isArray(imported.hypotheses)) throw new Error("invalid"); if (!confirm(`将导入 ${imported.entries.length} 条原始记录并替换当前本机档案，确定继续吗？`)) return; state = imported; state.seeded = false; await persist("JSON 档案已导入"); render(); showToast("导入完成"); } catch { showToast("无法读取这个 JSON 文件", true); } }
async function deleteAll() { if (!confirm("这会删除当前浏览器里的全部记录、假设、实验和预测。请确认你已经导出 JSON。")) return; state = normalizeState({ createdAt: nowISO(), updatedAt: nowISO(), seeded: false }); await persist("全部数据已删除"); render(); showToast("本机档案已清空"); }

async function submitRevision(form) { const entry = entryById(form.dataset.entryId); const textarea = form.querySelector("#revision-text"); const text = textarea?.value.trim(); if (!entry || !text || text === entry.currentText) { showToast("没有新的版本需要保存"); return; } const createdAt = nowISO(); entry.revisions = entry.revisions || []; entry.revisions.push({ id: uid("rev"), createdAt, text, kind: "revision", note: "用户主动修订" }); entry.currentText = text; entry.updatedAt = createdAt; entry.analysis = analysisForText(text); entry.events = entry.analysis.facts.map((fact) => ({ id: uid("event"), text: fact, createdAt })); await persist("修订历史已追加"); closeDialog(); render(); showToast("新版本已追加，旧版本仍在档案中"); }
async function submitHypothesis(form) { const title = form.querySelector("#new-hyp-title").value.trim(); const description = form.querySelector("#new-hyp-description").value.trim(); if (!title || !description) return; const confidence = clamp(Number(form.querySelector("#new-hyp-confidence").value || 40), 0, 100); const createdAt = nowISO(); state.hypotheses.unshift({ id: `H-${String(state.hypotheses.length + 15).padStart(3, "0")}`, title, description, createdAt, updatedAt: createdAt, confidence, status: form.querySelector("#new-hyp-status").value, confidenceHistory: [{ date: dateISO(), confidence, reason: "首次提出" }], supportingEvidence: [], opposingEvidence: [] }); await persist("新假设已保存"); closeDialog(); currentView = "hypotheses"; render(); showToast("假设已加入研究库"); }
async function updateHypothesis(form) { const hypothesis = hypothesisById(form.dataset.hypothesisId); if (!hypothesis) return; const confidence = clamp(Number(form.querySelector("#hyp-confidence").value || hypothesis.confidence), 0, 100); const reason = form.querySelector("#hyp-reason").value.trim() || "没有补充理由"; hypothesis.confidence = confidence; hypothesis.status = form.querySelector("#hyp-status").value; hypothesis.updatedAt = nowISO(); hypothesis.confidenceHistory = [...(hypothesis.confidenceHistory || []), { date: dateISO(), confidence, reason }]; await persist("假设历史已追加"); showHypothesisDetail(hypothesis.id); showToast("新的置信度已追加"); }
async function attachEvidence(form) { const hypothesis = hypothesisById(form.dataset.hypothesisId); const entryId = form.querySelector("#evidence-entry").value; const type = form.querySelector("#evidence-type").value; const entry = entryById(entryId); if (!hypothesis || !entry) return; const evidence = { id: `E-${String(state.evidence.length + 60).padStart(3, "0")}`, hypothesisId: hypothesis.id, entryId, type, note: form.querySelector("#evidence-note").value.trim() || textPreview(entry.analysis?.facts?.[0] || entry.currentText, 120), createdAt: nowISO() }; state.evidence.push(evidence); if (type === "support") hypothesis.supportingEvidence = [...(hypothesis.supportingEvidence || []), evidence.id]; else hypothesis.opposingEvidence = [...(hypothesis.opposingEvidence || []), evidence.id]; hypothesis.updatedAt = nowISO(); await persist("证据已关联"); showHypothesisDetail(hypothesis.id); showToast("证据已加入台账"); }
async function submitExperiment(form) { const title = form.querySelector("#new-exp-title").value.trim(); const question = form.querySelector("#new-exp-question").value.trim(); if (!title || !question) return; const durationDays = clamp(Number(form.querySelector("#new-exp-days").value || 7), 2, 30); const startDate = dateISO(); const end = new Date(`${startDate}T12:00:00`); end.setDate(end.getDate() + durationDays - 1); state.experiments.unshift({ id: `X-${String(state.experiments.length + 4).padStart(3, "0")}`, title, question, status: "Active", startDate, endDate: dateISO(end), durationDays, metrics: form.querySelector("#new-exp-metrics").value.split(/[,，]/).map((item) => item.trim()).filter(Boolean), observations: [], conclusion: "", createdAt: nowISO() }); await persist("实验已开始"); closeDialog(); currentView = "experiments"; render(); showToast("实验已加入进行中列表"); }
async function submitObservation(form) { const experiment = state.experiments.find((item) => item.id === form.dataset.experimentId); if (!experiment) return; const observation = { id: uid("obs"), date: form.querySelector("#obs-date").value, completed: form.querySelector("#obs-completed").value === "true", focus: clamp(Number(form.querySelector("#obs-focus").value || 3), 1, 5), resistance: clamp(Number(form.querySelector("#obs-resistance").value || 3), 1, 5), sleepHours: Number(form.querySelector("#obs-sleep").value || 0), note: form.querySelector("#obs-note").value.trim() }; experiment.observations = [...(experiment.observations || []), observation].sort((a, b) => a.date.localeCompare(b.date)); await persist("实验观察已保存"); closeDialog(); render(); showToast("观察已加入实验记录"); }
function analyzeExperiment(experimentId) { const experiment = state.experiments.find((item) => item.id === experimentId); if (!experiment) return; const observations = experiment.observations || []; const completed = observations.filter((item) => item.completed); const avg = (key) => observations.length ? observations.reduce((sum, item) => sum + Number(item[key] || 0), 0) / observations.length : 0; experiment.conclusion = `当前 ${observations.length} 次观察中完成率 ${Math.round(completed.length / Math.max(observations.length, 1) * 100)}%，平均专注度 ${avg("focus").toFixed(1)}/5，平均抗拒度 ${avg("resistance").toFixed(1)}/5。现有数据更支持继续测试“开始时间、睡眠和任务大小的组合”，还不足以推出必须早起。`; experiment.status = observations.length >= Number(experiment.durationDays || 7) ? "Analyzed" : "Active"; persist("实验分析已追加").then(() => { render(); showToast("实验分析已更新"); }); }
async function submitPrediction(form) { const text = form.querySelector("#new-prediction-text").value.trim(); if (!text) return; state.predictions.unshift({ id: `P-${String(state.predictions.length + 19).padStart(3, "0")}`, text, probability: clamp(Number(form.querySelector("#new-prediction-probability").value || 50), 0, 100) / 100, dueDate: form.querySelector("#new-prediction-due").value, status: "Open", result: null, createdAt: nowISO() }); await persist("预测已保存"); closeDialog(); currentView = "predictions"; render(); showToast("预测已记录"); }
async function resolvePrediction(predictionId) { const prediction = state.predictions.find((item) => item.id === predictionId); if (!prediction) return; showDialog(dialogShell("记录预测结果", prediction.text, `<form id="resolve-prediction-form" data-prediction-id="${esc(prediction.id)}"><div class="form-field"><label class="form-label" for="prediction-result">结果</label><select class="form-select" id="prediction-result"><option value="true">发生</option><option value="false">未发生</option></select></div><div class="dialog-note">只记录事件是否发生。预测时的概率 ${Math.round(prediction.probability * 100)}% 会被保留，用来计算校准。</div><div class="dialog-footer"><button type="button" class="button button-secondary" data-action="close-dialog">取消</button><button type="submit" class="button button-primary">保存结果</button></div></form>`)); }
async function submitPredictionResult(form) { const prediction = state.predictions.find((item) => item.id === form.dataset.predictionId); if (!prediction) return; prediction.result = form.querySelector("#prediction-result").value === "true"; prediction.status = "Resolved"; prediction.resolvedAt = nowISO(); await persist("预测结果已保存"); closeDialog(); render(); showToast("结果已进入校准统计"); }
async function saveReview() { const data = reviewData(); state.reviews.unshift({ id: uid("review"), type: "monthly", period: data.currentMonth, createdAt: nowISO(), data: { entryCount: data.entries.length, topTags: data.topTags, evidenceCount: data.evidence.length, nextVariable: data.nextVariable } }); await persist("复盘快照已保存"); showToast("本月复盘已存入档案"); }
function registerWebMcp() {
  const context = document.modelContext;
  if (!context?.registerTool) return;
  const tools = [
    { name: "read_research_snapshot", title: "Read research snapshot", description: "Read a concise snapshot of the private personal research workspace.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true }, execute: () => ({ entries: state.entries.length, hypotheses: state.hypotheses.length, activeExperiments: state.experiments.filter((item) => item.status === "Active").length, openPredictions: state.predictions.filter((item) => item.status === "Open").length, latestEntry: latestEntry() ? { date: latestEntry().date, text: latestEntry().currentText } : null }) },
    { name: "create_original_entry", title: "Create original entry", description: "Save a user's original field note without replacing or rewriting it.", inputSchema: { type: "object", properties: { text: { type: "string", minLength: 1 }, tags: { type: "array", items: { type: "string" } } }, required: ["text"], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true }, execute: async (input) => { const text = String(input?.text || "").trim(); if (!text) throw new Error("text is required"); const createdAt = nowISO(); const entry = { id: uid("entry"), createdAt, updatedAt: createdAt, date: dateISO(), originalText: text, currentText: text, revisions: [{ id: uid("rev"), createdAt, text, kind: "original" }], tags: Array.isArray(input.tags) ? input.tags.slice(0, 8).map(String) : [], metadata: {}, analysis: analysisForText(text), events: [] }; entry.events = entry.analysis.facts.map((fact) => ({ id: uid("event"), text: fact, createdAt })); state.entries.unshift(entry); state.seeded = false; await persist("原始记录已通过研究工具保存"); render(); return { id: entry.id, date: entry.date, status: "saved" }; } },
    { name: "navigate_research_workspace", title: "Navigate research workspace", description: "Open a research section in the visible personal historian workspace.", inputSchema: { type: "object", properties: { view: { type: "string", enum: Object.keys(NAV_LABELS) } }, required: ["view"], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: (input) => { if (!NAV_LABELS[input?.view]) throw new Error("unknown view"); currentView = input.view; render(); return { view: input.view, status: "opened" }; } }
  ];
  tools.forEach((tool) => { try { Promise.resolve(context.registerTool(tool)).catch(() => {}); } catch {} });
}

document.addEventListener("click", async (event) => {
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) { currentView = viewButton.dataset.view; render(); document.getElementById("sidebar")?.classList.remove("open"); return; }
  const action = event.target.closest("[data-action]");
  if (!action) return;
  const type = action.dataset.action;
  if (type === "save-entry") return saveOriginalEntry();
  if (type === "toggle-tag") { const tag = action.dataset.tag; selectedTags = selectedTags.includes(tag) ? selectedTags.filter((item) => item !== tag) : [...selectedTags, tag]; action.classList.toggle("selected", selectedTags.includes(tag)); return; }
  if (type === "view-entry") return showEntryDetail(action.dataset.id);
  if (type === "timeline-range") { timelineRange = action.dataset.range; render(); return; }
  if (type === "new-hypothesis") return showNewHypothesis();
  if (type === "view-hypothesis") return showHypothesisDetail(action.dataset.id);
  if (type === "new-experiment") return showNewExperiment();
  if (type === "new-observation") return showNewObservation(action.dataset.id);
  if (type === "view-experiment") return showExperimentDetail(action.dataset.id);
  if (type === "analyze-experiment") return analyzeExperiment(action.dataset.id);
  if (type === "new-prediction") return showNewPrediction();
  if (type === "resolve-prediction") return resolvePrediction(action.dataset.id);
  if (type === "save-review") return saveReview();
  if (type === "clear-demo") return clearDemoData();
  if (type === "reset-demo") return restoreDemo();
  if (type === "close-dialog") return closeDialog();
  if (type === "export-json" || type === "quick-export") return exportJSON();
  if (type === "export-markdown") return exportMarkdown();
  if (type === "export-csv") return exportCSV();
  if (type === "import-json") return document.getElementById("import-file").click();
  if (type === "create-backup") return createBackup();
  if (type === "restore-backup") return restoreBackup(action.dataset.id);
  if (type === "delete-all") return deleteAll();
});

document.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target;
  if (form.id === "revision-form") return submitRevision(form);
  if (form.id === "new-hypothesis-form") return submitHypothesis(form);
  if (form.id === "hypothesis-update-form") return updateHypothesis(form);
  if (form.id === "evidence-form") return attachEvidence(form);
  if (form.id === "new-experiment-form") return submitExperiment(form);
  if (form.id === "observation-form") return submitObservation(form);
  if (form.id === "new-prediction-form") return submitPrediction(form);
  if (form.id === "resolve-prediction-form") return submitPredictionResult(form);
});

document.getElementById("import-file").addEventListener("change", (event) => { const file = event.target.files?.[0]; if (file) importJSON(file); event.target.value = ""; });
document.getElementById("mobile-menu").addEventListener("click", () => document.getElementById("sidebar").classList.toggle("open"));
document.getElementById("quick-export").addEventListener("click", exportJSON);
document.getElementById("reset-demo").addEventListener("click", restoreDemo);
dialog.addEventListener("click", (event) => { if (event.target === dialog) closeDialog(); });

async function init() {
  const stored = await readStoredState();
  state = stored ? normalizeState(stored) : seedState();
  if (!stored) await persist("演示样本已保存到本机");
  render();
  registerWebMcp();
}

init();
