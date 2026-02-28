'use strict';

const APP_VERSION = 'v61';

// ---- Keys ----
const LS_PLAYERS = 'nsk_players_v1';
const LS_COACHES = 'nsk_coaches_v1';
const LS_POOLS   = 'nsk_pools_v1';
const LS_KV      = 'nsk_kv_v1';

// ---- Default roster ----
const DEFAULT_PLAYERS = [
  "Agnes Danielsson","Albert Zillén","Albin Andersson","Aron Warensjö-Sommar",
  "August Hasselberg","Benjamin Linderström","Charlie Carman","Emil Tranborg",
  "Enzo Olsson","Gunnar Englund","Henry Gauffin","Linus Stolt","Melker Axbom",
  "Måns Åkvist","Nelson Östergren","Nicky Selander","Nikola Kosoderc",
  "Noé Bonnafous Sand","Oliver Engström","Oliver Zoumblios","Pelle Åstrand",
  "Simon Misiorny","Sixten Bratt","Theo Ydrenius","Viggo Kronvall","Yuktha reddy Semberi"
];
const DEFAULT_COACHES = [
  "Fredrik Selander","Joakim Lund","Linus Öhman","Niklas Gauffin",
  "Olle Åstrand","Peter Hasselberg","Tommy Englund","William Åkvist"
];

// ---- Helpers ----
const $ = (id) => document.getElementById(id);
function safeJsonParse(raw, fallback){
  try { return JSON.parse(raw); } catch { return fallback; }
}
function uniqSorted(arr){
  const seen = new Set();
  const out = [];
  for (const x of (arr||[])){
    const v = String(x||'').trim();
    if(!v) continue;
    const k = v.toLowerCase();
    if(seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out.sort((a,b)=>a.localeCompare(b,'sv'));
}
function loadPlayers(){
  const stored = safeJsonParse(localStorage.getItem(LS_PLAYERS) || '[]', []);
  return uniqSorted([...stored, ...DEFAULT_PLAYERS]);
}
function loadCoaches(){
  const stored = safeJsonParse(localStorage.getItem(LS_COACHES) || '[]', []);
  return uniqSorted([...stored, ...DEFAULT_COACHES]);
}
function savePlayers(list){ localStorage.setItem(LS_PLAYERS, JSON.stringify(uniqSorted(list))); }
function saveCoaches(list){ localStorage.setItem(LS_COACHES, JSON.stringify(uniqSorted(list))); }

function loadPools(){
  const arr = safeJsonParse(localStorage.getItem(LS_POOLS) || '[]', []);
  return Array.isArray(arr) ? arr : [];
}
function savePools(arr){ localStorage.setItem(LS_POOLS, JSON.stringify(arr||[])); }

function loadKV(){
  return safeJsonParse(localStorage.getItem(LS_KV) || '{}', {});
}
function saveKV(obj){
  localStorage.setItem(LS_KV, JSON.stringify(obj||{}));
}

function genId(){
  return Math.random().toString(16).slice(2,10) + Date.now().toString(16);
}
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

// ---- UI: HARD view control (fixar att flera vyer syns samtidigt) ----
function hardHideAllViews(){
  const a = $('view-startsida');
  const b = $('view-poolspel');
  if (a) a.classList.add('hidden');
  if (b) b.classList.add('hidden');
}
function setActiveTab(hash){
  document.querySelectorAll('[data-nav]').forEach(a=>{
    a.classList.toggle('active', a.getAttribute('data-nav') === hash);
  });
}
function showStartsida(){
  hardHideAllViews();
  $('view-startsida')?.classList.remove('hidden');
  setActiveTab('#startsida');
}
function showPoolspel(){
  hardHideAllViews();
  $('view-poolspel')?.classList.remove('hidden');
  setActiveTab('#poolspel');
}

// ---- Trupp overlay (FORCE overlay även om Safari/CSS strular) ----
function forceOverlayStyles(on){
  const ov = $('truppOverlay');
  if(!ov) return;

  if(on){
    // tvinga overlay-läge
    ov.style.position = 'fixed';
    ov.style.inset = '0';
    ov.style.left = '0';
    ov.style.right = '0';
    ov.style.top = '0';
    ov.style.bottom = '0';
    ov.style.background = 'rgba(0,0,0,0.55)';
    ov.style.display = 'flex';
    ov.style.alignItems = 'flex-end';
    ov.style.justifyContent = 'center';
    ov.style.padding = '18px';
    ov.style.zIndex = '99999';

    // lås bakgrund-scroll
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
  } else {
    // återställ
    ov.style.position = '';
    ov.style.inset = '';
    ov.style.left = '';
    ov.style.right = '';
    ov.style.top = '';
    ov.style.bottom = '';
    ov.style.background = '';
    ov.style.display = '';
    ov.style.alignItems = '';
    ov.style.justifyContent = '';
    ov.style.padding = '';
    ov.style.zIndex = '';

    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
  }
}

function openTrupp(){
  const ov = $('truppOverlay');
  if(!ov) return;
  ov.classList.remove('hidden');
  forceOverlayStyles(true);
  renderTruppLists();
}
function closeTrupp(silent=false){
  const ov = $('truppOverlay');
  if(!ov) return;
  ov.classList.add('hidden');
  forceOverlayStyles(false);
  if(!silent && location.hash.toLowerCase() === '#trupp'){
    location.hash = '#startsida';
  }
}

function renderTruppLists(){
  const players = loadPlayers();
  const coaches = loadCoaches();

  const pl = $('playerList');
  const cl = $('coachList');

  if(pl){
    pl.innerHTML = players.map((name, idx)=>`
      <div class="item" data-kind="player" data-idx="${idx}">
        <div class="itemName">${escapeHtml(name)}</div>
        <button class="btnSecondary smallBtn" data-action="edit-player" data-idx="${idx}">Redigera</button>
        <button class="btnSecondary smallBtn" data-action="del-player"  data-idx="${idx}">Ta bort</button>
      </div>
    `).join('');
  }

  if(cl){
    cl.innerHTML = coaches.map((name, idx)=>`
      <div class="item" data-kind="coach" data-idx="${idx}">
        <div class="itemName">${escapeHtml(name)}</div>
        <button class="btnSecondary smallBtn" data-action="edit-coach" data-idx="${idx}">Redigera</button>
        <button class="btnSecondary smallBtn" data-action="del-coach"  data-idx="${idx}">Ta bort</button>
      </div>
    `).join('');
  }
}

// ---- Pools ----
function formatPool(p){
  const d = p?.date || '—';
  const place = p?.place || '—';
  return `${d} · ${place}`;
}
function renderPools(){
  const list = loadPools().slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
  const html = list.length ? list.map(p=>`
    <div class="poolCard">
      <div class="poolTitle">${escapeHtml(formatPool(p))}</div>
      <div class="poolRow">
        <button class="btnPrimary" data-action="start-pool" data-id="${escapeHtml(p.id)}">Påbörja</button>
        <button class="btnSecondary" data-action="edit-pool" data-id="${escapeHtml(p.id)}">Redigera</button>
        <button class="btnSecondary" data-action="del-pool" data-id="${escapeHtml(p.id)}">Ta bort</button>
      </div>
    </div>
  `).join('') : `<div class="muted">Inga sparade poolspel ännu.</div>`;

  $('poolList')?.(null);
  if ($('poolList')) $('poolList').innerHTML = html;
  if ($('poolList2')) $('poolList2').innerHTML = html;
}

function newPool(){
  const today = new Date();
  const yyyy = String(today.getFullYear());
  const mm = String(today.getMonth()+1).padStart(2,'0');
  const dd = String(today.getDate()).padStart(2,'0');
  const def = `${yyyy}-${mm}-${dd}`;

  const date = prompt('Datum (YYYY-MM-DD):', def);
  if(date == null) return;
  const place = prompt('Plats:', '');
  if(place == null) return;

  const pools = loadPools();
  pools.push({
    id: genId(),
    date: String(date).trim(),
    place: String(place).trim(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    completed: false
  });
  savePools(pools);
  renderPools();
  location.hash = '#poolspel';
}
function editPool(id){
  const pools = loadPools();
  const p = pools.find(x=>x.id===id);
  if(!p) return;

  const date = prompt('Datum (YYYY-MM-DD):', p.date || '');
  if(date == null) return;
  const place = prompt('Plats:', p.place || '');
  if(place == null) return;

  p.date = String(date).trim();
  p.place = String(place).trim();
  p.updatedAt = Date.now();
  savePools(pools);
  renderPools();
}
function deletePool(id){
  if(!confirm('Ta bort detta poolspel?')) return;
  const pools = loadPools().filter(x=>x.id!==id);
  savePools(pools);
  renderPools();
}
function startPool(id){
  alert('Matchläge kommer i nästa steg.\n\n(pool-id: '+id+')');
  location.hash = '#poolspel';
}

// ---- Import/Export ----
function exportBackup(){
  const payload = {
    players: loadPlayers(),
    coaches: loadCoaches(),
    pools: loadPools(),
    kv: loadKV()
  };
  const txt = JSON.stringify(payload, null, 2);
  navigator.clipboard?.writeText(txt).catch(()=>{});
  const msg = $('importMsg');
  if(msg){
    msg.className = 'msg ok';
    msg.textContent = '✔ Export kopierad (om tillåtet). Innehållet ligger också i rutan.';
  }
  if($('importArea')) $('importArea').value = txt;
}
function importBackup(){
  const raw = $('importArea')?.value || '';
  let data;
  try{ data = JSON.parse(raw); }
  catch{
    const msg = $('importMsg');
    if(msg){ msg.className = 'msg err'; msg.textContent = '✖ Ogiltig JSON'; }
    return;
  }

  if(Array.isArray(data.players)) savePlayers(data.players);
  if(Array.isArray(data.coaches)) saveCoaches(data.coaches);
  if(Array.isArray(data.pools)) savePools(data.pools);
  if(data.kv && typeof data.kv === 'object') saveKV(data.kv);

  const msg = $('importMsg');
  if(msg){ msg.className = 'msg ok'; msg.textContent = '✔ Import klar'; }

  renderTruppLists();
  renderPools();
}

// ---- Trupp actions ----
function addPlayer(){
  const inp = $('newPlayer');
  const v = (inp?.value||'').trim();
  if(!v) return;
  const list = loadPlayers();
  list.push(v);
  savePlayers(list);
  if(inp) inp.value = '';
  renderTruppLists();
}
function addCoach(){
  const inp = $('newCoach');
  const v = (inp?.value||'').trim();
  if(!v) return;
  const list = loadCoaches();
  list.push(v);
  saveCoaches(list);
  if(inp) inp.value = '';
  renderTruppLists();
}
function editName(kind, idx){
  const list = kind==='player' ? loadPlayers() : loadCoaches();
  const current = list[idx];
  const next = prompt('Redigera:', current || '');
  if(next == null) return;
  const v = String(next).trim();
  if(!v) return;
  list[idx]=v;
  if(kind==='player') savePlayers(list); else saveCoaches(list);
  renderTruppLists();
}
function deleteName(kind, idx){
  if(!confirm('Ta bort?')) return;
  const list = kind==='player' ? loadPlayers() : loadCoaches();
  list.splice(idx,1);
  if(kind==='player') savePlayers(list); else saveCoaches(list);
  renderTruppLists();
}

// ---- Routing ----
function applyRoute(){
  const h = (location.hash || '#startsida').toLowerCase();

  // stäng overlay om vi inte är på #trupp
  if(h !== '#trupp') closeTrupp(true);

  if(h === '#trupp'){
    showStartsida();          // bakgrundsvy
    setActiveTab('#trupp');   // markera fliken
    openTrupp();              // öppna overlay
    return;
  }
  if(h === '#poolspel'){
    showPoolspel();
    return;
  }
  showStartsida();
}

// ---- Click handling (iOS-safe) ----
function onAction(action, el){
  switch(action){
    case 'open-trupp': location.hash = '#trupp'; return;
    case 'close-trupp': closeTrupp(); return;

    case 'new-pool': newPool(); return;
    case 'stats': alert('Kommer snart: Statistik målvakter.'); return;

    case 'add-player': addPlayer(); return;
    case 'add-coach': addCoach(); return;

    case 'edit-player': editName('player', parseInt(el.dataset.idx,10)); return;
    case 'del-player': deleteName('player', parseInt(el.dataset.idx,10)); return;
    case 'edit-coach': editName('coach', parseInt(el.dataset.idx,10)); return;
    case 'del-coach': deleteName('coach', parseInt(el.dataset.idx,10)); return;

    case 'import-json': importBackup(); return;
    case 'export-json': exportBackup(); return;

    case 'start-pool': startPool(el.dataset.id); return;
    case 'edit-pool': editPool(el.dataset.id); return;
    case 'del-pool': deletePool(el.dataset.id); return;
  }
}
function wireGlobalActions(){
  const handler = (e)=>{
    const t = e.target.closest('[data-action]');
    if(!t) return;
    e.preventDefault();
    onAction(t.dataset.action, t);
  };
  document.addEventListener('pointerup', handler, {passive:false});
  document.addEventListener('click', handler, {passive:false});
}

// ---- SW update banner ----
function setupUpdateBanner(){
  const banner = $('updateBanner');
  const updateBtn = $('updateBtn');
  const dismissBtn = $('dismissBtn');
  if(!banner || !updateBtn || !dismissBtn) return;

  const show = ()=>banner.classList.remove('hidden');
  const hide = ()=>banner.classList.add('hidden');

  dismissBtn.addEventListener('click', hide);

  updateBtn.addEventListener('click', async ()=>{
    hide();
    try{
      const reg = await navigator.serviceWorker.getRegistration();
      if(reg?.waiting){
        reg.waiting.postMessage({type:'SKIP_WAITING'});
      }else{
        await reg?.update?.();
      }
    }catch{}
  });

  navigator.serviceWorker?.addEventListener('controllerchange', ()=>{
    hide();
    location.reload();
  });

  (async ()=>{
    try{
      const reg = await navigator.serviceWorker.getRegistration();
      if(reg?.waiting) show();
      reg?.addEventListener('updatefound', ()=>{
        const w = reg.installing;
        if(!w) return;
        w.addEventListener('statechange', ()=>{
          if(w.state==='installed' && navigator.serviceWorker.controller) show();
        });
      });
    }catch{}
  })();
}

// ---- init ----
function init(){
  if($('versionPill')) $('versionPill').textContent = APP_VERSION;

  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }

  wireGlobalActions();
  renderPools();
  applyRoute();
  window.addEventListener('hashchange', applyRoute);

  if('serviceWorker' in navigator) setupUpdateBanner();
}
window.addEventListener('DOMContentLoaded', init);