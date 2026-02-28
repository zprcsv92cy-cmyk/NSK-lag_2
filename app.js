const VERSION = "v61";

/* ----------------------------
  Default roster (Team 18)
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
  Simple view switching
---------------------------- */
const views = {
  home: document.getElementById("viewHome"),
  app: document.getElementById("viewApp"),
  roster: document.getElementById("viewRoster"),
  match: document.getElementById("viewMatch"),
};
function show(view){
  Object.values(views).forEach(v=>v.style.display="none");
  views[view].style.display="block";
}
show("home");

/* ----------------------------
  Utils
---------------------------- */
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
  if (parts.length===1) return parts[0];
  return `${parts[0]} ${parts[parts.length-1][0].toUpperCase()}`;
}
function mmss(totalSeconds){
  const s=Math.max(0, Math.floor(totalSeconds));
  const mm=String(Math.floor(s/60)).padStart(2,"0");
  const ss=String(s%60).padStart(2,"0");
  return `${mm}:${ss}`;
}

/* ----------------------------
  Storage keys
---------------------------- */
const K = {
  players: "players",
  coaches: "coaches",
  pools: "pools",
  currentPool: "currentPool",
};

function loadPlayers(){ return JSON.parse(localStorage.getItem(K.players)||"null") || DEFAULT_PLAYERS.slice(); }
function loadCoaches(){ return JSON.parse(localStorage.getItem(K.coaches)||"null") || DEFAULT_COACHES.slice(); }
function saveRoster(players, coaches){
  localStorage.setItem(K.players, JSON.stringify(uniq(players)));
  localStorage.setItem(K.coaches, JSON.stringify(uniq(coaches)));
}
function loadPools(){ return JSON.parse(localStorage.getItem(K.pools)||"[]"); }
function savePools(p){ localStorage.setItem(K.pools, JSON.stringify(p||[])); }
function getCurrentPool(){ return localStorage.getItem(K.currentPool)||""; }
function setCurrentPool(id){ localStorage.setItem(K.currentPool, id||""); }

function poolKeyPrefix(){
  const id=getCurrentPool();
  return `nsk_pool_${id}_`;
}
function keySettings(matchNo){
  return `${poolKeyPrefix()}match_${matchNo}_settings`;
}
function keyDone(matchNo){
  return `${poolKeyPrefix()}match_${matchNo}_done`; // array of 0/1
}

/* ----------------------------
  Roster UI
---------------------------- */
let players = uniq(loadPlayers());
let coaches = uniq(loadCoaches());

function renderRoster(){
  const pList=document.getElementById("playerList");
  pList.innerHTML = players.map((p,i)=>
    `<div class="row" style="justify-content:space-between">
      <div><b>${p}</b></div>
      <div class="row">
        <button onclick="editPlayer(${i})">Redigera</button>
        <button onclick="removePlayer(${i})">Ta bort</button>
      </div>
    </div>`
  ).join("");

  const cList=document.getElementById("coachList");
  cList.innerHTML = coaches.map((c,i)=>
    `<div class="row" style="justify-content:space-between">
      <div><b>${c}</b></div>
      <div class="row">
        <button onclick="editCoach(${i})">Redigera</button>
        <button onclick="removeCoach(${i})">Ta bort</button>
      </div>
    </div>`
  ).join("");

  saveRoster(players, coaches);
  renderPlayersSelectors(); // keep app in sync
  fillGoalie();
}
window.removePlayer = (i)=>{ players.splice(i,1); renderRoster(); };
window.removeCoach  = (i)=>{ coaches.splice(i,1); renderRoster(); };
window.editPlayer = (i)=>{
  const next=prompt("Redigera spelare:", players[i]||"");
  if (next==null) return;
  const name=String(next).trim(); if(!name) return;
  players[i]=name; renderRoster();
};
window.editCoach = (i)=>{
  const next=prompt("Redigera tränare:", coaches[i]||"");
  if (next==null) return;
  const name=String(next).trim(); if(!name) return;
  coaches[i]=name; renderRoster();
};

/* ----------------------------
  Pools UI
---------------------------- */
let pools = loadPools();

function renderPools(){
  const list=document.getElementById("poolList");
  if (!pools.length){
    list.innerHTML = "<div>Inga poolspel</div>";
    return;
  }
  list.innerHTML = pools.map(p=>`
    <div class="card">
      <div><b>${p.date}</b> · ${p.place}</div>
      <div class="row">
        <button class="primary" onclick="openPool('${p.id}')">Öppna</button>
        <button onclick="editPool('${p.id}')">Redigera</button>
        <button onclick="deletePool('${p.id}')">Ta bort</button>
      </div>
    </div>
  `).join("");
}
window.openPool = (id)=>{
  setCurrentPool(id);
  document.getElementById("currentPoolLabel").textContent = poolTitle();
  show("app");
  loadSettingsToUI();
  renderSchedule();
};
window.editPool = (id)=>{
  const p = pools.find(x=>x.id===id); if(!p) return;
  const d = prompt("Datum:", p.date||""); if (d==null) return;
  const pl = prompt("Plats:", p.place||""); if (pl==null) return;
  p.date=String(d).trim(); p.place=String(pl).trim();
  savePools(pools); renderPools();
  document.getElementById("currentPoolLabel").textContent = poolTitle();
};
window.deletePool = (id)=>{
  if (!confirm("Ta bort poolspel?")) return;
  pools = pools.filter(x=>x.id!==id);
  savePools(pools);
  // remove pool storage
  for (let i=localStorage.length-1;i>=0;i--){
    const k=localStorage.key(i);
    if (k && k.startsWith(`nsk_pool_${id}_`)) localStorage.removeItem(k);
  }
  if (getCurrentPool()===id) setCurrentPool("");
  renderPools();
};

function poolTitle(){
  const id=getCurrentPool();
  const p=pools.find(x=>x.id===id);
  return p ? `${p.date} · ${p.place}` : "Poolspel";
}

/* ----------------------------
  Settings UI (per pool + match)
---------------------------- */
const el = {
  onCourt: document.getElementById("onCourt"),
  teamSize: document.getElementById("teamSize"),
  matchMinutes: document.getElementById("matchMinutes"),
  shiftSec: document.getElementById("shiftSec"),
  goalie: document.getElementById("goalie"),
  matchNo: document.getElementById("matchNo"),
  scheduleOut: document.getElementById("scheduleOut"),
  playersContainer: document.getElementById("playersContainer"),
};

function fillSelectRange(select, start, end, step=1, defVal=null){
  select.innerHTML="";
  for (let v=start; v<=end; v+=step){
    const o=document.createElement("option");
    o.value=String(v);
    o.textContent=String(v);
    select.appendChild(o);
  }
  if (defVal!=null) select.value=String(defVal);
}
fillSelectRange(el.teamSize, 1, 25, 1, 10);
fillSelectRange(el.matchMinutes, 10, 60, 5, 30);
fillSelectRange(el.shiftSec, 30, 180, 5, 90);
fillSelectRange(el.matchNo, 1, 10, 1, 1);

function settingsFromUI(){
  return {
    onCourt: parseInt(el.onCourt.value||"3",10),
    teamSize: parseInt(el.teamSize.value||"10",10),
    matchMinutes: parseInt(el.matchMinutes.value||"30",10),
    shiftSec: parseInt(el.shiftSec.value||"90",10),
    goalie: el.goalie.value||"",
    // players ranking (first = best)
    ranking: getRankingFromSelectors(),
  };
}
function saveSettings(){
  const matchNo = el.matchNo.value || "1";
  localStorage.setItem(keySettings(matchNo), JSON.stringify(settingsFromUI()));
}
function loadSettingsToUI(){
  const matchNo = el.matchNo.value || "1";
  const raw = localStorage.getItem(keySettings(matchNo));
  const st = raw ? JSON.parse(raw) : null;
  if (!st) {
    renderPlayersSelectors(); fillGoalie();
    return;
  }
  el.onCourt.value = String(st.onCourt||3);
  el.teamSize.value = String(st.teamSize||10);
  el.matchMinutes.value = String(st.matchMinutes||30);
  el.shiftSec.value = String(st.shiftSec||90);

  renderPlayersSelectors(st.teamSize||10, Array.isArray(st.ranking)?st.ranking:[]);
  fillGoalie();
  el.goalie.value = st.goalie || "";
}

/* ----------------------------
  Player selectors (ranking)
---------------------------- */
function renderPlayersSelectors(teamSize=null, values=null){
  const n = Math.max(1, Math.min(25, teamSize || parseInt(el.teamSize.value||"10",10) || 10));
  const vals = Array.isArray(values) ? values.slice(0,n) : [];
  while (vals.length < n) vals.push("");

  el.playersContainer.innerHTML="";
  for (let i=1;i<=n;i++){
    const wrap=document.createElement("div");

    const lab=document.createElement("label");
    lab.textContent = `Spelare ${i} (ranking)`;

    const sel=document.createElement("select");
    sel.id = `p${i}`;

    const o0=document.createElement("option");
    o0.value=""; o0.textContent="Välj...";
    sel.appendChild(o0);

    players.forEach(name=>{
      const o=document.createElement("option");
      o.value=name; o.textContent=name;
      sel.appendChild(o);
    });

    sel.value = vals[i-1] || "";
    sel.addEventListener("change", ()=>{ saveSettings(); renderSchedule(); });

    wrap.appendChild(lab);
    wrap.appendChild(sel);
    el.playersContainer.appendChild(wrap);
  }
}
function renderPlayersSelectors(){
  renderPlayersSelectors(parseInt(el.teamSize.value||"10",10));
}
function getRankingFromSelectors(){
  const n = parseInt(el.teamSize.value||"10",10) || 10;
  const out=[];
  for (let i=1;i<=n;i++){
    const s=document.getElementById(`p${i}`);
    out.push(s ? (s.value||"") : "");
  }
  return out;
}
function fillGoalie(){
  el.goalie.innerHTML="";
  const o0=document.createElement("option");
  o0.value=""; o0.textContent="Välj...";
  el.goalie.appendChild(o0);
  players.forEach(name=>{
    const o=document.createElement("option");
    o.value=name; o.textContent=name;
    el.goalie.appendChild(o);
  });
}

/* ----------------------------
  AI Rotation (fair + avoid double swaps + ranking)
---------------------------- */
function rosterFromRanking(ranking){
  const raw = (ranking||[]).map(x=>String(x||"").trim()).filter(Boolean);
  const out=[]; const seen=new Set();
  for (const n of raw){
    const k=n.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k); out.push(n);
  }
  return out;
}
function makeRatings(roster){
  const r={};
  const n=roster.length;
  for (let i=0;i<n;i++) r[roster[i].toLowerCase()] = (n-i); // Spelare 1 högst
  return r;
}
function overlapCount(a,b){
  const s=new Set((a||[]).map(x=>x.toLowerCase()));
  let o=0;
  for (const x of (b||[])) if (s.has(x.toLowerCase())) o++;
  return o;
}
function combos(arr,k){
  const res=[];
  const idx=[];
  function rec(start,left){
    if(left===0){ res.push(idx.map(i=>arr[i])); return; }
    for(let i=start;i<=arr.length-left;i++){
      idx.push(i); rec(i+1,left-1); idx.pop();
    }
  }
  rec(0,k);
  return res;
}
function buildTimes(totalMin, shiftSec){
  const total = Math.floor(totalMin*60);
  const step = Math.max(1, Math.floor(shiftSec));
  const times=[];
  for (let t=total; t>0; t-=step) times.push(mmss(t));
  return times;
}

function buildRotationAI(settings){
  const roster = rosterFromRanking(settings.ranking);
  const kWanted = Math.min(5, Math.max(3, settings.onCourt|0));
  const k = Math.min(kWanted, roster.length || kWanted);
  if (!roster.length) return {times:[], rot:[]};

  const times = buildTimes(settings.matchMinutes, settings.shiftSec);
  const ratings = makeRatings(roster);
  const counts = {};
  roster.forEach(n=>counts[n.toLowerCase()]=0);

  // weights
  const W_FAIR=9, W_STR=3, W_CONT=7, PEN_DOUBLE=200;
  let prev=null;
  const rot=[];

  for (let i=0;i<times.length;i++){
    // build candidate pool (limited)
    const sorted = roster
      .map(n=>({n, c:counts[n.toLowerCase()]||0, r:ratings[n.toLowerCase()]||0}))
      .sort((a,b)=> a.c-b.c || b.r-a.r);

    const pool=[]; const seen=new Set();
    const add=(n)=>{ const k=n.toLowerCase(); if(seen.has(k)) return; seen.add(k); pool.push(n); };
    sorted.slice(0, Math.min(8, sorted.length)).forEach(x=>add(x.n));
    sorted.slice().sort((a,b)=>b.r-a.r).slice(0, Math.min(6, sorted.length)).forEach(x=>add(x.n));
    (prev||[]).forEach(add);
    roster.forEach(add);

    const P = pool.slice(0, Math.min(11, pool.length));
    const cands = combos(P,k).map(lineup=>{
      const minC = Math.min(...roster.map(n=>counts[n.toLowerCase()]||0));
      let fairPenalty=0, strength=0;
      lineup.forEach(n=>{
        fairPenalty += (counts[n.toLowerCase()]||0) - minC;
        strength += (ratings[n.toLowerCase()]||0);
      });
      const fairScore = -fairPenalty;

      const ov = prev ? overlapCount(prev,lineup) : 0;
      const delta = prev ? (k-ov) : k;
      const contScore = ov;

      const hasBench = roster.length > k;
      const doublePenalty = (hasBench && prev && delta>=2) ? -(PEN_DOUBLE*(delta-1)) : 0;

      const score = W_FAIR*fairScore + W_STR*strength + W_CONT*contScore + doublePenalty;
      return {lineup, score, delta};
    });

    cands.sort((a,b)=> b.score-a.score || a.delta-b.delta);
    let best = cands[0]?.lineup || [];
    if (prev && roster.length>k){
      const filtered = cands.filter(x=>x.delta<=1);
      if (filtered.length) best = filtered[0].lineup;
    }

    best.forEach(n=>counts[n.toLowerCase()] = (counts[n.toLowerCase()]||0)+1);
    rot.push(best);
    prev=best;
  }

  return {times, rot};
}

/* ----------------------------
  Done-state per pool+match
---------------------------- */
function loadDone(matchNo, len){
  const raw = localStorage.getItem(keyDone(matchNo));
  const arr = raw ? JSON.parse(raw) : [];
  const out = Array.isArray(arr) ? arr.slice(0,len) : [];
  while (out.length < len) out.push(0);
  return out;
}
function saveDone(matchNo, doneArr){
  localStorage.setItem(keyDone(matchNo), JSON.stringify(doneArr||[]));
}
function nextUndoneIndex(doneArr){
  for (let i=0;i<doneArr.length;i++) if (!doneArr[i]) return i;
  return null;
}

/* ----------------------------
  Render schedule
---------------------------- */
let __currentSchedule = null; // {times, rot, done, matchNo}

function renderSchedule(){
  if (!getCurrentPool()){
    el.scheduleOut.innerHTML = "<div class='card'>Välj eller skapa poolspel.</div>";
    return;
  }

  const matchNo = el.matchNo.value || "1";
  saveSettings();

  const settings = settingsFromUI();
  const {times, rot} = buildRotationAI(settings);
  const done = loadDone(matchNo, times.length);

  __currentSchedule = { times, rot, done, matchNo, settings };

  if (!times.length){
    el.scheduleOut.innerHTML = "<div class='card'>Välj spelare i ranking (minst antal på plan).</div>";
    return;
  }

  const rows = times.map((t,i)=>{
    const isDone = !!done[i];
    const lineup = (rot[i]||[]).map(shortName).join(", ") || "—";
    return `
      <tr class="${isDone ? "doneRow":""}" data-row="${i}">
        <td>${i+1}</td>
        <td>${t}</td>
        <td>${lineup}</td>
        <td><button data-mark="${i}">${isDone ? "✔ Gjort" : "Markera"}</button></td>
      </tr>
    `;
  }).join("");

  el.scheduleOut.innerHTML = `
    <table>
      <thead><tr><th>#</th><th>Tid kvar</th><th>På plan</th><th>Gjort</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  updateMatchModePanel(); // keep big panel in sync
}

document.body.addEventListener("click", (e)=>{
  const b = e.target.closest("button");
  if (!b) return;

  const mark = b.getAttribute("data-mark");
  if (mark != null && __currentSchedule){
    const i = parseInt(mark,10);
    const {done, matchNo} = __currentSchedule;
    done[i] = done[i] ? 0 : 1;
    saveDone(matchNo, done);
    renderSchedule();
  }
});

/* ----------------------------
  Match Mode + Wake Lock
---------------------------- */
let wakeLock = null;

async function requestWakeLock(){
  try{
    if (!("wakeLock" in navigator)) return false;
    wakeLock = await navigator.wakeLock.request("screen");
    wakeLock.addEventListener("release", ()=>{ wakeLock=null; });
    return true;
  }catch{
    wakeLock=null;
    return false;
  }
}
async function releaseWakeLock(){
  try{
    if (wakeLock) await wakeLock.release();
  }catch{}
  wakeLock=null;
}
document.addEventListener("visibilitychange", async ()=>{
  if (document.visibilityState !== "visible") return;
  if (views.match.style.display !== "none"){
    await requestWakeLock();
  }
});

function scrollToRow(i){
  const row = document.querySelector(`tr[data-row="${i}"]`);
  if (!row) return;
  row.scrollIntoView({behavior:"smooth", block:"center"});
}

function updateMatchModePanel(){
  if (views.match.style.display === "none") return;
  if (!__currentSchedule) return;

  const {times, rot, done} = __currentSchedule;
  const idx = nextUndoneIndex(done);
  const timeEl = document.getElementById("mm_time");
  const lineEl = document.getElementById("mm_lineup");
  const title = document.getElementById("matchTitle");

  title.textContent = poolTitle() + ` • Match ${__currentSchedule.matchNo}`;

  if (idx == null){
    timeEl.textContent = "—";
    lineEl.textContent = "Alla byten är markerade.";
    return;
  }
  timeEl.textContent = times[idx] || "—";
  lineEl.textContent = (rot[idx]||[]).map(shortName).join(", ") || "—";
}

document.getElementById("mm_markNext").addEventListener("click", ()=>{
  if (!__currentSchedule) return;
  const {done, matchNo} = __currentSchedule;
  const idx = nextUndoneIndex(done);
  if (idx == null) return;
  done[idx]=1;
  saveDone(matchNo, done);
  renderSchedule();
});
document.getElementById("mm_showInList").addEventListener("click", ()=>{
  if (!__currentSchedule) return;
  const idx = nextUndoneIndex(__currentSchedule.done);
  if (idx == null) return;
  show("app");
  scrollToRow(idx);
});
document.getElementById("exitMatchBtn").addEventListener("click", async ()=>{
  await releaseWakeLock();
  show("app");
});

/* ----------------------------
  Wire buttons
---------------------------- */
document.getElementById("openRosterBtn").onclick = ()=>{ show("roster"); renderRoster(); };
document.getElementById("backFromRosterBtn").onclick = ()=>show("home");
document.getElementById("backHomeBtn").onclick = ()=>show("home");

document.getElementById("addPlayerBtn").onclick = ()=>{
  const inp=document.getElementById("newPlayer");
  const v=String(inp.value||"").trim(); if(!v) return;
  players.push(v); players=uniq(players);
  inp.value=""; renderRoster();
};
document.getElementById("addCoachBtn").onclick = ()=>{
  const inp=document.getElementById("newCoach");
  const v=String(inp.value||"").trim(); if(!v) return;
  coaches.push(v); coaches=uniq(coaches);
  inp.value=""; renderRoster();
};

document.getElementById("newPoolspelBtn").onclick = ()=>{
  const date = prompt("Datum (YYYY-MM-DD):"); if(!date) return;
  const place = prompt("Plats:"); if(!place) return;
  const id = Date.now().toString(16);
  pools.push({id, date:String(date).trim(), place:String(place).trim()});
  savePools(pools);
  renderPools();
};

document.getElementById("btnGenerate").onclick = ()=>renderSchedule();
document.getElementById("btnResetDone").onclick = ()=>{
  if (!confirm("Nollställ alla ‘Gjort’ för denna match?")) return;
  const matchNo = el.matchNo.value || "1";
  localStorage.removeItem(keyDone(matchNo));
  renderSchedule();
};

document.getElementById("btnMatchMode").onclick = async ()=>{
  show("match");
  await requestWakeLock();
  updateMatchModePanel();
};

el.teamSize.addEventListener("change", ()=>{
  renderPlayersSelectors(parseInt(el.teamSize.value||"10",10));
  saveSettings(); renderSchedule();
});
el.onCourt.addEventListener("change", ()=>{ saveSettings(); renderSchedule(); });
el.matchMinutes.addEventListener("change", ()=>{ saveSettings(); renderSchedule(); });
el.shiftSec.addEventListener("change", ()=>{ saveSettings(); renderSchedule(); });
el.goalie.addEventListener("change", ()=>{ saveSettings(); });
el.matchNo.addEventListener("change", ()=>{ loadSettingsToUI(); renderSchedule(); });

/* ----------------------------
  Init
---------------------------- */
function renderPlayersSelectorsInitial(){
  renderPlayersSelectors(parseInt(el.teamSize.value||"10",10), []);
}
function renderPlayersSelectors(teamSize, values){
  const n = Math.max(1, Math.min(25, teamSize|0));
  const vals = Array.isArray(values) ? values.slice(0,n) : [];
  while (vals.length < n) vals.push("");

  el.playersContainer.innerHTML="";
  for (let i=1;i<=n;i++){
    const wrap=document.createElement("div");
    const lab=document.createElement("label");
    lab.textContent=`Spelare ${i} (ranking)`;

    const sel=document.createElement("select");
    sel.id=`p${i}`;

    const o0=document.createElement("option");
    o0.value=""; o0.textContent="Välj...";
    sel.appendChild(o0);

    players.forEach(name=>{
      const o=document.createElement("option");
      o.value=name; o.textContent=name;
      sel.appendChild(o);
    });

    sel.value = vals[i-1] || "";
    sel.addEventListener("change", ()=>{ saveSettings(); renderSchedule(); });

    wrap.appendChild(lab);
    wrap.appendChild(sel);
    el.playersContainer.appendChild(wrap);
  }
}

function renderPlayersSelectors(){
  renderPlayersSelectors(parseInt(el.teamSize.value||"10",10), getRankingFromSelectors());
}

function getRankingFromSelectors(){
  const n = parseInt(el.teamSize.value||"10",10) || 10;
  const out=[];
  for (let i=1;i<=n;i++){
    const s=document.getElementById(`p${i}`);
    out.push(s ? (s.value||"") : "");
  }
  return out;
}

function fillGoalie(){
  el.goalie.innerHTML="";
  const o0=document.createElement("option");
  o0.value=""; o0.textContent="Välj...";
  el.goalie.appendChild(o0);
  players.forEach(name=>{
    const o=document.createElement("option");
    o.value=name; o.textContent=name;
    el.goalie.appendChild(o);
  });
}

(function init(){
  document.getElementById("version").textContent = VERSION;

  // Seed roster if first run
  if (!localStorage.getItem(K.players)) localStorage.setItem(K.players, JSON.stringify(DEFAULT_PLAYERS));
  if (!localStorage.getItem(K.coaches)) localStorage.setItem(K.coaches, JSON.stringify(DEFAULT_COACHES));

  players = uniq(loadPlayers());
  coaches = uniq(loadCoaches());

  renderPools();
  renderRoster();

  // Start: if pool exists
  if (pools.length && getCurrentPool()){
    document.getElementById("currentPoolLabel").textContent = poolTitle();
  }

  renderPlayersSelectorsInitial();
  fillGoalie();
})();