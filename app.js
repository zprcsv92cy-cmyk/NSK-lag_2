/* v51 — adds #stats (goalie statistics) */

const APP_VERSION = "v51";

/* ---------------------------
   Default Team 18 roster
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

/* ---------------------------
   Storage helpers
---------------------------- */
const LS = {
  players: "nsk_players",
  coaches: "nsk_coaches",
  pools: "nsk_pools:v1",
  currentPool: "nsk_current_pool:v1",
};

function safeJsonParse(raw, fallback){
  try { return JSON.parse(raw); } catch { return fallback; }
}
function uniq(arr){
  const out=[]; const seen=new Set();
  for (const x of (arr||[])){
    const v=String(x||"").trim(); if(!v) continue;
    const k=v.toLowerCase(); if(seen.has(k)) continue;
    seen.add(k); out.push(v);
  }
  return out;
}
function nowId(){
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}
function setPill(text){
  const el=document.getElementById("saveState"); if(el) el.textContent=text;
}
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

/* ---------------------------
   Roster
---------------------------- */
function loadRoster(){
  const storedPlayers = safeJsonParse(localStorage.getItem(LS.players) || "[]", []);
  const storedCoaches = safeJsonParse(localStorage.getItem(LS.coaches) || "[]", []);
  const players = uniq(storedPlayers.concat(DEFAULT_PLAYERS)).sort((a,b)=>a.localeCompare(b,"sv"));
  const coaches = uniq(storedCoaches.concat(DEFAULT_COACHES)).sort((a,b)=>a.localeCompare(b,"sv"));
  return {players, coaches};
}
function saveRoster(players, coaches){
  localStorage.setItem(LS.players, JSON.stringify(uniq(players).sort((a,b)=>a.localeCompare(b,"sv"))));
  localStorage.setItem(LS.coaches, JSON.stringify(uniq(coaches).sort((a,b)=>a.localeCompare(b,"sv"))));
}

function renderRoster(){
  const {players, coaches} = loadRoster();
  const pl = document.getElementById("playerList");
  const cl = document.getElementById("coachList");

  if (pl){
    pl.innerHTML = players.map((name, idx)=>`
      <div class="listRow">
        <strong>${escapeHtml(name)}</strong>
        <div class="row">
          <button class="btn" data-act="editPlayer" data-i="${idx}">Redigera</button>
          <button class="btn" data-act="delPlayer" data-i="${idx}">Ta bort</button>
        </div>
      </div>
    `).join("") || `<div class="muted">Inga spelare.</div>`;
  }

  if (cl){
    cl.innerHTML = coaches.map((name, idx)=>`
      <div class="listRow">
        <strong>${escapeHtml(name)}</strong>
        <div class="row">
          <button class="btn" data-act="editCoach" data-i="${idx}">Redigera</button>
          <button class="btn" data-act="delCoach" data-i="${idx}">Ta bort</button>
        </div>
      </div>
    `).join("") || `<div class="muted">Inga tränare.</div>`;
  }
}

/* ---------------------------
   Pools
---------------------------- */
function loadPools(){
  return safeJsonParse(localStorage.getItem(LS.pools) || "[]", []);
}
function savePools(pools){
  localStorage.setItem(LS.pools, JSON.stringify(pools||[]));
}
function getCurrentPoolId(){
  return localStorage.getItem(LS.currentPool) || "";
}
function setCurrentPoolId(id){
  localStorage.setItem(LS.currentPool, id || "");
}
function formatPoolTitle(p){
  return `${p?.date || "—"} · ${p?.place || "—"}`;
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
  const id = nowId();
  pools.push({
    id,
    date: String(date).trim(),
    place: String(place).trim(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  savePools(pools);
  setCurrentPoolId(id);
  routeTo("#pool");
  renderAll();
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

  renderPoolsLists();
  updatePoolLabel();
}

function deletePool(id){
  if (!confirm("Ta bort detta poolspel?")) return;

  let pools = loadPools();
  pools = pools.filter(x=>x.id!==id);
  savePools(pools);

  // rensa poolens localStorage keys
  for (let i=localStorage.length-1; i>=0; i--){
    const k = localStorage.key(i);
    if (k && k.startsWith(`nsk_pool_${id}_`)) localStorage.removeItem(k);
  }

  if (getCurrentPoolId()===id){
    setCurrentPoolId("");
    routeTo("#pools");
  }

  renderAll();
}

function renderPoolsLists(){
  const pools = loadPools().slice().sort((a,b)=>String(b.date||"").localeCompare(String(a.date||"")));
  const wrap1 = document.getElementById("poolList");
  const wrap2 = document.getElementById("poolListHome");

  const html = !pools.length
    ? `<div class="muted">Inga sparade poolspel ännu.</div>`
    : pools.map(p=>`
        <div class="poolCard">
          <div class="poolTitle">${escapeHtml(p.date || "—")} <span class="poolMeta">· ${escapeHtml(p.place || "—")}</span></div>
          <div class="poolActions">
            <button class="btn btn--primary" data-act="startPool" data-id="${escapeHtml(p.id)}">Påbörja</button>
            <button class="btn" data-act="editPool" data-id="${escapeHtml(p.id)}">Redigera</button>
            <button class="btn" data-act="delPool" data-id="${escapeHtml(p.id)}">Ta bort</button>
          </div>
        </div>
      `).join("");

  if (wrap1) wrap1.innerHTML = html;
  if (wrap2) wrap2.innerHTML = html;
}

function startPool(id){
  setCurrentPoolId(id);
  routeTo("#pool");
  renderAll();
}

function updatePoolLabel(){
  const id = getCurrentPoolId();
  const pools = loadPools();
  const p = pools.find(x=>x.id===id);
  const label = document.getElementById("poolLabel");
  if (label) label.textContent = p ? formatPoolTitle(p) : "Poolspel";
}

/* ---------------------------
   Pool-specific keys
---------------------------- */
function poolPrefix(){
  const id = getCurrentPoolId();
  return `nsk_pool_${id}_`;
}
function kMatchCount(teamNo){
  return `${poolPrefix()}matchCount_team_${teamNo}`;
}
function kTeamCoaches(teamNo){
  return `${poolPrefix()}team_coaches_team_${teamNo}`;
}
function kState(teamNo, matchNo){
  return `${poolPrefix()}state_team_${teamNo}_match_${matchNo}`;
}

/* ---------------------------
   App state + form helpers
---------------------------- */
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

function loadMatchCount(teamNo){
  const raw = localStorage.getItem(kMatchCount(teamNo));
  const n = raw ? parseInt(raw,10) : 4;
  return (Number.isFinite(n) && n>=1 && n<=30) ? n : 4;
}
function saveMatchCount(teamNo, n){
  localStorage.setItem(kMatchCount(teamNo), String(n));
}

function loadTeamCoaches(teamNo){
  return safeJsonParse(localStorage.getItem(kTeamCoaches(teamNo)) || "[]", []);
}
function saveTeamCoaches(teamNo, arr){
  localStorage.setItem(kTeamCoaches(teamNo), JSON.stringify(uniq(arr)));
}

function getTeamNo(){ return document.getElementById("teamSelect")?.value || "1"; }
function getMatchNo(){ return document.getElementById("matchNo")?.value || "1"; }

function loadState(teamNo, matchNo){
  const raw = localStorage.getItem(kState(teamNo, matchNo));
  const st = raw ? safeJsonParse(raw, {}) : {};
  const d = defaultsState();
  const out = Object.assign(d, st || {});
  const n = parseInt(out.teamSize||"10",10) || 10;
  out.players = Array.isArray(out.players) ? out.players.slice(0,n) : [];
  while (out.players.length < n) out.players.push("");
  return out;
}

function saveState(){
  const teamNo = getTeamNo();
  const matchNo = getMatchNo();
  const st = getFormState();
  localStorage.setItem(kState(teamNo, matchNo), JSON.stringify(st));
  setPill("Sparat");
  clearTimeout(window.__pillT);
  window.__pillT = setTimeout(()=>setPill("Redo"), 700);
}

function getFormState(){
  const teamSize = document.getElementById("teamSize").value || "10";
  const n = parseInt(teamSize,10)||10;

  const players = [];
  for (let i=1;i<=n;i++){
    const sel = document.getElementById(`p${i}`);
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

function setFormState(st){
  const s = Object.assign(defaultsState(), st||{});
  document.getElementById("matchDate").value = s.matchDate || "";
  document.getElementById("matchTime").value = s.matchTime || "";
  document.getElementById("opponent").value = s.opponent || "";
  document.getElementById("arena").value = s.arena || "1";
  document.getElementById("teamSize").value = s.teamSize || "10";
  document.getElementById("onCourt").value = s.onCourt || "3";
  document.getElementById("periodsCount").value = s.periodsCount || "1";
  document.getElementById("periodMin").value = s.periodMin || "15";
  document.getElementById("shiftSec").value = s.shiftSec || "90";

  renderPlayerSelectors(parseInt(s.teamSize,10)||10, s.players||[]);
  refreshGoalieSelect();
  document.getElementById("goalie").value = s.goalie || "";
}

function clearCurrentMatch(){
  const teamNo = getTeamNo();
  const matchNo = getMatchNo();
  localStorage.removeItem(kState(teamNo, matchNo));
  loadAndRenderPool();
}

/* ---------------------------
   Dropdowns
---------------------------- */
function fillSelect(el, items, placeholder="Välj..."){
  el.innerHTML="";
  const o0=document.createElement("option");
  o0.value=""; o0.textContent=placeholder;
  el.appendChild(o0);
  for (const name of items){
    const o=document.createElement("option");
    o.value=name; o.textContent=name;
    el.appendChild(o);
  }
}

function refreshGoalieSelect(){
  const {players} = loadRoster();
  const goalie = document.getElementById("goalie");
  const current = goalie.value;
  fillSelect(goalie, players, "Välj...");
  goalie.value = current;
}

function refreshCoachMulti(){
  const {coaches} = loadRoster();
  const teamNo = getTeamNo();
  const sel = document.getElementById("coach");
  const chosen = new Set(loadTeamCoaches(teamNo).map(x=>String(x).toLowerCase()));

  sel.innerHTML="";
  for (const name of coaches){
    const o=document.createElement("option");
    o.value=name; o.textContent=name;
    o.selected = chosen.has(name.toLowerCase());
    sel.appendChild(o);
  }
}

function selectedValues(selectEl){
  return Array.from(selectEl.selectedOptions||[]).map(o=>o.value).filter(Boolean);
}

function renderPlayerSelectors(n, values){
  const {players} = loadRoster();
  const wrap = document.getElementById("playersContainer");
  wrap.innerHTML="";

  const wanted = Math.min(25, Math.max(1, n|0));
  const vals = Array.isArray(values) ? values.slice(0,wanted) : [];
  while (vals.length < wanted) vals.push("");

  for (let i=1;i<=wanted;i++){
    const box = document.createElement("div");
    const lab = document.createElement("label");
    lab.className="label";
    lab.textContent = `Spelare ${i}`;

    const sel = document.createElement("select");
    sel.className="select";
    sel.id = `p${i}`;

    const o0=document.createElement("option");
    o0.value=""; o0.textContent="Välj...";
    sel.appendChild(o0);

    for (const name of players){
      const o=document.createElement("option");
      o.value=name; o.textContent=name;
      sel.appendChild(o);
    }

    sel.value = vals[i-1] || "";
    sel.addEventListener("change", ()=>{ saveState(); renderSchedule(); });

    box.appendChild(lab);
    box.appendChild(sel);
    wrap.appendChild(box);
  }
}

/* ---------------------------
   Rotation schedule
---------------------------- */
function formatMMSS(sec){
  const s = Math.max(0, Math.floor(sec));
  const mm = String(Math.floor(s/60)).padStart(2,"0");
  const ss = String(s%60).padStart(2,"0");
  return `${mm}:${ss}`;
}
function buildTimes(totalMinutes, shiftSec){
  const total = Math.floor(totalMinutes*60);
  const step = Math.max(1, Math.floor(shiftSec));
  const out=[];
  for (let t=total; t>0; t-=step) out.push(formatMMSS(t));
  return out;
}

function validateState(st){
  const chosen = (st.players||[]).map(x=>(x||"").trim()).filter(Boolean);
  const set = new Set(chosen.map(x=>x.toLowerCase()));
  if (set.size !== chosen.length) return "Samma spelare är vald flera gånger.";
  if (st.goalie && set.has(st.goalie.toLowerCase())) return "Målvakt kan inte vara utespelare.";
  const onCourt = Math.min(5, Math.max(3, parseInt(st.onCourt,10)||3));
  if (chosen.length && chosen.length < onCourt) return `För få spelare valda. Antal på plan är ${onCourt}.`;
  return "";
}

function buildRotation(st, times){
  const roster = (st.players||[]).map(x=>(x||"").trim()).filter(Boolean);
  const k = Math.min(5, Math.max(3, parseInt(st.onCourt,10)||3));
  if (roster.length === 0) return times.map(()=>[]);

  const lineup = roster.slice(0, Math.min(k, roster.length));
  const bench = roster.slice(lineup.length);

  const result = [];
  let benchIndex = 0;

  for (let i=0;i<times.length;i++){
    result.push(lineup.slice());

    if (bench.length === 0) continue;

    const outIdx = i % lineup.length;
    const inPlayer = bench[benchIndex % bench.length];
    benchIndex++;

    const outPlayer = lineup[outIdx];
    lineup[outIdx] = inPlayer;

    const bpos = bench.indexOf(inPlayer);
    if (bpos >= 0) bench.splice(bpos, 1);
    bench.push(outPlayer);
  }

  return result;
}

function shortName(full){
  const parts = String(full||"").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  if (parts.length===1) return parts[0];
  return `${parts[0]} ${parts[parts.length-1][0].toUpperCase()}`;
}

function renderSchedule(){
  const msg = document.getElementById("msg");
  const out = document.getElementById("output");
  if (!msg || !out) return;

  const st = getFormState();
  const err = validateState(st);
  msg.innerHTML = err
    ? `<div class="err">✖ ${escapeHtml(err)}</div>`
    : `<div class="ok">✔ OK</div>`;

  const periods = Math.min(3, Math.max(1, parseInt(st.periodsCount,10)||1));
  const periodMin = parseInt(st.periodMin,10)||15;
  const shiftSec = parseInt(st.shiftSec,10)||90;
  const totalMin = periods * periodMin;

  const times = buildTimes(totalMin, shiftSec);
  const rot = buildRotation(st, times);

  const teamNo = getTeamNo();
  const matchNo = getMatchNo();
  const coaches = loadTeamCoaches(teamNo);
  const poolText = document.getElementById("poolLabel")?.textContent || "Poolspel";

  out.innerHTML = `
    <div class="muted" style="margin-bottom:10px">
      <b>${escapeHtml(poolText)}</b> • Lag ${escapeHtml(teamNo)} • Match ${escapeHtml(matchNo)}<br>
      Datum: <b>${escapeHtml(st.matchDate||"—")}</b> • Start: <b>${escapeHtml(st.matchTime||"—")}</b><br>
      Motståndare: <b>${escapeHtml(st.opponent||"—")}</b> • Plan: <b>${escapeHtml("Plan " + (st.arena||"—"))}</b><br>
      Tränare: <b>${escapeHtml(coaches.join(", ") || "—")}</b> • Målvakt: <b>${escapeHtml(st.goalie||"—")}</b>
    </div>

    <table>
      <thead><tr><th>#</th><th>Tid kvar</th><th>På plan</th></tr></thead>
      <tbody>
        ${times.map((t,i)=>`
          <tr>
            <td>${i+1}</td>
            <td>${escapeHtml(t)}</td>
            <td>${escapeHtml((rot[i]||[]).map(shortName).join(", ") || "—")}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

/* ---------------------------
   Statistics (Goalies)
---------------------------- */
function renderStats(){
  const out = document.getElementById("statsOut");
  const meta = document.getElementById("statsMeta");
  if (!out) return;

  const pools = loadPools();
  const curId = getCurrentPoolId();
  const cur = pools.find(p=>p.id===curId);

  // collect goalie selections across pools (or current pool if exists)
  const poolIds = curId ? [curId] : pools.map(p=>p.id);
  const counts = new Map();
  const rows = [];

  for (const pid of poolIds){
    for (let team=1; team<=3; team++){
      const prefix = `nsk_pool_${pid}_`;
      const mcKey = `${prefix}matchCount_team_${team}`;
      const mc = parseInt(localStorage.getItem(mcKey)||"4",10) || 4;

      for (let m=1; m<=mc; m++){
        const stKey = `${prefix}state_team_${team}_match_${m}`;
        const st = safeJsonParse(localStorage.getItem(stKey) || "null", null);
        if (!st) continue;

        const goalie = String(st.goalie || "").trim();
        if (!goalie) continue;

        const k = goalie.toLowerCase();
        counts.set(k, (counts.get(k)||0) + 1);

        rows.push({
          poolId: pid,
          team,
          match: m,
          date: st.matchDate || "",
          time: st.matchTime || "",
          opponent: st.opponent || "",
          goalie
        });
      }
    }
  }

  const title = cur ? `Visar statistik för: ${formatPoolTitle(cur)}` : `Visar statistik för: Alla poolspel`;
  if (meta) meta.textContent = title;

  if (counts.size === 0){
    out.innerHTML = `<div class="muted">Ingen målvakt är vald ännu i sparade matcher.</div>`;
    return;
  }

  const summary = Array.from(counts.entries())
    .map(([k,v])=>({name: rows.find(r=>r.goalie.toLowerCase()===k)?.goalie || k, count:v}))
    .sort((a,b)=>b.count-a.count || a.name.localeCompare(b.name,"sv"));

  const detail = rows.slice().sort((a,b)=>{
    if (a.poolId !== b.poolId) return String(a.poolId).localeCompare(String(b.poolId));
    if (a.team !== b.team) return a.team - b.team;
    return a.match - b.match;
  });

  out.innerHTML = `
    <div class="card" style="margin:0 0 14px 0">
      <div class="h2" style="margin-top:0">Summering</div>
      <table>
        <thead><tr><th>Målvakt</th><th>Antal matcher</th></tr></thead>
        <tbody>
          ${summary.map(x=>`<tr><td>${escapeHtml(x.name)}</td><td>${x.count}</td></tr>`).join("")}
        </tbody>
      </table>
    </div>

    <div class="card" style="margin:0">
      <div class="h2" style="margin-top:0">Detaljer</div>
      <table>
        <thead><tr><th>Lag</th><th>Match</th><th>Datum</th><th>Start</th><th>Motstånd</th><th>Målvakt</th></tr></thead>
        <tbody>
          ${detail.map(r=>`
            <tr>
              <td>${r.team}</td>
              <td>${r.match}</td>
              <td>${escapeHtml(r.date||"—")}</td>
              <td>${escapeHtml(r.time||"—")}</td>
              <td>${escapeHtml(r.opponent||"—")}</td>
              <td>${escapeHtml(r.goalie)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
      <div class="muted" style="margin-top:10px">
        Tips: För statistik per specifikt poolspel, öppna poolen först och gå sedan till Statistik.
      </div>
    </div>
  `;
}

/* ---------------------------
   Views + routing
---------------------------- */
function hideAll(){
  for (const id of ["viewHome","viewRoster","viewPools","viewPool","viewStats"]){
    const el=document.getElementById(id);
    if (el) el.style.display="none";
  }
}
function show(id){
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

  if (h === "#trupp"){
    show("viewRoster");
    renderRoster();
    return;
  }

  if (h === "#pools"){
    show("viewPools");
    renderPoolsLists();
    return;
  }

  if (h === "#pool"){
    if (!getCurrentPoolId()){
      routeTo("#pools");
      return;
    }
    show("viewPool");
    loadAndRenderPool();
    return;
  }

  if (h === "#stats"){
    show("viewStats");
    renderStats();
    return;
  }

  show("viewHome");
  renderPoolsLists();
}

function loadAndRenderPool(){
  updatePoolLabel();
  fillPoolDropdowns();
  refreshCoachMulti();

  const teamNo = getTeamNo();
  const matchNo = getMatchNo();
  const st = loadState(teamNo, matchNo);
  setFormState(st);

  refreshCoachMulti();
  applyCoachSelections(teamNo);

  renderSchedule();
}

function applyCoachSelections(teamNo){
  const sel = document.getElementById("coach");
  const chosen = new Set(loadTeamCoaches(teamNo).map(x=>String(x).toLowerCase()));
  for (const opt of sel.options){
    opt.selected = chosen.has(String(opt.value).toLowerCase());
  }
}

function fillPoolDropdowns(){
  const mc = document.getElementById("matchCount");
  mc.innerHTML="";
  for (let i=1;i<=30;i++){
    const o=document.createElement("option");
    o.value=String(i); o.textContent=String(i);
    mc.appendChild(o);
  }

  const ts = document.getElementById("teamSize");
  ts.innerHTML="";
  for (let i=1;i<=25;i++){
    const o=document.createElement("option");
    o.value=String(i); o.textContent=String(i);
    ts.appendChild(o);
  }

  const pm = document.getElementById("periodMin");
  pm.innerHTML="";
  for (let i=8;i<=20;i++){
    const o=document.createElement("option");
    o.value=String(i); o.textContent=String(i);
    pm.appendChild(o);
  }

  const ss = document.getElementById("shiftSec");
  ss.innerHTML="";
  for (let i=30;i<=180;i+=5){
    const o=document.createElement("option");
    o.value=String(i); o.textContent=String(i);
    ss.appendChild(o);
  }

  const teamNo = getTeamNo();
  const count = loadMatchCount(teamNo);
  mc.value = String(count);

  const mn = document.getElementById("matchNo");
  const current = parseInt(mn.value||"1",10) || 1;
  mn.innerHTML="";
  for (let i=1;i<=count;i++){
    const o=document.createElement("option");
    o.value=String(i); o.textContent=`Match ${i}`;
    mn.appendChild(o);
  }
  mn.value = String(Math.min(Math.max(current,1), count));

  refreshGoalieSelect();
}

/* ---------------------------
   Import / Export
---------------------------- */
function exportBackup(){
  const payload = {
    players: loadRoster().players,
    coaches: loadRoster().coaches,
    pools: loadPools(),
    kv: {}
  };
  for (let i=0;i<localStorage.length;i++){
    const k = localStorage.key(i);
    if (!k) continue;
    if (k.startsWith("nsk_pool_")) payload.kv[k] = safeJsonParse(localStorage.getItem(k) || "null", localStorage.getItem(k));
  }
  const txt = JSON.stringify(payload, null, 2);
  const blob = new Blob([txt], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href=url;
  a.download="nsk-lag-backup.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importBackupFromTextarea(){
  const ta = document.getElementById("inpImportJson");
  const msg = document.getElementById("importMsg");
  if (!ta) return;

  try{
    const data = JSON.parse(ta.value || "{}");

    const players = Array.isArray(data.players) ? data.players : [];
    const coaches = Array.isArray(data.coaches) ? data.coaches : [];
    saveRoster(players, coaches);

    if (Array.isArray(data.pools)){
      savePools(data.pools);
      if (!getCurrentPoolId() && data.pools[0]?.id) setCurrentPoolId(data.pools[0].id);
    }

    if (data.kv && typeof data.kv === "object"){
      for (const [k,v] of Object.entries(data.kv)){
        if (!k.startsWith("nsk_pool_")) continue;
        localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
      }
    }

    if (msg) msg.textContent = "✔ Import klar";
    ta.value = "";

    renderRoster();
    renderPoolsLists();
  } catch(e){
    if (msg) msg.textContent = "✖ Import misslyckades (kontrollera JSON)";
  }
}

/* ---------------------------
   PDF / print
---------------------------- */
function printPDF(){
  renderSchedule();
  window.print();
}

/* ---------------------------
   Service worker — auto update
---------------------------- */
function setupSW(){
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker.register("./sw.js").catch(()=>{});

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (window.__reloadedOnce) return;
    window.__reloadedOnce = true;
    location.reload();
  });
}

/* ---------------------------
   Wire events (no inline onclick)
---------------------------- */
function wire(){
  const v = document.getElementById("versionPill");
  if (v) v.textContent = APP_VERSION;

  document.getElementById("navHome").addEventListener("click", ()=>routeTo("#home"));
  document.getElementById("navRoster").addEventListener("click", ()=>routeTo("#trupp"));
  document.getElementById("navPool").addEventListener("click", ()=>routeTo("#pools"));
  document.getElementById("navStats").addEventListener("click", ()=>routeTo("#stats"));

  document.getElementById("btnGoRoster").addEventListener("click", ()=>routeTo("#trupp"));
  document.getElementById("btnNewPool").addEventListener("click", createPool);
  document.getElementById("btnNewPool2").addEventListener("click", createPool);
  document.getElementById("btnGoalieStats").addEventListener("click", ()=>routeTo("#stats"));

  document.getElementById("btnBackFromStats").addEventListener("click", ()=>{
    // go back to pool if you came from pool, else home
    if (getCurrentPoolId()) routeTo("#pool");
    else routeTo("#home");
  });

  document.getElementById("btnCloseRoster").addEventListener("click", ()=>routeTo("#home"));

  document.getElementById("btnAddPlayer").addEventListener("click", ()=>{
    const inp = document.getElementById("inpNewPlayer");
    const name = String(inp.value||"").trim();
    if (!name) return;
    const {players, coaches} = loadRoster();
    players.push(name);
    saveRoster(players, coaches);
    inp.value="";
    renderRoster();
    refreshGoalieSelect();
  });

  document.getElementById("btnAddCoach").addEventListener("click", ()=>{
    const inp = document.getElementById("inpNewCoach");
    const name = String(inp.value||"").trim();
    if (!name) return;
    const {players, coaches} = loadRoster();
    coaches.push(name);
    saveRoster(players, coaches);
    inp.value="";
    renderRoster();
  });

  document.getElementById("viewRoster").addEventListener("click", (e)=>{
    const btn = e.target.closest("button");
    if (!btn) return;
    const act = btn.getAttribute("data-act");
    if (!act) return;

    const idx = parseInt(btn.getAttribute("data-i")||"0",10);

    if (act==="delPlayer"){
      const {players, coaches} = loadRoster();
      players.splice(idx,1);
      saveRoster(players, coaches);
      renderRoster();
      refreshGoalieSelect();
      return;
    }
    if (act==="editPlayer"){
      const {players, coaches} = loadRoster();
      const next = prompt("Redigera spelare:", players[idx]||"");
      if (next==null) return;
      const name = String(next).trim();
      if (!name) return;
      players[idx]=name;
      saveRoster(players, coaches);
      renderRoster();
      refreshGoalieSelect();
      return;
    }

    if (act==="delCoach"){
      const {players, coaches} = loadRoster();
      coaches.splice(idx,1);
      saveRoster(players, coaches);
      renderRoster();
      return;
    }
    if (act==="editCoach"){
      const {players, coaches} = loadRoster();
      const next = prompt("Redigera tränare:", coaches[idx]||"");
      if (next==null) return;
      const name = String(next).trim();
      if (!name) return;
      coaches[idx]=name;
      saveRoster(players, coaches);
      renderRoster();
      return;
    }
  });

  document.getElementById("btnImport").addEventListener("click", importBackupFromTextarea);
  document.getElementById("btnExport").addEventListener("click", exportBackup);

  document.body.addEventListener("click", (e)=>{
    const btn = e.target.closest("button");
    if (!btn) return;
    const act = btn.getAttribute("data-act");
    const id = btn.getAttribute("data-id");
    if (!act || !id) return;

    if (act==="startPool") return startPool(id);
    if (act==="editPool") return editPool(id);
    if (act==="delPool") return deletePool(id);
  });

  document.getElementById("btnBackToPools").addEventListener("click", ()=>routeTo("#pools"));
  document.getElementById("btnPrint").addEventListener("click", printPDF);
  document.getElementById("btnClearMatch").addEventListener("click", clearCurrentMatch);

  const autos = ["matchDate","matchTime","opponent","arena","onCourt","periodsCount","periodMin","shiftSec","goalie"];
  autos.forEach(id=>{
    const el = document.getElementById(id);
    el.addEventListener("change", ()=>{ saveState(); renderSchedule(); });
    el.addEventListener("input", ()=>{ saveState(); });
  });

  document.getElementById("teamSize").addEventListener("change", ()=>{
    const n = parseInt(document.getElementById("teamSize").value||"10",10)||10;
    const st = getFormState();
    st.teamSize = String(n);
    st.players = Array.isArray(st.players) ? st.players.slice(0,n) : [];
    while (st.players.length < n) st.players.push("");
    renderPlayerSelectors(n, st.players);
    saveState();
    renderSchedule();
  });

  document.getElementById("teamSelect").addEventListener("change", ()=>{
    fillPoolDropdowns();
    refreshCoachMulti();
    applyCoachSelections(getTeamNo());
    loadAndRenderPool();
  });

  document.getElementById("matchCount").addEventListener("change", ()=>{
    const teamNo = getTeamNo();
    const n = parseInt(document.getElementById("matchCount").value||"4",10)||4;
    saveMatchCount(teamNo, n);
    fillPoolDropdowns();
    loadAndRenderPool();
  });

  document.getElementById("matchNo").addEventListener("change", ()=>{
    loadAndRenderPool();
  });

  document.getElementById("coach").addEventListener("change", ()=>{
    const teamNo = getTeamNo();
    saveTeamCoaches(teamNo, selectedValues(document.getElementById("coach")));
    renderSchedule();
  });

  window.addEventListener("hashchange", applyRoute);
}

/* ---------------------------
   Render everything
---------------------------- */
function renderAll(){
  renderPoolsLists();
  renderRoster();
  if (location.hash.toLowerCase()==="#pool"){
    loadAndRenderPool();
  }
  if (location.hash.toLowerCase()==="#stats"){
    renderStats();
  }
}

/* ---------------------------
   Init
---------------------------- */
window.addEventListener("load", ()=>{
  loadRoster();
  if (!localStorage.getItem(LS.players)) localStorage.setItem(LS.players, JSON.stringify(DEFAULT_PLAYERS));
  if (!localStorage.getItem(LS.coaches)) localStorage.setItem(LS.coaches, JSON.stringify(DEFAULT_COACHES));

  wire();
  setupSW();
  applyRoute();
  renderAll();
});