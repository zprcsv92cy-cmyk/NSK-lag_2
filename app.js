const APP_VERSION = 'v69';

let matchLockActive = false;
let matchLockHash = '';
let wakeLockObj = null;
async function requestWakeLock(){
  try{ if('wakeLock' in navigator){ wakeLockObj = await navigator.wakeLock.request('screen'); } }
  catch(e){ console.warn('WakeLock failed', e); }
}
function releaseWakeLock(){
  try{ if(wakeLockObj){ wakeLockObj.release(); wakeLockObj=null; } }
  catch(e){}
}

'use strict';

function escapeHtml(s){
  return String(s).replace(/[&<>\"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}
function normalizeName(s){
  return String(s || '').trim().replace(/\s+/g,' ');
}
function uniqNames(arr){
  const out=[];
  const seen=new Set();
  for(const it of (arr||[])){
    const name = normalizeName(it?.name ?? it);
    if(!name) continue;
    const key=name.toLowerCase();
    if(seen.has(key)) continue;
    seen.add(key);
    out.push({name});
  }
  return out;
}
function loadArr(key){
  try{
    const v = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(v) ? uniqNames(v) : [];
  }catch{ return []; }
}
function saveArr(key, arr){
  localStorage.setItem(key, JSON.stringify(uniqNames(arr)));
}

/* ---------- Roster modal ---------- */
let players = loadArr('players');
let coaches = loadArr('coaches');

function persistRoster(){
  saveArr('players', players);
  saveArr('coaches', coaches);
  renderRoster();
  // refresh match view dropdowns if open
  refreshMatchDropdowns();
}
function openRoster(){
  const m = document.getElementById('rosterModal');
  if(!m) return;
  m.classList.add('show');
  m.setAttribute('aria-hidden','false');
  renderRoster();
}
function closeRoster(){
  const m = document.getElementById('rosterModal');
  if(!m) return;
  m.classList.remove('show');
  m.setAttribute('aria-hidden','true');
}

let editing = { kind:null, idx:-1 };

function renderList(kind, items){
  const listEl = document.getElementById(kind === 'player' ? 'playerList' : 'coachList');
  if(!listEl) return;

  if(!items.length){
    listEl.innerHTML = `<div class="small">Inga ${kind==='player'?'spelare':'tränare'} ännu.</div>`;
    return;
  }

  listEl.innerHTML = items.map((it, i) => {
    const isEdit = editing.kind === kind && editing.idx === i;
    if(isEdit){
      return `
        <div class="listItem">
          <div style="flex:1">
            <input class="inlineEdit" id="${kind}-edit-${i}" value="${escapeHtml(it.name)}" />
          </div>
          <div class="actions">
            <button class="actionBtn" data-action="save" data-kind="${kind}" data-idx="${i}">Spara</button>
            <button class="actionBtn" data-action="cancel">Avbryt</button>
          </div>
        </div>
      `;
    }
    return `
      <div class="listItem">
        <div class="nameText">${escapeHtml(it.name)}</div>
        <div class="actions">
          <button class="actionBtn" data-action="edit" data-kind="${kind}" data-idx="${i}">Redigera</button>
          <button class="actionBtn" data-action="del" data-kind="${kind}" data-idx="${i}">Ta bort</button>
        </div>
      </div>
    `;
  }).join('');

  listEl.onclick = (e) => {
    const btn = e.target.closest('button');
    if(!btn) return;
    const action = btn.getAttribute('data-action');

    if(action === 'cancel'){
      editing={kind:null, idx:-1};
      renderRoster();
      return;
    }

    const k = btn.getAttribute('data-kind');
    const idx = parseInt(btn.getAttribute('data-idx') || '-1', 10);
    if(!k || idx < 0) return;

    if(action === 'edit'){
      editing = {kind:k, idx};
      renderRoster();
      setTimeout(()=>{ document.getElementById(`${k}-edit-${idx}`)?.focus(); }, 50);
      return;
    }

    if(action === 'save'){
      const inp = document.getElementById(`${k}-edit-${idx}`);
      const next = normalizeName(inp ? inp.value : '');
      if(!next) return;
      if(k === 'player') players[idx] = {name: next};
      else coaches[idx] = {name: next};
      editing = {kind:null, idx:-1};
      persistRoster();
      return;
    }

    if(action === 'del'){
      if(!confirm('Ta bort?')) return;
      if(k === 'player') players.splice(idx,1);
      else coaches.splice(idx,1);
      persistRoster();
    }
  };

  listEl.onkeydown = (e) => {
    if(e.key !== 'Enter') return;
    const inp = e.target.closest('input.inlineEdit');
    if(!inp) return;
    const parts = inp.id.split('-'); // player-edit-0
    const k = parts[0];
    const idx = parseInt(parts[2] || '-1', 10);
    const next = normalizeName(inp.value);
    if(!next || idx < 0) return;
    if(k === 'player') players[idx] = {name: next};
    else coaches[idx] = {name: next};
    editing = {kind:null, idx:-1};
    persistRoster();
  };
}

function renderRoster(){
  renderList('player', players);
  renderList('coach', coaches);
}

function addFromInput(kind){
  const id = kind === 'player' ? 'newPlayer' : 'newCoach';
  const inp = document.getElementById(id);
  const name = normalizeName(inp ? inp.value : '');
  if(!name) return;
  if(kind === 'player') players = uniqNames(players.concat([{name}]));
  else coaches = uniqNames(coaches.concat([{name}]));
  if(inp) inp.value='';
  persistRoster();
}

/* ---------- Backup import (paste JSON) ---------- */
function importFromText(){
  const ta = document.getElementById('importText');
  const msg = document.getElementById('importMsg');
  const raw = (ta?.value || '').trim();
  if(!raw){
    if(msg) msg.innerHTML = '<span style="color:#b00020">✖ Klistra in JSON först</span>';
    return;
  }
  try{
    const data = JSON.parse(raw);

    const nextPlayers = uniqNames(Array.isArray(data.players) ? data.players : []);
    const nextCoaches = uniqNames(Array.isArray(data.coaches) ? data.coaches : []);
    players = uniqNames(players.concat(nextPlayers));
    coaches = uniqNames(coaches.concat(nextCoaches));
    saveArr('players', players);
    saveArr('coaches', coaches);

    if (Array.isArray(data.pools)) localStorage.setItem('nsk_pools', JSON.stringify(data.pools));

    if (data.kv && typeof data.kv === 'object') {
      for (const k of Object.keys(data.kv)) {
        const v = data.kv[k];
        if (v === null || v === undefined) continue;
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
          localStorage.setItem(k, String(v));
        } else {
          localStorage.setItem(k, JSON.stringify(v));
        }
      }
    }

    players = loadArr('players');
    coaches = loadArr('coaches');
    editing = {kind:null, idx:-1};
    renderRoster();
    renderPoolspelList();

    if(msg) msg.innerHTML =
      `<span style="color:#1b5e20">✔ Import klar (${nextPlayers.length} spelare, ${nextCoaches.length} tränare)</span>`;
    if(ta) ta.value='';
  }catch(e){
    if(msg) msg.innerHTML = '<span style="color:#b00020">✖ Ogiltig JSON</span>';
  }
}
function clearImportText(){
  const ta = document.getElementById('importText');
  const msg = document.getElementById('importMsg');
  if(ta) ta.value='';
  if(msg) msg.innerHTML='';
}

/* ---------- Poolspel ---------- */
const POOLS_KEY = 'nsk_pools';
const CURRENT_POOL_KEY = 'nsk_current_pool';

function loadPools(){
  try{
    const arr = JSON.parse(localStorage.getItem(POOLS_KEY) || '[]');
    return Array.isArray(arr) ? arr : [];
  }catch{ return []; }
}
function savePools(arr){
  localStorage.setItem(POOLS_KEY, JSON.stringify(arr||[]));
}
function genId(){
  return Math.random().toString(16).slice(2,10);
}
function formatPoolTitle(p){
  return `${p?.date || '—'} · ${p?.place || '—'}`;
}

function renderPoolspelList(){
  const el = document.getElementById('poolspelList');
  if(!el) return;
  const pools = loadPools();
  if(!pools.length){
    el.innerHTML = '<div class="small">Inga sparade poolspel ännu.</div>';
    return;
  }
  const sorted = pools.slice().sort((a,b)=> (b.updatedAt||b.createdAt||0) - (a.updatedAt||a.createdAt||0));
  el.innerHTML = sorted.map(p => `
    <div class="poolspelCard">
      <div>
        <span class="poolspelTitle">${escapeHtml(p.date || '—')}</span>
        <span class="poolspelMeta"> · ${escapeHtml(p.place || '—')}</span>
      </div>
      <div class="poolspelRow">
        <button class="btn-primary" data-start="${escapeHtml(p.id)}">Påbörja poolspel</button>
        <button class="btn-secondary" data-edit="${escapeHtml(p.id)}">Redigera</button>
        <button class="btn-secondary" data-del="${escapeHtml(p.id)}">Ta bort</button>
      </div>
    </div>
  `).join('');

  el.querySelectorAll('[data-start]').forEach(b=>{
    b.addEventListener('click', ()=> openPool(b.getAttribute('data-start')));
  });
  el.querySelectorAll('[data-edit]').forEach(b=>{
    b.addEventListener('click', ()=> editPool(b.getAttribute('data-edit')));
  });
  el.querySelectorAll('[data-del]').forEach(b=>{
    b.addEventListener('click', ()=> deletePool(b.getAttribute('data-del')));
  });
}

function createNewPoolspel(){
  const today = new Date();
  const yyyy = String(today.getFullYear());
  const mm = String(today.getMonth()+1).padStart(2,'0');
  const dd = String(today.getDate()).padStart(2,'0');
  const defDate = `${yyyy}-${mm}-${dd}`;

  const date = prompt('Datum (YYYY-MM-DD):', defDate);
  if(date == null) return;
  const place = prompt('Plats:', '');
  if(place == null) return;

  const pools = loadPools();
  const id = genId();
  const now = Date.now();
  pools.push({id, date: String(date).trim(), place: String(place).trim(), createdAt: now, updatedAt: now, completed:false});
  savePools(pools);
  renderPoolspelList();
  openPool(id);
}

function editPool(id){
  const pools = loadPools();
  const p = pools.find(x=>x.id===id);
  if(!p) return;
  const date = prompt('Datum (YYYY-MM-DD):', p.date||'');
  if(date == null) return;
  const place = prompt('Plats:', p.place||'');
  if(place == null) return;
  p.date = String(date).trim();
  p.place = String(place).trim();
  p.updatedAt = Date.now();
  savePools(pools);
  renderPoolspelList();
  // if currently open
  if(localStorage.getItem(CURRENT_POOL_KEY)===id) updatePoolHeader();
}
function deletePool(id){
  if(!confirm('Ta bort detta poolspel?')) return;
  let pools = loadPools().filter(x=>x.id!==id);
  savePools(pools);
  renderPoolspelList();
  if(localStorage.getItem(CURRENT_POOL_KEY)===id){
    localStorage.removeItem(CURRENT_POOL_KEY);
    showHome();
  }
}

/* ---------- Navigation between views ---------- */

function showStats(){
  setHash('#statistik');
  document.getElementById('viewHome').style.display = 'none';
  document.getElementById('viewPool').style.display = 'none';
  document.getElementById('viewMatch').style.display = 'none';
  document.getElementById('viewStats').style.display = '';
  renderGoalieStats();
}
function hideStats(){
  document.getElementById('viewStats').style.display = 'none';
  showHome();
}
function renderGoalieStats(){
  const out = document.getElementById('goalieStatsOut');
  if (!out) return;

  const counts = {};
  for (let i=0; i<localStorage.length; i++){
    const k = localStorage.key(i);
    if (!k || !k.startsWith('nsk_pool_') || k.indexOf('_state_team_') === -1) continue;
    try{
      const st = JSON.parse(localStorage.getItem(k) || '{}');
      const g = st && st.goalie ? String(st.goalie).trim() : '';
      if (!g) continue;
      const key = g.toLowerCase();
      if (!counts[key]) counts[key] = {name:g, n:0};
      counts[key].n += 1;
    }catch{}
  }

  const rows = Object.values(counts).sort((a,b)=> b.n-a.n || a.name.localeCompare(b.name,'sv'));
  if (!rows.length){
    out.innerHTML = `<div class="small muted">Ingen målvaktsdata ännu.</div>`;
    return;
  }

  out.innerHTML = `
    <table class="tbl">
      <thead><tr><th>Spelare</th><th class="right">Matcher som målvakt</th></tr></thead>
      <tbody>
        ${rows.map(r=>`<tr><td>${escapeHtml(r.name)}</td><td class="right"><b>${r.n}</b></td></tr>`).join('')}
      </tbody>
    </table>
  `;
}

function showHome() {
  matchLockActive = false;
  releaseWakeLock();
  document.body.classList.remove('match-locked');
  viewHome.style.display = 'block';
  viewPool.style.display = 'none';
  viewMatch.style.display = 'none';
  viewStats.style.display = 'none';
  setHash('');
  renderPools();
}
function showPool() {
  matchLockActive = false;
  releaseWakeLock();
  document.body.classList.remove('match-locked');
  viewHome.style.display = 'none';
  viewPool.style.display = 'block';
  viewMatch.style.display = 'none';
  viewStats.style.display = 'none';
  setHash('pool');
  renderPools();
}
function showMatch() {
  viewHome.style.display = 'none';
  viewPool.style.display = 'none';
  viewMatch.style.display = 'block';
  viewStats.style.display = 'none';
  setHash('match');
  try{ const p = loadPools().find(x=>x.id===state.activePoolId); const dt = p?.date ? formatDate(p.date) : ''; const el=document.getElementById('matchDateText'); if(el) el.textContent = dt; }catch(e){}
  renderMatch();
}

function openPool(id){
  localStorage.setItem(CURRENT_POOL_KEY, id);
  showPool();
}

function currentPool(){
  const id = localStorage.getItem(CURRENT_POOL_KEY) || '';
  if(!id) return null;
  return loadPools().find(p=>p.id===id) || null;
}

function updatePoolHeader(){
  const p = currentPool();
  const label = document.getElementById('currentPoolLabel');
  const title = document.getElementById('poolTitle');
  const meta = document.getElementById('poolMeta');
  if(!p){
    if(label) label.textContent='Poolspel';
    if(title) title.textContent='Poolspel';
    if(meta) meta.textContent='';
    return;
  }
  const t = formatPoolTitle(p);
  if(label) label.textContent=t;
  if(title) title.textContent=t;
  if(meta) meta.textContent='Välj lag och match för att redigera.';
}

/* ---------- Pool selectors + match editor (uses imported kv keys) ---------- */
function poolKey(prefix){
  const p = currentPool();
  const id = p ? p.id : '';
  return `nsk_pool_${id}_${prefix}`;
}
function matchCountKey(teamNo){ return poolKey(`matchCount_team_${teamNo}`); }
function stateKey(teamNo, matchNo){ return poolKey(`state_team_${teamNo}_match_${matchNo}`); }
function teamCoachesKey(teamNo){ return poolKey(`team_coaches_team_${teamNo}`); }

function setupPoolSelectors(){
  const p = currentPool();
  if(!p) return;

  const teamSel = document.getElementById('poolTeamSelect');
  const countSel = document.getElementById('poolMatchCount');
  const matchSel = document.getElementById('poolMatchSelect');

  // teams 1-3
  if(teamSel && !teamSel.options.length){
    teamSel.innerHTML='';
    ['1','2','3'].forEach(t=>{
      const o=document.createElement('option');
      o.value=t;
      o.textContent=`Lag ${t}`;
      teamSel.appendChild(o);
    });
  }
  if(countSel && !countSel.options.length){
    countSel.innerHTML='';
    for(let i=1;i<=30;i++){
      const o=document.createElement('option');
      o.value=String(i);
      o.textContent=String(i);
      countSel.appendChild(o);
    }
  }

  const savedTeam = sessionStorage.getItem('nsk_pool_team') || '1';
  teamSel.value = savedTeam;

  function applyMatchCount(){
    const t = teamSel.value || '1';
    const raw = localStorage.getItem(matchCountKey(t));
    const n = raw ? parseInt(raw,10) : 4;
    const count = (Number.isFinite(n) && n>=1 && n<=30) ? n : 4;
    countSel.value = String(count);

    matchSel.innerHTML='';
    for(let i=1;i<=count;i++){
      const o=document.createElement('option');
      o.value=String(i);
      o.textContent=`Match ${i}`;
      matchSel.appendChild(o);
    }
    const savedMatch = sessionStorage.getItem('nsk_pool_match') || '1';
    matchSel.value = String(Math.min(count, Math.max(1, parseInt(savedMatch,10)||1)));
  }

  applyMatchCount();

  teamSel.onchange = ()=>{
    sessionStorage.setItem('nsk_pool_team', teamSel.value);
    applyMatchCount();
  };
  countSel.onchange = ()=>{
    const t = teamSel.value || '1';
    localStorage.setItem(matchCountKey(t), String(parseInt(countSel.value,10)||4));
    applyMatchCount();
  };
  matchSel.onchange = ()=> sessionStorage.setItem('nsk_pool_match', matchSel.value);

  document.getElementById('openMatchBtn').onclick = ()=>{
    sessionStorage.setItem('nsk_pool_team', teamSel.value);
    sessionStorage.setItem('nsk_pool_match', matchSel.value);
    openMatch(teamSel.value, matchSel.value);
  };
}

function defaultsState(){
  return {
    matchDate:"", matchTime:"", opponent:"", arena:"1",
    teamSize:"10", onCourt:"3", periodsCount:"1", periodMin:"15", shiftSec:"90",
    players:Array(10).fill(""), goalie:""
  };
}

function loadState(teamNo, matchNo){
  try{
    const raw = localStorage.getItem(stateKey(teamNo, matchNo));
    const s = raw ? JSON.parse(raw) : {};
    return Object.assign(defaultsState(), s||{});
  }catch{
    return defaultsState();
  }
}
function saveState(teamNo, matchNo, state){
  localStorage.setItem(stateKey(teamNo, matchNo), JSON.stringify(state||defaultsState()));
}

function fillSelect(el, values, placeholder=null){
  if(!el) return;
  el.innerHTML='';
  if(placeholder != null){
    const o=document.createElement('option');
    o.value='';
    o.textContent=placeholder;
    el.appendChild(o);
  }
  values.forEach(v=>{
    const o=document.createElement('option');
    o.value=String(v);
    o.textContent=String(v);
    el.appendChild(o);
  });
}

function initMatchDropdowns(){
  fillSelect(document.getElementById('arena'), ['1','2','3','4']);
  fillSelect(document.getElementById('teamSize'), Array.from({length:25},(_,i)=>String(i+1)));
  fillSelect(document.getElementById('onCourt'), ['3','4','5']);
  fillSelect(document.getElementById('periodsCount'), ['1','2','3']);
  fillSelect(document.getElementById('periodMin'), Array.from({length:13},(_,i)=>String(i+8))); // 8-20
  fillSelect(document.getElementById('shiftSec'), Array.from({length:31},(_,i)=>String(30+i*5))); //30-180 step5
}

let currentMatch = {team:'1', match:'1'};

function openMatch(teamNo, matchNo){
  currentMatch = {team:String(teamNo), match:String(matchNo)};
  const pill = document.getElementById('matchPill');
  if(pill) pill.textContent = `Lag ${currentMatch.team} · Match ${currentMatch.match}`;
  showMatch();
  initMatchDropdowns();
  loadMatchIntoForm();
}

function loadMatchIntoForm(){
  const s = loadState(currentMatch.team, currentMatch.match);

  const matchDateEl = document.getElementById('matchDate');
  if (matchDateEl) matchDateEl.value = s.matchDate || '';
  document.getElementById('matchTime').value = s.matchTime || '';
  document.getElementById('opponent').value = s.opponent || '';
  document.getElementById('arena').value = s.arena || '1';
  document.getElementById('teamSize').value = s.teamSize || '10';
  document.getElementById('onCourt').value = s.onCourt || '3';
  document.getElementById('periodsCount').value = s.periodsCount || '1';
  document.getElementById('periodMin').value = s.periodMin || '15';
  document.getElementById('shiftSec').value = s.shiftSec || '90';

  renderPlayersGrid(parseInt(s.teamSize,10)||10, s.players||[]);
  refreshMatchDropdowns();

  document.getElementById('goalie').value = s.goalie || '';
  applyTeamCoachesSelection();
}

function currentFormState(){
  const teamSize = parseInt(document.getElementById('teamSize').value||'10',10)||10;
  const playersArr=[];
  for(let i=1;i<=teamSize;i++){
    playersArr.push(document.getElementById(`p${i}`)?.value || '');
  }
  return {
    matchDate: document.getElementById('matchDate')?.value || '',
    matchTime: document.getElementById('matchTime').value || '',
    opponent: document.getElementById('opponent').value || '',
    arena: document.getElementById('arena').value || '1',
    teamSize: String(teamSize),
    onCourt: document.getElementById('onCourt').value || '3',
    periodsCount: document.getElementById('periodsCount').value || '1',
    periodMin: document.getElementById('periodMin').value || '15',
    shiftSec: document.getElementById('shiftSec').value || '90',
    players: playersArr,
    goalie: document.getElementById('goalie').value || ''
  };
}

function renderPlayersGrid(n, selected){
  const grid = document.getElementById('playersGrid');
  if(!grid) return;
  const wanted = Math.min(25, Math.max(1, n));
  const vals = Array.isArray(selected) ? selected.slice(0,wanted) : [];
  while(vals.length < wanted) vals.push('');

  grid.innerHTML='';
  const playerNames = players.map(x=>x.name).sort((a,b)=>a.localeCompare(b,'sv'));

  for(let i=1;i<=wanted;i++){
    const cell=document.createElement('div');
    cell.className='playerCell';
    const lab=document.createElement('label');
    lab.className='label';
    lab.textContent = `Spelare ${i}`;
    const sel=document.createElement('select');
    sel.className='select';
    sel.id=`p${i}`;
    // options
    const o0=document.createElement('option'); o0.value=''; o0.textContent='Välj...'; sel.appendChild(o0);
    playerNames.forEach(name=>{
      const o=document.createElement('option'); o.value=name; o.textContent=name; sel.appendChild(o);
    });
    sel.value = vals[i-1] || '';
    sel.addEventListener('change', ()=> autoSave());
    cell.appendChild(lab);
    cell.appendChild(sel);
    grid.appendChild(cell);
  }
}

function refreshMatchDropdowns(){
  // goalie options based on current roster
  const goalieSel = document.getElementById('goalie');
  if(goalieSel){
    const current = goalieSel.value || '';
    const names = players.map(x=>x.name).sort((a,b)=>a.localeCompare(b,'sv'));
    goalieSel.innerHTML='';
    const o0=document.createElement('option'); o0.value=''; o0.textContent='Välj...'; goalieSel.appendChild(o0);
    names.forEach(n=>{
      const o=document.createElement('option'); o.value=n; o.textContent=n; goalieSel.appendChild(o);
    });
    goalieSel.value = current;
  }

  // coach multiselect from roster coaches
  const coachSel = document.getElementById('coach');
  if(coachSel){
    const names = coaches.map(x=>x.name).sort((a,b)=>a.localeCompare(b,'sv'));
    coachSel.innerHTML='';
    names.forEach(n=>{
      const o=document.createElement('option'); o.value=n; o.textContent=n; coachSel.appendChild(o);
    });
    applyTeamCoachesSelection();
  }
}

function loadTeamCoaches(){
  try{
    const raw = localStorage.getItem(teamCoachesKey(currentMatch.team));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  }catch{ return []; }
}
function saveTeamCoaches(arr){
  localStorage.setItem(teamCoachesKey(currentMatch.team), JSON.stringify(arr||[]));
}
function selectedValues(selectEl){
  return Array.from(selectEl.selectedOptions||[]).map(o=>o.value).filter(Boolean);
}

// ----------------------------
// Team buttons (Lag 1-3) synced with hidden <select>
// ----------------------------
function bindTeamButtons(containerId, selectId){
  const wrap = document.getElementById(containerId);
  const sel = document.getElementById(selectId);
  if (!wrap || !sel) return;

  function setActive(){
    const v = sel.value || "1";
    wrap.querySelectorAll('[data-team]').forEach(btn=>{
      btn.classList.toggle('active', btn.getAttribute('data-team') === v);
    });
  }

  wrap.querySelectorAll('[data-team]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const v = btn.getAttribute('data-team') || "1";
      sel.value = v;
      sel.dispatchEvent(new Event('change', {bubbles:true}));
      setActive();
    });
  });

  sel.addEventListener('change', setActive);
  setActive();
}

function applyTeamCoachesSelection(){
  renderCoachChips();
}

function renderCoachChips(){
  const wrap = document.getElementById('coachChips');
  if (!wrap) return;

  const reg = loadRegister();
  const coaches = reg.coaches || [];
  const selected = new Set(loadTeamCoaches().map(x=>String(x).toLowerCase()));

  if (!coaches.length){
    wrap.innerHTML = `<div class="small muted">Inga tränare i registret.</div>`;
    return;
  }

  wrap.innerHTML = coaches.map(name=>{
    const on = selected.has(String(name).toLowerCase());
    return `<button type="button" class="chip ${on?'on':''}" data-name="${escapeHtml(name)}">${escapeHtml(name)}</button>`;
  }).join("");

  wrap.querySelectorAll('[data-name]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const name = btn.getAttribute('data-name') || '';
      const key = name.toLowerCase();
      if (selected.has(key)) selected.delete(key); else selected.add(key);
      const arr = Array.from(selected).map(k=>{
        const found = coaches.find(c=>c.toLowerCase()===k);
        return found || name;
      });
      saveTeamCoaches(arr);
      renderCoachChips();
      renderAll();
    });
  });
}

let __saveTimer = null;
function autoSave(){
  clearTimeout(__saveTimer);
  __saveTimer = setTimeout(()=>{
    const s = currentFormState();
    saveState(currentMatch.team, currentMatch.match, s);
  }, 150);
}

/* ---------- Routing ---------- */
function applyRoute(){
  const h = (location.hash || '#home').toLowerCase();
  if(matchLockActive && h !== '#match'){
    location.hash = matchLockHash || '#match';
    return;
  }
  if(h === '#match') matchLockHash = '#match';
  if(h === '#match'){ showMatch(); return; }
  if(h === '#pool'){ showPool(); return; }
  showHome();
}

/* ---------- SW ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  });
}

/* ---------- Boot ---------- */
window.addEventListener('load', () => {
  });

window.addEventListener('load', () => {
  const v = document.getElementById('versionBox');
  if(v) v.textContent = APP_VERSION;

  // home buttons
  document.getElementById('openRosterBtn')?.addEventListener('click', openRoster);
  document.getElementById('closeRosterBtn')?.addEventListener('click', closeRoster);
  document.getElementById('newPoolspelBtn')?.addEventListener('click', createNewPoolspel);
  document.getElementById('goalieStatsBtn')?.addEventListener('click', ()=>alert('Kommer snart: Statistik målvakter.'));

  // modal backdrop click closes
  const modal = document.getElementById('rosterModal');
  if(modal) modal.addEventListener('click', (e)=>{ if(e.target === modal) closeRoster(); });

  // add buttons
  document.getElementById('addPlayerBtn')?.addEventListener('click', ()=>addFromInput('player'));
  document.getElementById('addCoachBtn')?.addEventListener('click', ()=>addFromInput('coach'));
  document.getElementById('newPlayer')?.addEventListener('keydown', (e)=>{ if(e.key==='Enter') addFromInput('player'); });
  document.getElementById('newCoach')?.addEventListener('keydown', (e)=>{ if(e.key==='Enter') addFromInput('coach'); });

  // import
  document.getElementById('importBtn')?.addEventListener('click', importFromText);
  document.getElementById('clearImportBtn')?.addEventListener('click', clearImportText);

  // pool/match nav
  document.getElementById('backToHomeBtn')?.addEventListener('click', showHome);
  document.getElementById('backToPoolBtn')?.addEventListener('click', showPool);

  // match autosave fields
  ['matchDate','matchTime','opponent','arena','teamSize','onCourt','periodsCount','periodMin','shiftSec','goalie'].forEach(id=>{
    const el = document.getElementById(id);
    if(!el) return;
    el.addEventListener('input', autoSave);
    el.addEventListener('change', ()=>{
      if(id==='teamSize'){
        const n = parseInt(document.getElementById('teamSize').value||'10',10)||10;
        const s = currentFormState();
        renderPlayersGrid(n, s.players||[]);
      }
      if(id==='goalie') autoSave();
      autoSave();
    });
  });
  document.getElementById('coach')?.addEventListener('change', ()=>{
    saveTeamCoaches(selectedValues(document.getElementById('coach')));
  });

  renderRoster();
  renderPoolspelList();
  applyRoute();
});
// Stats modal
  document.getElementById('goalieStatsBtn')?.addEventListener('click', openStatsModal);
  document.getElementById('closeStatsBtn')?.addEventListener('click', closeStatsModal);
  document.getElementById('refreshStatsBtn')?.addEventListener('click', renderGoalieStats);
  document.getElementById('exportStatsBtn')?.addEventListener('click', () => {
    const rows = computeGoalieStats();
    const txt = rows.map(([n,c])=>`${c}\t${n}`).join('\n');
    (navigator.clipboard?.writeText(txt) || Promise.reject()).then(()=>toast('Kopierat')).catch(()=>toast('Kunde inte kopiera'));
  });
  document.getElementById('statsModal')?.addEventListener('click', (e)=>{ if(e.target?.id==='statsModal') closeStatsModal(); });

  // Match exit
  document.getElementById('exitMatchBtn')?.addEventListener('click', () => {
    if(confirm('Avsluta matchläge?')){ matchLockActive=false; releaseWakeLock(); document.body.classList.remove('match-locked'); location.hash = '#pool'; }
  });

  window.addEventListener('hashchange', applyRoute);
