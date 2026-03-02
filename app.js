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
  const stamp = fmtTime(state.match.elapsedSec);
  state.match.log.push(`[${stamp}] ${line}`);
  writeState(state);
  renderMatchLog();
}

function renderMatch() {
  const pool = getActivePool();
  $("#active-pool-name").textContent = pool ? pool.name : "—";
  $("#match-timer").textContent = fmtTime(state.match.elapsedSec);
  $("#match-period").textContent = String(state.match.period);
  $("#btn-start-stop").textContent = state.match.running ? "Stop" : "Start";
  renderMatchLog();
}

function renderMatchLog() {
  $("#match-log").textContent = (state.match.log || []).join("\n");
}

function startTimer() {
  if (state.match.running) return;
  state.match.running = true;
  state.match.startedAt = Date.now();
  writeState(state);

  timerInterval = setInterval(() => {
    state.match.elapsedSec += 1;
    $("#match-timer").textContent = fmtTime(state.match.elapsedSec);
    writeState(state);
  }, 1000);
}

function stopTimer() {
  if (!state.match.running) return;
  state.match.running = false;
  state.match.startedAt = null;
  writeState(state);
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
}

function resetMatch() {
  if (!confirm("Återställ matchläge?")) return;
  stopTimer();
  state.match.elapsedSec = 0;
  state.match.period = 1;
  state.match.line = 1;
  state.match.log = [];
  writeState(state);
  renderMatch();
}

function pickPoolForMatch() {
  if (state.pools.length === 0) {
    alert("Skapa ett poolspel först.");
    return;
  }
  const options = state.pools.map((p, i) => `${i+1}. ${p.date || "—"} • ${p.name}`).join("\n");
  const chosen = prompt(`Välj poolspel (skriv siffra):\n\n${options}`, "1");
  if (!chosen) return;
  const idx = Number(chosen) - 1;
  if (!Number.isFinite(idx) || idx < 0 || idx >= state.pools.length) return;
  state.match.activePoolId = state.pools[idx].id;
  writeState(state);
  renderMatch();
}

function newPeriod() {
  state.match.period += 1;
  logMatch(`Ny period: ${state.match.period}`);
  writeState(state);
  renderMatch();
}

function lineChange() {
  state.match.line += 1;
  logMatch(`Byt femma (byte #${state.match.line})`);
  writeState(state);
  renderMatch();
}

function exportMatchLog() {
  const pool = getActivePool();
  const poolName = pool ? pool.name : "okänt poolspel";
  const date = pool?.date || todayISO();
  const text = [
    `NSK Lag v78 - Matchlogg`,
    `Pool: ${poolName}`,
    `Datum: ${date}`,
    ``,
    ...(state.match.log || [])
  ].join("\n");

  state.matchLogs.unshift({
    id: uid(),
    poolId: pool?.id || null,
    poolName,
    date,
    exportedAt: new Date().toISOString(),
    logText: text
  });
  state.matchLogs = state.matchLogs.slice(0, 30);
  writeState(state);

  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `nsk-matchlogg-${date}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  alert("Matchlogg exporterad.");
  renderStats();
}

/* ---------------- AI SWAP SCHEDULE ---------------- */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateAISchedule(playerCount, lines) {
  const players = Array.from({ length: playerCount }, (_, i) => `Spelare ${i+1}`);
  const order = shuffle(players);
  const out = [];
  out.push(`Bytesschema (AI)`);
  out.push(`Spelare: ${playerCount}, Linor: ${lines}`);
  out.push(``);

  let idx = 0;
  const rounds = Math.max(6, Math.ceil(playerCount / lines) * 3);
  for (let r = 1; r <= rounds; r++) {
    out.push(`Byte ${r}`);
    for (let l = 1; l <= lines; l++) {
      const group = [];
      const groupSize = Math.ceil(playerCount / lines);
      for (let k = 0; k < groupSize; k++) {
        group.push(order[idx % order.length]);
        idx++;
      }
      out.push(`  Linje ${l}: ${group.join(", ")}`);
    }
    out.push(``);
  }
  return out.join("\n");
}

/* ---------------- TEAMS 1-3 ---------------- */
function generateTeams3() {
  const names = state.squad.players.map(p => (p.number != null ? `${p.name} (#${p.number})` : p.name));
  const order = shuffle(names);
  const teams = [[], [], []];

  let dir = 1;
  let t = 0;
  for (const n of order) {
    teams[t].push(n);
    if (dir === 1) {
      if (t === 2) dir = -1;
      else t++;
    } else {
      if (t === 0) dir = 1;
      else t--;
    }
  }
  return teams;
}

/* ---------------- STATS ---------------- */
function renderStats() {
  $("#s-players").textContent = String(state.squad.players.length);
  $("#s-pools").textContent = String(state.pools.length);
  $("#s-matchlogs").textContent = String(state.matchLogs.length);

  const box = $("#stats-matchlogs");
  box.innerHTML = "";

  if (state.matchLogs.length === 0) {
    const m = document.createElement("div");
    m.className = "muted";
    m.textContent = "Inga matchloggar ännu. Exportera från Matchläge.";
    box.appendChild(m);
    return;
  }

  for (const lg of state.matchLogs.slice(0, 10)) {
    const row = document.createElement("div");
    row.className = "item";

    const left = document.createElement("div");
    left.innerHTML = `<div class="item-title">${escapeHtml(lg.date)} • ${escapeHtml(lg.poolName)}</div><div class="item-meta">${escapeHtml(lg.exportedAt)}</div>`;

    const actions = document.createElement("div");
    actions.className = "item-actions";

    const dl = document.createElement("button");
    dl.className = "btn";
    dl.textContent = "Ladda ned";
    dl.onclick = () => {
      const blob = new Blob([lg.logText], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nsk-matchlogg-${lg.date}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    };

    actions.appendChild(dl);
    row.appendChild(left);
    row.appendChild(actions);
    box.appendChild(row);
  }
}

/* ---------------- BACKUP ---------------- */
function exportBackup() {
  const payload = {
    version: state.version,
    exportedAt: new Date().toISOString(),
    data: state
  };
  const json = JSON.stringify(payload, null, 2);

  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `nsklag-backup-v78-${todayISO()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  $("#backup-preview").hidden = false;
  $("#backup-preview").textContent = json.slice(0, 5000) + (json.length > 5000 ? "\n… (trunkerat)" : "");
}

async function importBackup(file) {
  const text = await file.text();
  let payload;
  try { payload = JSON.parse(text); }
  catch { alert("Kunde inte läsa JSON."); return; }

  const data = payload?.data;
  if (!data || !data.pools || !data.squad) {
    alert("Backupformat känns inte igen.");
    return;
  }
  state = data;
  writeState(state);
  renderAll();
  alert("Backup importerad.");
}

function resetAll() {
  if (!confirm("Återställ allt?")) return;
  stopTimer();
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LAST_OPEN_POOL);
  state = ensureState();
  renderAll();
}

/* ---------------- DEMO ---------------- */
function seedDemo() {
  if (state.pools.length > 0 || state.squad.players.length > 0) {
    if (!confirm("Skapa demo ändå? (lägger till extra data)")) return;
  }

  if (state.squad.players.length === 0) {
    state.squad.players.push(
      { id: uid(), name: "Agnes Danielsson", number: 7 },
      { id: uid(), name: "Albert Zillén", number: 12 },
      { id: uid(), name: "Alex", number: 1 },
      { id: uid(), name: "Sam", number: 18 },
      { id: uid(), name: "Kim", number: 4 }
    );
  }

  state.pools.push(
    {
      id: uid(),
      name: "Hy",
      date: todayISO(),
      createdAt: Date.now(),
      goalieMatches: [{ playerName: "Alex", matches: 2 }, { playerName: "Sam", matches: 1 }]
    },
    {
      id: uid(),
      name: "Nyköping",
      date: todayISO(),
      createdAt: Date.now() - 86400000,
      goalieMatches: [{ playerName: "Kim", matches: 1 }]
    }
  );

  writeState(state);
  renderAll();
}

/* ---------------- UTILS ---------------- */
function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ---------------- RENDER ALL ---------------- */
function renderAll() {
  renderPools();
  renderSquad();
  renderGoalieStats();
  renderMatch();
  renderStats();

  $("#ai-player-count").value = String(Math.max(1, state.squad.players.length || 1));

  $("#team-1").innerHTML = "";
  $("#team-2").innerHTML = "";
  $("#team-3").innerHTML = "";
}

/* ---------------- WIRING ---------------- */
function wireHome() {
  $("#btn-create-pool").addEventListener("click", openCreateDialog);

  $("#btn-clear-pools").addEventListener("click", () => {
    if (!confirm("Rensa alla poolspel?")) return;
    state.pools = [];
    if (state.match.activePoolId) state.match.activePoolId = null;
    writeState(state);
    renderPools();
    renderGoalieStats();
    renderStats();
  });

  $("#btn-demo").addEventListener("click", seedDemo);
}

function wireCreateDialog() {
  $("#btn-save-pool").addEventListener("click", (e) => {
    const name = $("#pool-name").value.trim();
    if (!name) { e.preventDefault(); return; }
    savePoolFromDialog();
    $("#dlg-create").close();
  });
}

function wireSquad() {
  $("#btn-add-player").addEventListener("click", () => {
    const name = prompt("Namn på spelare?");
    if (!name) return;
    const nrRaw = prompt("Nummer (valfritt):");
    const number = (nrRaw === null || nrRaw.trim()==="") ? null : Number(nrRaw);
    state.squad.players.push({ id: uid(), name: name.trim(), number: Number.isFinite(number) ? number : null });
    writeState(state);
    renderSquad();
    renderStats();
    $("#ai-player-count").value = String(state.squad.players.length);
  });

  $("#btn-add-coach").addEventListener("click", () => {
    const name = prompt("Namn på tränare/ledare?");
    if (!name) return;
    state.squad.coaches.push({ id: uid(), name: name.trim() });
    writeState(state);
    renderSquad();
  });
}

function wireGoalies() {
  $("#btn-refresh-goalies").addEventListener("click", renderGoalieStats);
}

function wireMatch() {
  $("#btn-pick-pool").addEventListener("click", pickPoolForMatch);

  $("#btn-start-stop").addEventListener("click", () => {
    const pool = getActivePool();
    if (!pool) { alert("Välj ett poolspel först."); return; }

    if (state.match.running) {
      stopTimer();
      logMatch("Stop");
    } else {
      startTimer();
      logMatch("Start");
    }
    renderMatch();
  });

  $("#btn-period").addEventListener("click", () => {
    const pool = getActivePool();
    if (!pool) { alert("Välj ett poolspel först."); return; }
    newPeriod();
  });

  $("#btn-line-change").addEventListener("click", () => {
    const pool = getActivePool();
    if (!pool) { alert("Välj ett poolspel först."); return; }
    lineChange();
  });

  $("#btn-reset-match").addEventListener("click", resetMatch);

  $("#btn-export-match").addEventListener("click", () => {
    const pool = getActivePool();
    if (!pool) { alert("Välj ett poolspel först."); return; }
    exportMatchLog();
  });
}

function wireAI() {
  $("#btn-ai-generate").addEventListener("click", () => {
    const pc = Number($("#ai-player-count").value);
    const lines = Number($("#ai-lines").value);
    if (!Number.isFinite(pc) || pc <= 0) return;
    if (!Number.isFinite(lines) || lines <= 0) return;
    const text = generateAISchedule(pc, lines);
    $("#ai-output").textContent = text;
  });

  $("#btn-ai-copy").addEventListener("click", async () => {
    const text = $("#ai-output").textContent || "";
    if (!text.trim()) { alert("Generera först."); return; }
    try {
      await navigator.clipboard.writeText(text);
      alert("Kopierat!");
    } catch {
      alert("Kunde inte kopiera (iOS kan kräva långtryck/markera).");
    }
  });
}

function wireTeams() {
  $("#btn-teams-generate").addEventListener("click", () => {
    if (state.squad.players.length === 0) { alert("Lägg in spelare först."); return; }
    const teams = generateTeams3();
    $("#team-1").innerHTML = teams[0].map(n => `<div class="pill" style="margin-top:8px;">${escapeHtml(n)}</div>`).join("");
    $("#team-2").innerHTML = teams[1].map(n => `<div class="pill" style="margin-top:8px;">${escapeHtml(n)}</div>`).join("");
    $("#team-3").innerHTML = teams[2].map(n => `<div class="pill" style="margin-top:8px;">${escapeHtml(n)}</div>`).join("");
  });

  $("#btn-teams-copy").addEventListener("click", async () => {
    const t1 = $("#team-1").innerText.trim();
    const t2 = $("#team-2").innerText.trim();
    const t3 = $("#team-3").innerText.trim();
    if (!t1 && !t2 && !t3) { alert("Skapa lag först."); return; }
    const text = `Lag 1:\n${t1}\n\nLag 2:\n${t2}\n\nLag 3:\n${t3}\n`;
    try {
      await navigator.clipboard.writeText(text);
      alert("Kopierat!");
    } catch {
      alert("Kunde inte kopiera.");
    }
  });
}

function wireStats() {
  $("#btn-refresh-stats").addEventListener("click", renderStats);
}

function wireBackup() {
  $("#btn-export").addEventListener("click", exportBackup);
  $("#file-import").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await importBackup(file);
    e.target.value = "";
  });
  $("#btn-reset-all").addEventListener("click", resetAll);
}

/* ---------------- SW ---------------- */
async function registerSW() {
  if (!("serviceWorker" in navigator)) return;
  try { await navigator.serviceWorker.register("sw.js"); } catch {}
}

/* ---------------- BOOT ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  wireNav();
  wireHome();
  wireCreateDialog();
  wireSquad();
  wireGoalies();
  wireMatch();
  wireAI();
  wireTeams();
  wireStats();
  wireBackup();

  if (!state.match.activePoolId) {
    const last = localStorage.getItem(LAST_OPEN_POOL);
    if (last && state.pools.some(p => p.id === last)) {
      state.match.activePoolId = last;
      writeState(state);
    }
  }

  if (state.match.running) {
    state.match.running = false;
    state.match.startedAt = null;
    writeState(state);
  }

  renderAll();
  registerSW();
});
