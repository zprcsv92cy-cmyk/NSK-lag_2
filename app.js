'use strict';
const APP_VERSION = 'v44';

/* -------------------------------------------------
   NSK Lag (v44)
   Fix: knappar “händer inget” berodde på att tidigare app.js
   förväntade IDs som inte fanns i index.html -> JS kraschade.
   Denna version matchar index.html och binder knapparna robust.
-------------------------------------------------- */

// ---------- Helpers ----------
function $(id){ return document.getElementById(id); }
function escapeHtml(s){
  return String(s ?? '').replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}
function safeJSON(raw, fallback){
  try { return JSON.parse(raw); } catch { return fallback; }
}
function uniq(arr){
  const out=[]; const seen=new Set();
  for (const x of (arr||[])){
    const v=String(x||'').trim();
    if (!v) continue;
    const k=v.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k); out.push(v);
  }
  return out;
}
function nowYMD(){
  const d=new Date();
  const y=String(d.getFullYear());
  const m=String(d.getMonth()+1).padStart(2,'0');
  const dd=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${dd}`;
}
function show(el){ if (el) el.style.display=''; }
function hide(el){ if (el) el.style.display='none'; }

// ---------- Storage keys ----------
const KEY_PLAYERS = 'nsk_players';
const KEY_COACHES = 'nsk_coaches';
const KEY_POOLS   = 'nsk_pools';
const KEY_CURRENT_POOL = 'nsk_current_pool';

// ---------- Default roster (Team 18) ----------
const DEFAULT_PLAYERS = [
  "Agnes Danielsson","Albert Zillén","Albin Andersson","Aron Warensjö-Sommar","August Hasselberg",
  "Benjamin Linderström","Charlie Carman","Emil Tranborg","Enzo Olsson","Gunnar Englund","Henry Gauffin",
  "Linus Stolt","Melker Axbom","Måns Åkvist","Nelson Östergren","Nicky Selander","Nikola Kosoderc",
  "Noé Bonnafous Sand","Oliver Engström","Oliver Zoumblios","Pelle Åstrand","Simon Misiorny","Sixten Bratt",
  "Theo Ydrenius","Viggo Kronvall","Yuktha reddy Semberi"
];
const DEFAULT_COACHES = [
  "Fredrik Selander","Joakim Lund","Linus Öhman","Niklas Gauffin","Olle Åstrand","Peter Hasselberg",
  "Tommy Englund","William Åkvist"
];

function loadList(key, fallbackArr){
  const raw = localStorage.getItem(key);
  const arr = raw ? safeJSON(raw, []) : [];
  const merged = uniq([...(Array.isArray(arr)?arr:[]), ...(fallbackArr||[])]).sort((a,b)=>a.localeCompare(b,'sv'));
  return merged;
}
function saveList(key, arr){
  localStorage.setItem(key, JSON.stringify(uniq(arr).sort((a,b)=>a.localeCompare(b,'sv'))));
}

// ---------- Version pill ----------
function setVersion(){
  const vb = $('versionBox');
  if (vb) vb.textContent = APP_VERSION;
}

// ---------- Roster modal ----------
function openRoster(){
  const modal = $('rosterModal');
  if (!modal) return;
  modal.classList.add('show');
  renderRosterLists();
}
function closeRoster(){
  const modal = $('rosterModal');
  if (!modal) return;
  modal.classList.remove('show');
}
function getPlayers(){ return loadList(KEY_PLAYERS, DEFAULT_PLAYERS); }
function getCoaches(){ return loadList(KEY_COACHES, DEFAULT_COACHES); }

function renderRosterLists(){
  const players = getPlayers();
  const coaches = getCoaches();

  const pl = $('playerList');
  const cl = $('coachList');

  if (pl){
    pl.innerHTML = players.map((n,i)=>`
      <div class="listRow">
        <div class="name">${escapeHtml(n)}</div>
        <div class="actions">
          <button type="button" class="btn-secondary" data-edit-player="${i}">Redigera</button>
          <button type="button" class="btn-secondary" data-del-player="${i}">Ta bort</button>
        </div>
      </div>
    `).join('');

    pl.querySelectorAll('[data-edit-player]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const idx = parseInt(btn.getAttribute('data-edit-player')||'0',10);
        const cur = players[idx] || '';
        const next = prompt('Redigera spelare:', cur);
        if (next == null) return;
        const name = String(next).trim();
        if (!name) return;
        players[idx] = name;
        saveList(KEY_PLAYERS, players);
        renderRosterLists();
      });
    });

    pl.querySelectorAll('[data-del-player]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const idx = parseInt(btn.getAttribute('data-del-player')||'0',10);
        if (!confirm('Ta bort spelare?')) return;
        players.splice(idx,1);
        saveList(KEY_PLAYERS, players);
        renderRosterLists();
      });
    });
  }

  if (cl){
    cl.innerHTML = coaches.map((n,i)=>`
      <div class="listRow">
        <div class="name">${escapeHtml(n)}</div>
        <div class="actions">
          <button type="button" class="btn-secondary" data-edit-coach="${i}">Redigera</button>
          <button type="button" class="btn-secondary" data-del-coach="${i}">Ta bort</button>
        </div>
      </div>
    `).join('');

    cl.querySelectorAll('[data-edit-coach]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const idx = parseInt(btn.getAttribute('data-edit-coach')||'0',10);
        const cur = coaches[idx] || '';
        const next = prompt('Redigera tränare:', cur);
        if (next == null) return;
        const name = String(next).trim();
        if (!name) return;
        coaches[idx] = name;
        saveList(KEY_COACHES, coaches);
        renderRosterLists();
      });
    });

    cl.querySelectorAll('[data-del-coach]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const idx = parseInt(btn.getAttribute('data-del-coach')||'0',10);
        if (!confirm('Ta bort tränare?')) return;
        coaches.splice(idx,1);
        saveList(KEY_COACHES, coaches);
        renderRosterLists();
      });
    });
  }
}

function addPlayer(){
  const inp = $('newPlayer');
  if (!inp) return;
  const name = String(inp.value||'').trim();
  if (!name) return;
  const players = getPlayers();
  players.push(name);
  saveList(KEY_PLAYERS, players);
  inp.value='';
  renderRosterLists();
}
function addCoach(){
  const inp = $('newCoach');
  if (!inp) return;
  const name = String(inp.value||'').trim();
  if (!name) return;
  const coaches = getCoaches();
  coaches.push(name);
  saveList(KEY_COACHES, coaches);
  inp.value='';
  renderRosterLists();
}

// ---------- Backup import (paste JSON) ----------
function importBackup(){
  const ta = $('importText');
  const msg = $('importMsg');
  if (!ta) return;
  const raw = String(ta.value||'').trim();
  if (!raw){ if (msg) msg.textContent='Klistra in JSON först.'; return; }

  try{
    const data = JSON.parse(raw);

    if (Array.isArray(data.players)) saveList(KEY_PLAYERS, data.players);
    if (Array.isArray(data.coaches)) saveList(KEY_COACHES, data.coaches);

    if (Array.isArray(data.pools)){
      localStorage.setItem(KEY_POOLS, JSON.stringify(data.pools));
    }

    if (data.kv && typeof data.kv === 'object'){
      for (const [k,v] of Object.entries(data.kv)){
        if (v === null || v === undefined){
          localStorage.removeItem(k);
        } else if (typeof v === 'string'){
          localStorage.setItem(k, v);
        } else if (typeof v === 'number' || typeof v === 'boolean'){
          localStorage.setItem(k, String(v));
        } else {
          localStorage.setItem(k, JSON.stringify(v));
        }
      }
    }

    if (msg) msg.innerHTML = '<span class="ok">✔ Import klar</span>';
    renderRosterLists();
    renderPoolsHome();
    ta.value = '';
  } catch(e){
    if (msg) msg.innerHTML = '<span class="error">✖ Import misslyckades</span>';
  }
}
function clearImport(){
  const ta = $('importText');
  const msg = $('importMsg');
  if (ta) ta.value='';
  if (msg) msg.textContent='';
}

// ---------- Pools (home list) ----------
function loadPools(){
  const raw = localStorage.getItem(KEY_POOLS);
  const arr = raw ? safeJSON(raw, []) : [];
  return Array.isArray(arr) ? arr : [];
}
function savePools(arr){
  localStorage.setItem(KEY_POOLS, JSON.stringify(arr||[]));
}
function genId(){
  return Math.random().toString(16).slice(2,10);
}

function renderPoolsHome(){
  const wrap = $('poolspelList');
  if (!wrap) return;
  const pools = loadPools();

  if (!pools.length){
    wrap.innerHTML = '<div class="small">Inga sparade poolspel ännu.</div>';
    return;
  }

  const sorted = pools.slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
  wrap.innerHTML = sorted.map(p=>`
    <div class="poolCard">
      <div class="poolTitle">${escapeHtml(p.date||'—')} <span class="small">· ${escapeHtml(p.place||'—')}</span></div>
      <div class="poolActions">
        <button type="button" class="btn-primary" data-start="${escapeHtml(p.id)}">Påbörja</button>
        <button type="button" class="btn-secondary" data-edit="${escapeHtml(p.id)}">Redigera</button>
        <button type="button" class="btn-secondary" data-del="${escapeHtml(p.id)}">Ta bort</button>
      </div>
    </div>
  `).join('');

  wrap.querySelectorAll('[data-start]').forEach(btn=>{
    btn.addEventListener('click', ()=> openPool(btn.getAttribute('data-start')));
  });
  wrap.querySelectorAll('[data-edit]').forEach(btn=>{
    btn.addEventListener('click', ()=> editPool(btn.getAttribute('data-edit')));
  });
  wrap.querySelectorAll('[data-del]').forEach(btn=>{
    btn.addEventListener('click', ()=> deletePool(btn.getAttribute('data-del')));
  });
}

function createPool(){
  const date = prompt('Datum (YYYY-MM-DD):', nowYMD());
  if (date == null) return;
  const place = prompt('Plats:', '');
  if (place == null) return;
  const matchCount = prompt('Antal matcher (1-30):', '4');
  if (matchCount == null) return;

  const pools = loadPools();
  const id = genId();
  pools.push({
    id,
    date: String(date).trim(),
    place: String(place).trim(),
    matchCount: Math.max(1, Math.min(30, parseInt(matchCount,10)||4)),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    completed: false
  });
  savePools(pools);
  renderPoolsHome();
  openPool(id);
}

function editPool(id){
  const pools = loadPools();
  const p = pools.find(x=>x.id===id);
  if (!p) return;

  const date = prompt('Datum (YYYY-MM-DD):', p.date||'');
  if (date == null) return;
  const place = prompt('Plats:', p.place||'');
  if (place == null) return;
  const matchCount = prompt('Antal matcher (1-30):', String(p.matchCount||4));
  if (matchCount == null) return;

  p.date = String(date).trim();
  p.place = String(place).trim();
  p.matchCount = Math.max(1, Math.min(30, parseInt(matchCount,10)||4));
  p.updatedAt = Date.now();

  savePools(pools);
  renderPoolsHome();
}

function deletePool(id){
  if (!confirm('Ta bort detta poolspel?')) return;
  const pools = loadPools().filter(x=>x.id!==id);
  savePools(pools);
  const cur = localStorage.getItem(KEY_CURRENT_POOL) || '';
  if (cur === id) localStorage.removeItem(KEY_CURRENT_POOL);
  renderPoolsHome();
}

// ---------- Pool + Match views ----------
function openPool(id){
  if (!id) return;
  const pools = loadPools();
  const p = pools.find(x=>x.id===id);
  if (!p) return;

  localStorage.setItem(KEY_CURRENT_POOL, id);

  hide($('homeView'));
  show($('poolView'));
  hide($('matchView'));

  if ($('currentPoolLabel')) $('currentPoolLabel').textContent = `${p.date||'—'} · ${p.place||'—'}`;
  if ($('poolMeta')) $('poolMeta').innerHTML = `<b>${escapeHtml(p.date||'—')}</b> • ${escapeHtml(p.place||'—')}`;

  // populate controls
  const teamSel = $('poolTeamSelect');
  const matchSel = $('poolMatchSelect');
  const mcSel = $('poolMatchCount');

  if (teamSel && !teamSel.options.length){
    [1,2,3].forEach(n=>{
      const o=document.createElement('option');
      o.value=String(n);
      o.textContent=`Lag ${n}`;
      teamSel.appendChild(o);
    });
  }

  if (mcSel){
    if (!mcSel.options.length){
      for (let i=1;i<=30;i++){
        const o=document.createElement('option');
        o.value=String(i); o.textContent=String(i);
        mcSel.appendChild(o);
      }
    }
    mcSel.value = String(p.matchCount || 4);
  }

  function rebuildMatches(){
    const count = parseInt((mcSel && mcSel.value) || String(p.matchCount||4),10) || 4;
    if (!matchSel) return;
    matchSel.innerHTML='';
    for (let i=1;i<=count;i++){
      const o=document.createElement('option');
      o.value=String(i);
      o.textContent=`Match ${i}`;
      matchSel.appendChild(o);
    }
  }

  rebuildMatches();

  if (mcSel){
    mcSel.onchange = ()=>{
      const pools2 = loadPools();
      const pp = pools2.find(x=>x.id===id);
      if (pp){
        pp.matchCount = parseInt(mcSel.value||'4',10)||4;
        pp.updatedAt = Date.now();
        savePools(pools2);
      }
      rebuildMatches();
    };
  }

  const openMatchBtn = $('openMatchBtn');
  if (openMatchBtn){
    openMatchBtn.onclick = ()=>{
      const team = teamSel ? teamSel.value : '1';
      const match = matchSel ? matchSel.value : '1';
      openMatch(id, team, match);
    };
  }
}

function backToHome(){
  show($('homeView'));
  hide($('poolView'));
  hide($('matchView'));
  renderPoolsHome();
}

// ---------- Match state (kv format from backup) ----------
function kvKey(poolId, suffix){
  return `nsk_pool_${poolId}_${suffix}`;
}
function loadMatchState(poolId, team, match){
  const k = kvKey(poolId, `state_team_${team}_match_${match}`);
  const raw = localStorage.getItem(k);
  return raw ? safeJSON(raw, {}) : {};
}
function saveMatchState(poolId, team, match, state){
  const k = kvKey(poolId, `state_team_${team}_match_${match}`);
  localStorage.setItem(k, JSON.stringify(state||{}));
}

function openMatch(poolId, team, match){
  hide($('homeView'));
  hide($('poolView'));
  show($('matchView'));

  const pools = loadPools();
  const p = pools.find(x=>x.id===poolId);
  if ($('matchPill')) $('matchPill').textContent = `${p?.date||'—'} · ${p?.place||'—'}  •  Lag ${team} • Match ${match}`;

  const st = loadMatchState(poolId, team, match);

  // fill dropdowns first time
  const teamSizeSel = $('teamSize');
  if (teamSizeSel && !teamSizeSel.options.length){
    for (let i=1;i<=25;i++){
      const o=document.createElement('option');
      o.value=String(i); o.textContent=String(i);
      teamSizeSel.appendChild(o);
    }
  }
  const periodMinSel = $('periodMin');
  if (periodMinSel && !periodMinSel.options.length){
    for (let m=8;m<=20;m++){
      const o=document.createElement('option');
      o.value=String(m); o.textContent=String(m);
      periodMinSel.appendChild(o);
    }
  }
  const shiftSel = $('shiftSec');
  if (shiftSel && !shiftSel.options.length){
    for (let s=30;s<=180;s+=5){
      const o=document.createElement('option');
      o.value=String(s); o.textContent=String(s);
      shiftSel.appendChild(o);
    }
  }

  if ($('matchDate')) $('matchDate').value = st.matchDate || '';
  if ($('matchTime')) $('matchTime').value = st.matchTime || '';
  if ($('opponent')) $('opponent').value = st.opponent || '';
  if ($('arena')) $('arena').value = st.arena || '1';
  if ($('teamSize')) $('teamSize').value = st.teamSize || '10';
  if ($('onCourt')) $('onCourt').value = st.onCourt || '3';
  if ($('periodsCount')) $('periodsCount').value = st.periodsCount || '1';
  if ($('periodMin')) $('periodMin').value = st.periodMin || '15';
  if ($('shiftSec')) $('shiftSec').value = st.shiftSec || '90';

  const grid = $('playersGrid');
  const players = getPlayers();

  function persist(){
    st.matchDate = $('matchDate')?.value || '';
    st.matchTime = $('matchTime')?.value || '';
    st.opponent = $('opponent')?.value || '';
    st.arena = $('arena')?.value || '1';
    st.teamSize = $('teamSize')?.value || '10';
    st.onCourt = $('onCourt')?.value || '3';
    st.periodsCount = $('periodsCount')?.value || '1';
    st.periodMin = $('periodMin')?.value || '15';
    st.shiftSec = $('shiftSec')?.value || '90';
    saveMatchState(poolId, team, match, st);
  }

  function renderGrid(){
    if (!grid) return;
    const size = Math.max(1, Math.min(25, parseInt(($('teamSize')?.value)||'10',10)||10));
    const vals = Array.isArray(st.players) ? st.players.slice(0,size) : [];
    while (vals.length < size) vals.push('');
    st.players = vals;

    grid.innerHTML = vals.map((v,i)=>`
      <div>
        <label>Spelare ${i+1}</label>
        <select data-p="${i}">
          <option value="">Välj…</option>
          ${players.map(n=>`<option value="${escapeHtml(n)}"${n===v?' selected':''}>${escapeHtml(n)}</option>`).join('')}
        </select>
      </div>
    `).join('');

    grid.querySelectorAll('select[data-p]').forEach(sel=>{
      sel.addEventListener('change', ()=>{
        const i = parseInt(sel.getAttribute('data-p')||'0',10);
        st.players[i] = sel.value || '';
        persist();
      });
    });
  }

  ['matchDate','matchTime','opponent','arena','onCourt','periodsCount','periodMin','shiftSec','teamSize'].forEach(id=>{
    const el = $(id);
    if (!el) return;
    el.onchange = ()=>{
      if (id === 'teamSize') renderGrid();
      persist();
    };
    el.oninput = ()=>persist();
  });

  renderGrid();

  const back = $('backToPoolBtn');
  if (back) back.onclick = ()=> openPool(poolId);
}

// ---------- Bind clicks ----------
function bindClicks(){
  const map = [
    ['openRosterBtn', openRoster],
    ['closeRosterBtn', closeRoster],
    ['newPoolspelBtn', createPool],
    ['goalieStatsBtn', ()=>alert('Kommer snart: Statistik målvakter.')],
    ['backToHomeBtn', backToHome],
    ['addPlayerBtn', addPlayer],
    ['addCoachBtn', addCoach],
    ['importBtn', importBackup],
    ['clearImportBtn', clearImport],
  ];
  for (const [id, fn] of map){
    const el = $(id);
    if (!el) continue;
    el.addEventListener('click', (e)=>{ e.preventDefault(); fn(); });
  }

  // Close modal on backdrop tap
  const modal = $('rosterModal');
  if (modal){
    modal.addEventListener('click', (e)=>{
      if (e.target === modal) closeRoster();
    });
  }
}

// ---------- Init ----------
function init(){
  setVersion();
  bindClicks();
  if (!localStorage.getItem(KEY_PLAYERS)) saveList(KEY_PLAYERS, DEFAULT_PLAYERS);
  if (!localStorage.getItem(KEY_COACHES)) saveList(KEY_COACHES, DEFAULT_COACHES);
  renderPoolsHome();
}
window.addEventListener('DOMContentLoaded', init);

// ---------- PWA SW ----------
if ('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('./sw.js?v=44').catch(()=>{});
  });
}