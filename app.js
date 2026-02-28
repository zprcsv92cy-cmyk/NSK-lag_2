/* app.js — v45 (matchar index.html v45) */
'use strict';

const APP_VERSION = 'v45';

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

// ---------- Keys ----------
const KEY_PLAYERS = 'nsk_players';
const KEY_COACHES = 'nsk_coaches';
const KEY_POOLS   = 'nsk_pools';

// ---------- Defaults Team 18 ----------
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

// ---------- Storage ----------
function loadArr(key, fallback){
  const raw = localStorage.getItem(key);
  const data = raw ? safeJSON(raw) : null;
  return Array.isArray(data) ? data : (fallback || []);
}
function saveArr(key, arr){
  localStorage.setItem(key, JSON.stringify(uniq(arr).sort((a,b)=>a.localeCompare(b,'sv'))));
}
function getRoster(){
  const p = uniq(loadArr(KEY_PLAYERS, []).concat(DEFAULT_PLAYERS)).sort((a,b)=>a.localeCompare(b,'sv'));
  const c = uniq(loadArr(KEY_COACHES, []).concat(DEFAULT_COACHES)).sort((a,b)=>a.localeCompare(b,'sv'));
  return { players: p, coaches: c };
}
function ensureDefaultsOnce(){
  if (!localStorage.getItem(KEY_PLAYERS)) saveArr(KEY_PLAYERS, DEFAULT_PLAYERS);
  if (!localStorage.getItem(KEY_COACHES)) saveArr(KEY_COACHES, DEFAULT_COACHES);
}
function loadPools(){
  const arr = loadArr(KEY_POOLS, []);
  return Array.isArray(arr) ? arr : [];
}
function savePools(pools){
  localStorage.setItem(KEY_POOLS, JSON.stringify(pools || []));
}

// ---------- Views (supports both new + old ids) ----------
function getViewEls(){
  return {
    // new wrappers
    homeWrap: $('homeView'),
    truppWrap: $('truppView'),
    poolWrap: $('poolView'),
    // old wrappers (inside)
    viewHome: $('viewHome'),
    viewRoster: $('viewRoster'),
    viewApp: $('viewApp'),
  };
}
function hideAll(){
  const v = getViewEls();
  // new
  hideEl(v.homeWrap); hideEl(v.truppWrap); hideEl(v.poolWrap);
  // old
  if (v.viewHome) v.viewHome.style.display = 'none';
  if (v.viewRoster) v.viewRoster.style.display = 'none';
  if (v.viewApp) v.viewApp.style.display = 'none';
}
function goHome(){
  hideAll();
  const v = getViewEls();
  showEl(v.homeWrap);
  if (v.viewHome) v.viewHome.style.display = '';
  location.hash = '#home';
  renderPoolsList();
}
function goTrupp(){
  hideAll();
  const v = getViewEls();
  showEl(v.truppWrap);
  if (v.viewRoster) v.viewRoster.style.display = '';
  location.hash = '#trupp';
  renderRosterLists();
}
function goPool(){
  hideAll();
  const v = getViewEls();
  showEl(v.poolWrap);
  if (v.viewApp) v.viewApp.style.display = '';
  location.hash = '#pool';
}
function applyRoute(){
  const h = (location.hash || '#home').toLowerCase();
  if (h === '#trupp') return goTrupp();
  if (h === '#pool' || h === '#app') return goPool();
  return goHome();
}

// ---------- Roster UI ----------
function renderRosterLists(){
  const {players, coaches} = getRoster();

  const pl = $('playerList');
  const cl = $('coachList');

  if (pl){
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

  if (cl){
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
  const inp = $('newPlayer');
  if (!inp) return;
  const name = String(inp.value||'').trim();
  if (!name) return;

  const {players} = getRoster();
  players.push(name);
  saveArr(KEY_PLAYERS, players);
  inp.value = '';
  renderRosterLists();
}
function addCoach(){
  const inp = $('newCoach');
  if (!inp) return;
  const name = String(inp.value||'').trim();
  if (!name) return;

  const {coaches} = getRoster();
  coaches.push(name);
  saveArr(KEY_COACHES, coaches);
  inp.value = '';
  renderRosterLists();
}

// ---------- Import (paste JSON) ----------
function doImportFromPaste(){
  const ta = $('importText');
  const msg = $('importMsg');
  if (!ta) return;
  const raw = String(ta.value||'').trim();
  if (!raw){
    if (msg) msg.innerHTML = '<span class="error">✖ Klistra in JSON först</span>';
    return;
  }

  const data = safeJSON(raw);
  if (!data){
    if (msg) msg.innerHTML = '<span class="error">✖ Ogiltig JSON</span>';
    return;
  }

  try{
    if (Array.isArray(data.players)) saveArr(KEY_PLAYERS, data.players);
    if (Array.isArray(data.coaches)) saveArr(KEY_COACHES, data.coaches);

    // pools (nyare format)
    if (Array.isArray(data.pools)) savePools(data.pools);

    // kv (återställ allt exakt)
    if (data.kv && typeof data.kv === 'object'){
      for (const [k,v] of Object.entries(data.kv)){
        if (v === null || v === undefined) {
          localStorage.removeItem(k);
        } else if (typeof v === 'string') {
          localStorage.setItem(k, v);
        } else if (typeof v === 'number' || typeof v === 'boolean') {
          localStorage.setItem(k, String(v));
        } else {
          localStorage.setItem(k, JSON.stringify(v));
        }
      }
    }

    if (msg) msg.innerHTML = '<span class="ok">✔ Import klar</span>';
    renderRosterLists();
    renderPoolsList();
    ta.value = '';
  }catch(e){
    if (msg) msg.innerHTML = '<span class="error">✖ Import misslyckades</span>';
  }
}

// ---------- Export (simple) ----------
function exportJSON(){
  const payload = {
    players: getRoster().players,
    coaches: getRoster().coaches,
    pools: loadPools(),
    kv: {}
  };

  // exportera alla nsk_pool_* keys (ditt format)
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

// ---------- Pools list on home ----------
function renderPoolsList(){
  const wrap = $('poolspelList');
  if (!wrap) return;

  const pools = loadPools();
  if (!pools.length){
    wrap.innerHTML = `<div class="small">Inga sparade poolspel ännu.</div>`;
    return;
  }

  const sorted = pools.slice().sort((a,b)=> String(b.date||'').localeCompare(String(a.date||'')));
  wrap.innerHTML = sorted.map(p=>`
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

// Minimal pool actions (navigation to pool view)
function createPool(){
  const date = prompt('Datum (YYYY-MM-DD):', nowYMD());
  if (date == null) return;
  const place = prompt('Plats:', '');
  if (place == null) return;

  const pools = loadPools();
  const id = Math.random().toString(16).slice(2,10);
  pools.push({ id, date: String(date).trim(), place: String(place).trim(), createdAt: Date.now(), updatedAt: Date.now(), completed: false });
  savePools(pools);
  renderPoolsList();
  goPool();
  const label = $('currentPoolspelLabel');
  if (label) label.textContent = `${date} · ${place}`;
}

function editPool(id){
  const pools = loadPools();
  const p = pools.find(x=>x.id===id);
  if (!p) return;

  const date = prompt('Datum (YYYY-MM-DD):', p.date || nowYMD());
  if (date == null) return;
  const place = prompt('Plats:', p.place || '');
  if (place == null) return;

  p.date = String(date).trim();
  p.place = String(place).trim();
  p.updatedAt = Date.now();
  savePools(pools);
  renderPoolsList();
}
function deletePool(id){
  if (!confirm('Ta bort detta poolspel?')) return;
  const pools = loadPools().filter(x=>x.id !== id);
  savePools(pools);
  renderPoolsList();
}
function startPool(id){
  const pools = loadPools();
  const p = pools.find(x=>x.id===id);
  if (!p) return;
  goPool();
  const label = $('currentPoolspelLabel');
  if (label) label.textContent = `${p.date||'—'} · ${p.place||'—'}`;
}

// ---------- Bindings (failsafe via delegation) ----------
function bindStaticButtons(){
  const setVer = $('appVersion');
  if (setVer) setVer.textContent = APP_VERSION;
  const dbg = $('debugVersion');
  if (dbg && $('appVersion') == null) dbg.textContent = APP_VERSION;

  const bind = (id, fn) => {
    const el = $(id);
    if (!el) return;
    el.addEventListener('click', (e)=>{ e.preventDefault(); fn(); });
  };

  bind('openRosterBtn', goTrupp);
  bind('newPoolspelBtn', createPool);
  bind('goalieStatsBtn', ()=>alert('Kommer snart: Statistik målvakter.'));
  bind('backFromRosterBtn', goHome);
  bind('backHomeBtn', goHome);

  bind('addPlayerBtn', addPlayer);
  bind('addCoachBtn', addCoach);

  // Import buttons (index has importPasteBtn)
  bind('importPasteBtn', doImportFromPaste);

  // Export button (index has exportJsonBtn)
  bind('exportJsonBtn', exportJSON);

  // Update banner (optional)
  const dismiss = $('dismissUpdateBtn');
  if (dismiss){
    dismiss.addEventListener('click', ()=>{ const b=$('updateBanner'); if(b) b.style.display='none'; });
  }
  const updateBtn = $('updateBtn');
  if (updateBtn){
    updateBtn.addEventListener('click', ()=>{
      // try SW skip waiting if exists
      if (navigator.serviceWorker && navigator.serviceWorker.controller){
        navigator.serviceWorker.getRegistration().then(reg=>{
          if (reg && reg.waiting) reg.waiting.postMessage({type:'SKIP_WAITING'});
        });
      }
      location.reload();
    });
  }
}

function bindDelegation(){
  document.body.addEventListener('click', (e)=>{
    const t = e.target;

    // data-nav navigation
    const navBtn = t && t.closest ? t.closest('[data-nav]') : null;
    if (navBtn){
      const target = navBtn.getAttribute('data-nav');
      if (target) location.hash = target;
      return;
    }

    // roster list buttons
    const editP = t && t.getAttribute ? t.getAttribute('data-edit-player') : null;
    const delP  = t && t.getAttribute ? t.getAttribute('data-del-player') : null;
    const editC = t && t.getAttribute ? t.getAttribute('data-edit-coach') : null;
    const delC  = t && t.getAttribute ? t.getAttribute('data-del-coach') : null;

    if (editP != null){
      const idx = parseInt(editP, 10);
      const {players} = getRoster();
      const cur = players[idx] || '';
      const next = prompt('Redigera spelare:', cur);
      if (next == null) return;
      const name = String(next).trim();
      if (!name) return;
      players[idx] = name;
      saveArr(KEY_PLAYERS, players);
      renderRosterLists();
      return;
    }
    if (delP != null){
      const idx = parseInt(delP, 10);
      const {players} = getRoster();
      if (!confirm('Ta bort spelare?')) return;
      players.splice(idx, 1);
      saveArr(KEY_PLAYERS, players);
      renderRosterLists();
      return;
    }
    if (editC != null){
      const idx = parseInt(editC, 10);
      const {coaches} = getRoster();
      const cur = coaches[idx] || '';
      const next = prompt('Redigera tränare:', cur);
      if (next == null) return;
      const name = String(next).trim();
      if (!name) return;
      coaches[idx] = name;
      saveArr(KEY_COACHES, coaches);
      renderRosterLists();
      return;
    }
    if (delC != null){
      const idx = parseInt(delC, 10);
      const {coaches} = getRoster();
      if (!confirm('Ta bort tränare?')) return;
      coaches.splice(idx, 1);
      saveArr(KEY_COACHES, coaches);
      renderRosterLists();
      return;
    }

    // pools list buttons
    const start = t && t.getAttribute ? t.getAttribute('data-start-pool') : null;
    const edit  = t && t.getAttribute ? t.getAttribute('data-edit-pool') : null;
    const del   = t && t.getAttribute ? t.getAttribute('data-del-pool') : null;

    if (start){ startPool(start); return; }
    if (edit){ editPool(edit); return; }
    if (del){ deletePool(del); return; }
  });
}

// ---------- Init ----------
function init(){
  ensureDefaultsOnce();
  bindStaticButtons();
  bindDelegation();
  renderPoolsList();
  applyRoute();
}
window.addEventListener('hashchange', applyRoute);
window.addEventListener('DOMContentLoaded', init);

// ---------- SW register (cache-bust) ----------
if ('serviceWorker' in navigator){
  window.addEventListener('load', async ()=>{
    try{
      const reg = await navigator.serviceWorker.register('./sw.js?v=45');
      if (reg.update) reg.update();

      // If waiting -> activate immediately
      if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }catch(e){}
  });
}