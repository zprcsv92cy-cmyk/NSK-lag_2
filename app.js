'use strict';

const APP_VERSION = 'v63';

// ----------------------------
// Utils
// ----------------------------
const $ = (id) => document.getElementById(id);

function escapeHtml(s){
  return String(s ?? '').replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}
function safeParseJSON(raw, fallback){
  try { return JSON.parse(raw); } catch { return fallback; }
}
function uniq(arr){
  const out = [];
  const seen = new Set();
  for (const x of (arr||[])){
    const v = String(x||'').trim();
    if (!v) continue;
    const k = v.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out;
}
function shortName(full){
  const parts = String(full||"").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const last = parts[parts.length - 1];
  const initial = last ? last[0].toUpperCase() : "";
  return initial ? `${first} ${initial}` : first;
}
function setPill(text){
  const pill = $("saveState");
  if (!pill) return;
  pill.textContent = text;
}

// ----------------------------
// Storage model
// ----------------------------
const LS_PLAYERS = "nsk_players";
const LS_COACHES = "nsk_coaches";
const LS_POOLS   = "nsk_pools:v1";
const LS_CURRENT_POOL = "nsk_current_pool:v1";

function getCurrentPoolId(){
  return localStorage.getItem(LS_CURRENT_POOL) || "";
}
function setCurrentPoolId(id){
  localStorage.setItem(LS_CURRENT_POOL, id || "");
  updateCurrentPoolLabel();
}
function poolKeyPrefix(poolId){
  return `nsk_pool_${poolId}_`;
}
function poolStateKey(poolId, team, match){
  return `${poolKeyPrefix(poolId)}state_team_${team}_match_${match}`;
}
function poolMatchCountKey(poolId, team){
  return `${poolKeyPrefix(poolId)}matchCount_team_${team}`;
}
function poolProgressKey(poolId, team, match){
  return `${poolKeyPrefix(poolId)}progress_team_${team}_match_${match}`;
}

// ----------------------------
// Default roster
// ----------------------------
const DEFAULT_PLAYERS = [
  "Agnes Danielsson","Albert Zillén","Albin Andersson","Aron Warensjö-Sommar","August Hasselberg",
  "Benjamin Linderström","Charlie Carman","Emil Tranborg","Enzo Olsson","Gunnar Englund","Henry Gauffin",
  "Linus Stolt","Melker Axbom","Måns Åkvist","Nelson Östergren","Nicky Selander","Nikola Kosoderc",
  "Noé Bonnafous Sand","Oliver Engström","Oliver Zoumblios","Pelle Åstrand","Simon Misiorny","Sixten Bratt",
  "Theo Ydrenius","Viggo Kronvall","Yuktha reddy Semberi"
];
const DEFAULT_COACHES = [
  "Fredrik Selander","Joakim Lund","Linus Öhman","Niklas Gauffin",
  "Olle Åstrand","Peter Hasselberg","Tommy Englund","William Åkvist"
];

function loadRegister(){
  const p = safeParseJSON(localStorage.getItem(LS_PLAYERS) || "[]", []);
  const c = safeParseJSON(localStorage.getItem(LS_COACHES) || "[]", []);
  let players = uniq(p.concat(DEFAULT_PLAYERS)).sort((a,b)=>a.localeCompare(b,'sv'));
  let coaches = uniq(c.concat(DEFAULT_COACHES)).sort((a,b)=>a.localeCompare(b,'sv'));
  return {players, coaches};
}
function saveRegister(players, coaches){
  localStorage.setItem(LS_PLAYERS, JSON.stringify(uniq(players).sort((a,b)=>a.localeCompare(b,'sv'))));
  localStorage.setItem(LS_COACHES, JSON.stringify(uniq(coaches).sort((a,b)=>a.localeCompare(b,'sv'))));
}

// ----------------------------
// Pools
// ----------------------------
function loadPools(){
  const arr = safeParseJSON(localStorage.getItem(LS_POOLS) || "[]", []);
  return Array.isArray(arr) ? arr : [];
}
function savePools(arr){
  localStorage.setItem(LS_POOLS, JSON.stringify(arr||[]));
}
function genId(){
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}
function formatPoolTitle(p){
  return `${p?.date || "—"} · ${p?.place || "—"}`;
}
function updateCurrentPoolLabel(){
  const id = getCurrentPoolId();
  const pools = loadPools();
  const p = pools.find(x=>x.id===id);
  const t = p ? formatPoolTitle(p) : "—";
  const label = $("currentPoolLabel");
  if (label) label.textContent = t;
}

function createPool(){
  const today = new Date();
  const yyyy = String(today.getFullYear());
  const mm = String(today.getMonth()+1).padStart(2,'0');
  const dd = String(today.getDate()).padStart(2,'0');
  const defaultDate = `${yyyy}-${mm}-${dd}`;

  const date = prompt("Datum (YYYY-MM-DD):", defaultDate);
  if (date == null) return;
  const place = prompt("Plats:", "");
  if (place == null) return;

  const pools = loadPools();
  const id = genId();
  const now = Date.now();
  pools.push({ id, date:String(date).trim(), place:String(place).trim(), createdAt: now, updatedAt: now });
  savePools(pools);
  setCurrentPoolId(id);
  renderPoolLists();
  go('#poolspel');
}

function editPool(id){
  const pools = loadPools();
  const p = pools.find(x=>x.id===id);
  if (!p) return;
  const date = prompt("Datum (YYYY-MM-DD):", p.date || "");
  if (date == null) return;
  const place = prompt("Plats:", p.place || "");
  if (place == null) return;
  p.date = String(date).trim();
  p.place = String(place).trim();
  p.updatedAt = Date.now();
  savePools(pools);
  renderPoolLists();
  updateCurrentPoolLabel();
}

function deletePool(id){
  if (!confirm("Ta bort detta poolspel?")) return;
  const pools = loadPools().filter(x=>x.id!==id);
  savePools(pools);
  if (getCurrentPoolId() === id) setCurrentPoolId("");
  renderPoolLists();
}

// ----------------------------
// Routing (hash)
// ----------------------------
function setActiveTab(hash){
  document.querySelectorAll(".topNav .tab").forEach(btn=>{
    const nav = btn.getAttribute("data-nav");
    btn.classList.toggle("active", nav === hash);
  });
}
function showView(name){
  const s = $("view-startsida");
  const p = $("view-poolspel");
  if (s) s.classList.toggle("hidden", name !== "startsida");
  if (p) p.classList.toggle("hidden", name !== "poolspel");
}
function go(hash){
  if (!hash) hash = "#startsida";
  if (location.hash !== hash) location.hash = hash;
  applyRoute();
}
function applyRoute(){
  const h = (location.hash || "#startsida").toLowerCase();
  if (h === "#trupp"){
    showView("startsida");
    setActiveTab("#trupp");
    openTrupp();
    return;
  }
  if (h === "#poolspel"){
    showView("poolspel");
    setActiveTab("#poolspel");
    ensurePoolSelected();
    initPoolspelUI();
    return;
  }
  showView("startsida");
  setActiveTab("#startsida");
  closeTrupp();
  renderPoolLists();
}

// ----------------------------
// Trupp overlay
// ----------------------------
let editing = { kind:null, idx:null };

function openTrupp(){
  const o = $("truppOverlay");
  if (!o) return;
  o.classList.remove("hidden");
  o.setAttribute("aria-hidden", "false");
  renderTruppLists();
}
function closeTrupp(){
  const o = $("truppOverlay");
  if (!o) return;
  o.classList.add("hidden");
  o.setAttribute("aria-hidden", "true");
  editing = {kind:null, idx:null};
  if (location.hash.toLowerCase()==="#trupp"){
    go("#startsida");
  }
}

function renderTruppLists(){
  const {players, coaches} = loadRegister();

  const pl = $("playerList");
  const cl = $("coachList");
  if (pl){
    pl.innerHTML = players.map((n,i)=>{
      const isEdit = editing.kind==="player" && editing.idx===i;
      if (isEdit){
        return `
          <div class="listItem">
            <input class="inlineEdit" data-kind="player" data-idx="${i}" value="${escapeHtml(n)}" />
            <div class="actions">
              <button class="btnPrimary" data-action="save-edit" data-kind="player" data-idx="${i}">Spara</button>
              <button class="btnSecondary" data-action="cancel-edit">Avbryt</button>
            </div>
          </div>
        `;
      }
      return `
        <div class="listItem">
          <div class="name">${escapeHtml(n)}</div>
          <div class="actions">
            <button class="btnSecondary" data-action="begin-edit" data-kind="player" data-idx="${i}">Redigera</button>
            <button class="btnSecondary" data-action="remove-player" data-idx="${i}">Ta bort</button>
          </div>
        </div>
      `;
    }).join("");
  }
  if (cl){
    cl.innerHTML = coaches.map((n,i)=>{
      const isEdit = editing.kind==="coach" && editing.idx===i;
      if (isEdit){
        return `
          <div class="listItem">
            <input class="inlineEdit" data-kind="coach" data-idx="${i}" value="${escapeHtml(n)}" />
            <div class="actions">
              <button class="btnPrimary" data-action="save-edit" data-kind="coach" data-idx="${i}">Spara</button>
              <button class="btnSecondary" data-action="cancel-edit">Avbryt</button>
            </div>
          </div>
        `;
      }
      return `
        <div class="listItem">
          <div class="name">${escapeHtml(n)}</div>
          <div class="actions">
            <button class="btnSecondary" data-action="begin-edit" data-kind="coach" data-idx="${i}">Redigera</button>
            <button class="btnSecondary" data-action="remove-coach" data-idx="${i}">Ta bort</button>
          </div>
        </div>
      `;
    }).join("");
  }
}

function addPlayer(){
  const inp = $("newPlayer");
  const name = String(inp?.value||"").trim();
  if (!name) return;
  const {players, coaches} = loadRegister();
  players.push(name);
  saveRegister(players, coaches);
  if (inp) inp.value = "";
  editing = {kind:null, idx:null};
  renderTruppLists();
  refreshDropdowns();
  renderAll();
}
function addCoach(){
  const inp = $("newCoach");
  const name = String(inp?.value||"").trim();
  if (!name) return;
  const {players, coaches} = loadRegister();
  coaches.push(name);
  saveRegister(players, coaches);
  if (inp) inp.value = "";
  editing = {kind:null, idx:null};
  renderTruppLists();
  refreshDropdowns();
  renderAll();
}
function removePlayer(idx){
  const {players, coaches} = loadRegister();
  players.splice(idx, 1);
  saveRegister(players, coaches);
  editing = {kind:null, idx:null};
  renderTruppLists();
  refreshDropdowns();
  renderAll();
}
function removeCoach(idx){
  const {players, coaches} = loadRegister();
  coaches.splice(idx, 1);
  saveRegister(players, coaches);
  editing = {kind:null, idx:null};
  renderTruppLists();
  refreshDropdowns();
  renderAll();
}
function beginEdit(kind, idx){
  editing = {kind, idx};
  renderTruppLists();
  setTimeout(()=>{
    const el = document.querySelector(`.inlineEdit[data-kind="${kind}"][data-idx="${idx}"]`);
    if (el) el.focus();
  }, 10);
}
function cancelEdit(){
  editing = {kind:null, idx:null};
  renderTruppLists();
}
function saveEdit(kind, idx, value){
  const name = String(value||"").trim();
  if (!name) return;
  const {players, coaches} = loadRegister();
  if (kind === "player"){
    if (idx>=0 && idx<players.length) players[idx] = name;
  } else {
    if (idx>=0 && idx<coaches.length) coaches[idx] = name;
  }
  saveRegister(players, coaches);
  editing = {kind:null, idx:null};
  renderTruppLists();
  refreshDropdowns();
  renderAll();
}

// ----------------------------
// Import / Export
// ----------------------------
function doImport(){
  const area = $("importArea");
  const msg = $("importMsg");
  const raw = String(area?.value || "").trim();
  if (!raw){
    if (msg) msg.textContent = "Klistra in JSON först.";
    return;
  }
  try{
    const data = JSON.parse(raw);

    if (Array.isArray(data.players) || Array.isArray(data.coaches)){
      saveRegister(Array.isArray(data.players)?data.players:[], Array.isArray(data.coaches)?data.coaches:[]);
    }
    if (Array.isArray(data.pools)){
      savePools(data.pools);
    }
    if (data.kv && typeof data.kv === "object"){
      for (const [k,v] of Object.entries(data.kv)){
        try{
          if (typeof v === "string") localStorage.setItem(k, v);
          else localStorage.setItem(k, JSON.stringify(v));
        } catch {}
      }
    }

    if (msg) msg.textContent = "✔ Import klar";
    refreshDropdowns();
    renderPoolLists();
    updateCurrentPoolLabel();
    initPoolspelUI();
    renderAll();
  }catch(e){
    if (msg) msg.textContent = "✖ Import misslyckades";
  }
}
function doExport(){
  const {players, coaches} = loadRegister();
  const pools = loadPools();
  const kv = {};
  for (let i=0; i<localStorage.length; i++){
    const k = localStorage.key(i);
    if (!k) continue;
    if (k.startsWith("nsk_pool_")){
      kv[k] = safeParseJSON(localStorage.getItem(k) || "null", localStorage.getItem(k));
    }
  }
  const payload = { players, coaches, pools, kv };
  const out = JSON.stringify(payload, null, 2);

  const area = $("exportArea");
  if (area){
    area.classList.remove("hidden");
    area.value = out;
    area.scrollTop = 0;
    area.focus();
  }
  const msg = $("importMsg");
  if (msg) msg.textContent = "✔ Export klar (kopiera texten)";
}

// ----------------------------
// Poolspel UI init
// ----------------------------
function ensurePoolSelected(){
  const pools = loadPools();
  if (!pools.length){
    showView("startsida");
    setActiveTab("#startsida");
    return;
  }
  const id = getCurrentPoolId();
  if (!id || !pools.find(p=>p.id===id)){
    setCurrentPoolId(pools[0].id);
  }
}

function renderPoolLists(){
  const wrap = $("poolListHome");
  if (!wrap) return;

  const pools = loadPools().slice().sort((a,b)=> String(b.date||"").localeCompare(String(a.date||"")));
  if (!pools.length){
    wrap.innerHTML = `<div class="small">Inga poolspel</div>`;
    return;
  }

  wrap.innerHTML = pools.map(p=>`
    <div class="poolCard">
      <div class="poolTitle">${escapeHtml(p.date || "—")} <span class="poolMeta">· ${escapeHtml(p.place || "—")}</span></div>
      <div class="poolActions">
        <button class="btnPrimary" data-action="start-pool" data-id="${escapeHtml(p.id)}">Påbörja</button>
        <button class="btnSecondary" data-action="edit-pool" data-id="${escapeHtml(p.id)}">Redigera</button>
        <button class="btnSecondary" data-action="delete-pool" data-id="${escapeHtml(p.id)}">Ta bort</button>
      </div>
    </div>
  `).join("");
}

function initPoolspelUI(){
  updateCurrentPoolLabel();
  const poolId = getCurrentPoolId();
  if (!poolId) return;

  fillStaticDropdowns();
  fillTeamSelect();
  fillMatchCountDropdown();
  applyMatchCount();
  refreshDropdowns();
  loadState();
  renderAll();
}

// ----------------------------
// Dropdown filling
// ----------------------------
function fillStaticDropdowns(){
  const arena = $("arena");
  if (arena && !arena.dataset.filled){
    arena.innerHTML = "";
    for (let i=1;i<=4;i++){
      const o = document.createElement("option");
      o.value = String(i);
      o.textContent = `Plan ${i}`;
      arena.appendChild(o);
    }
    arena.dataset.filled = "1";
  }

  const teamSize = $("teamSize");
  if (teamSize && !teamSize.dataset.filled){
    teamSize.innerHTML = "";
    for (let i=1;i<=25;i++){
      const o = document.createElement("option");
      o.value = String(i);
      o.textContent = String(i);
      teamSize.appendChild(o);
    }
    teamSize.dataset.filled = "1";
  }

  const onCourt = $("onCourt");
  if (onCourt && !onCourt.dataset.filled){
    onCourt.innerHTML = "";
    [3,4,5].forEach(n=>{
      const o = document.createElement("option");
      o.value = String(n);
      o.textContent = String(n);
      onCourt.appendChild(o);
    });
    onCourt.dataset.filled="1";
  }

  const periodsCount = $("periodsCount");
  if (periodsCount && !periodsCount.dataset.filled){
    periodsCount.innerHTML="";
    [1,2,3].forEach(n=>{
      const o=document.createElement("option");
      o.value=String(n);
      o.textContent=String(n);
      periodsCount.appendChild(o);
    });
    periodsCount.dataset.filled="1";
  }

  const periodMin = $("periodMin");
  if (periodMin && !periodMin.dataset.filled){
    periodMin.innerHTML="";
    for (let m=8;m<=20;m++){
      const o=document.createElement("option");
      o.value=String(m);
      o.textContent=String(m);
      periodMin.appendChild(o);
    }
    periodMin.dataset.filled="1";
  }

  const shiftSec = $("shiftSec");
  if (shiftSec && !shiftSec.dataset.filled){
    shiftSec.innerHTML="";
    for (let s=30;s<=180;s+=5){
      const o=document.createElement("option");
      o.value=String(s);
      o.textContent=String(s);
      shiftSec.appendChild(o);
    }
    shiftSec.dataset.filled="1";
  }
}

function fillTeamSelect(){
  const team = $("teamSelect");
  if (!team || team.dataset.filled) return;
  team.innerHTML="";
  for (let i=1;i<=3;i++){
    const o=document.createElement("option");
    o.value=String(i);
    o.textContent=`Lag ${i}`;
    team.appendChild(o);
  }
  team.value="1";
  team.dataset.filled="1";
}

function fillMatchCountDropdown(){
  const sel = $("matchCount");
  if (!sel || sel.dataset.filled) return;
  sel.innerHTML="";
  for (let i=1;i<=30;i++){
    const o=document.createElement("option");
    o.value=String(i);
    o.textContent=String(i);
    sel.appendChild(o);
  }
  sel.dataset.filled="1";
}

function refreshDropdowns(){
  const {players} = loadRegister();
  const goalie = $("goalie");
  if (goalie){
    const cur = goalie.value;
    goalie.innerHTML="";
    const o0=document.createElement("option");
    o0.value=""; o0.textContent="Välj...";
    goalie.appendChild(o0);
    for (const n of players){
      const o=document.createElement("option");
      o.value=n; o.textContent=n;
      goalie.appendChild(o);
    }
    goalie.value = cur;
  }

  const st = getFormState();
  renderPlayerSelectors(parseInt(st.teamSize,10)||10, st.players || []);
}

// ----------------------------
// Match count per team per pool
// ----------------------------
function getTeam(){
  return $("teamSelect")?.value || "1";
}
function getMatchNo(){
  return $("matchNo")?.value || "1";
}
function loadMatchCount(){
  const poolId = getCurrentPoolId();
  const team = getTeam();
  const raw = localStorage.getItem(poolMatchCountKey(poolId, team));
  const n = raw ? parseInt(raw,10) : 4;
  return (Number.isFinite(n) && n>=1 && n<=30) ? n : 4;
}
function saveMatchCount(n){
  const poolId = getCurrentPoolId();
  const team = getTeam();
  localStorage.setItem(poolMatchCountKey(poolId, team), String(n));
}
function applyMatchCount(){
  const count = loadMatchCount();
  const sel = $("matchCount");
  if (sel) sel.value = String(count);

  const matchNoSel = $("matchNo");
  if (!matchNoSel) return;
  const current = parseInt(matchNoSel.value || "1", 10);

  matchNoSel.innerHTML="";
  for (let i=1;i<=count;i++){
    const o=document.createElement("option");
    o.value=String(i);
    o.textContent=`Match ${i}`;
    matchNoSel.appendChild(o);
  }
  matchNoSel.value = String(Math.min(Math.max(current || 1, 1), count));
}

// ----------------------------
// Per pool/team/match state
// ----------------------------
function defaultsState(){
  return {
    matchDate:"",
    matchTime:"",
    opponent:"",
    arena:"1",
    teamSize:"10",
    onCourt:"3",
    periodsCount:"1",
    periodMin:"15",
    shiftSec:"90",
    players:[],
    goalie:""
  };
}
function getFormState(){
  const teamSize = $("teamSize")?.value || "10";
  const n = parseInt(teamSize,10)||10;
  const players = [];
  for (let i=1;i<=n;i++){
    const sel = $(`p${i}`);
    players.push(sel ? (sel.value || "") : "");
  }
  return {
    matchDate: $("matchDate")?.value || "",
    matchTime: $("matchTime")?.value || "",
    opponent: $("opponent")?.value || "",
    arena: $("arena")?.value || "1",
    teamSize: teamSize,
    onCourt: $("onCourt")?.value || "3",
    periodsCount: $("periodsCount")?.value || "1",
    periodMin: $("periodMin")?.value || "15",
    shiftSec: $("shiftSec")?.value || "90",
    players,
    goalie: $("goalie")?.value || ""
  };
}
function setFormState(s){
  const d = Object.assign(defaultsState(), s||{});
  if ($("matchDate")) $("matchDate").value = d.matchDate || "";
  if ($("matchTime")) $("matchTime").value = d.matchTime || "";
  if ($("opponent")) $("opponent").value = d.opponent || "";
  if ($("arena")) $("arena").value = d.arena || "1";
  if ($("teamSize")) $("teamSize").value = d.teamSize || "10";
  if ($("onCourt")) $("onCourt").value = d.onCourt || "3";
  if ($("periodsCount")) $("periodsCount").value = d.periodsCount || "1";
  if ($("periodMin")) $("periodMin").value = d.periodMin || "15";
  if ($("shiftSec")) $("shiftSec").value = d.shiftSec || "90";

  renderPlayerSelectors(parseInt(d.teamSize,10)||10, Array.isArray(d.players)?d.players:[]);
  if ($("goalie")) $("goalie").value = d.goalie || "";
}

function saveState(){
  const poolId = getCurrentPoolId();
  const team = getTeam();
  const matchNo = getMatchNo();
  if (!poolId) return;
  localStorage.setItem(poolStateKey(poolId, team, matchNo), JSON.stringify(getFormState()));
  setPill("Sparat");
  window.clearTimeout(window.__savePillTimer);
  window.__savePillTimer = window.setTimeout(()=>setPill("Redo"), 700);
}
function loadState(){
  const poolId = getCurrentPoolId();
  if (!poolId) return;
  const team = getTeam();
  const matchNo = getMatchNo();
  const raw = localStorage.getItem(poolStateKey(poolId, team, matchNo));
  setFormState(raw ? safeParseJSON(raw, {}) : {});
}
function loadStateFor(teamNo, matchNo){
  const poolId = getCurrentPoolId();
  const raw = localStorage.getItem(poolStateKey(poolId, String(teamNo), String(matchNo)));
  return Object.assign(defaultsState(), raw ? safeParseJSON(raw,{}) : {});
}

// ----------------------------
// Player selectors
// ----------------------------
function renderPlayerSelectors(n, values){
  const {players} = loadRegister();
  const container = $("playersContainer");
  if (!container) return;

  container.innerHTML = "";
  const wanted = Math.min(25, Math.max(1, parseInt(n,10)||1));
  const vals = Array.isArray(values) ? values.slice(0,wanted) : [];
  while (vals.length < wanted) vals.push("");

  for (let i=1;i<=wanted;i++){
    const wrap = document.createElement("div");
    const lab = document.createElement("label");
    lab.textContent = `Spelare ${i}`;
    const sel = document.createElement("select");
    sel.id = `p${i}`;

    const o0 = document.createElement("option");
    o0.value=""; o0.textContent="Välj...";
    sel.appendChild(o0);

    for (const name of players){
      const o = document.createElement("option");
      o.value=name; o.textContent=name;
      sel.appendChild(o);
    }
    sel.value = vals[i-1] || "";
    sel.addEventListener("change", ()=>{ saveState(); renderAll(); });

    wrap.appendChild(lab);
    wrap.appendChild(sel);
    container.appendChild(wrap);
  }
}

// ----------------------------
// Validation
// ----------------------------
function validateCurrentMatch(){
  const s = getFormState();
  const chosen = (s.players||[]).map(x=>(x||"").trim()).filter(Boolean);
  const set = new Set(chosen.map(x=>x.toLowerCase()));
  if (set.size !== chosen.length) return "Samma spelare är vald flera gånger.";
  if (s.goalie && set.has(s.goalie.toLowerCase())) return "Målvakt kan inte vara utespelare.";
  const onCourt = Math.min(5, Math.max(3, parseInt(s.onCourt,10)||3));
  if (chosen.length && chosen.length < onCourt) return `För få spelare valda. Antal på plan är ${onCourt}.`;
  return "";
}

// ----------------------------
// Shift times + rotation AI
// ----------------------------
function formatMMSS(totalSeconds){
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = String(Math.floor(s/60)).padStart(2,"0");
  const ss = String(s%60).padStart(2,"0");
  return `${mm}:${ss}`;
}
function buildShiftTimes(totalMinutes, shiftSec){
  const totalSeconds = Math.floor(totalMinutes * 60);
  const step = Math.max(1, Math.floor(shiftSec));
  const times = [];
  for (let t = totalSeconds; t > 0; t -= step){
    times.push(formatMMSS(t));
  }
  return [...new Set(times)];
}
function rosterFromState(st){
  const raw = (st.players||[]).map(x=>(x||"").trim()).filter(Boolean);
  const out = [];
  const seen = new Set();
  for (const n of raw){
    const k=n.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(n);
  }
  return out;
}
function makeRatings(roster){
  const r = {};
  const n = roster.length;
  for (let i=0;i<n;i++){
    r[roster[i].toLowerCase()] = (n - i);
  }
  return r;
}
function countOverlap(a,b){
  const setA = new Set((a||[]).map(x=>x.toLowerCase()));
  let o=0;
  for (const x of (b||[])){
    if (setA.has(x.toLowerCase())) o++;
  }
  return o;
}
function pickBestLineup(candidates){
  candidates.sort((x,y)=>{
    if (y.score !== x.score) return y.score - x.score;
    if (x.delta !== y.delta) return x.delta - y.delta;
    return 0;
  });
  return candidates.length ? candidates[0].lineup : [];
}

function makeLineupsForMatch(st, globalCounts, shiftTimes){
  const roster = rosterFromState(st);
  const kWanted = Math.min(Math.max(3, parseInt(st.onCourt,10)||3), 5);
  const k = Math.min(kWanted, roster.length || kWanted);
  const ratings = makeRatings(roster);

  for (const n of roster){
    const key = n.toLowerCase();
    if (globalCounts[key]==null) globalCounts[key]=0;
  }
  if (!roster.length) return shiftTimes.map(()=>[]);

  const W_FAIR = 8;
  const W_STR  = 3;
  const W_CONT = 6;
  const PENALTY_DOUBLE = 120;

  let prev=null;
  const lineups=[];

  for (let i=0;i<shiftTimes.length;i++){
    const countsArr = roster.map(n=>({n, c:globalCounts[n.toLowerCase()]||0, r:ratings[n.toLowerCase()]||0}));
    countsArr.sort((a,b)=>{
      if (a.c!==b.c) return a.c-b.c;
      return b.r-a.r;
    });

    const poolSet=new Set();
    const pool=[];
    for (const obj of countsArr.slice(0, Math.min(12, roster.length))){
      const key=obj.n.toLowerCase();
      if (!poolSet.has(key)){ poolSet.add(key); pool.push(obj.n); }
    }
    const strongArr = countsArr.slice().sort((a,b)=>b.r-a.r);
    for (const obj of strongArr.slice(0, Math.min(8, roster.length))){
      const key=obj.n.toLowerCase();
      if (!poolSet.has(key)){ poolSet.add(key); pool.push(obj.n); }
    }
    if (prev && prev.length){
      for (const n of prev){
        const key=n.toLowerCase();
        if (!poolSet.has(key)){ poolSet.add(key); pool.push(n); }
      }
    }
    if (pool.length < k){
      for (const n of roster){
        const key=n.toLowerCase();
        if (!poolSet.has(key)){ poolSet.add(key); pool.push(n); }
        if (pool.length>=k) break;
      }
    }

    const M = Math.min(pool.length, 12);
    const P = pool.slice(0,M);

    const candidates=[];
    const idxs=[];
    function rec(start,left){
      if (left===0){
        const lineup = idxs.map(j=>P[j]);

        const minC = Math.min(...roster.map(n=>globalCounts[n.toLowerCase()]||0));
        let fairPenalty=0;
        let strength=0;
        for (const n of lineup){
          const key=n.toLowerCase();
          fairPenalty += (globalCounts[key]||0) - minC;
          strength += (ratings[key]||0);
        }
        const fairScore = -fairPenalty;

        const overlap = prev ? countOverlap(prev,lineup) : 0;
        const delta = prev ? (k - overlap) : k;
        const contScore = overlap;

        const rosterGtK = roster.length > k;
        const doublePenalty = (rosterGtK && prev && delta>=2) ? -PENALTY_DOUBLE*(delta-1) : 0;

        const score = W_FAIR*fairScore + W_STR*strength + W_CONT*contScore + doublePenalty;
        candidates.push({lineup, score, delta});
        return;
      }
      for (let j=start; j<=M-left; j++){
        idxs.push(j);
        rec(j+1,left-1);
        idxs.pop();
      }
    }
    rec(0,k);

    let best = null;
    if (prev && roster.length > k){
      const filtered = candidates.filter(x=>x.delta<=1);
      best = pickBestLineup(filtered.length ? filtered : candidates);
    }else{
      best = pickBestLineup(candidates);
    }

    for (const n of best){
      const key=n.toLowerCase();
      globalCounts[key]=(globalCounts[key]||0)+1;
    }

    lineups.push(best);
    prev=best;
  }
  return lineups;
}

function lineupToShortText(names){
  return (names||[]).map(shortName).filter(Boolean).join(", ") || "—";
}

function formatInfoLine(st){
  const date = st.matchDate || "—";
  const time = st.matchTime || "—";
  const opp  = st.opponent || "—";
  const arenaLabel = `Plan ${st.arena || "—"}`;
  return `Datum: <b>${escapeHtml(date)}</b> • Start: <b>${escapeHtml(time)}</b><br>
          Motståndare: <b>${escapeHtml(opp)}</b> • Plan: <b>${escapeHtml(arenaLabel)}</b>`;
}

// ----------------------------
// Progress (klar/nu-rad) + Matchscreen
// ----------------------------
function loadProgress(teamNo, matchNo){
  const poolId = getCurrentPoolId();
  const raw = localStorage.getItem(poolProgressKey(poolId, teamNo, matchNo));
  const p = raw ? safeParseJSON(raw, null) : null;
  if (p && Number.isFinite(p.index)) return { index: Math.max(0, p.index|0) };
  return { index: 0 };
}
function saveProgress(teamNo, matchNo, index){
  const poolId = getCurrentPoolId();
  localStorage.setItem(poolProgressKey(poolId, teamNo, matchNo), JSON.stringify({ index: Math.max(0, index|0) }));
}

function computeCurrentMatchPlan(){
  const teamNo = getTeam();
  const matchNo = getMatchNo();
  const st = loadStateFor(teamNo, matchNo);

  const periodsCount = Math.min(3, Math.max(1, parseInt(st.periodsCount,10)||1));
  const periodMin = parseInt(st.periodMin,10)||15;
  const shiftSec = parseInt(st.shiftSec,10)||90;

  const totalMinutes = periodMin * periodsCount; // inga pauser
  const shiftTimes = buildShiftTimes(totalMinutes, shiftSec);

  // globalCounts reset för matchskärm (vi vill samma lineup som tabellen → renderAll använder globalCounts över matcher)
  // För matchläge: vi räknar lineup för just denna match, deterministiskt.
  const globalCounts = {};
  const lineups = makeLineupsForMatch(st, globalCounts, shiftTimes);

  return { teamNo, matchNo, st, shiftTimes, lineups };
}

let wakeLock = null;
async function tryWakeLockOn(){
  try{
    if (!('wakeLock' in navigator)) return;
    wakeLock = await navigator.wakeLock.request('screen');
  }catch{}
}
async function tryWakeLockOff(){
  try{
    if (wakeLock){
      await wakeLock.release();
      wakeLock = null;
    }
  }catch{}
}

function openMatchscreen(){
  const ov = $("matchOverlay");
  if (!ov) return;

  const { teamNo, matchNo, st, shiftTimes, lineups } = computeCurrentMatchPlan();
  const prog = loadProgress(teamNo, matchNo);

  ov.classList.remove("hidden");
  ov.setAttribute("aria-hidden", "false");

  // info
  const info = $("matchInfo");
  const badge = $("matchBadge");
  const miniGoalie = $("miniGoalie");
  const miniShift = $("miniShift");
  const miniTime = $("miniTime");

  const date = st.matchDate || "—";
  const time = st.matchTime || "—";
  const opp  = st.opponent || "—";
  const plan = `Plan ${st.arena||"—"}`;
  if (info) info.textContent = `Lag ${teamNo} • Match ${matchNo} • ${date} ${time} • ${opp} • ${plan}`;

  if (miniGoalie) miniGoalie.textContent = st.goalie || "—";
  if (miniShift) miniShift.textContent = `${st.shiftSec||"—"}s`;

  // clamp
  const max = Math.max(0, shiftTimes.length - 1);
  const idx = Math.min(Math.max(0, prog.index), max);

  // render
  renderMatchscreenState(shiftTimes, lineups, idx);

  // wake lock
  tryWakeLockOn();
}

function closeMatchscreen(){
  const ov = $("matchOverlay");
  if (!ov) return;
  ov.classList.add("hidden");
  ov.setAttribute("aria-hidden","true");
  tryWakeLockOff();
}

function renderMatchscreenState(shiftTimes, lineups, idx){
  const badge = $("matchBadge");
  const nowEl  = $("nowLineup");
  const nextEl = $("nextLineup");
  const miniTime = $("miniTime");

  const total = shiftTimes.length || 1;
  if (badge) badge.textContent = `Byte ${Math.min(idx+1,total)}/${total}`;

  const now = lineups[idx] || [];
  const next = lineups[idx+1] || [];

  if (nowEl) nowEl.textContent = now.length ? now.map(shortName).join(" • ") : "—";
  if (nextEl) nextEl.textContent = next.length ? next.map(shortName).join(" • ") : "—";

  if (miniTime) miniTime.textContent = shiftTimes[idx] || "—";
}

function nextShift(){
  const { teamNo, matchNo, shiftTimes, lineups } = computeCurrentMatchPlan();
  const prog = loadProgress(teamNo, matchNo);

  const max = Math.max(0, shiftTimes.length - 1);
  const idx = Math.min(Math.max(0, prog.index), max);

  // mark current as done by moving index forward
  const nextIdx = Math.min(idx + 1, max);
  saveProgress(teamNo, matchNo, nextIdx);

  renderAll(); // update table highlight/done
  renderMatchscreenState(shiftTimes, lineups, nextIdx);
}

function undoShift(){
  const { teamNo, matchNo, shiftTimes, lineups } = computeCurrentMatchPlan();
  const prog = loadProgress(teamNo, matchNo);
  const idx = Math.max(0, prog.index|0);
  const prevIdx = Math.max(0, idx - 1);
  saveProgress(teamNo, matchNo, prevIdx);

  renderAll();
  renderMatchscreenState(shiftTimes, lineups, prevIdx);
}

// ----------------------------
// Render all matches for selected team
// ----------------------------
function renderMatchBlock(teamNo, matchNo, st, shiftTimes, lineups, progressIndex){
  const periodsCount = Math.min(3, Math.max(1, parseInt(st.periodsCount,10)||1));
  const periodMin = parseInt(st.periodMin,10)||15;
  const shiftSec = parseInt(st.shiftSec,10)||90;

  const chosen = rosterFromState(st);
  const goalie = st.goalie || "—";
  const onCourt = st.onCourt || "3";

  return `
    <div class="poolCard">
      <div class="poolTitle">Match ${escapeHtml(matchNo)} • Lag ${escapeHtml(teamNo)}</div>
      <div class="small">${formatInfoLine(st)}</div>
      <div class="small" style="margin-top:6px;">
        Antal i laget: <b>${escapeHtml(st.teamSize||"—")}</b> • Antal på plan: <b>${escapeHtml(onCourt)}</b>
        • Perioder: <b>${periodsCount}</b> • Periodtid: <b>${periodMin}:00</b> • Bytestid: <b>${shiftSec}s</b>
      </div>

      <div style="margin-top:10px;">
        <div><b>Laguppställning (ranking)</b></div>
        <ol>${chosen.map(n=>`<li>${escapeHtml(n)}</li>`).join("") || "<li>—</li>"}</ol>
        <div><b>Målvakt:</b> ${escapeHtml(goalie)}</div>
      </div>

      <div style="margin-top:12px;">
        <div><b>Bytesschema</b></div>
        <table>
          <thead><tr><th>#</th><th>Tid kvar</th><th>På plan</th></tr></thead>
          <tbody>
            ${shiftTimes.map((t,i)=>{
              const cls = (i < progressIndex) ? "done" : (i === progressIndex ? "current" : "");
              return `
                <tr class="${cls}">
                  <td>${i+1}</td>
                  <td class="nowrap">${escapeHtml(t)}</td>
                  <td>${escapeHtml(lineupToShortText(lineups[i]||[]))}</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
        <div class="small" style="margin-top:6px;">
          Rader markeras som <b>klara</b> när du trycker “Nästa byte” i matchläge.
        </div>
      </div>
    </div>
  `;
}

function renderAll(){
  const msg = $("msg");
  const err = validateCurrentMatch();
  if (msg){
    msg.innerHTML = err ? `<span style="color:#b00020;font-weight:900;">✖ ${escapeHtml(err)}</span>`
                        : `<span style="color:#1b5e20;font-weight:900;">✔ OK</span> <span class="small">Inga dubbletter.</span>`;
  }

  const out = $("output");
  if (!out) return;

  const teamNo = getTeam();
  const matchCount = loadMatchCount();

  const globalCounts = {};
  let html = "";
  for (let m=1; m<=matchCount; m++){
    const st = loadStateFor(teamNo, m);

    const periodsCount = Math.min(3, Math.max(1, parseInt(st.periodsCount,10)||1));
    const periodMin = parseInt(st.periodMin,10)||15;
    const shiftSec = parseInt(st.shiftSec,10)||90;

    const totalMinutes = periodMin * periodsCount;
    const shiftTimes = buildShiftTimes(totalMinutes, shiftSec);
    const lineups = makeLineupsForMatch(st, globalCounts, shiftTimes);

    const prog = loadProgress(teamNo, String(m));
    const idx = Math.min(Math.max(0, prog.index|0), Math.max(0, shiftTimes.length-1));

    html += renderMatchBlock(teamNo, m, st, shiftTimes, lineups, idx);
  }

  out.innerHTML = html || `<div class="small">Inga matcher.</div>`;
}

function exportPrint(){
  const help = $("exportHelp");
  if (help){
    help.classList.remove("hidden");
    help.innerHTML =
      "📄 iPhone: Tryck <b>Skriv ut</b> → nyp ut på förhandsvisningen → <b>Dela</b> PDF.<br>" +
      "📄 Android/Chrome: Välj <b>Spara som PDF</b>.";
  }
  renderAll();
  window.print();
}

// ----------------------------
// Global click handler
// ----------------------------
document.addEventListener("click", (e)=>{
  const el = e.target.closest("[data-action],[data-nav]");
  if (!el) return;

  const nav = el.getAttribute("data-nav");
  if (nav){
    e.preventDefault();
    go(nav);
    return;
  }

  const action = el.getAttribute("data-action");
  if (!action) return;

  e.preventDefault();

  if (action === "open-trupp") return openTrupp();
  if (action === "close-trupp") return closeTrupp();
  if (action === "new-pool") return createPool();
  if (action === "stats") return alert("Kommer snart: Statistik målvakter.");

  if (action === "start-pool"){
    const id = el.getAttribute("data-id") || "";
    setCurrentPoolId(id);
    return go("#poolspel");
  }
  if (action === "edit-pool"){
    const id = el.getAttribute("data-id") || "";
    return editPool(id);
  }
  if (action === "delete-pool"){
    const id = el.getAttribute("data-id") || "";
    return deletePool(id);
  }

  if (action === "add-player") return addPlayer();
  if (action === "add-coach") return addCoach();
  if (action === "remove-player"){
    const idx = parseInt(el.getAttribute("data-idx")||"0",10);
    return removePlayer(idx);
  }
  if (action === "remove-coach"){
    const idx = parseInt(el.getAttribute("data-idx")||"0",10);
    return removeCoach(idx);
  }
  if (action === "begin-edit"){
    const kind = el.getAttribute("data-kind") || "player";
    const idx = parseInt(el.getAttribute("data-idx")||"0",10);
    return beginEdit(kind, idx);
  }
  if (action === "cancel-edit") return cancelEdit();
  if (action === "save-edit"){
    const kind = el.getAttribute("data-kind") || "player";
    const idx = parseInt(el.getAttribute("data-idx")||"0",10);
    const inp = document.querySelector(`.inlineEdit[data-kind="${kind}"][data-idx="${idx}"]`);
    return saveEdit(kind, idx, inp ? inp.value : "");
  }

  if (action === "import-json") return doImport();
  if (action === "export-json") return doExport();

  if (action === "export-print") return exportPrint();

  // MATCHSCREEN
  if (action === "open-matchscreen") return openMatchscreen();
  if (action === "close-matchscreen") return closeMatchscreen();
  if (action === "next-shift") return nextShift();
  if (action === "undo-shift") return undoShift();
});

// Enter saves edit in roster list
document.addEventListener("keydown", (e)=>{
  if (e.key !== "Enter") return;
  const inp = e.target.closest(".inlineEdit");
  if (!inp) return;
  const kind = inp.getAttribute("data-kind") || "player";
  const idx = parseInt(inp.getAttribute("data-idx")||"0",10);
  saveEdit(kind, idx, inp.value);
});

// close matchscreen on ESC
document.addEventListener("keydown", (e)=>{
  if (e.key === "Escape"){
    const ov = $("matchOverlay");
    if (ov && !ov.classList.contains("hidden")) closeMatchscreen();
  }
});

// ----------------------------
// Form autosave
// ----------------------------
function wireFormAutosave(){
  const ids = ["matchDate","matchTime","opponent","arena","onCourt","periodsCount","periodMin","shiftSec","goalie"];
  ids.forEach(id=>{
    const el = $(id);
    if (!el) return;
    el.addEventListener("change", ()=>{ saveState(); renderAll(); });
    el.addEventListener("input", ()=>{ saveState(); });
  });

  const teamSize = $("teamSize");
  if (teamSize){
    teamSize.addEventListener("change", ()=>{
      const n = parseInt(teamSize.value||"10",10) || 10;
      const st = getFormState();
      st.teamSize = String(n);
      renderPlayerSelectors(n, st.players || []);
      saveState();
      renderAll();
    });
  }

  const matchCount = $("matchCount");
  if (matchCount){
    matchCount.addEventListener("change", ()=>{
      const n = parseInt(matchCount.value||"4",10);
      saveMatchCount(n);
      applyMatchCount();
      loadState();
      renderAll();
    });
  }

  const teamSelect = $("teamSelect");
  if (teamSelect){
    teamSelect.addEventListener("change", ()=>{
      applyMatchCount();
      refreshDropdowns();
      loadState();
      renderAll();
    });
  }

  const matchNo = $("matchNo");
  if (matchNo){
    matchNo.addEventListener("change", ()=>{
      loadState();
      renderAll();
    });
  }
}

// ----------------------------
// Service Worker: register + auto-update
// ----------------------------
async function registerSW(){
  if (!('serviceWorker' in navigator)) return;

  try{
    const reg = await navigator.serviceWorker.register('./sw.js');

    setInterval(()=>{ try{ reg.update(); }catch{} }, 30 * 1000);

    navigator.serviceWorker.addEventListener('controllerchange', ()=>{
      if (window.__reloading) return;
      window.__reloading = true;
      location.reload();
    });

    if (reg.waiting){
      reg.waiting.postMessage({type:'SKIP_WAITING'});
    }

    reg.addEventListener('updatefound', ()=>{
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', ()=>{
        if (nw.state === 'installed' && navigator.serviceWorker.controller){
          nw.postMessage({type:'SKIP_WAITING'});
        }
      });
    });
  }catch{}
}

// ----------------------------
// Init
// ----------------------------
function init(){
  const vp = $("versionPill");
  if (vp) vp.textContent = APP_VERSION;

  renderPoolLists();
  applyRoute();
  wireFormAutosave();
  registerSW();

  window.addEventListener("hashchange", applyRoute);
}

window.addEventListener("load", init);