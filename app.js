/* app.js — v47 (komplett) */
'use strict';

const APP_VERSION = 'v47';

// ---------- Helpers ----------
const $ = (id) => document.getElementById(id);

function escapeHtml(s){
  return String(s ?? '').replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

function safeJSON(s){ try { return JSON.parse(s); } catch { return null; } }

function uniq(arr){
  const out=[]; const seen=new Set();
  for(const x of (arr||[])){
    const v=String(x||'').trim();
    if(!v) continue;
    const k=v.toLowerCase();
    if(seen.has(k)) continue;
    seen.add(k); out.push(v);
  }
  return out;
}

function showEl(el){ if(el) el.style.display=''; }
function hideEl(el){ if(el) el.style.display='none'; }

function nowYMD(){
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function bind(id, fn){
  const el=$(id);
  if(!el) return;
  el.addEventListener('click', (e)=>{ e.preventDefault(); fn(); });
}

// ---------- Keys ----------
const KEY_PLAYERS='nsk_players';
const KEY_COACHES='nsk_coaches';
const KEY_POOLS='nsk_pools';
const KEY_CURRENT_POOL='nsk_current_pool';

// ---------- Defaults Team 18 ----------
const DEFAULT_PLAYERS=[
  "Agnes Danielsson","Albert Zillén","Albin Andersson","Aron Warensjö-Sommar","August Hasselberg",
  "Benjamin Linderström","Charlie Carman","Emil Tranborg","Enzo Olsson","Gunnar Englund","Henry Gauffin",
  "Linus Stolt","Melker Axbom","Måns Åkvist","Nelson Östergren","Nicky Selander","Nikola Kosoderc",
  "Noé Bonnafous Sand","Oliver Engström","Oliver Zoumblios","Pelle Åstrand","Simon Misiorny","Sixten Bratt",
  "Theo Ydrenius","Viggo Kronvall","Yuktha reddy Semberi"
];

const DEFAULT_COACHES=[
  "Fredrik Selander","Joakim Lund","Linus Öhman","Niklas Gauffin","Olle Åstrand","Peter Hasselberg",
  "Tommy Englund","William Åkvist"
];

// ---------- Storage ----------
function loadArr(key, fallback){
  const raw=localStorage.getItem(key);
  const data=raw ? safeJSON(raw) : null;
  return Array.isArray(data) ? data : (fallback||[]);
}

function saveArr(key, arr){
  localStorage.setItem(key, JSON.stringify(uniq(arr).sort((a,b)=>a.localeCompare(b,'sv'))));
}

function ensureDefaultsOnce(){
  if(!localStorage.getItem(KEY_PLAYERS)) saveArr(KEY_PLAYERS, DEFAULT_PLAYERS);
  if(!localStorage.getItem(KEY_COACHES)) saveArr(KEY_COACHES, DEFAULT_COACHES);
}

function getRoster(){
  const players=uniq(loadArr(KEY_PLAYERS, []).concat(DEFAULT_PLAYERS)).sort((a,b)=>a.localeCompare(b,'sv'));
  const coaches=uniq(loadArr(KEY_COACHES, []).concat(DEFAULT_COACHES)).sort((a,b)=>a.localeCompare(b,'sv'));
  return {players, coaches};
}

function loadPools(){
  const arr=loadArr(KEY_POOLS, []);
  return Array.isArray(arr) ? arr : [];
}

function savePools(pools){
  localStorage.setItem(KEY_POOLS, JSON.stringify(pools||[]));
}

function currentPoolId(){
  return localStorage.getItem(KEY_CURRENT_POOL) || '';
}

function setCurrentPoolId(id){
  localStorage.setItem(KEY_CURRENT_POOL, id);
}

// ---------- Views ----------
function getViewEls(){
  return {
    homeWrap:$('homeView'),
    truppWrap:$('truppView'),
    poolWrap:$('poolView'),
    viewHome:$('viewHome'),
    viewRoster:$('viewRoster'),
    viewApp:$('viewApp'),
  };
}

function hideAll(){
  const v=getViewEls();
  hideEl(v.homeWrap); hideEl(v.truppWrap); hideEl(v.poolWrap);
  if(v.viewHome) v.viewHome.style.display='none';
  if(v.viewRoster) v.viewRoster.style.display='none';
  if(v.viewApp) v.viewApp.style.display='none';
}

function goHome(){
  hideAll();
  const v=getViewEls();
  showEl(v.homeWrap);
  if(v.viewHome) v.viewHome.style.display='';
  location.hash='#home';
  renderPoolsList();
}

function goTrupp(){
  hideAll();
  const v=getViewEls();
  showEl(v.truppWrap);
  if(v.viewRoster) v.viewRoster.style.display='';
  location.hash='#trupp';
  renderRosterLists();
}

function goPool(){
  hideAll();
  const v=getViewEls();
  showEl(v.poolWrap);
  if(v.viewApp) v.viewApp.style.display='';
  location.hash='#pool';
}

function applyRoute(){
  const h=(location.hash||'#home').toLowerCase();
  if(h==='#trupp') return goTrupp();
  if(h==='#pool' || h==='#app') return goPool();
  return goHome();
}

// ---------- Pools list (home) ----------
function renderPoolsList(){
  const wrap=$('poolspelList');
  if(!wrap) return;

  const pools=loadPools();
  if(!pools.length){
    wrap.innerHTML=`<div class="small">Inga sparade poolspel ännu.</div>`;
    return;
  }

  const sorted=pools.slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
  wrap.innerHTML=sorted.map(p=>`
    <div class="poolCard">
      <div class="poolTitle">${escapeHtml(p.date||'—')} <span class="small">· ${escapeHtml(p.place||'—')}</span></div>
      <div class="poolActions">
        <button class="btn-primary" type="button" data-start-pool="${escapeHtml(p.id)}">Påbörja</button>
        <button class="btn-secondary" type="button" data-edit-pool="${escapeHtml(p.id)}">Redigera</button>
        <button class="btn-secondary" type="button" data-del-pool="${escapeHtml(p.id)}">Ta bort</button>
      </div>
    </div>
  `).join('');
}

function createPool(){
  const date=prompt('Datum (YYYY-MM-DD):', nowYMD());
  if(date==null) return;
  const place=prompt('Plats:', '');
  if(place==null) return;

  const pools=loadPools();
  const id=Math.random().toString(16).slice(2,10);
  pools.push({ id, date:String(date).trim(), place:String(place).trim(), createdAt:Date.now(), updatedAt:Date.now(), completed:false, matchCount:4 });
  savePools(pools);
  renderPoolsList();
  startPool(id, true);
}

function editPool(id){
  const pools=loadPools();
  const p=pools.find(x=>x.id===id);
  if(!p) return;

  const date=prompt('Datum (YYYY-MM-DD):', p.date||nowYMD());
  if(date==null) return;
  const place=prompt('Plats:', p.place||'');
  if(place==null) return;

  p.date=String(date).trim();
  p.place=String(place).trim();
  p.updatedAt=Date.now();
  savePools(pools);
  renderPoolsList();

  // update header subtitle if this is current
  if(currentPoolId() === id){
    setMatchHeader(__activeTeam, __activeMatch);
    writePoolHeader(id);
  }
}

function deletePool(id){
  if(!confirm('Ta bort detta poolspel?')) return;
  const pools=loadPools().filter(x=>x.id!==id);
  savePools(pools);
  if(currentPoolId()===id) localStorage.removeItem(KEY_CURRENT_POOL);
  renderPoolsList();
}

// ---------- Match state per pool (backup format) ----------
function kvKey(poolId, suffix){
  return `nsk_pool_${poolId}_${suffix}`;
}

function matchStateKey(poolId, teamNo, matchNo){
  return kvKey(poolId, `state_team_${teamNo}_match_${matchNo}`);
}

function loadMatchState(poolId, teamNo, matchNo){
  const raw=localStorage.getItem(matchStateKey(poolId, teamNo, matchNo));
  return raw ? safeJSON(raw) || {} : {};
}

function saveMatchState(poolId, teamNo, matchNo, state){
  localStorage.setItem(matchStateKey(poolId, teamNo, matchNo), JSON.stringify(state||{}));
}

// ---------- Pool header label ----------
function writePoolHeader(poolId){
  const pools=loadPools();
  const p=pools.find(x=>x.id===poolId);
  const label=$('currentPoolspelLabel');
  if(label) label.textContent = p ? `${p.date||'—'} · ${p.place||'—'}` : 'Poolspel';
}

// ---------- Static dropdowns + roster dropdowns ----------
function fillSelectRange(sel, from, to, step=1){
  if(!sel) return;
  sel.innerHTML='';
  for(let i=from;i<=to;i+=step){
    const o=document.createElement('option');
    o.value=String(i);
    o.textContent=String(i);
    sel.appendChild(o);
  }
}

function refreshStaticDropdowns(){
  // arena 1-4
  const arena=$('arena');
  if(arena && !arena.options.length){
    for(let i=1;i<=4;i++){
      const o=document.createElement('option');
      o.value=String(i);
      o.textContent=`Plan ${i}`;
      arena.appendChild(o);
    }
  }
  // teamSize 1-25 default 10
  const teamSize=$('teamSize');
  if(teamSize && !teamSize.options.length) fillSelectRange(teamSize,1,25,1);

  // onCourt 3-5
  const onCourt=$('onCourt');
  if(onCourt && !onCourt.options.length){
    [3,4,5].forEach(n=>{
      const o=document.createElement('option');
      o.value=String(n);
      o.textContent=String(n);
      onCourt.appendChild(o);
    });
  }

  // periodsCount 1-3
  const pc=$('periodsCount');
  if(pc && !pc.options.length){
    [1,2,3].forEach(n=>{
      const o=document.createElement('option');
      o.value=String(n);
      o.textContent=String(n);
      pc.appendChild(o);
    });
  }

  // periodMin 8-20
  const pm=$('periodMin');
  if(pm && !pm.options.length) fillSelectRange(pm,8,20,1);

  // shiftSec 30-180 step 5
  const ss=$('shiftSec');
  if(ss && !ss.options.length) fillSelectRange(ss,30,180,5);
}

function fillRosterDropdowns(){
  const {players, coaches}=getRoster();

  // goalie
  const goalie=$('goalie');
  if(goalie){
    const cur=goalie.value;
    goalie.innerHTML='<option value="">Välj…</option>' + players.map(p=>`<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
    goalie.value = cur;
  }

  // coach multi (keep selection if possible)
  const coach=$('coach');
  if(coach){
    const selected=new Set(Array.from(coach.selectedOptions||[]).map(o => String(o.value||'').toLowerCase()));
    coach.innerHTML = coaches.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    for(const opt of coach.options){
      opt.selected = selected.has(String(opt.value||'').toLowerCase());
    }
  }
}

function renderPlayersContainer(teamSizeVal, selectedPlayers){
  const cont=$('playersContainer');
  if(!cont) return;
  const {players}=getRoster();
  const n=Math.max(1, Math.min(25, parseInt(teamSizeVal||'10',10)||10));
  const vals=Array.isArray(selectedPlayers)?selectedPlayers.slice(0,n):[];
  while(vals.length<n) vals.push('');

  cont.innerHTML='';
  for(let i=0;i<n;i++){
    const wrap=document.createElement('div');
    const lab=document.createElement('label');
    lab.textContent=`Spelare ${i+1}`;
    const sel=document.createElement('select');
    sel.className='select';
    sel.setAttribute('data-player-idx', String(i));
    sel.innerHTML = '<option value="">Välj…</option>' + players.map(p=>`<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
    sel.value = vals[i] || '';
    wrap.appendChild(lab);
    wrap.appendChild(sel);
    cont.appendChild(wrap);
  }
}

// ---------- Editor pointers ----------
let __activeTeam = '1';
let __activeMatch = '1';

// ---------- Header (Lag/Match + pool subtitle + opponent/time + prev/next) ----------
function setMatchHeader(teamNo, matchNo){
  let h = document.getElementById('matchHeader');

  // pool subtitle (datum · plats)
  const poolId = currentPoolId();
  let subtitle = '';
  try {
    const pools = JSON.parse(localStorage.getItem(KEY_POOLS) || '[]');
    const p = pools.find(x => x.id === poolId);
    if (p){
      subtitle = `${p.date || '—'} · ${p.place || '—'}`;
    }
  } catch {}

  // match meta (motståndare + starttid)
  const opp = (document.getElementById('opponent')?.value || '').trim();
  const time = (document.getElementById('matchTime')?.value || '').trim();
  const meta = `${opp ? opp : 'Motståndare: —'}${time ? ` · Start: ${time}` : ''}`;

  if (!h){
    const viewApp = document.getElementById('viewApp');
    if (!viewApp) return;

    h = document.createElement('div');
    h.id = 'matchHeader';
    h.style.margin = '10px 0 8px';
    h.style.padding = '12px 14px';
    h.style.borderRadius = '14px';
    h.style.border = '1px solid rgba(15,23,42,.10)';
    h.style.background = '#fff';

    const toolbar = viewApp.querySelector('.toolbar');
    if (toolbar && toolbar.parentNode) {
      toolbar.parentNode.insertBefore(h, toolbar.nextSibling);
    } else {
      viewApp.insertBefore(h, viewApp.firstChild);
    }
  }

  h.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
      <div>
        <div style="font-weight:900;font-size:16px;">Lag ${teamNo} – Match ${matchNo}</div>
        <div style="font-size:13px;color:#475569;margin-top:2px;">${escapeHtml(subtitle)}</div>
        <div style="font-size:13px;color:#0f172a;margin-top:4px;font-weight:700;">${escapeHtml(meta)}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <button id="prevMatchBtn" type="button"
          style="border:0;cursor:pointer;border-radius:14px;padding:10px 12px;font-weight:900;background:#e5e7eb;color:#0f172a;">
          ← Föregående
        </button>
        <button id="nextMatchBtn" type="button"
          style="border:0;cursor:pointer;border-radius:14px;padding:10px 12px;font-weight:900;background:#e5e7eb;color:#0f172a;">
          Nästa match →
        </button>
      </div>
    </div>
  `;

  const prev = document.getElementById('prevMatchBtn');
  if (prev) prev.onclick = () => { goPrevMatch(); };

  const next = document.getElementById('nextMatchBtn');
  if (next) next.onclick = () => { goNextMatch(); };
}

// ---------- Form load/save ----------
function loadStateIntoForm(poolId, teamNo, matchNo){
  const st=loadMatchState(poolId, teamNo, matchNo);

  if($('matchDate')) $('matchDate').value = st.matchDate || '';
  if($('matchTime')) $('matchTime').value = st.matchTime || '';
  if($('opponent')) $('opponent').value = st.opponent || '';
  if($('arena')) $('arena').value = st.arena || '1';
  if($('teamSize')) $('teamSize').value = st.teamSize || '10';
  if($('onCourt')) $('onCourt').value = st.onCourt || '3';
  if($('periodsCount')) $('periodsCount').value = st.periodsCount || '1';
  if($('periodMin')) $('periodMin').value = st.periodMin || '15';
  if($('shiftSec')) $('shiftSec').value = st.shiftSec || '90';
  if($('goalie')) $('goalie').value = st.goalie || '';

  renderPlayersContainer($('teamSize')?.value || '10', st.players || []);

  setMatchHeader(teamNo, matchNo);
}

function readFormState(){
  const teamSize = $('teamSize')?.value || '10';
  const n = Math.max(1, Math.min(25, parseInt(teamSize,10)||10));
  const players=[];
  for(let i=0;i<n;i++){
    const sel=document.querySelector(`select[data-player-idx="${i}"]`);
    players.push(sel ? (sel.value||'') : '');
  }
  return {
    matchDate: $('matchDate')?.value || '',
    matchTime: $('matchTime')?.value || '',
    opponent: $('opponent')?.value || '',
    arena: $('arena')?.value || '1',
    teamSize,
    onCourt: $('onCourt')?.value || '3',
    periodsCount: $('periodsCount')?.value || '1',
    periodMin: $('periodMin')?.value || '15',
    shiftSec: $('shiftSec')?.value || '90',
    goalie: $('goalie')?.value || '',
    players
  };
}

function saveCurrentMatchState(){
  const poolId=currentPoolId();
  if(!poolId) return;
  const st=readFormState();
  saveMatchState(poolId, __activeTeam, __activeMatch, st);

  const pill=$('saveState');
  if(pill){
    pill.textContent='Sparat';
    setTimeout(()=>{ pill.textContent='Redo'; }, 600);
  }
}

// ---------- Next/Prev match ----------
function goNextMatch(){
  const poolId = currentPoolId();
  if (!poolId) return;

  const matchNoSel = $('matchNo');
  const matchCountSel = $('matchCount');

  const current = parseInt(matchNoSel?.value || '1', 10) || 1;
  const max = parseInt(matchCountSel?.value || '4', 10) || 4;

  const next = (current < max) ? (current + 1) : 1;

  try { saveCurrentMatchState(); } catch {}

  if (matchNoSel) matchNoSel.value = String(next);
  __activeMatch = String(next);
  loadStateIntoForm(poolId, __activeTeam, __activeMatch);
  setMatchHeader(__activeTeam, __activeMatch);
}

function goPrevMatch(){
  const poolId = currentPoolId();
  if (!poolId) return;

  const matchNoSel = $('matchNo');
  const matchCountSel = $('matchCount');

  const current = parseInt(matchNoSel?.value || '1', 10) || 1;
  const max = parseInt(matchCountSel?.value || '4', 10) || 4;

  const prev = (current > 1) ? (current - 1) : max;

  try { saveCurrentMatchState(); } catch {}

  if (matchNoSel) matchNoSel.value = String(prev);
  __activeMatch = String(prev);
  loadStateIntoForm(poolId, __activeTeam, __activeMatch);
  setMatchHeader(__activeTeam, __activeMatch);
}

// ---------- Pool selectors (team/match/matchCount) ----------
function setupPoolSelectors(poolId){
  const teamSel=$('teamSelect');
  if(teamSel){
    teamSel.value = __activeTeam;
    teamSel.onchange = ()=>{
      __activeTeam = teamSel.value || '1';
      loadStateIntoForm(poolId, __activeTeam, __activeMatch);
      setMatchHeader(__activeTeam, __activeMatch);
    };
  }

  const matchCountSel=$('matchCount');
  const matchNoSel=$('matchNo');

  // Ensure matchCount options
  if(matchCountSel && !matchCountSel.options.length){
    for(let i=1;i<=30;i++){
      const o=document.createElement('option');
      o.value=String(i); o.textContent=String(i);
      matchCountSel.appendChild(o);
    }
  }

  const pools=loadPools();
  const p=pools.find(x=>x.id===poolId);
  const count = p && p.matchCount ? p.matchCount : 4;

  function fillMatchNoOptions(cnt){
    if(!matchNoSel) return;
    matchNoSel.innerHTML='';
    for(let i=1;i<=cnt;i++){
      const o=document.createElement('option');
      o.value=String(i);
      o.textContent=`Match ${i}`;
      matchNoSel.appendChild(o);
    }
  }

  fillMatchNoOptions(count);

  if(matchCountSel){
    matchCountSel.value = String(count);
    matchCountSel.onchange = ()=>{
      const pools2=loadPools();
      const pp=pools2.find(x=>x.id===poolId);
      const n = parseInt(matchCountSel.value||'4',10)||4;
      if(pp){
        pp.matchCount = n;
        pp.updatedAt = Date.now();
        savePools(pools2);
      }
      fillMatchNoOptions(n);
      __activeMatch = '1';
      if(matchNoSel) matchNoSel.value = __activeMatch;
      loadStateIntoForm(poolId, __activeTeam, __activeMatch);
      setMatchHeader(__activeTeam, __activeMatch);
    };
  }

  if(matchNoSel){
    matchNoSel.value = __activeMatch;
    matchNoSel.onchange = ()=>{
      __activeMatch = matchNoSel.value || '1';
      loadStateIntoForm(poolId, __activeTeam, __activeMatch);
      setMatchHeader(__activeTeam, __activeMatch);
    };
  }
}

// ---------- Autosave wiring ----------
let __autosaveWired = false;

function wireMatchAutoSave(){
  if(__autosaveWired) return;
  __autosaveWired = true;

  const ids=['matchDate','matchTime','opponent','arena','teamSize','onCourt','periodsCount','periodMin','shiftSec','goalie'];
  ids.forEach(id=>{
    const el=$(id);
    if(!el) return;

    el.addEventListener('change', ()=>{
      if(id==='teamSize'){
        const old = readFormState().players || [];
        renderPlayersContainer(el.value, old);
      }
      saveCurrentMatchState();
      setMatchHeader(__activeTeam, __activeMatch);
    });

    el.addEventListener('input', ()=>{
      saveCurrentMatchState();
      setMatchHeader(__activeTeam, __activeMatch);
    });
  });

  const cont=$('playersContainer');
  if(cont){
    cont.addEventListener('change', (e)=>{
      const t=e.target;
      if(t && t.matches && t.matches('select[data-player-idx]')){
        saveCurrentMatchState();
        setMatchHeader(__activeTeam, __activeMatch);
      }
    });
  }
}

// ---------- Start pool: open editor at Lag 1 Match 1 ----------
function startPool(id, isNew=false){
  setCurrentPoolId(id);

  __activeTeam='1';
  __activeMatch='1';

  goPool();

  writePoolHeader(id);
  refreshStaticDropdowns();
  fillRosterDropdowns();
  setupPoolSelectors(id);

  loadStateIntoForm(id, __activeTeam, __activeMatch);
  wireMatchAutoSave();

  setMatchHeader(__activeTeam, __activeMatch);
}

// ---------- Trupp (list + CRUD) ----------
function renderRosterLists(){
  const {players, coaches}=getRoster();
  const pl=$('playerList');
  const cl=$('coachList');

  if(pl){
    pl.innerHTML = players.map((n,i)=>`
      <div class="listRow">
        <div class="name">${escapeHtml(n)}</div>
        <div class="actions">
          <button class="btn" type="button" data-edit-player="${i}">Redigera</button>
          <button class="btn" type="button" data-del-player="${i}">Ta bort</button>
        </div>
      </div>
    `).join('');
  }

  if(cl){
    cl.innerHTML = coaches.map((n,i)=>`
      <div class="listRow">
        <div class="name">${escapeHtml(n)}</div>
        <div class="actions">
          <button class="btn" type="button" data-edit-coach="${i}">Redigera</button>
          <button class="btn" type="button" data-del-coach="${i}">Ta bort</button>
        </div>
      </div>
    `).join('');
  }
}

function addPlayer(){
  const inp=$('newPlayer');
  if(!inp) return;
  const name=String(inp.value||'').trim();
  if(!name) return;
  const {players}=getRoster();
  players.push(name);
  saveArr(KEY_PLAYERS, players);
  inp.value='';
  renderRosterLists();
  fillRosterDropdowns();
  // rerender players container to include new option names
  if(currentPoolId() && $('playersContainer')) {
    const st = readFormState();
    renderPlayersContainer(st.teamSize, st.players);
  }
}

function addCoach(){
  const inp=$('newCoach');
  if(!inp) return;
  const name=String(inp.value||'').trim();
  if(!name) return;
  const {coaches}=getRoster();
  coaches.push(name);
  saveArr(KEY_COACHES, coaches);
  inp.value='';
  renderRosterLists();
  fillRosterDropdowns();
}

// ---------- Import (paste JSON) ----------
function doImportFromPaste(){
  const ta=$('importText');
  const msg=$('importMsg');
  const raw=String(ta?.value||'').trim();
  if(!raw){ if(msg) msg.innerHTML='<span class="error">✖ Klistra in JSON först</span>'; return; }

  const data=safeJSON(raw);
  if(!data){ if(msg) msg.innerHTML='<span class="error">✖ Ogiltig JSON</span>'; return; }

  try{
    if(Array.isArray(data.players)) saveArr(KEY_PLAYERS, data.players);
    if(Array.isArray(data.coaches)) saveArr(KEY_COACHES, data.coaches);
    if(Array.isArray(data.pools)) savePools(data.pools);

    if(data.kv && typeof data.kv==='object'){
      for(const [k,v] of Object.entries(data.kv)){
        if(v===null || v===undefined) localStorage.removeItem(k);
        else if(typeof v==='string') localStorage.setItem(k,v);
        else if(typeof v==='number' || typeof v==='boolean') localStorage.setItem(k, String(v));
        else localStorage.setItem(k, JSON.stringify(v));
      }
    }

    if(msg) msg.innerHTML='<span class="ok">✔ Import klar</span>';
    ta.value='';

    renderPoolsList();
    renderRosterLists();
    fillRosterDropdowns();

    // If there's a pool selected in storage, refresh header
    const pid=currentPoolId();
    if(pid) {
      writePoolHeader(pid);
      setMatchHeader(__activeTeam, __activeMatch);
    }

  }catch(e){
    if(msg) msg.innerHTML='<span class="error">✖ Import misslyckades</span>';
  }
}

// ---------- Export (basic) ----------
function exportJSON(){
  const payload = {
    players: getRoster().players,
    coaches: getRoster().coaches,
    pools: loadPools(),
    kv: {}
  };

  for (let i=0; i<localStorage.length; i++){
    const k = localStorage.key(i);
    if (k && k.startsWith('nsk_pool_')){
      const raw = localStorage.getItem(k);
      const parsed = safeJSON(raw);
      payload.kv[k] = (parsed !== null ? parsed : raw);
    }
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'nsk-lag-backup.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---------- Delegation ----------
function bindDelegation(){
  document.body.addEventListener('click', (e)=>{
    const t=e.target;

    // pools list
    const start=t?.getAttribute?.('data-start-pool');
    const edit=t?.getAttribute?.('data-edit-pool');
    const del=t?.getAttribute?.('data-del-pool');
    if(start){ startPool(start); return; }
    if(edit){ editPool(edit); return; }
    if(del){ deletePool(del); return; }

    // roster edit/delete
    const ep=t?.getAttribute?.('data-edit-player');
    const dp=t?.getAttribute?.('data-del-player');
    const ec=t?.getAttribute?.('data-edit-coach');
    const dc=t?.getAttribute?.('data-del-coach');

    if(ep!=null){
      const idx=parseInt(ep,10);
      const {players}=getRoster();
      const cur=players[idx]||'';
      const next=prompt('Redigera spelare:', cur);
      if(next==null) return;
      const name=String(next).trim();
      if(!name) return;
      players[idx]=name;
      saveArr(KEY_PLAYERS, players);
      renderRosterLists();
      fillRosterDropdowns();
      // update selects in editor
      if(currentPoolId() && $('playersContainer')) {
        const st = readFormState();
        renderPlayersContainer(st.teamSize, st.players);
      }
      return;
    }

    if(dp!=null){
      const idx=parseInt(dp,10);
      const {players}=getRoster();
      if(!confirm('Ta bort spelare?')) return;
      players.splice(idx,1);
      saveArr(KEY_PLAYERS, players);
      renderRosterLists();
      fillRosterDropdowns();
      if(currentPoolId() && $('playersContainer')) {
        const st = readFormState();
        renderPlayersContainer(st.teamSize, st.players);
      }
      return;
    }

    if(ec!=null){
      const idx=parseInt(ec,10);
      const {coaches}=getRoster();
      const cur=coaches[idx]||'';
      const next=prompt('Redigera tränare:', cur);
      if(next==null) return;
      const name=String(next).trim();
      if(!name) return;
      coaches[idx]=name;
      saveArr(KEY_COACHES, coaches);
      renderRosterLists();
      fillRosterDropdowns();
      return;
    }

    if(dc!=null){
      const idx=parseInt(dc,10);
      const {coaches}=getRoster();
      if(!confirm('Ta bort tränare?')) return;
      coaches.splice(idx,1);
      saveArr(KEY_COACHES, coaches);
      renderRosterLists();
      fillRosterDropdowns();
      return;
    }
  });
}

// ---------- Static bindings ----------
function bindStaticButtons(){
  const appVer=$('appVersion');
  if(appVer) appVer.textContent=APP_VERSION;
  const dbg=$('debugVersion');
  if(dbg && !appVer) dbg.textContent=APP_VERSION;

  bind('openRosterBtn', goTrupp);
  bind('newPoolspelBtn', createPool);
  bind('goalieStatsBtn', ()=>alert('Kommer snart: Statistik målvakter.'));
  bind('backFromRosterBtn', goHome);
  bind('backHomeBtn', goHome);

  bind('addPlayerBtn', addPlayer);
  bind('addCoachBtn', addCoach);

  bind('importPasteBtn', doImportFromPaste);
  bind('exportJsonBtn', exportJSON);
}

// ---------- Init ----------
function init(){
  ensureDefaultsOnce();
  bindStaticButtons();
  bindDelegation();
  renderPoolsList();
  applyRoute();

  // Restore editor if current pool + user is on pool view
  const pid=currentPoolId();
  if(pid && (location.hash||'').toLowerCase()==='#pool'){
    startPool(pid);
  }
}

window.addEventListener('hashchange', applyRoute);
window.addEventListener('DOMContentLoaded', init);

// ---------- SW register (cache-bust) ----------
if('serviceWorker' in navigator){
  window.addEventListener('load', async ()=>{
    try{
      const reg = await navigator.serviceWorker.register('./sw.js?v=45');
      if(reg.update) reg.update();
      if(reg.waiting) reg.waiting.postMessage({type:'SKIP_WAITING'});
      navigator.serviceWorker.addEventListener('controllerchange', ()=>window.location.reload());
    }catch(e){}
  });
}