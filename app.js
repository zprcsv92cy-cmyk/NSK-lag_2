const APP_VERSION = "v60";

/* ----------------------------
   Utilities
---------------------------- */
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}
function safeParse(raw, fallback){ try { return JSON.parse(raw); } catch { return fallback; } }
function uniq(arr){
  const out=[]; const seen=new Set();
  for (const x of (arr||[])){
    const v=String(x||"").trim(); if(!v) continue;
    const k=v.toLowerCase(); if(seen.has(k)) continue;
    seen.add(k); out.push(v);
  }
  return out;
}
function shortName(full){
  const parts = String(full||"").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const last = parts[parts.length-1];
  return `${first} ${last[0].toUpperCase()}`;
}
function setPill(text){
  const el = document.getElementById("saveState");
  if (!el) return;
  el.textContent = text;
}

/* ----------------------------
   Default roster
---------------------------- */
const DEFAULT_PLAYERS = [
  "Agnes Danielsson","Albert Zillén","Albin Andersson","Aron Warensjö-Sommar","August Hasselberg",
  "Benjamin Linderström","Charlie Carman","Emil Tranborg","Enzo Olsson","Gunnar Englund","Henry Gauffin",
  "Linus Stolt","Melker Axbom","Måns Åkvist","Nelson Östergren","Nicky Selander","Nikola Kosoderc",
  "Noé Bonnafous Sand","Oliver Engström","Oliver Zoumblios","Pelle Åstrand","Simon Misiorny","Sixten Bratt",
  "Theo Ydrenius","Viggo Kronvall","Yuktha reddy Semberi"
];
const DEFAULT_COACHES = [
  "Fredrik Selander","Joakim Lund","Linus Öhman","Niklas Gauffin","Olle Åstrand",
  "Peter Hasselberg","Tommy Englund","William Åkvist"
];

/* ----------------------------
   Storage keys
---------------------------- */
const LS = {
  players: "nsk_players",
  coaches: "nsk_coaches",
  pools: "nsk_pools:v2",
  currentPool: "nsk_current_pool:v2"
};

function loadRoster(){
  const storedP = safeParse(localStorage.getItem(LS.players)||"[]", []);
  const storedC = safeParse(localStorage.getItem(LS.coaches)||"[]", []);
  const players = uniq(storedP.concat(DEFAULT_PLAYERS)).sort((a,b)=>a.localeCompare(b,"sv"));
  const coaches = uniq(storedC.concat(DEFAULT_COACHES)).sort((a,b)=>a.localeCompare(b,"sv"));
  return {players, coaches};
}
function saveRoster(players, coaches){
  localStorage.setItem(LS.players, JSON.stringify(uniq(players).sort((a,b)=>a.localeCompare(b,"sv"))));
  localStorage.setItem(LS.coaches, JSON.stringify(uniq(coaches).sort((a,b)=>a.localeCompare(b,"sv"))));
}

/* ----------------------------
   Pools
---------------------------- */
function loadPools(){ return safeParse(localStorage.getItem(LS.pools)||"[]", []); }
function savePools(p){ localStorage.setItem(LS.pools, JSON.stringify(p||[])); }
function getCurrentPoolId(){ return localStorage.getItem(LS.currentPool)||""; }
function setCurrentPoolId(id){ localStorage.setItem(LS.currentPool, id||""); }
function genId(){ return Math.random().toString(16).slice(2)+Date.now().toString(16); }
function formatPoolTitle(p){ return `${p?.date||"—"} · ${p?.place||"—"}`; }

function poolPrefix(){
  const id = getCurrentPoolId();
  return `nsk_pool_${id}_`;
}
function kMatchCount(team){ return `${poolPrefix()}matchCount_team_${team}`; }
function kTeamCoaches(team){ return `${poolPrefix()}team_coaches_team_${team}`; }
function kState(team, match){ return `${poolPrefix()}state_team_${team}_match_${match}`; }
function kShiftDone(team, match, i){ return `${poolPrefix()}shiftDone_team_${team}_match_${match}_i_${i}`; }

/* ----------------------------
   Views + routing
---------------------------- */
function hideAll(){
  ["viewHome","viewPools","viewPool","viewRoster","viewStats"].forEach(id=>{
    const el=document.getElementById(id);
    if (el) el.style.display="none";
  });
}
function showView(id){
  hideAll();
  const el=document.getElementById(id);
  if (el) el.style.display="";
}
function routeTo(hash){
  try { history.replaceState(null,"",hash); }
  catch { location.hash = hash; }
  applyRoute();
}
function applyRoute(){
  const h = (location.hash||"#home").toLowerCase();

  if (h === "#pools"){
    showView("viewPools");
    renderPoolsLists();
    return;
  }
  if (h === "#pool"){
    if (!getCurrentPoolId()){
      routeTo("#pools");
      return;
    }
    showView("viewPool");
    loadAndRenderPool();
    return;
  }
  if (h === "#trupp"){
    showView("viewRoster");
    renderRoster();
    return;
  }
  if (h === "#stats"){
    showView("viewStats");
    renderStats();
    return;
  }

  showView("viewHome");
  renderPoolsLists();
}

/* ----------------------------
   Pools UI
---------------------------- */
function renderPoolsLists(){
  const pools = loadPools().slice().sort((a,b)=>String(b.date||"").localeCompare(String(a.date||"")));
  const html = pools.length ? pools.map(p=>`
    <div class="poolCard">
      <div class="poolTitle">${escapeHtml(p.date||"—")} <span class="poolMeta">· ${escapeHtml(p.place||"—")}</span></div>
      <div class="poolActions">
        <button class="btn btn-primary" data-act="startPool" data-id="${escapeHtml(p.id)}">Påbörja</button>
        <button class="btn" data-act="editPool" data-id="${escapeHtml(p.id)}">Redigera</button>
        <button class="btn" data-act="delPool" data-id="${escapeHtml(p.id)}">Ta bort</button>
      </div>
    </div>
  `).join("") : `<div class="muted">Inga sparade poolspel ännu.</div>`;

  const a = document.getElementById("poolList");
  const b = document.getElementById("poolListHome");
  if (a) a.innerHTML = html;
  if (b) b.innerHTML = html;
}

function createPool(){
  const today = new Date();
  const yyyy = String(today.getFullYear());
  const mm = String(today.getMonth()+1).padStart(2,"0");
  const dd = String(today.getDate()).padStart(2,"0");
  const d0 = `${yyyy}-${mm}-${dd}`;

  const date = prompt("Datum (YYYY-MM-DD):", d0);
  if (date == null) return;
  const place = prompt("Plats:", "");
  if (place == null) return;

  const pools = loadPools();
  const id = genId();
  pools.push({ id, date: String(date).trim(), place: String(place).trim(), createdAt: Date.now(), updatedAt: Date.now() });
  savePools(pools);
  setCurrentPoolId(id);
  routeTo("#pool");
}

function editPool(id){
  const pools = loadPools();
  const p = pools.find(x=>x.id===id);
  if (!p) return;

  const date = prompt("Datum (YYYY-MM-DD):", p.date||"");
  if (date == null) return;
  const place = prompt("Plats:", p.place||"");
  if (place == null) return;

  p.date = String(date).trim();
  p.place = String(place).trim();
  p.updatedAt = Date.now();
  savePools(pools);
  renderPoolsLists();
  updatePoolLabel();
}

function deletePool(id){
  if (!confirm("Ta bort detta poolspel?")) return;

  let pools = loadPools();
  pools = pools.filter(x=>x.id!==id);
  savePools(pools);

  for (let i=localStorage.length-1;i>=0;i--){
    const k = localStorage.key(i);
    if (k && k.startsWith(`nsk_pool_${id}_`)) localStorage.removeItem(k);
  }

  if (getCurrentPoolId() === id){
    setCurrentPoolId("");
    routeTo("#pools");
  } else {
    renderPoolsLists();
  }
}

function startPool(id){
  setCurrentPoolId(id);
  routeTo("#pool");
}

function updatePoolLabel(){
  const id = getCurrentPoolId();
  const pools = loadPools();
  const p = pools.find(x=>x.id===id);
  const el = document.getElementById("poolLabel");
  if (el) el.textContent = p ? formatPoolTitle(p) : "Poolspel";
}

/* ----------------------------
   Per pool: match settings
---------------------------- */
function loadMatchCount(team){
  const raw = localStorage.getItem(kMatchCount(team));
  const n = raw ? parseInt(raw,10) : 4;
  return (Number.isFinite(n) && n>=1 && n<=30) ? n : 4;
}
function saveMatchCount(team, n){
  localStorage.setItem(kMatchCount(team), String(n));
}

function loadTeamCoachList(team){
  const raw = localStorage.getItem(kTeamCoaches(team));
  const arr = raw ? safeParse(raw, []) : [];
  return Array.isArray(arr) ? arr : [];
}
function saveTeamCoachList(team, values){
  localStorage.setItem(kTeamCoaches(team), JSON.stringify(uniq(values)));
}

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
    players: Array(10).fill(""),
    goalie:""
  };
}

function getTeamNo(){ return document.getElementById("teamSelect")?.value || "1"; }
function getMatchNo(){ return document.getElementById("matchNo")?.value || "1"; }

function loadState(team, match){
  const raw = localStorage.getItem(kState(team, match));
  const st = raw ? safeParse(raw, {}) : {};
  const d = defaultsState();
  const out = Object.assign(d, st||{});
  const n = parseInt(out.teamSize||"10",10) || 10;
  out.players = Array.isArray(out.players) ? out.players.slice(0,n) : [];
  while (out.players.length < n) out.players.push("");
  return out;
}

function getFormState(){
  const teamSize = document.getElementById("teamSize").value || "10";
  const n = parseInt(teamSize,10) || 10;
  const players=[];
  for (let i=1;i<=n;i++){
    const sel=document.getElementById(`p${i}`);
    players.push(sel ? (sel.value||"") : "");
  }
  return {
    matchDate: document.getElementById("matchDate").value || "",
    matchTime: document.getElementById("matchTime").value || "",
    opponent: document.getElementById("opponent").value || "",
    arena: document.getElementById("arena").value || "1",
    teamSize,
    onCourt: document.getElementById("onCourt").value || "3",
    periodsCount: document.getElementById("periodsCount").value || "1",
    periodMin: document.getElementById("periodMin").value || "15",
    shiftSec: document.getElementById("shiftSec").value || "90",
    players,
    goalie: document.getElementById("goalie").value || ""
  };
}

function setFormState(s){
  const d = Object.assign(defaultsState(), s||{});
  document.getElementById("matchDate").value = d.matchDate||"";
  document.getElementById("matchTime").value = d.matchTime||"";
  document.getElementById("opponent").value = d.opponent||"";
  document.getElementById("arena").value = d.arena||"1";
  document.getElementById("teamSize").value = d.teamSize||"10";
  document.getElementById("onCourt").value = d.onCourt||"3";
  document.getElementById("periodsCount").value = d.periodsCount||"1";
  document.getElementById("periodMin").value = d.periodMin||"15";
  document.getElementById("shiftSec").value = d.shiftSec||"90";
  renderPlayerSelectors(parseInt(d.teamSize,10)||10, d.players||[]);
  refreshGoalieSelect();
  document.getElementById("goalie").value = d.goalie||"";
}

function saveState(){
  const team = getTeamNo();
  const match = getMatchNo();
  localStorage.setItem(kState(team, match), JSON.stringify(getFormState()));
  setPill("Sparat");
  clearTimeout(window.__pillT);
  window.__pillT = setTimeout(()=>setPill("Redo"), 700);
}

/* ----------------------------
   Shift done
---------------------------- */
function loadShiftDone(team, match, i){
  return localStorage.getItem(kShiftDone(team, match, i)) === "1";
}
function setShiftDone(team, match, i, done){
  localStorage.setItem(kShiftDone(team, match, i), done ? "1" : "0");
}
function resetAllShiftDone(team, match){
  const prefix = `${poolPrefix()}shiftDone_team_${team}_match_${match}_i_`;
  for (let j=localStorage.length-1;j>=0;j--){
    const k = localStorage.key(j);
    if (k && k.startsWith(prefix)) localStorage.removeItem(k);
  }
}

/* ----------------------------
   Dropdowns + roster binds
---------------------------- */
function fillMatchCountDropdown(){
  const el=document.getElementById("matchCount");
  el.innerHTML="";
  for (let i=1;i<=30;i++){
    const o=document.createElement("option");
    o.value=String(i); o.textContent=String(i);
    el.appendChild(o);
  }
}
function fillTeamSizeDropdown(){
  const el=document.getElementById("teamSize");
  el.innerHTML="";
  for (let i=1;i<=25;i++){
    const o=document.createElement("option");
    o.value=String(i); o.textContent=String(i);
    el.appendChild(o);
  }
}
function fillPeriodMinDropdown(){
  const el=document.getElementById("periodMin");
  el.innerHTML="";
  for (let i=8;i<=20;i++){
    const o=document.createElement("option");
    o.value=String(i); o.textContent=String(i);
    el.appendChild(o);
  }
}
function fillShiftSecDropdown(){
  const el=document.getElementById("shiftSec");
  el.innerHTML="";
  for (let i=30;i<=180;i+=5){
    const o=document.createElement("option");
    o.value=String(i); o.textContent=String(i);
    el.appendChild(o);
  }
}
function applyMatchCount(){
  const team=getTeamNo();
  const count=loadMatchCount(team);
  document.getElementById("matchCount").value = String(count);

  const mn=document.getElementById("matchNo");
  const current=parseInt(mn.value||"1",10)||1;
  mn.innerHTML="";
  for (let i=1;i<=count;i++){
    const o=document.createElement("option");
    o.value=String(i); o.textContent=`Match ${i}`;
    mn.appendChild(o);
  }
  mn.value = String(Math.min(Math.max(current,1),count));
}

function refreshGoalieSelect(){
  const {players} = loadRoster();
  const el=document.getElementById("goalie");
  const current=el.value;
  el.innerHTML="";
  const o0=document.createElement("option");
  o0.value=""; o0.textContent="Välj...";
  el.appendChild(o0);
  for (const p of players){
    const o=document.createElement("option");
    o.value=p; o.textContent=p;
    el.appendChild(o);
  }
  el.value=current;
}

function refreshCoachMulti(){
  const {coaches} = loadRoster();
  const team=getTeamNo();
  const chosen=new Set(loadTeamCoachList(team).map(x=>String(x).toLowerCase()));
  const el=document.getElementById("coach");
  el.innerHTML="";
  for (const c of coaches){
    const o=document.createElement("option");
    o.value=c; o.textContent=c;
    o.selected = chosen.has(c.toLowerCase());
    el.appendChild(o);
  }
}

function selectedValues(selectEl){
  return Array.from(selectEl.selectedOptions||[]).map(o=>o.value).filter(Boolean);
}

function renderPlayerSelectors(n, values){
  const {players} = loadRoster();
  const wrap=document.getElementById("playersContainer");
  wrap.innerHTML="";

  const wanted=Math.min(25, Math.max(1, n|0));
  const vals=Array.isArray(values) ? values.slice(0,wanted) : [];
  while (vals.length < wanted) vals.push("");

  for (let i=1;i<=wanted;i++){
    const box=document.createElement("div");

    const lab=document.createElement("label");
    lab.className="label";
    lab.textContent=`Spelare ${i}`;

    const sel=document.createElement("select");
    sel.className="select";
    sel.id=`p${i}`;

    const o0=document.createElement("option");
    o0.value=""; o0.textContent="Välj...";
    sel.appendChild(o0);

    for (const name of players){
      const o=document.createElement("option");
      o.value=name; o.textContent=name;
      sel.appendChild(o);
    }

    sel.value=vals[i-1]||"";
    sel.addEventListener("change", ()=>{ saveState(); renderSchedule(); });

    box.appendChild(lab);
    box.appendChild(sel);
    wrap.appendChild(box);
  }
}

/* ----------------------------
   Schedule
---------------------------- */
function formatMMSS(totalSeconds){
  const s=Math.max(0, Math.floor(totalSeconds));
  const mm=String(Math.floor(s/60)).padStart(2,"0");
  const ss=String(s%60).padStart(2,"0");
  return `${mm}:${ss}`;
}
function buildTimes(totalMinutes, shiftSec){
  const total=Math.floor(totalMinutes*60);
  const step=Math.max(1, Math.floor(shiftSec));
  const out=[];
  for (let t=total; t>0; t-=step) out.push(formatMMSS(t));
  return out;
}
function validateState(st){
  const chosen=(st.players||[]).map(x=>(x||"").trim()).filter(Boolean);
  const set=new Set(chosen.map(x=>x.toLowerCase()));
  if (set.size !== chosen.length) return "Samma spelare är vald flera gånger.";
  if (st.goalie && set.has(st.goalie.toLowerCase())) return "Målvakt kan inte vara utespelare.";
  const onCourt=Math.min(5, Math.max(3, parseInt(st.onCourt,10)||3));
  if (chosen.length && chosen.length < onCourt) return `För få spelare valda. Antal på plan är ${onCourt}.`;
  return "";
}

// Enkel rotation: rotera 1 spelare i taget
function buildRotation(st, times){
  const roster=(st.players||[]).map(x=>(x||"").trim()).filter(Boolean);
  const k=Math.min(5, Math.max(3, parseInt(st.onCourt,10)||3));
  if (!roster.length) return times.map(()=>[]);

  const lineup=roster.slice(0, Math.min(k, roster.length));
  const bench=roster.slice(lineup.length);

  const result=[];
  let benchIndex=0;

  for (let i=0;i<times.length;i++){
    result.push(lineup.slice());

    if (!bench.length) continue;

    const outIdx=i % lineup.length;
    const inPlayer=bench[benchIndex % bench.length];
    benchIndex++;

    const outPlayer=lineup[outIdx];
    lineup[outIdx]=inPlayer;

    const bpos=bench.indexOf(inPlayer);
    if (bpos>=0) bench.splice(bpos,1);
    bench.push(outPlayer);
  }
  return result;
}

// Auto-scroll to next undone after toggle
let __lastToggleIndex=null;
function findNextUndone(team, match, total, startFrom){
  if (!total) return null;
  const start=Math.min(Math.max(0, startFrom|0), total-1);
  for (let i=start;i<total;i++) if (!loadShiftDone(team,match,i)) return i;
  for (let i=0;i<start;i++) if (!loadShiftDone(team,match,i)) return i;
  return null;
}
function scrollToRow(i){
  if (i==null) return;
  const row=document.querySelector(`tr[data-shift-row="${i}"]`);
  if (!row) return;
  row.scrollIntoView({behavior:"smooth", block:"center"});
  row.classList.add("shiftFocus");
  setTimeout(()=>row.classList.remove("shiftFocus"), 900);
}

function renderSchedule(){
  const msg=document.getElementById("msg");
  const out=document.getElementById("output");

  const st=getFormState();
  const err=validateState(st);
  msg.innerHTML = err ? `<span class="err">✖ ${escapeHtml(err)}</span>` : `<span class="ok">✔ OK</span>`;

  const team=getTeamNo();
  const match=getMatchNo();

  const periods=Math.min(3, Math.max(1, parseInt(st.periodsCount,10)||1));
  const periodMin=parseInt(st.periodMin,10)||15;
  const shiftSec=parseInt(st.shiftSec,10)||90;
  const totalMin=periods*periodMin;

  const times=buildTimes(totalMin, shiftSec);
  const rot=buildRotation(st, times);

  const coaches=loadTeamCoachList(team);
  const poolTitle=document.getElementById("poolLabel")?.textContent || "Poolspel";

  out.innerHTML = `
    <div class="muted small" style="margin-bottom:10px">
      <b>${escapeHtml(poolTitle)}</b> • Lag ${escapeHtml(team)} • Match ${escapeHtml(match)}<br>
      Datum: <b>${escapeHtml(st.matchDate||"—")}</b> • Start: <b>${escapeHtml(st.matchTime||"—")}</b><br>
      Motståndare: <b>${escapeHtml(st.opponent||"—")}</b> • Plan: <b>${escapeHtml("Plan "+(st.arena||"—"))}</b><br>
      Tränare: <b>${escapeHtml(coaches.join(", ")||"—")}</b> • Målvakt: <b>${escapeHtml(st.goalie||"—")}</b>
    </div>

    <table>
      <thead><tr><th>#</th><th>Tid kvar</th><th>På plan</th><th>Gjort</th></tr></thead>
      <tbody>
        ${times.map((t,i)=>{
          const done=loadShiftDone(team,match,i);
          return `
            <tr data-shift-row="${i}" class="${done ? "shiftDoneRow" : ""}">
              <td>${i+1}</td>
              <td>${escapeHtml(t)}</td>
              <td>${escapeHtml((rot[i]||[]).map(shortName).join(", ") || "—")}</td>
              <td>
                <button class="btn btnShift ${done ? "btn--done":"btn--todo"}"
                        data-act="toggleShift" data-i="${i}">
                  ${done ? "✔ Gjort" : "Markera"}
                </button>
              </td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>

    <div class="muted small" style="margin-top:10px">
      Efter att du markerar en rad scrollar appen automatiskt till nästa “ej gjort”.
    </div>
  `;

  if (__lastToggleIndex != null){
    const next=findNextUndone(team,match,times.length,__lastToggleIndex+1);
    scrollToRow(next!=null ? next : __lastToggleIndex);
    __lastToggleIndex=null;
  }
}

/* ----------------------------
   Load pool view
---------------------------- */
function loadAndRenderPool(){
  updatePoolLabel();

  fillMatchCountDropdown();
  fillTeamSizeDropdown();
  fillPeriodMinDropdown();
  fillShiftSecDropdown();

  applyMatchCount();
  refreshGoalieSelect();
  refreshCoachMulti();

  const team=getTeamNo();
  const match=getMatchNo();
  const st=loadState(team,match);
  setFormState(st);

  refreshCoachMulti();
  applyCoachSelections(team);

  renderSchedule();
}

function applyCoachSelections(team){
  const chosen=new Set(loadTeamCoachList(team).map(x=>String(x).toLowerCase()));
  const el=document.getElementById("coach");
  for (const opt of el.options){
    opt.selected = chosen.has(String(opt.value).toLowerCase());
  }
}

/* ----------------------------
   Roster UI
---------------------------- */
function renderRoster(){
  const {players, coaches} = loadRoster();
  const pl=document.getElementById("playerList");
  const cl=document.getElementById("coachList");

  pl.innerHTML = players.map((name,idx)=>`
    <div class="listRow">
      <strong>${escapeHtml(name)}</strong>
      <div class="row">
        <button class="btn" data-act="editPlayer" data-i="${idx}">Redigera</button>
        <button class="btn" data-act="delPlayer" data-i="${idx}">Ta bort</button>
      </div>
    </div>
  `).join("") || `<div class="muted">Inga spelare.</div>`;

  cl.innerHTML = coaches.map((name,idx)=>`
    <div class="listRow">
      <strong>${escapeHtml(name)}</strong>
      <div class="row">
        <button class="btn" data-act="editCoach" data-i="${idx}">Redigera</button>
        <button class="btn" data-act="delCoach" data-i="${idx}">Ta bort</button>
      </div>
    </div>
  `).join("") || `<div class="muted">Inga tränare.</div>`;
}

/* ----------------------------
   Stats
---------------------------- */
function renderStats(){
  const out=document.getElementById("statsOut");
  const meta=document.getElementById("statsMeta");

  const pools=loadPools();
  const curId=getCurrentPoolId();
  const cur=pools.find(p=>p.id===curId);

  const poolIds = curId ? [curId] : pools.map(p=>p.id);
  const counts=new Map();
  const rows=[];

  for (const pid of poolIds){
    for (let team=1; team<=3; team++){
      const prefix=`nsk_pool_${pid}_`;
      const mc=parseInt(localStorage.getItem(`${prefix}matchCount_team_${team}`)||"4",10)||4;
      for (let m=1;m<=mc;m++){
        const st=safeParse(localStorage.getItem(`${prefix}state_team_${team}_match_${m}`)||"null", null);
        if (!st) continue;
        const g=String(st.goalie||"").trim();
        if (!g) continue;
        const k=g.toLowerCase();
        counts.set(k,(counts.get(k)||0)+1);
        rows.push({team, match:m, goalie:g, date:st.matchDate||"", time:st.matchTime||"", opp:st.opponent||""});
      }
    }
  }

  meta.textContent = cur ? `Visar: ${formatPoolTitle(cur)}` : `Visar: Alla poolspel`;

  if (!counts.size){
    out.innerHTML = `<div class="muted">Ingen målvakt vald ännu.</div>`;
    return;
  }

  const summary = Array.from(counts.entries())
    .map(([k,v])=>({name: rows.find(r=>r.goalie.toLowerCase()===k)?.goalie || k, count:v}))
    .sort((a,b)=>b.count-a.count || a.name.localeCompare(b.name,"sv"));

  out.innerHTML = `
    <div class="card inner">
      <h2>Summering</h2>
      <table>
        <thead><tr><th>Målvakt</th><th>Antal matcher</th></tr></thead>
        <tbody>${summary.map(x=>`<tr><td>${escapeHtml(x.name)}</td><td>${x.count}</td></tr>`).join("")}</tbody>
      </table>
    </div>
    <div class="card inner">
      <h2>Detaljer</h2>
      <table>
        <thead><tr><th>Lag</th><th>Match</th><th>Datum</th><th>Start</th><th>Motstånd</th><th>Målvakt</th></tr></thead>
        <tbody>${rows.map(r=>`
          <tr>
            <td>${r.team}</td>
            <td>${r.match}</td>
            <td>${escapeHtml(r.date||"—")}</td>
            <td>${escapeHtml(r.time||"—")}</td>
            <td>${escapeHtml(r.opp||"—")}</td>
            <td>${escapeHtml(r.goalie)}</td>
          </tr>
        `).join("")}</tbody>
      </table>
    </div>
  `;
}

/* ----------------------------
   Import/Export (textarea)
---------------------------- */
function exportBackup(){
  const payload = { players: loadRoster().players, coaches: loadRoster().coaches, pools: loadPools(), kv:{} };
  for (let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i);
    if (k && k.startsWith("nsk_pool_")){
      const v=localStorage.getItem(k);
      payload.kv[k] = safeParse(v, v);
    }
  }
  const txt=JSON.stringify(payload,null,2);
  const blob=new Blob([txt], {type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url; a.download="nsk-lag-backup.json";
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function importBackupFromTextarea(){
  const ta=document.getElementById("inpImportJson");
  const msg=document.getElementById("importMsg");
  try{
    const data=JSON.parse(ta.value||"{}");
    if (Array.isArray(data.players) || Array.isArray(data.coaches)){
      saveRoster(Array.isArray(data.players)?data.players:[], Array.isArray(data.coaches)?data.coaches:[]);
    }
    if (Array.isArray(data.pools)){
      savePools(data.pools);
      if (!getCurrentPoolId() && data.pools[0]?.id) setCurrentPoolId(data.pools[0].id);
    }
    if (data.kv && typeof data.kv==="object"){
      for (const [k,v] of Object.entries(data.kv)){
        if (!k.startsWith("nsk_pool_")) continue;
        localStorage.setItem(k, typeof v==="string" ? v : JSON.stringify(v));
      }
    }
    msg.textContent="✔ Import klar";
    ta.value="";
    renderPoolsLists();
    renderRoster();
  } catch {
    msg.textContent="✖ Import misslyckades (kontrollera JSON)";
  }
}

/* ----------------------------
   Actions
---------------------------- */
function clearCurrentMatch(){
  const team=getTeamNo();
  const match=getMatchNo();
  localStorage.removeItem(kState(team,match));
  resetAllShiftDone(team,match);
  loadAndRenderPool();
}

function printPDF(){
  renderSchedule();
  window.print();
}

/* ----------------------------
   Service Worker (auto-update)
---------------------------- */
function setupSW(){
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker.register(`./sw.js?v=${APP_VERSION}`).catch(()=>{});

  navigator.serviceWorker.addEventListener("controllerchange", ()=>{
    if (window.__reloadedOnce) return;
    window.__reloadedOnce = true;
    location.reload();
  });
}

/* ----------------------------
   Wire UI
---------------------------- */
function wire(){
  const v=document.getElementById("versionPill");
  if (v) v.textContent = APP_VERSION;

  // nav
  document.getElementById("navHome").addEventListener("click", ()=>routeTo("#home"));
  document.getElementById("navPools").addEventListener("click", ()=>routeTo("#pools"));
  document.getElementById("navPool").addEventListener("click", ()=>routeTo("#pool"));
  document.getElementById("navRoster").addEventListener("click", ()=>routeTo("#trupp"));
  document.getElementById("navStats").addEventListener("click", ()=>routeTo("#stats"));

  // home buttons
  document.getElementById("btnGoRoster").addEventListener("click", ()=>routeTo("#trupp"));
  document.getElementById("btnNewPool").addEventListener("click", createPool);
  document.getElementById("btnNewPool2").addEventListener("click", createPool);
  document.getElementById("btnToPools").addEventListener("click", ()=>routeTo("#pools"));
  document.getElementById("btnGoalieStats").addEventListener("click", ()=>routeTo("#stats"));

  // pools view
  document.getElementById("btnCreatePool").addEventListener("click", createPool);

  // pool view
  document.getElementById("btnBackToPools").addEventListener("click", ()=>routeTo("#pools"));
  document.getElementById("btnPrint").addEventListener("click", printPDF);
  document.getElementById("btnClearMatch").addEventListener("click", clearCurrentMatch);
  document.getElementById("btnResetShifts").addEventListener("click", ()=>{
    const team=getTeamNo();
    const match=getMatchNo();
    if (!confirm("Nollställ alla ‘Gjort’-markeringar för denna match?")) return;
    resetAllShiftDone(team,match);
    renderSchedule();
  });

  // stats
  document.getElementById("btnBackFromStats").addEventListener("click", ()=>{
    if (getCurrentPoolId()) routeTo("#pool");
    else routeTo("#home");
  });

  // roster
  document.getElementById("btnCloseRoster").addEventListener("click", ()=>routeTo("#home"));
  document.getElementById("btnAddPlayer").addEventListener("click", ()=>{
    const inp=document.getElementById("inpNewPlayer");
    const name=String(inp.value||"").trim();
    if (!name) return;
    const {players, coaches}=loadRoster();
    players.push(name);
    saveRoster(players, coaches);
    inp.value="";
    renderRoster();
    refreshGoalieSelect();
  });
  document.getElementById("btnAddCoach").addEventListener("click", ()=>{
    const inp=document.getElementById("inpNewCoach");
    const name=String(inp.value||"").trim();
    if (!name) return;
    const {players, coaches}=loadRoster();
    coaches.push(name);
    saveRoster(players, coaches);
    inp.value="";
    renderRoster();
    refreshCoachMulti();
  });

  // import/export
  document.getElementById("btnImport").addEventListener("click", importBackupFromTextarea);
  document.getElementById("btnExport").addEventListener("click", exportBackup);

  // delegate buttons: pools + roster + shift toggle
  document.body.addEventListener("click", (e)=>{
    const btn=e.target.closest("button");
    if (!btn) return;

    const act=btn.getAttribute("data-act");
    const id=btn.getAttribute("data-id");

    if (act && id){
      if (act==="startPool") return startPool(id);
      if (act==="editPool") return editPool(id);
      if (act==="delPool") return deletePool(id);
    }

    if (act==="toggleShift"){
      const i=parseInt(btn.getAttribute("data-i")||"0",10);
      const team=getTeamNo();
      const match=getMatchNo();
      const now=loadShiftDone(team,match,i);
      setShiftDone(team,match,i,!now);
      __lastToggleIndex=i;
      renderSchedule();
      return;
    }

    // roster list edit/delete
    if (act==="delPlayer" || act==="editPlayer" || act==="delCoach" || act==="editCoach"){
      const idx=parseInt(btn.getAttribute("data-i")||"0",10);
      const {players, coaches}=loadRoster();

      if (act==="delPlayer"){
        players.splice(idx,1);
        saveRoster(players, coaches);
        renderRoster();
        refreshGoalieSelect();
        return;
      }
      if (act==="editPlayer"){
        const next=prompt("Redigera spelare:", players[idx]||"");
        if (next==null) return;
        const name=String(next).trim();
        if (!name) return;
        players[idx]=name;
        saveRoster(players, coaches);
        renderRoster();
        refreshGoalieSelect();
        return;
      }
      if (act==="delCoach"){
        coaches.splice(idx,1);
        saveRoster(players, coaches);
        renderRoster();
        refreshCoachMulti();
        return;
      }
      if (act==="editCoach"){
        const next=prompt("Redigera tränare:", coaches[idx]||"");
        if (next==null) return;
        const name=String(next).trim();
        if (!name) return;
        coaches[idx]=name;
        saveRoster(players, coaches);
        renderRoster();
        refreshCoachMulti();
        return;
      }
    }
  });

  // autosave fields
  ["matchDate","matchTime","opponent","arena","onCourt","periodsCount","periodMin","shiftSec","goalie"].forEach(id=>{
    const el=document.getElementById(id);
    el.addEventListener("change", ()=>{ saveState(); renderSchedule(); });
    el.addEventListener("input", ()=>{ saveState(); });
  });

  // teamSize changes players list
  document.getElementById("teamSize").addEventListener("change", ()=>{
    const n=parseInt(document.getElementById("teamSize").value||"10",10)||10;
    const st=getFormState();
    st.teamSize=String(n);
    st.players=Array.isArray(st.players)?st.players.slice(0,n):[];
    while(st.players.length<n) st.players.push("");
    renderPlayerSelectors(n, st.players);
    saveState();
    renderSchedule();
  });

  // coach multiselect saves per team
  document.getElementById("coach").addEventListener("change", ()=>{
    const team=getTeamNo();
    saveTeamCoachList(team, selectedValues(document.getElementById("coach")));
    renderSchedule();
  });

  // team changes
  document.getElementById("teamSelect").addEventListener("change", ()=>{
    applyMatchCount();
    refreshCoachMulti();
    loadAndRenderPool();
  });

  // matchCount changes
  document.getElementById("matchCount").addEventListener("change", ()=>{
    const team=getTeamNo();
    const n=parseInt(document.getElementById("matchCount").value||"4",10)||4;
    saveMatchCount(team,n);
    applyMatchCount();
    loadAndRenderPool();
  });

  // match changes
  document.getElementById("matchNo").addEventListener("change", ()=>{
    loadAndRenderPool();
  });

  window.addEventListener("hashchange", applyRoute);
}

/* ----------------------------
   Init
---------------------------- */
window.addEventListener("load", ()=>{
  // seed defaults once
  if (!localStorage.getItem(LS.players)) localStorage.setItem(LS.players, JSON.stringify(DEFAULT_PLAYERS));
  if (!localStorage.getItem(LS.coaches)) localStorage.setItem(LS.coaches, JSON.stringify(DEFAULT_COACHES));

  wire();
  setupSW();
  applyRoute();
  renderPoolsLists();
  renderRoster();
});