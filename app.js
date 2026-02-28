const VERSION = "v62";

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
  Views
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
  Storage
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
  DOM refs
---------------------------- */
const el = {
  version: document.getElementById("version"),
  currentPoolLabel: document.getElementById("currentPoolLabel"),
  poolList: document.getElementById("poolList"),

  // app controls
  opponent: document.getElementById("opponent"),
  startTime: document.getElementById("startTime"),
  arena: document.getElementById("arena"),
  matchNo: document.getElementById("matchNo"),

  onCourt: document.getElementById("onCourt"),
  teamSize: document.getElementById("teamSize"),
  periodsCount: document.getElementById("periodsCount"),
  periodMin: document.getElementById("periodMin"),
  shiftSec: document.getElementById("shiftSec"),
  goalie: document.getElementById("goalie"),

  playersContainer: document.getElementById("playersContainer"),
  scheduleOut: document.getElementById("scheduleOut"),

  // roster
  playerList: document.getElementById("playerList"),
  coachList: document.getElementById("coachList"),
  newPlayer: document.getElementById("newPlayer"),
  newCoach: document.getElementById("newCoach"),

  // match mode
  matchTitle: document.getElementById("matchTitle"),
  mm_time: document.getElementById("mm_time"),
  mm_lineup: document.getElementById("mm_lineup"),
  mm_meta: document.getElementById("mm_meta"),
  mm_markNext: document.getElementById("mm_markNext"),
  mm_showInList: document.getElementById("mm_showInList"),
  exitMatchBtn: document.getElementById("exitMatchBtn"),
};

/* ----------------------------
  Seed roster on first run
---------------------------- */
if (!localStorage.getItem(K.players)) localStorage.setItem(K.players, JSON.stringify(DEFAULT_PLAYERS));
if (!localStorage.getItem(K.coaches)) localStorage.setItem(K.coaches, JSON.stringify(DEFAULT_COACHES));

let players = uniq(loadPlayers());
let coaches = uniq(loadCoaches());

/* ----------------------------
  Pools
---------------------------- */
let pools = loadPools();

function poolTitle(){
  const id=getCurrentPool();
  const p=pools.find(x=>x.id===id);
  return p ? `${p.date} · ${p.place}` : "Poolspel";
}

function renderPools(){
  if (!pools.length){
    el.poolList.innerHTML = "<div>Inga poolspel</div>";
    return;
  }
  el.poolList.innerHTML = pools.map(p=>`
    <div class="card">
      <div><b>${p.date}</b> · ${p.place}</div>
      <div class="row">
        <button class="primary" data-open="${p.id}">Öppna</button>
        <button data-edit="${p.id}">Redigera</button>
        <button data-del="${p.id}">Ta bort</button>
      </div>
    </div>
  `).join("");
}

el.poolList.addEventListener("click", (e)=>{
  const b = e.target.closest("button");
  if (!b) return;

  const openId = b.getAttribute("data-open");
  const editId = b.getAttribute("data-edit");
  const delId  = b.getAttribute("data-del");

  if (openId){
    setCurrentPool(openId);
    el.currentPoolLabel.textContent = poolTitle();
    show("app");
    loadSettingsToUI();
    renderSchedule();
    return;
  }
  if (editId){
    const p=pools.find(x=>x.id===editId); if(!p) return;
    const d=prompt("Datum (YYYY-MM-DD):", p.date||""); if(d==null) return;
    const pl=prompt("Plats:", p.place||""); if(pl==null) return;
    p.date=String(d).trim(); p.place=String(pl).trim();
    savePools(pools); renderPools();
    el.currentPoolLabel.textContent = poolTitle();
    return;
  }
  if (delId){
    if (!confirm("Ta bort poolspel?")) return;
    pools = pools.filter(x=>x.id!==delId);
    savePools(pools);

    // remove pool storage
    for (let i=localStorage.length-1;i>=0;i--){
      const k=localStorage.key(i);
      if (k && k.startsWith(`nsk_pool_${delId}_`)) localStorage.removeItem(k);
    }
    if (getCurrentPool()===delId) setCurrentPool("");
    renderPools();
    return;
  }
});

/* ----------------------------
  Roster view
---------------------------- */
function renderRoster(){
  el.playerList.innerHTML = players.map((p,i)=>`
    <div class="row" style="justify-content:space-between">
      <div><b>${p}</b></div>
      <div class="row">
        <button data-edit-player="${i}">Redigera</button>
        <button data-del-player="${i}">Ta bort</button>
      </div>
    </div>
  `).join("");

  el.coachList.innerHTML = coaches.map((c,i)=>`
    <div class="row" style="justify-content:space-between">
      <div><b>${c}</b></div>
      <div class="row">
        <button data-edit-coach="${i}">Redigera</button>
        <button data-del-coach="${i}">Ta bort</button>
      </div>
    </div>
  `).join("");

  saveRoster(players, coaches);
  fillGoalie();
  renderPlayerSelectors(); // keep app in sync
}

document.getElementById("viewRoster").addEventListener("click", (e)=>{
  const b = e.target.closest("button");
  if (!b) return;

  const ep = b.getAttribute("data-edit-player");
  const dp = b.getAttribute("data-del-player");
  const ec = b.getAttribute("data-edit-coach");
  const dc = b.getAttribute("data-del-coach");

  if (ep != null){
    const i=parseInt(ep,10);
    const next=prompt("Redigera spelare:", players[i]||"");
    if (next==null) return;
    const name=String(next).trim(); if(!name) return;
    players[i]=name; players=uniq(players); renderRoster(); renderSchedule();
    return;
  }
  if (dp != null){
    const i=parseInt(dp,10);
    players.splice(i,1); renderRoster(); renderSchedule();
    return;
  }
  if (ec != null){
    const i=parseInt(ec,10);
    const next=prompt("Redigera tränare:", coaches[i]||"");
    if (next==null) return;
    const name=String(next).trim(); if(!name) return;
    coaches[i]=name; coaches=uniq(coaches); renderRoster();
    return;
  }
  if (dc != null){
    const i=parseInt(dc,10);
    coaches.splice(i,1); renderRoster();
    return;
  }
});

document.getElementById("addPlayerBtn").onclick = ()=>{
  const v=String(el.newPlayer.value||"").trim(); if(!v) return;
  players=uniq(players.concat([v]));
  el.newPlayer.value="";
  renderRoster();
  renderSchedule();
};
document.getElementById("addCoachBtn").onclick = ()=>{
  const v=String(el.newCoach.value||"").trim(); if(!v) return;
  coaches=uniq(coaches.concat([v]));
  el.newCoach.value="";
  renderRoster();
};

/* ----------------------------
  Select helpers
---------------------------- */
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
fillSelectRange(el.periodMin, 8, 20, 1, 15);
fillSelectRange(el.shiftSec, 30, 180, 5, 90);
fillSelectRange(el.matchNo, 1, 10, 1, 1);

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

function getRankingFromSelectors(){
  const n = parseInt(el.teamSize.value||"10",10) || 10;
  const out=[];
  for (let i=1;i<=n;i++){
    const s=document.getElementById(`p${i}`);
    out.push(s ? (s.value||"") : "");
  }
  return out;
}

function renderPlayerSelectors(teamSize=null, values=null){
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
function renderPlayerSelectors(){
  renderPlayerSelectors(parseInt(el.teamSize.value||"10",10), getRankingFromSelectors());
}

/* ----------------------------
  Settings per pool+match
---------------------------- */
function settingsFromUI(){
  return {
    opponent: String(el.opponent.value||"").trim(),
    startTime: String(el.startTime.value||"").trim(),
    arena: String(el.arena.value||"1"),
    onCourt: parseInt(el.onCourt.value||"3",10),
    teamSize: parseInt(el.teamSize.value||"10",10),
    periodsCount: parseInt(el.periodsCount.value||"1",10),
    periodMin: parseInt(el.periodMin.value||"15",10),
    shiftSec: parseInt(el.shiftSec.value||"90",10),
    goalie: el.goalie.value||"",
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

  if (!st){
    el.opponent.value = "";
    el.startTime.value = "";
    el.arena.value = "1";
    renderPlayerSelectors();
    fillGoalie();
    return;
  }

  el.opponent.value = st.opponent || "";
  el.startTime.value = st.startTime || "";
  el.arena.value = String(st.arena || "1");
  el.onCourt.value = String(st.onCourt||3);
  el.teamSize.value = String(st.teamSize||10);
  el.periodsCount.value = String(st.periodsCount||1);
  el.periodMin.value = String(st.periodMin||15);
  el.shiftSec.value = String(st.shiftSec||90);

  renderPlayerSelectors(st.teamSize||10, Array.isArray(st.ranking)?st.ranking:[]);
  fillGoalie();
  el.goalie.value = st.goalie || "";
}

/* ----------------------------
  AI rotation (fair + avoid double swaps + ranking)
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
  for (let i=0;i<n;i++) r[roster[i].toLowerCase()] = (n-i);
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

  const totalMin = Math.max(1, (settings.periodsCount|0) * (settings.periodMin|0)); // inga pauser
  const times = buildTimes(totalMin, settings.shiftSec);

  const ratings = makeRatings(roster);
  const counts = {};
  roster.forEach(n=>counts[n.toLowerCase()]=0);

  const W_FAIR=9, W_STR=3, W_CONT=7, PEN_DOUBLE=200;
  let prev=null;
  const rot=[];

  for (let i=0;i<times.length;i++){
    const sorted = roster
      .map(n=>({n, c:counts[n.toLowerCase()]||0, r:ratings[n.toLowerCase()]||0}))
      .sort((a,b)=> a.c-b.c || b.r-a.r);

    const pool=[]; const seen=new Set();
    const add=(n)=>{ const kk=n.toLowerCase(); if(seen.has(kk)) return; seen.add(kk); pool.push(n); };
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
  Done state per pool+match
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
let __currentSchedule = null; // {times, rot, done, matchNo, settings}

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
    updateMatchModePanel();
    return;
  }

  const totalMin = (settings.periodsCount|0) * (settings.periodMin|0);
  const info = `
    <div class="card">
      <div><b>Motståndare:</b> ${settings.opponent || "—"}</div>
      <div><b>Starttid:</b> ${settings.startTime || "—"} • <b>Plan:</b> Plan ${settings.arena || "—"}</div>
      <div><b>Perioder:</b> ${settings.periodsCount} • <b>Periodtid:</b> ${settings.periodMin} min (inga pauser) • <b>Total:</b> ${totalMin} min</div>
      <div><b>Bytestid:</b> ${settings.shiftSec}s • <b>På plan:</b> ${settings.onCourt} • <b>Målvakt:</b> ${settings.goalie || "—"}</div>
    </div>
  `;

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

  el.scheduleOut.innerHTML = info + `
    <table>
      <thead><tr><th>#</th><th>Tid kvar</th><th>På plan</th><th>Gjort</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  updateMatchModePanel();
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

  const {times, rot, done, settings, matchNo} = __currentSchedule;
  const idx = nextUndoneIndex(done);

  const totalMin = (settings.periodsCount|0) * (settings.periodMin|0);
  const meta = `Match ${matchNo} • ${settings.opponent || "—"} • ${settings.startTime || "—"} • Plan ${settings.arena || "—"} • ${settings.periodsCount}×${settings.periodMin} = ${totalMin} min`;

  el.matchTitle.textContent = poolTitle();
  el.mm_meta.textContent = meta;

  if (idx == null){
    el.mm_time.textContent = "—";
    el.mm_lineup.textContent = "Alla byten är markerade.";
    return;
  }
  el.mm_time.textContent = times[idx] || "—";
  el.mm_lineup.textContent = (rot[idx]||[]).map(shortName).join(", ") || "—";
}

el.mm_markNext.addEventListener("click", ()=>{
  if (!__currentSchedule) return;
  const {done, matchNo} = __currentSchedule;
  const idx = nextUndoneIndex(done);
  if (idx == null) return;
  done[idx]=1;
  saveDone(matchNo, done);
  renderSchedule();
});
el.mm_showInList.addEventListener("click", ()=>{
  if (!__currentSchedule) return;
  const idx = nextUndoneIndex(__currentSchedule.done);
  if (idx == null) return;
  show("app");
  scrollToRow(idx);
});
el.exitMatchBtn.addEventListener("click", async ()=>{
  await releaseWakeLock();
  show("app");
});

/* ----------------------------
  Wire top buttons
---------------------------- */
document.getElementById("openRosterBtn").onclick = ()=>{ show("roster"); renderRoster(); };
document.getElementById("backFromRosterBtn").onclick = ()=>show("home");
document.getElementById("backHomeBtn").onclick = ()=>show("home");

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

/* Save+rerender when settings change */
[
  el.opponent, el.startTime, el.arena, el.onCourt, el.teamSize,
  el.periodsCount, el.periodMin, el.shiftSec, el.goalie
].forEach(x=>{
  x.addEventListener("change", ()=>{ saveSettings(); renderSchedule(); });
  if (x.tagName === "INPUT") x.addEventListener("input", ()=>{ saveSettings(); });
});
el.teamSize.addEventListener("change", ()=>{
  renderPlayerSelectors(parseInt(el.teamSize.value||"10",10), getRankingFromSelectors());
  saveSettings(); renderSchedule();
});
el.matchNo.addEventListener("change", ()=>{
  loadSettingsToUI();
  renderSchedule();
});

/* ----------------------------
  Init
---------------------------- */
(function init(){
  el.version.textContent = VERSION;

  players = uniq(loadPlayers());
  coaches = uniq(loadCoaches());

  renderPools();
  renderRoster();

  if (pools.length && getCurrentPool()){
    el.currentPoolLabel.textContent = poolTitle();
  }

  fillGoalie();
  renderPlayerSelectors(parseInt(el.teamSize.value||"10",10), []);

  // if already have a current pool, stay ready
  if (getCurrentPool()){
    el.currentPoolLabel.textContent = poolTitle();
    loadSettingsToUI();
  }
})();