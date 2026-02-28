'use strict';

const APP_VERSION = 'v57';

// ---------- helpers ----------
const $ = (id) => document.getElementById(id);
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}
function toast(msg){
  const el = $('toast');
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
  window.clearTimeout(window.__toastT);
  window.__toastT = window.setTimeout(()=>{ el.hidden = true; }, 2500);
}
function uniq(arr){
  const seen = new Set();
  const out = [];
  for (const v of (arr||[])){
    const s = String(v||'').trim();
    if (!s) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}
function safeJSON(raw, fallback){
  try { return JSON.parse(raw); } catch { return fallback; }
}

// ---------- storage keys (v1) ----------
const KEY_PLAYERS = 'nsk_players';
const KEY_COACHES = 'nsk_coaches';
const KEY_POOLS   = 'nsk_pools';
const KEY_CURRENT = 'nsk_current_pool';
const KEY_POOL_PREFIX = 'nsk_pool_'; // + id + _...

// Defaults
const DEFAULT_PLAYERS = [
  "Agnes Danielsson","Albert Zillén","Albin Andersson","Aron Warensjö-Sommar","August Hasselberg","Benjamin Linderström",
  "Charlie Carman","Emil Tranborg","Enzo Olsson","Gunnar Englund","Henry Gauffin","Linus Stolt","Melker Axbom","Måns Åkvist",
  "Nelson Östergren","Nicky Selander","Nikola Kosoderc","Noé Bonnafous Sand","Oliver Engström","Oliver Zoumblios","Pelle Åstrand",
  "Simon Misiorny","Sixten Bratt","Theo Ydrenius","Viggo Kronvall","Yuktha reddy Semberi"
];
const DEFAULT_COACHES = [
  "Fredrik Selander","Joakim Lund","Linus Öhman","Niklas Gauffin","Olle Åstrand","Peter Hasselberg","Tommy Englund","William Åkvist"
];

function loadRegister(){
  const p = safeJSON(localStorage.getItem(KEY_PLAYERS), []);
  const c = safeJSON(localStorage.getItem(KEY_COACHES), []);
  const players = uniq([...(Array.isArray(p)?p:[]), ...DEFAULT_PLAYERS]).sort((a,b)=>a.localeCompare(b,'sv'));
  const coaches = uniq([...(Array.isArray(c)?c:[]), ...DEFAULT_COACHES]).sort((a,b)=>a.localeCompare(b,'sv'));
  return {players, coaches};
}
function saveRegister(players, coaches){
  localStorage.setItem(KEY_PLAYERS, JSON.stringify(uniq(players).sort((a,b)=>a.localeCompare(b,'sv'))));
  localStorage.setItem(KEY_COACHES, JSON.stringify(uniq(coaches).sort((a,b)=>a.localeCompare(b,'sv'))));
}

// ---------- pools ----------
function loadPools(){
  const arr = safeJSON(localStorage.getItem(KEY_POOLS), []);
  return Array.isArray(arr) ? arr : [];
}
function savePools(pools){
  localStorage.setItem(KEY_POOLS, JSON.stringify(pools || []));
}
function genId(){
  return Math.random().toString(16).slice(2,10);
}
function setCurrentPool(id){
  localStorage.setItem(KEY_CURRENT, id || '');
  const pools = loadPools();
  const p = pools.find(x=>x.id===id);
  $('currentPoolLabel').textContent = p ? `${p.date || '—'} · ${p.place || '—'}` : 'Poolspel';
}
function getCurrentPool(){
  return localStorage.getItem(KEY_CURRENT) || '';
}

// ---------- routing ----------
function setActiveTab(route){
  document.querySelectorAll('.tab').forEach(a=>{
    a.classList.toggle('active', a.dataset.route === route);
  });
}
function showView(route){
  const home = $('viewHome');
  const pool = $('viewPool');
  if (route === 'pool'){
    home.hidden = true;
    pool.hidden = false;
    setActiveTab('pool');
  } else {
    home.hidden = false;
    pool.hidden = true;
    setActiveTab('home');
  }
}
function applyRoute(){
  const h = (location.hash || '').toLowerCase();
  if (h.startsWith('#/trupp')){
    showView('home');
    openRoster();
    return;
  }
  if (h.startsWith('#/pool')){
    showView('pool');
    return;
  }
  showView('home');
}

// ---------- UI: pool list ----------
function renderPoolList(){
  const wrap = $('poolList');
  if (!wrap) return;
  const pools = loadPools().slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
  if (!pools.length){
    wrap.innerHTML = `<div class="small">Inga poolspel</div>`;
    return;
  }
  wrap.innerHTML = pools.map(p=>`
    <div class="poolCard">
      <div class="poolTitle">${escapeHtml(p.date||'—')} <span class="poolMeta">· ${escapeHtml(p.place||'—')}</span></div>
      <div class="poolRow">
        <button class="btn btn-primary" data-start="${escapeHtml(p.id)}">Påbörja</button>
        <button class="btn" data-edit="${escapeHtml(p.id)}">Redigera</button>
        <button class="btn" data-del="${escapeHtml(p.id)}">Ta bort</button>
      </div>
    </div>
  `).join('');

  wrap.querySelectorAll('[data-start]').forEach(btn=>btn.addEventListener('click', ()=>{
    const id = btn.getAttribute('data-start');
    setCurrentPool(id);
    location.hash = '#/pool';
  }));
  wrap.querySelectorAll('[data-edit]').forEach(btn=>btn.addEventListener('click', ()=>editPool(btn.getAttribute('data-edit'))));
  wrap.querySelectorAll('[data-del]').forEach(btn=>btn.addEventListener('click', ()=>deletePool(btn.getAttribute('data-del'))));
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
  pools.push({ id, date: String(date).trim(), place: String(place).trim(), createdAt: Date.now(), updatedAt: Date.now() });
  savePools(pools);
  setCurrentPool(id);
  renderPoolList();
  location.hash = '#/pool';
}

function editPool(id){
  const pools = loadPools();
  const p = pools.find(x=>x.id===id);
  if (!p) return;
  const date = prompt('Datum (YYYY-MM-DD):', p.date || '');
  if (date == null) return;
  const place = prompt('Plats:', p.place || '');
  if (place == null) return;
  p.date = String(date).trim();
  p.place = String(place).trim();
  p.updatedAt = Date.now();
  savePools(pools);
  renderPoolList();
  if (getCurrentPool() === id) setCurrentPool(id);
}

function deletePool(id){
  if (!confirm('Ta bort detta poolspel?')) return;
  let pools = loadPools().filter(x=>x.id!==id);
  savePools(pools);
  if (getCurrentPool() === id) setCurrentPool('');
  renderPoolList();
}

// ---------- Roster modal ----------
function openRoster(){
  $('rosterModal').hidden = false;
  renderRosterLists();
}
function closeRoster(){
  $('rosterModal').hidden = true;
}

function renderRosterLists(){
  const {players, coaches} = loadRegister();
  const pl = $('playerList');
  const cl = $('coachList');

  pl.innerHTML = players.map((name, idx)=>`
    <div class="listItem">
      <div class="name">${escapeHtml(name)}</div>
      <div class="actions">
        <button class="btn" data-pedit="${idx}">Redigera</button>
        <button class="btn" data-pdel="${idx}">Ta bort</button>
      </div>
    </div>
  `).join('');

  cl.innerHTML = coaches.map((name, idx)=>`
    <div class="listItem">
      <div class="name">${escapeHtml(name)}</div>
      <div class="actions">
        <button class="btn" data-cedit="${idx}">Redigera</button>
        <button class="btn" data-cdel="${idx}">Ta bort</button>
      </div>
    </div>
  `).join('');

  pl.querySelectorAll('[data-pedit]').forEach(b=>b.addEventListener('click', ()=>editPlayer(parseInt(b.dataset.pedit,10))));
  pl.querySelectorAll('[data-pdel]').forEach(b=>b.addEventListener('click', ()=>removePlayer(parseInt(b.dataset.pdel,10))));
  cl.querySelectorAll('[data-cedit]').forEach(b=>b.addEventListener('click', ()=>editCoach(parseInt(b.dataset.cedit,10))));
  cl.querySelectorAll('[data-cdel]').forEach(b=>b.addEventListener('click', ()=>removeCoach(parseInt(b.dataset.cdel,10))));
}

function addPlayer(){
  const inp = $('newPlayer');
  const name = String(inp.value||'').trim();
  if (!name) return;
  const {players, coaches} = loadRegister();
  players.push(name);
  saveRegister(players, coaches);
  inp.value = '';
  renderRosterLists();
  toast('Spelare tillagd');
}
function addCoach(){
  const inp = $('newCoach');
  const name = String(inp.value||'').trim();
  if (!name) return;
  const {players, coaches} = loadRegister();
  coaches.push(name);
  saveRegister(players, coaches);
  inp.value = '';
  renderRosterLists();
  toast('Tränare tillagd');
}
function removePlayer(idx){
  const {players, coaches} = loadRegister();
  players.splice(idx,1);
  saveRegister(players, coaches);
  renderRosterLists();
}
function removeCoach(idx){
  const {players, coaches} = loadRegister();
  coaches.splice(idx,1);
  saveRegister(players, coaches);
  renderRosterLists();
}
function editPlayer(idx){
  const {players, coaches} = loadRegister();
  const cur = players[idx] || '';
  const next = prompt('Redigera spelare:', cur);
  if (next == null) return;
  const name = String(next).trim();
  if (!name) return;
  players[idx] = name;
  saveRegister(players, coaches);
  renderRosterLists();
}
function editCoach(idx){
  const {players, coaches} = loadRegister();
  const cur = coaches[idx] || '';
  const next = prompt('Redigera tränare:', cur);
  if (next == null) return;
  const name = String(next).trim();
  if (!name) return;
  coaches[idx] = name;
  saveRegister(players, coaches);
  renderRosterLists();
}

// ---------- Import/Export ----------
function exportBackup(){
  const out = {
    players: loadRegister().players,
    coaches: loadRegister().coaches,
    pools: loadPools(),
    kv: {}
  };
  // Include any pool-specific keys (state etc)
  for (let i=0; i<localStorage.length; i++){
    const k = localStorage.key(i);
    if (!k) continue;
    if (k.startsWith(KEY_POOL_PREFIX)) out.kv[k] = safeJSON(localStorage.getItem(k), localStorage.getItem(k));
  }
  const txt = JSON.stringify(out, null, 2);
  navigator.clipboard?.writeText(txt).then(()=>toast('Backup kopierad')).catch(()=>toast('Kunde inte kopiera'));
  $('importMsg').textContent = 'Backup kopierad till urklipp (om tillåtet).';
}

function importBackup(){
  const raw = String($('importText').value||'').trim();
  if (!raw) return;
  try{
    const data = JSON.parse(raw);
    if (Array.isArray(data.players) || Array.isArray(data.coaches)){
      saveRegister(Array.isArray(data.players)?data.players:[], Array.isArray(data.coaches)?data.coaches:[]);
    }
    if (Array.isArray(data.pools)){
      savePools(data.pools);
    }
    if (data.kv && typeof data.kv === 'object'){
      for (const [k,v] of Object.entries(data.kv)){
        if (k.startsWith(KEY_POOL_PREFIX)){
          localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
        }
      }
    }
    $('importMsg').textContent = '✔ Import klar';
    $('importText').value = '';
    renderRosterLists();
    renderPoolList();
    toast('Import klar');
  } catch(e){
    $('importMsg').textContent = '✖ Import misslyckades (ogiltig JSON)';
  }
}

// ---------- Schedule (simple AI rotation) ----------
// NOTE: This is a lightweight version; it uses ranking order + tries to avoid big changes.
function getSelectedRoster(){
  const {players} = loadRegister();
  // For now use the full roster (you can later add UI selection)
  return players.slice();
}
function formatMMSS(totalSeconds){
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = String(Math.floor(s/60)).padStart(2,'0');
  const ss = String(s%60).padStart(2,'0');
  return `${mm}:${ss}`;
}
function buildShiftTimes(totalMinutes, shiftSec){
  const totalSeconds = Math.floor(totalMinutes*60);
  const step = Math.max(1, Math.floor(shiftSec));
  const out = [];
  for (let t=totalSeconds; t>0; t -= step) out.push(formatMMSS(t));
  return out;
}
function makeSchedule(){
  const roster = getSelectedRoster();
  const k = Math.min(parseInt($('onCourt').value||'3',10), 5);
  const periods = parseInt($('periodsCount').value||'1',10);
  const perMin = parseInt($('periodMin').value||'15',10);
  const shiftSec = parseInt($('shiftSec').value||'90',10);
  const times = buildShiftTimes(periods*perMin, shiftSec);

  if (!roster.length){
    $('schedule').innerHTML = '<div class="small">Ingen trupp hittad.</div>';
    return;
  }

  // fair rotation: counts
  const counts = new Map(roster.map(n=>[n,0]));
  let prev = [];
  const lineups = [];

  for (let i=0;i<times.length;i++){
    // pick players with lowest count; tie-break by roster order
    const sorted = roster.slice().sort((a,b)=>{
      const da = counts.get(a)||0;
      const db = counts.get(b)||0;
      if (da!==db) return da-db;
      return roster.indexOf(a)-roster.indexOf(b);
    });

    // attempt to keep overlap with prev (avoid big changes)
    const keep = prev.slice(0, Math.max(0, k-1));
    const pick = [];
    for (const n of keep){
      if (pick.length>=k) break;
      if (!pick.includes(n)) pick.push(n);
    }
    for (const n of sorted){
      if (pick.length>=k) break;
      if (!pick.includes(n)) pick.push(n);
    }

    for (const n of pick) counts.set(n, (counts.get(n)||0)+1);
    lineups.push(pick);
    prev = pick;
  }

  $('schedule').innerHTML = `
    <table>
      <thead><tr><th>#</th><th>Tid kvar</th><th>På plan</th></tr></thead>
      <tbody>
        ${times.map((t,i)=>`<tr><td>${i+1}</td><td>${escapeHtml(t)}</td><td>${escapeHtml(lineups[i].join(', '))}</td></tr>`).join('')}
      </tbody>
    </table>
  `;
}

// ---------- init select options ----------
function initSelects(){
  const per = $('periodMin');
  per.innerHTML = '';
  for (let m=8;m<=20;m++) per.insertAdjacentHTML('beforeend', `<option value="${m}">${m}</option>`);
  per.value = '15';

  const shift = $('shiftSec');
  shift.innerHTML = '';
  for (let s=30;s<=180;s+=5) shift.insertAdjacentHTML('beforeend', `<option value="${s}">${s}</option>`);
  shift.value = '90';
}

// ---------- service worker / auto update ----------
async function registerSW(){
  if (!('serviceWorker' in navigator)) return;
  try{
    const reg = await navigator.serviceWorker.register('./sw.js?v=57');

    // If a new SW is waiting, activate it immediately
    if (reg.waiting) reg.waiting.postMessage({type:'SKIP_WAITING'});

    reg.addEventListener('updatefound', ()=>{
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', ()=>{
        if (nw.state === 'installed' && navigator.serviceWorker.controller){
          // Auto update: activate + reload
          nw.postMessage({type:'SKIP_WAITING'});
        }
      });
    });

    navigator.serviceWorker.addEventListener('controllerchange', ()=>{
      // reload exactly once
      if (window.__reloading) return;
      window.__reloading = true;
      location.reload();
    });
  } catch {}
}

// ---------- bind events (single place) ----------
function bind(){
  $('versionChip').textContent = APP_VERSION;

  $('btnGoTroup').addEventListener('click', ()=> location.hash = '#/trupp');
  $('btnGoNewPool').addEventListener('click', createPool);
  $('btnStats').addEventListener('click', ()=>alert('Kommer snart: Statistik målvakter.'));

  $('btnBackToHome').addEventListener('click', ()=> location.hash = '#/home');
  $('btnOpenRoster').addEventListener('click', openRoster);
  $('btnMakeSchedule').addEventListener('click', makeSchedule);

  $('btnCloseRoster').addEventListener('click', closeRoster);
  $('btnAddPlayer').addEventListener('click', addPlayer);
  $('btnAddCoach').addEventListener('click', addCoach);
  $('btnExport').addEventListener('click', exportBackup);
  $('btnImport').addEventListener('click', importBackup);

  window.addEventListener('hashchange', ()=>{
    applyRoute();
    // refresh pool label
    setCurrentPool(getCurrentPool());
  });
}

function init(){
  initSelects();
  bind();

  // ensure defaults are present
  loadRegister();

  // initial label
  setCurrentPool(getCurrentPool());

  renderPoolList();
  applyRoute();
  registerSW();
}

window.addEventListener('DOMContentLoaded', init);