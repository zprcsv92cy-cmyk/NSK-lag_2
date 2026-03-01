// app.js
const STORAGE_KEY = "nsklag:data:v1";

const DEFAULTS = {
  teams: ["Lag 1", "Lag 2", "Lag 3"],
  players: [
    "Agnes Danielsson","Alma Andersson","Ella Berg","Elsa Johansson","Ida Karlsson",
    "Julia Nilsson","Maja Eriksson","Nora Svensson","Olivia Lind","Sofia Persson"
  ],
  coaches: ["Coach 1", "Coach 2"],
  data: {} // teamId -> matchId -> matchState
};

function mergeUnique(a, b){
  const out = [];
  const seen = new Set();
  const push = (x)=>{
    const v = String(x||"").trim();
    if (!v) return;
    const k = v.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    out.push(v);
  };
  (a||[]).forEach(push);
  (b||[]).forEach(push);
  return out;
}

function loadAll() {
  // 1) load current app state
  let state = structuredClone(DEFAULTS);
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw){
      const parsed = JSON.parse(raw);
      state = { ...structuredClone(DEFAULTS), ...parsed };
    }
  } catch {
    state = structuredClone(DEFAULTS);
  }

  // 2) migrate legacy keys (keep players/coaches)
  try{
    const legacyPlayers = JSON.parse(localStorage.getItem("nsk_players") || "[]");
    if (Array.isArray(legacyPlayers)) state.players = mergeUnique(state.players, legacyPlayers);
  } catch {}
  try{
    const legacyCoaches = JSON.parse(localStorage.getItem("nsk_coaches") || "[]");
    if (Array.isArray(legacyCoaches)) state.coaches = mergeUnique(state.coaches, legacyCoaches);
  } catch {}
  try{
    const legacyPlayers2 = JSON.parse(localStorage.getItem("players") || "[]");
    if (Array.isArray(legacyPlayers2)) state.players = mergeUnique(state.players, legacyPlayers2);
  } catch {}
  try{
    const legacyCoaches2 = JSON.parse(localStorage.getItem("coaches") || "[]");
    if (Array.isArray(legacyCoaches2)) state.coaches = mergeUnique(state.coaches, legacyCoaches2);
  } catch {}

  // 3) stamp schema + version
  state.schemaVersion = 1;
  state.appVersion = "v71";
  return state;
}

function saveAll(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let app = loadAll();

function $(sel, root=document) { return root.querySelector(sel); }
function $all(sel, root=document) { return [...root.querySelectorAll(sel)]; }

function getContext() {
  const team = $("#teamSelect").value;
  const match = $("#matchSelect").value;
  return { team, match };
}

function ensureMatchState(team, match) {
  app.data[team] ??= {};
  app.data[team][match] ??= {
    matchInfo: {
      date: "", startTime: "", opponent: "", field: "",
      squadSize: 0, onField: 0, periods: 0, periodMinutes: 0, swapSeconds: 0
    },
    selectedPlayers: [],
    goalie: "",
    coach: ""
  };
  return app.data[team][match];
}

function renderTeamAndMatchSelectors() {
  const teamSel = $("#teamSelect");
  teamSel.innerHTML = app.teams.map(t => `<option value="${t}">${t}</option>`).join("");

  const matchSel = $("#matchSelect");
  // enkelt: 1..10 matcher
  matchSel.innerHTML = Array.from({length: 10}, (_,i)=>i+1)
    .map(n => `<option value="Match ${n}">Match ${n}</option>`).join("");
}

function renderRegisterLists() {
  const playerList = $("#playersList");
  playerList.innerHTML = app.players
    .slice().sort((a,b)=>a.localeCompare(b,"sv"))
    .map(p => `<option value="${p}"></option>`).join("");

  const coachList = $("#coachesList");
  coachList.innerHTML = app.coaches
    .slice().sort((a,b)=>a.localeCompare(b,"sv"))
    .map(c => `<option value="${c}"></option>`).join("");
}

function bindViewTabs() {
  $all("[data-view]").forEach(btn => {
    btn.addEventListener("click", () => setView(btn.dataset.view));
  });
}

function setView(id) {
  $all(".view").forEach(v => v.classList.toggle("active", v.id === id));
  $all("[data-view]").forEach(b => b.classList.toggle("active", b.dataset.view === id));
}

function bindContextChange() {
  $("#teamSelect").addEventListener("change", () => loadContextIntoUI());
  $("#matchSelect").addEventListener("change", () => loadContextIntoUI());
}

function loadContextIntoUI() {
  const { team, match } = getContext();
  const st = ensureMatchState(team, match);

  // Matchinfo inputs
  $("#date").value = st.matchInfo.date;
  $("#startTime").value = st.matchInfo.startTime;
  $("#opponent").value = st.matchInfo.opponent;
  $("#field").value = st.matchInfo.field;
  $("#squadSize").value = st.matchInfo.squadSize || "";
  $("#onField").value = st.matchInfo.onField || "";
  $("#periods").value = st.matchInfo.periods || "";
  $("#periodMinutes").value = st.matchInfo.periodMinutes || "";
  $("#swapSeconds").value = st.matchInfo.swapSeconds || "";

  // Laguppställning
  const select = $("#matchPlayers");
  select.innerHTML = app.players.map(p => `<option value="${p}">${p}</option>`).join("");
  // markera valda
  [...select.options].forEach(o => o.selected = st.selectedPlayers.includes(o.value));

  // goalie/coach
  $("#goalie").innerHTML = `<option value=""></option>` + app.players.map(p => `<option value="${p}">${p}</option>`).join("");
  $("#goalie").value = st.goalie || "";

  $("#coach").innerHTML = `<option value=""></option>` + app.coaches.map(c => `<option value="${c}">${c}</option>`).join("");
  $("#coach").value = st.coach || "";
}

function bindAutoSave() {
  // Matchinfo autosave
  const map = [
    ["#date","date"],["#startTime","startTime"],["#opponent","opponent"],["#field","field"],
    ["#squadSize","squadSize"],["#onField","onField"],["#periods","periods"],
    ["#periodMinutes","periodMinutes"],["#swapSeconds","swapSeconds"]
  ];
  map.forEach(([sel,key]) => {
    $(sel).addEventListener("input", () => {
      const {team,match} = getContext();
      const st = ensureMatchState(team,match);
      const val = $(sel).value;
      st.matchInfo[key] = (["squadSize","onField","periods","periodMinutes","swapSeconds"].includes(key))
        ? Number(val || 0)
        : val;
      saveAll(app);
    });
  });

  $("#matchPlayers").addEventListener("change", () => {
    const {team,match} = getContext();
    const st = ensureMatchState(team,match);
    st.selectedPlayers = [...$("#matchPlayers").selectedOptions].map(o=>o.value);
    saveAll(app);
  });

  $("#goalie").addEventListener("change", () => {
    const {team,match} = getContext();
    const st = ensureMatchState(team,match);
    st.goalie = $("#goalie").value;
    saveAll(app);
  });

  $("#coach").addEventListener("change", () => {
    const {team,match} = getContext();
    const st = ensureMatchState(team,match);
    st.coach = $("#coach").value;
    saveAll(app);
  });
}

function bindRegisterModal() {
  $("#openRegister").addEventListener("click", () => $("#registerModal").showModal());
  $("#closeRegister").addEventListener("click", () => $("#registerModal").close());

  $("#addPlayer").addEventListener("click", () => {
    const v = $("#playerInput").value.trim();
    if (!v) return;
    if (!app.players.includes(v)) app.players.push(v);
    $("#playerInput").value = "";
    saveAll(app);
    renderRegisterLists();
    loadContextIntoUI();
  });

  $("#addCoach").addEventListener("click", () => {
    const v = $("#coachInput").value.trim();
    if (!v) return;
    if (!app.coaches.includes(v)) app.coaches.push(v);
    $("#coachInput").value = "";
    saveAll(app);
    renderRegisterLists();
    loadContextIntoUI();
  });

  $("#exportJson").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(app, null, 2)], {type:"application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "nsk-lag-backup.json";
    a.click();
    URL.revokeObjectURL(a.href);
  });

  $("#importFile").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const txt = await file.text();
    app = JSON.parse(txt);
    saveAll(app);
    renderTeamAndMatchSelectors();
    renderRegisterLists();
    loadContextIntoUI();
    e.target.value = "";
  });

  $("#resetMatch").addEventListener("click", () => {
    const {team,match} = getContext();
    if (app.data?.[team]?.[match]) {
      delete app.data[team][match];
      saveAll(app);
      loadContextIntoUI();
    }
  });
}

function registerSW() {
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker.register("./sw.js").then((reg) => {
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (window.__reloading) return;
      window.__reloading = true;
      window.location.reload();
    });
    try { reg.update(); } catch {}
  }).catch(()=>{});
}



/**
 * Backup/export (stabilitet)
 * - Exporterar hela appens state (inkl. lag/matcher)
 * - Inkluderar även legacy roster-keys om de finns
 */
function exportJSON(){
  try{
    const payload = {
      exportedAt: new Date().toISOString(),
      appVersion: "v71",
      schemaVersion: 1,
      storageKey: STORAGE_KEY,
      state: app,
      legacy: {
        nsk_players: (()=>{ try{ return JSON.parse(localStorage.getItem("nsk_players")||"[]"); }catch{return null;} })(),
        nsk_coaches: (()=>{ try{ return JSON.parse(localStorage.getItem("nsk_coaches")||"[]"); }catch{return null;} })()
      }
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nsklag-backup-v71.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    const msg = document.getElementById("importMsg");
    if (msg) msg.innerHTML = "<span class='ok'>✔ Export klar</span>";
  } catch(e){
    alert("Export misslyckades");
  }
}

/**
 * Återställ UI (utan att radera data)
 */
function resetUI(){
  try{ sessionStorage.clear(); } catch {}
  try{ setView("view-matchinfo"); window.scrollTo(0,0); } catch {}
}

window.exportJSON = exportJSON;
window.resetUI = resetUI;

document.addEventListener("DOMContentLoaded", () => {
  renderTeamAndMatchSelectors();
  renderRegisterLists();
  bindViewTabs();
  bindContextChange();
  bindAutoSave();
  bindRegisterModal();
  loadContextIntoUI();
  setView("view-matchinfo");
  registerSW();
});


// ----------------------------
// Matchläge (låst matchskärm + superstor "Nästa byte")
// ----------------------------
let __mm = { open:false, shiftTimes:[], lineups:[], index:0, key:"" };

function mmProgressKey(){
  // progress tied to current team+match selection
  try { return "nsk_mm_progress:" + stateKey(); } catch { return "nsk_mm_progress:fallback"; }
}

function openMatchMode(){
  try{
    // ensure current state saved
    try { saveState(); } catch {}
    const teamNo = document.getElementById("teamSelect").value || "1";
    const matchNo = document.getElementById("matchNo").value || "1";
    const st = loadStateFor(teamNo, matchNo);

    const periodsCount = Math.min(3, Math.max(1, parseInt(st.periodsCount, 10) || 1));
    const periodMin = parseInt(st.periodMin, 10) || 15;
    const shiftSec = parseInt(st.shiftSec, 10) || 90;
    const totalMinutes = periodMin * periodsCount;

    const shiftTimes = buildShiftTimes(totalMinutes, shiftSec);
    const globalCounts = {}; // per match
    const lineups = makeLineupsForMatch(st, globalCounts, shiftTimes);

    __mm.shiftTimes = shiftTimes;
    __mm.lineups = lineups;
    __mm.key = mmProgressKey();

    // restore progress
    const saved = localStorage.getItem(__mm.key);
    const idx = saved ? parseInt(saved, 10) : 0;
    __mm.index = (Number.isFinite(idx) && idx >= 0) ? Math.min(idx, shiftTimes.length) : 0;

    const meta = document.getElementById("mmMeta");
    if (meta){
      const opp = st.opponent || "—";
      const date = st.matchDate || "—";
      const time = st.matchTime || "—";
      const arena = "Plan " + (st.arena || "—");
      meta.innerHTML = `Lag ${escapeHtml(teamNo)} • Match ${escapeHtml(matchNo)} • ${escapeHtml(date)} ${escapeHtml(time)} • ${escapeHtml(opp)} • ${escapeHtml(arena)}`;
    }

    document.getElementById("matchModeOverlay").style.display = "flex";
    document.body.classList.add("mm-open");

    renderMatchModeTable();
    updateMatchModeNowNext();

    // wake lock (best effort)
    requestWakeLock();
  } catch(e){
    alert("Matchläge kunde inte starta (fel i data).");
  }
}

function closeMatchMode(){
  document.getElementById("matchModeOverlay").style.display = "none";
  document.body.classList.remove("mm-open");
  __mm.open = false;
  releaseWakeLock();
}

function renderMatchModeTable(){
  const tb = document.getElementById("mmTableBody");
  if (!tb) return;
  tb.innerHTML = __mm.shiftTimes.map((t,i)=>{
    const names = lineupToShortText(__mm.lineups[i] || []);
    const cls = (i < __mm.index) ? "mm-row-done" : (i === __mm.index ? "mm-row-current" : "");
    return `<tr class="${cls}"><td>${i+1}</td><td class="nowrap">${escapeHtml(t)}</td><td>${escapeHtml(names)}</td></tr>`;
  }).join("");
}

function updateMatchModeNowNext(){
  const nowEl = document.getElementById("mmNow");
  const nextEl = document.getElementById("mmNext");
  const i = __mm.index;

  const nowNames = (i < __mm.lineups.length) ? lineupToShortText(__mm.lineups[i] || []) : "—";
  const nextNames = (i+1 < __mm.lineups.length) ? lineupToShortText(__mm.lineups[i+1] || []) : "—";

  if (nowEl) nowEl.textContent = nowNames || "—";
  if (nextEl) nextEl.textContent = nextNames || "—";

  const btn = document.getElementById("mmNextBtn");
  if (btn){
    if (i >= __mm.shiftTimes.length){
      btn.textContent = "Klar";
      btn.disabled = true;
    } else {
      btn.textContent = "Nästa byte";
      btn.disabled = false;
    }
  }
}

function markNextShift(){
  const max = __mm.shiftTimes.length;
  __mm.index = Math.min(__mm.index + 1, max);
  try{ localStorage.setItem(__mm.key, String(__mm.index)); } catch {}
  renderMatchModeTable();
  updateMatchModeNowNext();
}

// Wake Lock (best effort)
let __wakeLock = null;
async function requestWakeLock(){
  try{
    if ('wakeLock' in navigator && navigator.wakeLock){
      __wakeLock = await navigator.wakeLock.request('screen');
      __wakeLock.addEventListener('release', ()=>{});
    }
  } catch {}
}
async function releaseWakeLock(){
  try{ if (__wakeLock){ await __wakeLock.release(); } } catch {}
  __wakeLock = null;
}

// expose to inline onclick
window.openMatchMode = openMatchMode;
window.closeMatchMode = closeMatchMode;
window.markNextShift = markNextShift;
