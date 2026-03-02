/* NSK Lag App v77 */

const STORAGE_KEY = "nsklag_v77";
const LAST_OPEN_KEY = "nsklag_last_open_pool_id_v77";

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function todayISO() {
  const d = new Date();
  const tzOff = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOff).toISOString().slice(0, 10);
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
  const existing = readState();
  if (existing) return existing;

  const init = {
    version: "v77",
    createdAt: Date.now(),
    squad: {
      players: [
        // tomt som default, men lämnar exempelstruktur
        // { id, name, number }
      ],
      coaches: [
        // { id, name }
      ],
    },
    pools: [
      // { id, name, date, createdAt, goalieMatches: [{playerName, matches}] }
    ],
  };
  writeState(init);
  return init;
}

let state = ensureState();

/* ---------- DOM helpers ---------- */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function show(id) {
  $$(".view").forEach(v => v.classList.remove("active"));
  const el = $(`#view-${id}`);
  if (el) el.classList.add("active");
}

function navTo(id) {
  show(id);
  // Liten “hash” för återladdning
  location.hash = id;
}

/* ---------- Rendering ---------- */
function renderPools() {
  const list = $("#pools-list");
  const empty = $("#pools-empty");
  list.innerHTML = "";

  const pools = [...state.pools].sort((a,b) => (b.createdAt||0) - (a.createdAt||0));
  empty.hidden = pools.length !== 0;

  for (const pool of pools) {
    const li = document.createElement("li");
    li.className = "item";

    const left = document.createElement("div");
    const title = document.createElement("div");
    title.className = "item-title";
    title.textContent = pool.name;

    const meta = document.createElement("div");
    meta.className = "item-meta";
    meta.textContent = `${pool.date || "—"} • ${pool.goalieMatches?.reduce((s,x)=>s+(x.matches||0),0) || 0} målvaktsmatcher`;

    left.appendChild(title);
    left.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "item-actions";

    const openBtn = document.createElement("button");
    openBtn.className = "btn btn-ghost";
    openBtn.textContent = "Öppna";
    openBtn.addEventListener("click", () => {
      localStorage.setItem(LAST_OPEN_KEY, pool.id);
      // här kan du koppla in din befintliga "öppna poolspel" logik
      alert(`Öppnar: ${pool.name}\n\n(Koppla in befintlig poolspelsvy här om du har den.)`);
    });

    const editBtn = document.createElement("button");
    editBtn.className = "btn btn-ghost";
    editBtn.textContent = "Redigera målvakter";
    editBtn.addEventListener("click", () => editPoolGoalies(pool.id));

    const delBtn = document.createElement("button");
    delBtn.className = "btn btn-danger";
    delBtn.textContent = "Radera";
    delBtn.addEventListener("click", () => {
      if (!confirm(`Radera poolspel "${pool.name}"?`)) return;
      state.pools = state.pools.filter(p => p.id !== pool.id);
      writeState(state);
      renderPools();
      renderGoalieStats();
    });

    actions.appendChild(openBtn);
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    li.appendChild(left);
    li.appendChild(actions);
    list.appendChild(li);
  }
}

function renderSquad() {
  const playersList = $("#players-list");
  const coachesList = $("#coaches-list");
  playersList.innerHTML = "";
  coachesList.innerHTML = "";

  const players = [...state.squad.players].sort((a,b)=> (a.number||999) - (b.number||999) || a.name.localeCompare(b.name));
  for (const p of players) {
    const li = document.createElement("li");
    li.className = "item";
    li.tabIndex = 0;

    const left = document.createElement("div");
    const title = document.createElement("div");
    title.className = "item-title";
    title.textContent = p.number != null && p.number !== "" ? `${p.name} (#${p.number})` : p.name;

    const meta = document.createElement("div");
    meta.className = "item-meta";
    meta.textContent = "Spelare";

    left.appendChild(title);
    left.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "item-actions";
    const edit = document.createElement("button");
    edit.className = "btn btn-ghost";
    edit.textContent = "Redigera";
    edit.addEventListener("click", () => openPersonDialog("player", p.id));
    actions.appendChild(edit);

    li.addEventListener("click", (e)=> {
      if (e.target.tagName.toLowerCase() === "button") return;
      openPersonDialog("player", p.id);
    });

    li.appendChild(left);
    li.appendChild(actions);
    playersList.appendChild(li);
  }

  const coaches = [...state.squad.coaches].sort((a,b)=>a.name.localeCompare(b.name));
  for (const c of coaches) {
    const li = document.createElement("li");
    li.className = "item";
    li.tabIndex = 0;

    const left = document.createElement("div");
    const title = document.createElement("div");
    title.className = "item-title";
    title.textContent = c.name;

    const meta = document.createElement("div");
    meta.className = "item-meta";
    meta.textContent = "Tränare/Ledare";

    left.appendChild(title);
    left.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "item-actions";
    const edit = document.createElement("button");
    edit.className = "btn btn-ghost";
    edit.textContent = "Redigera";
    edit.addEventListener("click", () => openPersonDialog("coach", c.id));
    actions.appendChild(edit);

    li.addEventListener("click", (e)=> {
      if (e.target.tagName.toLowerCase() === "button") return;
      openPersonDialog("coach", c.id);
    });

    li.appendChild(left);
    li.appendChild(actions);
    coachesList.appendChild(li);
  }
}

function computeGoalieStats() {
  const pools = state.pools || [];
  const perPlayer = new Map(); // name -> matches
  let totalMatches = 0;

  for (const pool of pools) {
    const gm = pool.goalieMatches || [];
    for (const row of gm) {
      const name = (row.playerName || "").trim();
      const matches = Number(row.matches || 0);
      if (!name || !Number.isFinite(matches) || matches <= 0) continue;
      totalMatches += matches;
      perPlayer.set(name, (perPlayer.get(name) || 0) + matches);
    }
  }

  const summary = Array.from(perPlayer.entries())
    .map(([name, matches]) => ({ name, matches }))
    .sort((a,b)=> b.matches - a.matches || a.name.localeCompare(b.name));

  return {
    poolsCount: pools.length,
    totalMatches,
    uniqueGoalies: summary.length,
    summary,
    pools: [...pools].sort((a,b)=> (b.createdAt||0) - (a.createdAt||0)),
  };
}

function renderGoalieStats() {
  const stats = computeGoalieStats();

  $("#stat-total-pools").textContent = String(stats.poolsCount);
  $("#stat-total-goalie-matches").textContent = String(stats.totalMatches);
  $("#stat-unique-goalies").textContent = String(stats.uniqueGoalies);

  const poolsList = $("#goalie-pools-list");
  poolsList.innerHTML = "";
  for (const pool of stats.pools) {
    const li = document.createElement("li");
    li.className = "item";

    const left = document.createElement("div");
    const title = document.createElement("div");
    title.className = "item-title";
    title.textContent = pool.name;

    const sum = (pool.goalieMatches || []).reduce((s,x)=> s + (Number(x.matches)||0), 0);
    const meta = document.createElement("div");
    meta.className = "item-meta";
    meta.textContent = `${pool.date || "—"} • ${sum} målvaktsmatcher`;

    left.appendChild(title);
    left.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "item-actions";

    const edit = document.createElement("button");
    edit.className = "btn btn-ghost";
    edit.textContent = "Redigera";
    edit.addEventListener("click", () => editPoolGoalies(pool.id));
    actions.appendChild(edit);

    li.appendChild(left);
    li.appendChild(actions);
    poolsList.appendChild(li);
  }

  const summaryList = $("#goalie-summary-list");
  summaryList.innerHTML = "";
  if (stats.summary.length === 0) {
    const li = document.createElement("li");
    li.className = "item";
    li.innerHTML = `<div><div class="item-title">Ingen data ännu</div><div class="item-meta">Lägg till målvaktsmatcher i ett poolspel.</div></div>`;
    summaryList.appendChild(li);
  } else {
    for (const row of stats.summary) {
      const li = document.createElement("li");
      li.className = "item";

      const left = document.createElement("div");
      const title = document.createElement("div");
      title.className = "item-title";
      title.textContent = row.name;

      const meta = document.createElement("div");
      meta.className = "item-meta";
      meta.textContent = `${row.matches} matcher som målvakt`;

      left.appendChild(title);
      left.appendChild(meta);
      li.appendChild(left);
      summaryList.appendChild(li);
    }
  }
}

/* ---------- Pool creation & goalie edit ---------- */
function openCreateDialog() {
  const dlg = $("#dlg-create");
  $("#pool-name").value = "";
  $("#pool-date").value = todayISO();
  $("#pool-goalies-raw").value = "";
  dlg.showModal();
}

function parseGoaliesRaw(raw) {
  // Expect lines: "Name 2" or "Name:2"
  const lines = (raw || "").split("\n").map(s=>s.trim()).filter(Boolean);
  const res = [];
  for (const line of lines) {
    const m = line.match(/^(.+?)[\s:]+(\d+)$/);
    if (!m) continue;
    const playerName = m[1].trim();
    const matches = Number(m[2]);
    if (!playerName || !Number.isFinite(matches) || matches <= 0) continue;
    res.push({ playerName, matches });
  }
  return res;
}

function savePoolFromDialog() {
  const name = $("#pool-name").value.trim();
  const date = $("#pool-date").value;
  if (!name) return;

  const goaliesRaw = $("#pool-goalies-raw").value;
  const goalieMatches = parseGoaliesRaw(goaliesRaw);

  const pool = {
    id: uid(),
    name,
    date,
    createdAt: Date.now(),
    goalieMatches,
  };

  state.pools.push(pool);
  writeState(state);
  renderPools();
  renderGoalieStats();
}

function editPoolGoalies(poolId) {
  const pool = state.pools.find(p=>p.id === poolId);
  if (!pool) return;

  const current = (pool.goalieMatches || [])
    .map(x => `${x.playerName} ${x.matches}`)
    .join("\n");

  const raw = prompt(
    `Redigera målvaktsmatcher för:\n${pool.name}\n\nSkriv en rad per spelare: "Namn antal"\nEx: Alex 2`,
    current
  );

  if (raw === null) return; // cancel

  pool.goalieMatches = parseGoaliesRaw(raw);
  writeState(state);
  renderPools();
  renderGoalieStats();
}

/* ---------- Squad person dialog ---------- */
function openPersonDialog(type, id) {
  const dlg = $("#dlg-person");
  $("#person-type").value = type;
  $("#person-id").value = id;

  const isPlayer = type === "player";
  $("#person-number-wrap").style.display = isPlayer ? "" : "none";

  let person;
  if (type === "player") person = state.squad.players.find(x=>x.id===id);
  if (type === "coach") person = state.squad.coaches.find(x=>x.id===id);

  if (!person) return;

  $("#person-title").textContent = isPlayer ? "Redigera spelare" : "Redigera tränare/ledare";
  $("#person-name").value = person.name || "";
  $("#person-number").value = person.number ?? "";

  dlg.showModal();
}

function savePersonFromDialog() {
  const type = $("#person-type").value;
  const id = $("#person-id").value;

  const name = $("#person-name").value.trim();
  if (!name) return;

  if (type === "player") {
    const p = state.squad.players.find(x=>x.id===id);
    if (!p) return;
    const numRaw = $("#person-number").value;
    p.name = name;
    p.number = numRaw === "" ? null : Number(numRaw);
  } else if (type === "coach") {
    const c = state.squad.coaches.find(x=>x.id===id);
    if (!c) return;
    c.name = name;
  }

  writeState(state);
  renderSquad();
}

function deletePersonFromDialog() {
  const type = $("#person-type").value;
  const id = $("#person-id").value;

  if (type === "player") {
    const p = state.squad.players.find(x=>x.id===id);
    if (!p) return;
    if (!confirm(`Radera spelare "${p.name}"?`)) return;
    state.squad.players = state.squad.players.filter(x=>x.id!==id);
  } else if (type === "coach") {
    const c = state.squad.coaches.find(x=>x.id===id);
    if (!c) return;
    if (!confirm(`Radera "${c.name}"?`)) return;
    state.squad.coaches = state.squad.coaches.filter(x=>x.id!==id);
  }

  writeState(state);
  renderSquad();
}

/* ---------- Backup ---------- */
function exportBackup() {
  const payload = {
    version: state.version,
    exportedAt: new Date().toISOString(),
    data: state,
  };
  const json = JSON.stringify(payload, null, 2);

  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `nsklag-backup-v77-${todayISO()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  $("#backup-preview").hidden = false;
  $("#backup-preview").textContent = json.slice(0, 4000) + (json.length > 4000 ? "\n… (trunkerat i preview)" : "");
}

async function importBackup(file) {
  const text = await file.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    alert("Kunde inte läsa JSON.");
    return;
  }
  const data = payload?.data;
  if (!data || !data.pools || !data.squad) {
    alert("Backupformatet känns inte igen.");
    return;
  }
  state = data;
  writeState(state);
  renderAll();
  alert("Backup importerad.");
}

function resetAll() {
  if (!confirm("Återställ allt? Detta raderar poolspel och trupp.")) return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LAST_OPEN_KEY);
  state = ensureState();
  renderAll();
}

/* ---------- Demo ---------- */
function seedDemoIfEmpty() {
  if ((state.pools || []).length > 0) return;

  const demo = {
    id: uid(),
    name: "Demo: Träning poolspel",
    date: todayISO(),
    createdAt: Date.now(),
    goalieMatches: [
      { playerName: "Alex", matches: 2 },
      { playerName: "Sam", matches: 1 },
    ],
  };
  state.pools.push(demo);

  if (state.squad.players.length === 0) {
    state.squad.players.push(
      { id: uid(), name: "Alex", number: 1 },
      { id: uid(), name: "Sam", number: 12 },
      { id: uid(), name: "Kim", number: 7 }
    );
  }
  if (state.squad.coaches.length === 0) {
    state.squad.coaches.push(
      { id: uid(), name: "Coach A" }
    );
  }

  writeState(state);
  renderAll();
}

/* ---------- Render all ---------- */
function renderAll() {
  renderPools();
  renderSquad();
  renderGoalieStats();
}

/* ---------- Event wiring ---------- */
function wireNav() {
  $$("[data-nav]").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-nav");
      navTo(target);
      if (target === "squad") renderSquad();
      if (target === "goalies") renderGoalieStats();
    });
  });

  // initial route from hash
  const h = (location.hash || "").replace("#", "").trim();
  if (h) show(h);
}

function wireHome() {
  $("#btn-create-pool").addEventListener("click", openCreateDialog);
  $("#btn-clear-pools").addEventListener("click", () => {
    if (!confirm("Rensa alla poolspel?")) return;
    state.pools = [];
    writeState(state);
    renderPools();
    renderGoalieStats();
  });
  $("#btn-import-demo").addEventListener("click", seedDemoIfEmpty);
}

function wireDialogs() {
  const dlgCreate = $("#dlg-create");
  $("#btn-save-pool").addEventListener("click", (e) => {
    // allow form validation
    const name = $("#pool-name").value.trim();
    if (!name) { e.preventDefault(); return; }
    savePoolFromDialog();
    dlgCreate.close();
  });

  const dlgPerson = $("#dlg-person");
  $("#btn-save-person").addEventListener("click", (e) => {
    const name = $("#person-name").value.trim();
    if (!name) { e.preventDefault(); return; }
    savePersonFromDialog();
    dlgPerson.close();
  });
  $("#btn-delete-person").addEventListener("click", (e) => {
    e.preventDefault();
    deletePersonFromDialog();
    dlgPerson.close();
  });
}

function wireSquadButtons() {
  $("#btn-add-player").addEventListener("click", () => {
    const name = prompt("Namn på spelare?");
    if (!name) return;
    const numRaw = prompt("Nummer? (valfritt)");
    const number = numRaw === null || numRaw.trim() === "" ? null : Number(numRaw);
    state.squad.players.push({ id: uid(), name: name.trim(), number: Number.isFinite(number) ? number : null });
    writeState(state);
    renderSquad();
  });

  $("#btn-add-coach").addEventListener("click", () => {
    const name = prompt("Namn på tränare/ledare?");
    if (!name) return;
    state.squad.coaches.push({ id: uid(), name: name.trim() });
    writeState(state);
    renderSquad();
  });
}

function wireGoalieButtons() {
  $("#btn-recalc-goalies").addEventListener("click", renderGoalieStats);
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

/* ---------- Service worker ---------- */
async function registerSW() {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("sw.js");
  } catch {
    // ignore
  }
}

/* ---------- Boot ---------- */
document.addEventListener("DOMContentLoaded", () => {
  // set default date in dialog
  const dateInput = $("#pool-date");
  if (dateInput) dateInput.value = todayISO();

  wireNav();
  wireHome();
  wireDialogs();
  wireSquadButtons();
  wireGoalieButtons();
  wireBackup();

  renderAll();
  registerSW();
});