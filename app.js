/* NSK Lag v78 */

const STORAGE_KEY = "nsklag_v78";
const LAST_OPEN_POOL = "nsklag_last_open_pool_v78";

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}
function todayISO() {
  const d = new Date();
  const tzOff = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOff).toISOString().slice(0, 10);
}
function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec));
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function readState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function writeState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function ensureState() {
  const s = readState();
  if (s) return s;

  const init = {
    version: "v78",
    createdAt: Date.now(),
    squad: {
      players: [],
      coaches: []
    },
    pools: [],
    matchLogs: [], // {id, poolId, poolName, date, exportedAt, logText}
    match: {
      running: false,
      startedAt: null,
      elapsedSec: 0,
      period: 1,
      line: 1,
      activePoolId: null,
      log: [] // strings
    }
  };
  writeState(init);
  return init;
}

let state = ensureState();

/* ---------------- NAV ---------------- */
function showView(id) {
  $$(".view").forEach(v => v.classList.remove("active"));
  const el = $(`#view-${id}`);
  if (el) el.classList.add("active");
  location.hash = id;
}
function navTo(id) {
  showView(id);
  if (id === "home") renderPools();
  if (id === "squad") renderSquad();
  if (id === "goalies") renderGoalieStats();
  if (id === "match") renderMatch();
  if (id === "stats") renderStats();
}

function wireNav() {
  $$("[data-nav]").forEach(btn => {
    btn.addEventListener("click", () => navTo(btn.getAttribute("data-nav")));
  });

  const h = (location.hash || "").replace("#", "");
  if (h) showView(h);
}

/* ---------------- POOLS ---------------- */
function parseGoaliesRaw(raw) {
  const lines = (raw || "").split("\n").map(x => x.trim()).filter(Boolean);
  const out = [];
  for (const line of lines) {
    const m = line.match(/^(.+?)[\s:]+(\d+)$/);
    if (!m) continue;
    const name = m[1].trim();
    const matches = Number(m[2]);
    if (!name || !Number.isFinite(matches) || matches <= 0) continue;
    out.push({ playerName: name, matches });
  }
  return out;
}

function renderPools() {
  const list = $("#pools-list");
  const empty = $("#pools-empty");
  list.innerHTML = "";

  const pools = [...state.pools].sort((a,b) => (b.createdAt||0) - (a.createdAt||0));
  empty.hidden = pools.length !== 0;

  for (const pool of pools) {
    const row = document.createElement("div");
    row.className = "item";

    const left = document.createElement("div");
    const title = document.createElement("div");
    title.className = "item-title";
    title.textContent = pool.name;

    const goalieSum = (pool.goalieMatches || []).reduce((s,x)=> s + (Number(x.matches)||0), 0);
    const meta = document.createElement("div");
    meta.className = "item-meta";
    meta.textContent = `${pool.date || "—"} • ${goalieSum} målvaktsmatcher`;

    left.appendChild(title);
    left.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "item-actions";

    const startBtn = document.createElement("button");
    startBtn.className = "btn btn-primary";
    startBtn.textContent = "Påbörja poolspel";
    startBtn.addEventListener("click", () => {
      localStorage.setItem(LAST_OPEN_POOL, pool.id);
      state.match.activePoolId = pool.id;
      writeState(state);
      navTo("match");
    });

    const editBtn = document.createElement("button");
    editBtn.className = "btn";
    editBtn.textContent = "Redigera målvakter";
    editBtn.addEventListener("click", () => editPoolGoalies(pool.id));

    const delBtn = document.createElement("button");
    delBtn.className = "btn btn-danger";
    delBtn.textContent = "Ta bort";
    delBtn.addEventListener("click", () => {
      if (!confirm(`Radera poolspel "${pool.name}"?`)) return;
      state.pools = state.pools.filter(p => p.id !== pool.id);
      if (state.match.activePoolId === pool.id) state.match.activePoolId = null;
      writeState(state);
      renderPools();
      renderGoalieStats();
      renderStats();
    });

    actions.appendChild(startBtn);
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    row.appendChild(left);
    row.appendChild(actions);

    list.appendChild(row);
  }
}

function editPoolGoalies(poolId) {
  const pool = state.pools.find(p => p.id === poolId);
  if (!pool) return;

  const current = (pool.goalieMatches || []).map(x => `${x.playerName} ${x.matches}`).join("\n");
  const raw = prompt(
    `Målvaktsmatcher för: ${pool.name}\n\nEn rad per spelare: "Namn antal"\nEx: Alex 2`,
    current
  );
  if (raw === null) return;

  pool.goalieMatches = parseGoaliesRaw(raw);
  writeState(state);
  renderPools();
  renderGoalieStats();
}

function openCreateDialog() {
  $("#pool-name").value = "";
  $("#pool-date").value = todayISO();
  $("#pool-goalies-raw").value = "";
  $("#dlg-create").showModal();
}

function savePoolFromDialog() {
  const name = $("#pool-name").value.trim();
  const date = $("#pool-date").value;
  const raw = $("#pool-goalies-raw").value;
  if (!name) return;

  state.pools.push({
    id: uid(),
    name,
    date,
    createdAt: Date.now(),
    goalieMatches: parseGoaliesRaw(raw)
  });

  writeState(state);
  renderPools();
  renderGoalieStats();
  renderStats();
}

/* ---------------- SQUAD ---------------- */
function renderSquad() {
  const players = $("#players-list");
  const coaches = $("#coaches-list");
  players.innerHTML = "";
  coaches.innerHTML = "";

  const plist = [...state.squad.players].sort((a,b)=> (a.number||999) - (b.number||999) || a.name.localeCompare(b.name));
  for (const p of plist) {
    const row = document.createElement("div");
    row.className = "item";
    row.tabIndex = 0;

    const left = document.createElement("div");
    const t = document.createElement("div");
    t.className = "item-title";
    t.textContent = p.number != null ? `${p.name} (#${p.number})` : p.name;
    const m = document.createElement("div");
    m.className = "item-meta";
    m.textContent = "Spelare";
    left.appendChild(t); left.appendChild(m);

    const actions = document.createElement("div");
    actions.className = "item-actions";

    const edit = document.createElement("button");
    edit.className = "btn";
    edit.textContent = "Redigera";
    edit.onclick = () => editPerson("player", p.id);

    const del = document.createElement("button");
    del.className = "btn btn-danger";
    del.textContent = "Ta bort";
    del.onclick = () => {
      if (!confirm(`Ta bort ${p.name}?`)) return;
      state.squad.players = state.squad.players.filter(x => x.id !== p.id);
      writeState(state);
      renderSquad();
      renderStats();
    };

    actions.appendChild(edit);
    actions.appendChild(del);

    row.appendChild(left);
    row.appendChild(actions);
    row.addEventListener("click", (e)=> { if (e.target.tagName !== "BUTTON") editPerson("player", p.id); });

    players.appendChild(row);
  }

  const clist = [...state.squad.coaches].sort((a,b)=>a.name.localeCompare(b.name));
  for (const c of clist) {
    const row = document.createElement("div");
    row.className = "item";

    const left = document.createElement("div");
    const t = document.createElement("div");
    t.className = "item-title";
    t.textContent = c.name;
    const m = document.createElement("div");
    m.className = "item-meta";
    m.textContent = "Tränare/Ledare";
    left.appendChild(t); left.appendChild(m);

    const actions = document.createElement("div");
    actions.className = "item-actions";

    const edit = document.createElement("button");
    edit.className = "btn";
    edit.textContent = "Redigera";
    edit.onclick = () => editPerson("coach", c.id);

    const del = document.createElement("button");
    del.className = "btn btn-danger";
    del.textContent = "Ta bort";
    del.onclick = () => {
      if (!confirm(`Ta bort ${c.name}?`)) return;
      state.squad.coaches = state.squad.coaches.filter(x => x.id !== c.id);
      writeState(state);
      renderSquad();
    };

    actions.appendChild(edit);
    actions.appendChild(del);

    row.appendChild(left);
    row.appendChild(actions);

    coaches.appendChild(row);
  }
}

function editPerson(type, id) {
  if (type === "player") {
    const p = state.squad.players.find(x=>x.id===id);
    if (!p) return;
    const newName = prompt("Namn:", p.name);
    if (!newName) return;
    const newNr = prompt("Nummer (valfritt):", p.number ?? "");
    p.name = newName.trim();
    p.number = (newNr === null || newNr.trim()==="") ? null : Number(newNr);
  } else {
    const c = state.squad.coaches.find(x=>x.id===id);
    if (!c) return;
    const newName = prompt("Namn:", c.name);
    if (!newName) return;
    c.name = newName.trim();
  }
  writeState(state);
  renderSquad();
  renderStats();
}

/* ---------------- GOALIE STATS ---------------- */
function computeGoalieStats() {
  const per = new Map();
  let total = 0;

  for (const pool of (state.pools || [])) {
    for (const gm of (pool.goalieMatches || [])) {
      const name = (gm.playerName || "").trim();
      const matches = Number(gm.matches || 0);
      if (!name || !Number.isFinite(matches) || matches <= 0) continue;
      total += matches;
      per.set(name, (per.get(name) || 0) + matches);
    }
  }

  const summary = Array.from(per.entries())
    .map(([name, matches]) => ({ name, matches }))
    .sort((a,b)=> b.matches - a.matches || a.name.localeCompare(b.name));

  return { totalPools: state.pools.length, totalMatches: total, unique: summary.length, summary };
}

function renderGoalieStats() {
  const stats = computeGoalieStats();
  $("#g-total-pools").textContent = String(stats.totalPools);
  $("#g-total-matches").textContent = String(stats.totalMatches);
  $("#g-unique").textContent = String(stats.unique);

  const poolsEl = $("#goalie-pools");
  poolsEl.innerHTML = "";
  const pools = [...state.pools].sort((a,b)=> (b.createdAt||0)-(a.createdAt||0));

  for (const pool of pools) {
    const row = document.createElement("div");
    row.className = "item";
    const left = document.createElement("div");
    const t = document.createElement("div");
    t.className = "item-title";
    t.textContent = pool.name;
    const sum = (pool.goalieMatches||[]).reduce((s,x)=>s+(Number(x.matches)||0),0);
    const m = document.createElement("div");
    m.className = "item-meta";
    m.textContent = `${pool.date || "—"} • ${sum} målvaktsmatcher`;
    left.appendChild(t); left.appendChild(m);

    const actions = document.createElement("div");
    actions.className = "item-actions";
    const edit = document.createElement("button");
    edit.className = "btn";
    edit.textContent = "Redigera";
    edit.onclick = () => editPoolGoalies(pool.id);
    actions.appendChild(edit);

    row.appendChild(left);
    row.appendChild(actions);
    poolsEl.appendChild(row);
  }

  const sumEl = $("#goalie-summary");
  sumEl.innerHTML = "";
  if (stats.summary.length === 0) {
    const r = document.createElement("div");
    r.className = "muted";
    r.textContent = "Ingen målvaktsdata ännu.";
    sumEl.appendChild(r);
  } else {
    for (const s of stats.summary) {
      const row = document.createElement("div");
      row.className = "item";
      row.innerHTML = `<div><div class="item-title">${escapeHtml(s.name)}</div><div class="item-meta">${s.matches} matcher som målvakt</div></div>`;
      sumEl.appendChild(row);
    }
  }
}

/* ---------------- MATCH MODE ---------------- */
let timerInterval = null;

function getActivePool() {
  const id = state.match.activePoolId;
  if (!id) return null;
  return state.pools.find(p => p.id === id) || null;
}

function logMatch(line) {