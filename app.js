'use strict';

/* =========================
   VERSION
========================= */
const APP_VERSION = 'latest';
document.addEventListener('DOMContentLoaded', () => {
  const v = document.getElementById('versionPill');
  if (v) v.textContent = `v-${APP_VERSION}`;
});

/* =========================
   KEYS + DEFAULTS
========================= */
const LS_PLAYERS = 'nsk_players';
const LS_COACHES = 'nsk_coaches';
const LS_POOLS   = 'nsk_pools:v1';
const LS_CURRENT = 'nsk_pool_current:v1';

const DEFAULT_PLAYERS = [
  "Agnes Danielsson","Albert Zillén","Albin Andersson","Aron Warensjö-Sommar","August Hasselberg",
  "Benjamin Linderström","Charlie Carman","Emil Tranborg","Enzo Olsson","Gunnar Englund",
  "Henry Gauffin","Linus Stolt","Melker Axbom","Måns Åkvist","Nelson Östergren","Nicky Selander",
  "Nikola Kosoderc","Noé Bonnafous Sand","Oliver Engström","Oliver Zoumblios","Pelle Åstrand",
  "Simon Misiorny","Sixten Bratt","Theo Ydrenius","Viggo Kronvall","Yuktha reddy Semberi"
];
const DEFAULT_COACHES = [
  "Fredrik Selander","Joakim Lund","Linus Öhman","Niklas Gauffin","Olle Åstrand",
  "Peter Hasselberg","Tommy Englund","William Åkvist"
];

function safeJSON(raw, fallback){
  try { return JSON.parse(raw); } catch { return fallback; }
}
function uniqSorted(arr){
  const seen = new Set();
  const out = [];
  for (const x of (arr||[])){
    const v = String(x||'').trim();
    if (!v) continue;
    const k = v.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  out.sort((a,b)=>a.localeCompare(b,'sv'));
  return out;
}
function shortName(full){
  const parts = String(full||'').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length-1][0].toUpperCase()}`;
}

/* =========================
   LOAD/SAVE ROSTER
========================= */
function loadRoster(){
  const p = safeJSON(localStorage.getItem(LS_PLAYERS), []);
  const c = safeJSON(localStorage.getItem(LS_COACHES), []);
  const players = uniqSorted(p.concat(DEFAULT_PLAYERS));
  const coaches = uniqSorted(c.concat(DEFAULT_COACHES));
  return {players, coaches};
}
function saveRoster(players, coaches){
  localStorage.setItem(LS_PLAYERS, JSON.stringify(uniqSorted(players)));
  localStorage.setItem(LS_COACHES, JSON.stringify(uniqSorted(coaches)));
}

/* =========================
   POOLS
========================= */
function loadPools(){
  return safeJSON(localStorage.getItem(LS_POOLS), []);
}
function savePools(pools){
  localStorage.setItem(LS_POOLS, JSON.stringify(pools||[]));
}
function getCurrentPoolId(){
  return localStorage.getItem(LS_CURRENT) || '';
}
function setCurrentPoolId(id){
  localStorage.setItem(LS_CURRENT, id||'');
  renderPoolLists();
  renderPoolMeta();
}
function formatPoolTitle(p){
  return `${p?.date||'—'} · ${p?.place||'—'}`;
}
function genId(){
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}
function createPool(){
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth()+1).padStart(2,'0');
  const dd = String(now.getDate()).padStart(2,'0');
  const date = prompt('Datum (YYYY-MM-DD):', `${yyyy}-${mm}-${dd}`);
  if (date == null) return;
  const place = prompt('Plats:', '');
  if (place == null) return;

  const pools = loadPools();
  const id = genId();
  pools.push({id, date:String(date).trim(), place:String(place).trim(), createdAt:Date.now()});
  savePools(pools);
  setCurrentPoolId(id);
  go('#pool');
}
function editPool(id){
  const pools = loadPools();
  const p = pools.find(x=>x.id===id);
  if (!p) return;
  const date = prompt('Datum (YYYY-MM-DD):', p.date||'');
  if (date == null) return;
  const place = prompt('Plats:', p.place||'');
  if (place == null) return;
  p.date = String(date).trim();
  p.place = String(place).trim();
  p.updatedAt = Date.now();
  savePools(pools);
  renderPoolLists();
  renderPoolMeta();
}
function deletePool(id){
  if (!confirm('Ta bort detta poolspel?')) return;
  const pools = loadPools().filter(x=>x.id!==id);
  savePools(pools);
  if (getCurrentPoolId() === id){
    setCurrentPoolId('');
  }
}

/* =========================
   STATE KEYS PER POOL/MATCH
========================= */
function poolPrefix(){
  const id = getCurrentPoolId();
  return id ? `nsk_pool_${id}_` : 'nsk_pool__';
}
function stateKey(matchNo){
  return `${poolPrefix()}state_match_${matchNo}`;
}
function doneKey(matchNo){
  return `${poolPrefix()}shiftDone_match_${matchNo}`;
}
function defaultsState(){
  return {
    matchDate:'', matchTime:'', opponent:'', arena:'1',
    teamSize:'10', onCourt:'3',
    periodsCount:'1', periodMin:'15', shiftSec:'90',
    players: Array(10).fill(''),
    goalie:''
  };
}
function loadState(matchNo){
  const raw = localStorage.getItem(stateKey(matchNo));
  return Object.assign(defaultsState(), safeJSON(raw, {}));
}
function saveState(matchNo, st){
  localStorage.setItem(stateKey(matchNo), JSON.stringify(st||{}));
  const pill = document.getElementById('saveState');
  if (pill){
    pill.textContent = 'Sparat';
    clearTimeout(window.__pillT);
    window.__pillT = setTimeout(()=>pill.textContent='Redo', 700);
  }
}

/* =========================
   UI ROUTING
========================= */
function setActiveTab(hash){
  document.querySelectorAll('.tab').forEach(b=>{
    b.classList.toggle('is-active', (b.getAttribute('data-go')||'') === hash);
  });
}
function showView(id){
  ['viewHome','viewTrupp','viewPool'].forEach(v=>{
    const el = document.getElementById(v);
    if (el) el.classList.toggle('hidden', v !== id);
  });
}
function go(hash){
  const h = (hash||'#home').toLowerCase();
  history.replaceState(null,'',h);
  if (h === '#trupp'){
    showView('viewTrupp');
    setActiveTab('#trupp');
    renderTrupp();
    return;
  }
  if (h === '#pool'){
    showView('viewPool');
    setActiveTab('#pool');
    ensurePoolSelected();
    renderPoolMeta();
    renderMatchUI();
    return;
  }
  showView('viewHome');
  setActiveTab('#home');
  renderPoolLists();
}
window.addEventListener('hashchange', ()=>go(location.hash||'#home'));

/* =========================
   TRUPP CRUD (inline edit)
========================= */
let editP = null;
let editC = null;

function renderTrupp(){
  const {players, coaches} = loadRoster();

  const pl = document.getElementById('playerList');
  const cl = document.getElementById('coachList');

  if (pl){
    pl.innerHTML = players.map((n,i)=>{
      const editing = editP === i;
      if (editing){
        return `
          <div class="listItem">
            <input class="inlineEdit" data-kind="p" data-idx="${i}" value="${escapeHtml(n)}">
            <div class="actions">
              <button class="btn" data-action="save-edit" data-kind="p" data-idx="${i}">Spara</button>
              <button class="btn ghost" data-action="cancel-edit">Avbryt</button>
            </div>
          </div>`;
      }
      return `
        <div class="listItem">
          <div>${escapeHtml(n)}</div>
          <div class="actions">
            <button class="btn ghost" data-action="begin-edit" data-kind="p" data-idx="${i}">Redigera</button>
            <button class="btn ghost" data-action="del-player" data-idx="${i}">Ta bort</button>
          </div>
        </div>`;
    }).join('') || `<div class="small">Inga spelare.</div>`;
  }

  if (cl){
    cl.innerHTML = coaches.map((n,i)=>{
      const editing = editC === i;
      if (editing){
        return `
          <div class="listItem">
            <input class="inlineEdit" data-kind="c" data-idx="${i}" value="${escapeHtml(n)}">
            <div class="actions">
              <button class="btn" data-action="save-edit" data-kind="c" data-idx="${i}">Spara</button>
              <button class="btn ghost" data-action="cancel-edit">Avbryt</button>
            </div>
          </div>`;
      }
      return `
        <div class="listItem">
          <div>${escapeHtml(n)}</div>
          <div class="actions">
            <button class="btn ghost" data-action="begin-edit" data-kind="c" data-idx="${i}">Redigera</button>
            <button class="btn ghost" data-action="del-coach" data-idx="${i}">Ta bort</button>
          </div>
        </div>`;
    }).join('') || `<div class="small">Inga tränare.</div>`;
  }

  // bind Enter to save
  document.querySelectorAll('.inlineEdit').forEach(inp=>{
    inp.addEventListener('keydown', (e)=>{
      if (e.key === 'Enter'){
        const kind = inp.getAttribute('data-kind');
        const idx = parseInt(inp.getAttribute('data-idx')||'0',10);
        saveInline(kind, idx, inp.value);
      }
    });
  });
}
function saveInline(kind, idx, value){
  const name = String(value||'').trim();
  if (!name) return;
  const {players, coaches} = loadRoster();
  if (kind === 'p'){
    players[idx] = name;
    saveRoster(players, coaches);
    editP = null;
  } else {
    coaches[idx] = name;
    saveRoster(players, coaches);
    editC = null;
  }
  renderTrupp();
  refreshRosterSelectors();
  renderMatchUI();
}
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[m]));
}

/* =========================
   POOL UI + MATCH SETTINGS
========================= */
function ensurePoolSelected(){
  const pools = loadPools();
  if (!pools.length){
    // auto create prompt
    const ok = confirm('Inga poolspel finns. Skapa ett nu?');
    if (ok) createPool();
    return;
  }
  const cur = getCurrentPoolId();
  if (!cur){
    setCurrentPoolId(pools[0].id);
  }
}
function renderPoolMeta(){
  const pools = loadPools();
  const cur = pools.find(x=>x.id===getCurrentPoolId());
  const meta = document.getElementById('poolMeta');
  const label = document.getElementById('currentPoolLabel');
  if (meta) meta.textContent = cur ? formatPoolTitle(cur) : '—';
  if (label) label.textContent = cur ? formatPoolTitle(cur) : '—';
}

function renderPoolLists(){
  const wrapHome = document.getElementById('poolListHome');
  if (!wrapHome) return;
  const pools = loadPools().slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
  if (!pools.length){
    wrapHome.innerHTML = `<div class="small">Inga sparade poolspel. Tryck “Skapa nytt poolspel”.</div>`;
    return;
  }
  const curId = getCurrentPoolId();
  wrapHome.innerHTML = pools.map(p=>`
    <div class="poolCard">
      <div class="rowBetween">
        <div>
          <div class="poolCardTitle">${escapeHtml(p.date||'—')}</div>
          <div class="poolCardMeta">${escapeHtml(p.place||'—')}</div>
        </div>
        <span class="pillLight">${p.id===curId ? 'Aktiv' : '—'}</span>
      </div>
      <div class="poolBtns">
        <button class="btn" data-action="start-pool" data-id="${escapeHtml(p.id)}">Öppna</button>
        <button class="btn ghost" data-action="edit-pool" data-id="${escapeHtml(p.id)}">Redigera</button>
        <button class="btn ghost" data-action="del-pool" data-id="${escapeHtml(p.id)}">Ta bort</button>
      </div>
    </div>
  `).join('');
}

/* dropdown init */
function fillSelect(id, items, placeholder=null){
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = '';
  if (placeholder){
    const o0 = document.createElement('option');
    o0.value = '';
    o0.textContent = placeholder;
    el.appendChild(o0);
  }
  for (const x of items){
    const o = document.createElement('option');
    o.value = String(x);
    o.textContent = String(x);
    el.appendChild(o);
  }
}
function initSettings(){
  // matchNo 1..6 default
  fillSelect('matchNo', [1,2,3,4,5,6].map(String));
  fillSelect('arena', [1,2,3,4].map(x=>({v:String(x), t:`Plan ${x}`})));
  // custom arena builder
  const arena = document.getElementById('arena');
  if (arena){
    arena.innerHTML='';
    for (let i=1;i<=4;i++){
      const o=document.createElement('option');o.value=String(i);o.textContent=`Plan ${i}`;arena.appendChild(o);
    }
  }
  // teamSize 1..25
  const teamSize = document.getElementById('teamSize');
  if (teamSize){
    teamSize.innerHTML='';
    for (let i=1;i<=25;i++){
      const o=document.createElement('option');o.value=String(i);o.textContent=String(i);teamSize.appendChild(o);
    }
    teamSize.value='10';
  }
  // onCourt 3..5
  const onCourt = document.getElementById('onCourt');
  if (onCourt){
    onCourt.innerHTML='';
    [3,4,5].forEach(n=>{
      const o=document.createElement('option');o.value=String(n);o.textContent=String(n);onCourt.appendChild(o);
    });
    onCourt.value='3';
  }
  // periods 1..3 (no breaks)
  fillSelect('periodsCount', ['1','2','3']);
  const periodMin = document.getElementById('periodMin');
  if (periodMin){
    periodMin.innerHTML='';
    for (let m=8;m<=20;m++){
      const o=document.createElement('option');o.value=String(m);o.textContent=String(m);periodMin.appendChild(o);
    }
    periodMin.value='15';
  }
  const shift = document.getElementById('shiftSec');
  if (shift){
    shift.innerHTML='';
    for (let s=30;s<=180;s+=5){
      const o=document.createElement('option');o.value=String(s);o.textContent=String(s);shift.appendChild(o);
    }
    shift.value='90';
  }
}

/* players selectors */
function renderPlayerSelectors(n, values){
  const {players} = loadRoster();
  const wrap = document.getElementById('playersContainer');
  if (!wrap) return;
  const wanted = Math.min(25, Math.max(1, parseInt(n||'10',10)||10));
  const vals = Array.isArray(values) ? values.slice(0,wanted) : [];
  while (vals.length < wanted) vals.push('');
  wrap.innerHTML = '';
  for (let i=0;i<wanted;i++){
    const div = document.createElement('div');
    div.innerHTML = `<label>Spelare ${i+1}</label>`;
    const sel = document.createElement('select');
    sel.id = `p${i+1}`;
    const o0 = document.createElement('option');o0.value='';o0.textContent='Välj...';sel.appendChild(o0);
    for (const nm of players){
      const o=document.createElement('option');o.value=nm;o.textContent=nm;sel.appendChild(o);
    }
    sel.value = vals[i] || '';
    sel.addEventListener('change', ()=>{ persistFromUI(); renderSchedule(); });
    div.appendChild(sel);
    wrap.appendChild(div);
  }
}

/* refresh goalie/selectors */
function refreshRosterSelectors(){
  const {players} = loadRoster();
  fillSelect('goalie', players, 'Välj...');
}

/* =========================
   SCHEDULE (AI-ish round robin)
========================= */
function mmss(totalSeconds){
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = String(Math.floor(s/60)).padStart(2,'0');
  const ss = String(s%60).padStart(2,'0');
  return `${mm}:${ss}`;
}
function buildShiftTimes(totalMin, shiftSec){
  const total = Math.floor(totalMin*60);
  const step = Math.max(1, Math.floor(shiftSec));
  const out = [];
  for (let t=total; t>0; t-=step) out.push(mmss(t));
  return out;
}
function rosterFromState(st){
  const raw = (st.players||[]).map(x=>String(x||'').trim()).filter(Boolean);
  return uniqSorted(raw);
}
function makeLineups(roster, onCourt, rows){
  const k = Math.min(Math.max(3, parseInt(onCourt||'3',10)||3), 5);
  if (!roster.length) return Array(rows).fill([]);
  const lineups = [];
  let offset = 0;
  for (let i=0;i<rows;i++){
    const L = [];
    for (let j=0;j<Math.min(k, roster.length);j++){
      L.push(roster[(offset + j) % roster.length]);
    }
    lineups.push(L);
    // AI-ish: shift by 1 each time to avoid mass changes
    offset = (offset + 1) % roster.length;
  }
  return lineups;
}

/* =========================
   POOL UI ↔ STATE
========================= */
function getMatchNo(){
  const el = document.getElementById('matchNo');
  return el ? (el.value || '1') : '1';
}
function readUI(){
  const matchNo = getMatchNo();
  const st = defaultsState();
  st.matchDate = (document.getElementById('matchDate')?.value)||'';
  st.matchTime = (document.getElementById('matchTime')?.value)||'';
  st.opponent  = (document.getElementById('opponent')?.value)||'';
  st.arena     = (document.getElementById('arena')?.value)||'1';
  st.teamSize  = (document.getElementById('teamSize')?.value)||'10';
  st.onCourt   = (document.getElementById('onCourt')?.value)||'3';
  st.periodsCount = (document.getElementById('periodsCount')?.value)||'1';
  st.periodMin = (document.getElementById('periodMin')?.value)||'15';
  st.shiftSec  = (document.getElementById('shiftSec')?.value)||'90';
  st.goalie    = (document.getElementById('goalie')?.value)||'';

  const n = parseInt(st.teamSize,10)||10;
  st.players = [];
  for (let i=1;i<=n;i++){
    st.players.push(document.getElementById(`p${i}`)?.value || '');
  }
  return {matchNo, st};
}
function writeUI(st){
  document.getElementById('matchDate').value = st.matchDate || '';
  document.getElementById('matchTime').value = st.matchTime || '';
  document.getElementById('opponent').value  = st.opponent || '';
  document.getElementById('arena').value     = st.arena || '1';
  document.getElementById('teamSize').value  = st.teamSize || '10';
  document.getElementById('onCourt').value   = st.onCourt || '3';
  document.getElementById('periodsCount').value = st.periodsCount || '1';
  document.getElementById('periodMin').value = st.periodMin || '15';
  document.getElementById('shiftSec').value  = st.shiftSec || '90';
  refreshRosterSelectors();
  document.getElementById('goalie').value    = st.goalie || '';
  renderPlayerSelectors(st.teamSize, st.players||[]);
}
function persistFromUI(){
  const {matchNo, st} = readUI();
  saveState(matchNo, st);
}
function renderMatchUI(){
  if (!getCurrentPoolId()) return;
  const matchNo = getMatchNo();
  const st = loadState(matchNo);
  writeUI(st);
  renderSchedule();
}
function renderSchedule(){
  const matchNo = getMatchNo();
  const st = loadState(matchNo);

  // update st from UI (so schedule reflects latest)
  const ui = readUI().st;
  Object.assign(st, ui);
  saveState(matchNo, st);

  const roster = rosterFromState(st);
  const totalMin = (parseInt(st.periodMin,10)||15) * (parseInt(st.periodsCount,10)||1);
  const shiftSec = parseInt(st.shiftSec,10)||90;
  const times = buildShiftTimes(totalMin, shiftSec);
  const lineups = makeLineups(roster, st.onCourt, times.length);

  const doneIdx = parseInt(localStorage.getItem(doneKey(matchNo))||'0',10)||0;

  const wrap = document.getElementById('schedule');
  if (!wrap) return;
  wrap.innerHTML = times.map((t,i)=>{
    const done = (i < doneIdx);
    const names = (lineups[i]||[]).map(shortName).join(', ') || '—';
    return `
      <div class="rowCard ${done?'done':''}" data-row="${i}">
        <div><b>#${i+1}</b></div>
        <div>${escapeHtml(names)}</div>
        <div style="text-align:right"><b>${escapeHtml(t)}</b></div>
      </div>`;
  }).join('') || `<div class="small">Inga byten.</div>`;

  const msg = document.getElementById('msg');
  if (msg){
    msg.textContent = roster.length ? `✔ ${roster.length} spelare valda` : 'Välj spelare för att skapa schema.';
  }
}

/* =========================
   MATCH MODE + NEXT/UNDO + WAKE LOCK
========================= */
let wakeLock = null;

async function requestWakeLock(){
  try{
    if ('wakeLock' in navigator && navigator.wakeLock?.request){
      wakeLock = await navigator.wakeLock.request('screen');
    }
  }catch{}
}
async function releaseWakeLock(){
  try{ await wakeLock?.release?.(); }catch{}
  wakeLock = null;
}

function setMatchMode(on){
  document.body.classList.toggle('match-mode', !!on);
  try { localStorage.setItem('nsk_match_mode', on ? '1' : '0'); } catch {}
}

function openMatch(){
  if (!getCurrentPoolId()){
    alert('Välj/Skapa poolspel först.');
    return;
  }
  const overlay = document.getElementById('matchOverlay');
  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-hidden','false');

  setMatchMode(true);
  requestWakeLock();

  updateMatchOverlay();
}
function closeMatch(){
  const overlay = document.getElementById('matchOverlay');
  overlay.classList.add('hidden');
  overlay.setAttribute('aria-hidden','true');

  setMatchMode(false);
  releaseWakeLock();
}
function updateMatchOverlay(){
  const matchNo = getMatchNo();
  const st = loadState(matchNo);
  const roster = rosterFromState(st);

  const totalMin = (parseInt(st.periodMin,10)||15) * (parseInt(st.periodsCount,10)||1);
  const shiftSec = parseInt(st.shiftSec,10)||90;
  const times = buildShiftTimes(totalMin, shiftSec);
  const lineups = makeLineups(roster, st.onCourt, times.length);

  const doneIdx = parseInt(localStorage.getItem(doneKey(matchNo))||'0',10)||0;

  const now = lineups[doneIdx] || lineups[lineups.length-1] || [];
  const next = lineups[Math.min(doneIdx+1, lineups.length-1)] || [];

  document.getElementById('nowLineup').textContent = now.map(shortName).join(', ') || '—';
  document.getElementById('nextLineup').textContent = next.map(shortName).join(', ') || '—';
  document.getElementById('matchBadge').textContent = `Byte ${Math.min(doneIdx+1, lineups.length)}/${lineups.length}`;
  document.getElementById('miniGoalie').textContent = st.goalie || '—';
  document.getElementById('miniShift').textContent = `${shiftSec}s`;
  document.getElementById('miniTime').textContent = times[doneIdx] || '—';

  const info = [];
  info.push(`Match ${matchNo}`);
  if (st.opponent) info.push(`vs ${st.opponent}`);
  if (st.arena) info.push(`Plan ${st.arena}`);
  if (st.matchTime) info.push(`Start ${st.matchTime}`);
  document.getElementById('matchInfo').textContent = info.join(' • ') || '—';
}

function nextShift(){
  const matchNo = getMatchNo();
  const st = loadState(matchNo);
  const roster = rosterFromState(st);
  const totalMin = (parseInt(st.periodMin,10)||15) * (parseInt(st.periodsCount,10)||1);
  const shiftSec = parseInt(st.shiftSec,10)||90;
  const times = buildShiftTimes(totalMin, shiftSec);
  const rows = times.length;

  let doneIdx = parseInt(localStorage.getItem(doneKey(matchNo))||'0',10)||0;
  if (doneIdx < rows) doneIdx++;
  localStorage.setItem(doneKey(matchNo), String(doneIdx));

  renderSchedule();
  updateMatchOverlay();

  // tiny haptic (if supported)
  try{ navigator.vibrate?.(18); }catch{}
}

function undoShift(){
  const matchNo = getMatchNo();
  let doneIdx = parseInt(localStorage.getItem(doneKey(matchNo))||'0',10)||0;
  doneIdx = Math.max(0, doneIdx-1);
  localStorage.setItem(doneKey(matchNo), String(doneIdx));

  renderSchedule();
  updateMatchOverlay();
}

/* =========================
   IMPORT / EXPORT
========================= */
function exportJSON(){
  const payload = {
    players: loadRoster().players,
    coaches: loadRoster().coaches,
    pools: loadPools(),
    kv: {}
  };
  // include keys for current pool only (sufficient for your use)
  const prefix = poolPrefix();
  for (let i=0;i<localStorage.length;i++){
    const k = localStorage.key(i);
    if (k && k.startsWith(prefix)){
      payload.kv[k] = safeJSON(localStorage.getItem(k), localStorage.getItem(k));
    }
  }
  const out = document.getElementById('exportArea');
  out.value = JSON.stringify(payload, null, 2);
  out.classList.remove('hidden');
}
function importJSON(){
  const area = document.getElementById('importArea');
  const msg = document.getElementById('importMsg');
  try{
    const data = JSON.parse(area.value || '{}');

    if (Array.isArray(data.players) || Array.isArray(data.coaches)){
      saveRoster(data.players||[], data.coaches||[]);
    }
    if (Array.isArray(data.pools)){
      savePools(data.pools);
      if (!getCurrentPoolId() && data.pools[0]?.id) setCurrentPoolId(data.pools[0].id);
    }
    if (data.kv && typeof data.kv === 'object'){
      for (const [k,v] of Object.entries(data.kv)){
        localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
      }
    }

    msg.textContent = '✔ Import klar';
    refreshRosterSelectors();
    renderTrupp();
    renderPoolLists();
    renderPoolMeta();
    renderMatchUI();
  }catch(e){
    msg.textContent = '✖ Import misslyckades';
  }
}

/* =========================
   PRINT
========================= */
function doPrint(){
  // render schedule first (ensures latest)
  renderSchedule();
  window.print();
}

/* =========================
   INSTALL UI
========================= */
let deferredPrompt = null;
function isIos(){
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}
function isStandalone(){
  return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || (navigator.standalone === true);
}
function setupInstall(){
  const btn = document.getElementById('installBtn');
  const hint = document.getElementById('iosInstallHint');
  if (isIos() && !isStandalone() && hint) hint.style.display = 'block';

  window.addEventListener('beforeinstallprompt', (e)=>{
    e.preventDefault();
    deferredPrompt = e;
    if (btn) btn.style.display = 'inline-block';
  });

  btn?.addEventListener('click', async ()=>{
    if (!deferredPrompt) return;
    btn.disabled = true;
    deferredPrompt.prompt();
    try { await deferredPrompt.userChoice; } catch {}
    deferredPrompt = null;
    btn.style.display = 'none';
    btn.disabled = false;
  });

  window.addEventListener('appinstalled', ()=>{
    if (btn) btn.style.display = 'none';
    if (hint) hint.style.display = 'none';
  });
}

/* =========================
   EVENTS (single delegation)
========================= */
document.addEventListener('click', (e)=>{
  const t = e.target.closest('[data-action],[data-go]');
  if (!t) return;

  const goHash = t.getAttribute('data-go');
  if (goHash){
    go(goHash);
    return;
  }

  const act = t.getAttribute('data-action');
  if (act === 'go-home') return go('#home');
  if (act === 'open-trupp') return go('#trupp');
  if (act === 'open-pool') return go('#pool');
  if (act === 'new-pool') return createPool();

  if (act === 'start-pool'){
    const id = t.getAttribute('data-id') || '';
    setCurrentPoolId(id);
    return go('#pool');
  }
  if (act === 'edit-pool') return editPool(t.getAttribute('data-id'));
  if (act === 'del-pool') return deletePool(t.getAttribute('data-id'));

  if (act === 'add-player'){
    const inp = document.getElementById('newPlayer');
    const name = String(inp.value||'').trim();
    if (!name) return;
    const {players, coaches} = loadRoster();
    players.push(name);
    saveRoster(players, coaches);
    inp.value='';
    renderTrupp();
    refreshRosterSelectors();
    renderMatchUI();
    return;
  }
  if (act === 'add-coach'){
    const inp = document.getElementById('newCoach');
    const name = String(inp.value||'').trim();
    if (!name) return;
    const {players, coaches} = loadRoster();
    coaches.push(name);
    saveRoster(players, coaches);
    inp.value='';
    renderTrupp();
    return;
  }
  if (act === 'begin-edit'){
    const kind = t.getAttribute('data-kind');
    const idx = parseInt(t.getAttribute('data-idx')||'0',10);
    if (kind === 'p'){ editP = idx; editC = null; }
    else { editC = idx; editP = null; }
    return renderTrupp();
  }
  if (act === 'cancel-edit'){
    editP = null; editC = null;
    return renderTrupp();
  }
  if (act === 'save-edit'){
    const kind = t.getAttribute('data-kind');
    const idx = parseInt(t.getAttribute('data-idx')||'0',10);
    const inp = document.querySelector(`.inlineEdit[data-kind="${kind}"][data-idx="${idx}"]`);
    return saveInline(kind, idx, inp ? inp.value : '');
  }
  if (act === 'del-player'){
    const idx = parseInt(t.getAttribute('data-idx')||'0',10);
    const {players, coaches} = loadRoster();
    players.splice(idx,1);
    saveRoster(players, coaches);
    renderTrupp();
    refreshRosterSelectors();
    renderMatchUI();
    return;
  }
  if (act === 'del-coach'){
    const idx = parseInt(t.getAttribute('data-idx')||'0',10);
    const {players, coaches} = loadRoster();
    coaches.splice(idx,1);
    saveRoster(players, coaches);
    renderTrupp();
    return;
  }

  if (act === 'import-json') return importJSON();
  if (act === 'export-json') return exportJSON();

  if (act === 'print') return doPrint();

  if (act === 'open-match') return openMatch();
  if (act === 'close-match') return closeMatch();
  if (act === 'next-shift') return nextShift();
  if (act === 'undo-shift') return undoShift();
});

/* inputs autosave */
function bindAutosave(){
  const ids = ['matchDate','matchTime','opponent','arena','teamSize','onCourt','periodsCount','periodMin','shiftSec','goalie','matchNo'];
  ids.forEach(id=>{
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', ()=>{
      if (id === 'matchNo'){
        renderMatchUI();
        updateMatchOverlay();
      } else if (id === 'teamSize'){
        const {matchNo, st} = readUI();
        renderPlayerSelectors(st.teamSize, st.players||[]);
        persistFromUI();
        renderSchedule();
        updateMatchOverlay();
      } else {
        persistFromUI();
        renderSchedule();
        updateMatchOverlay();
      }
    });
    el.addEventListener('input', ()=>{
      if (['opponent'].includes(id)){
        persistFromUI();
      }
    });
  });
}

/* nav tabs click */
function bindTabs(){
  document.querySelectorAll('.tab').forEach(b=>{
    b.addEventListener('click', ()=>{
      go(b.getAttribute('data-go')||'#home');
    });
  });
}

/* =========================
   INIT
========================= */
window.addEventListener('load', ()=>{
  initSettings();
  setupInstall();

  refreshRosterSelectors();
  renderPoolLists();
  renderPoolMeta();
  renderTrupp();

  bindAutosave();
  bindTabs();

  // Default route
  go(location.hash || '#home');

  // If match overlay open and page refreshes, keep normal UI (match mode off by default)
  // (You can change to persist match-mode if you want)
});