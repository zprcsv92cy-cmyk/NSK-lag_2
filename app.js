'use strict';

const APP_VERSION = 'v45';

// --- helpers
const $ = (id) => document.getElementById(id);
function show(id){ const el=$(id); if(el) el.style.display=""; }
function hide(id){ const el=$(id); if(el) el.style.display="none"; }
function safeJSON(s){ try{return JSON.parse(s);}catch{return null;} }

// --- views
function goHome(){ show('viewHome'); hide('viewApp'); hide('viewRoster'); location.hash = '#home'; }
function goRoster(){ hide('viewHome'); hide('viewApp'); show('viewRoster'); location.hash = '#trupp'; renderRoster(); }
function goApp(){ hide('viewHome'); show('viewApp'); hide('viewRoster'); location.hash = '#app'; }

// --- storage
const KEY_PLAYERS='nsk_players';
const KEY_COACHES='nsk_coaches';
const DEFAULT_PLAYERS = [
  "Agnes Danielsson","Albert Zillén","Albin Andersson","Aron Warensjö-Sommar","August Hasselberg",
  "Benjamin Linderström","Charlie Carman","Emil Tranborg","Enzo Olsson","Gunnar Englund","Henry Gauffin",
  "Linus Stolt","Melker Axbom","Måns Åkvist","Nelson Östergren","Nicky Selander","Nikola Kosoderc",
  "Noé Bonnafous Sand","Oliver Engström","Oliver Zoumblios","Pelle Åstrand","Simon Misiorny","Sixten Bratt",
  "Theo Ydrenius","Viggo Kronvall","Yuktha reddy Semberi"
];
const DEFAULT_COACHES = [
  "Fredrik Selander","Joakim Lund","Linus Öhman","Niklas Gauffin","Olle Åstrand","Peter Hasselberg","Tommy Englund","William Åkvist"
];

function uniq(arr){
  const seen=new Set(); const out=[];
  for(const x of (arr||[])){
    const v=String(x||'').trim(); if(!v) continue;
    const k=v.toLowerCase(); if(seen.has(k)) continue;
    seen.add(k); out.push(v);
  }
  return out;
}
function loadList(key, fallback){
  const raw = localStorage.getItem(key);
  const data = raw ? safeJSON(raw) : null;
  return Array.isArray(data) ? data : fallback;
}
function saveList(key, arr){
  localStorage.setItem(key, JSON.stringify(uniq(arr).sort((a,b)=>a.localeCompare(b,'sv'))));
}
function loadRoster(){
  const players = uniq(loadList(KEY_PLAYERS, []).concat(DEFAULT_PLAYERS)).sort((a,b)=>a.localeCompare(b,'sv'));
  const coaches = uniq(loadList(KEY_COACHES, []).concat(DEFAULT_COACHES)).sort((a,b)=>a.localeCompare(b,'sv'));
  return {players, coaches};
}

// --- roster UI
function renderRoster(){
  const {players, coaches} = loadRoster();
  const pl = $('playerList');
  const cl = $('coachList');
  if(pl){
    pl.innerHTML = players.map((n,i)=>`
      <div class="listRow">
        <div class="name">${n}</div>
        <div class="actions">
          <button class="btn" data-edit-player="${i}">Redigera</button>
          <button class="btn" data-del-player="${i}">Ta bort</button>
        </div>
      </div>
    `).join('');
  }
  if(cl){
    cl.innerHTML = coaches.map((n,i)=>`
      <div class="listRow">
        <div class="name">${n}</div>
        <div class="actions">
          <button class="btn" data-edit-coach="${i}">Redigera</button>
          <button class="btn" data-del-coach="${i}">Ta bort</button>
        </div>
      </div>
    `).join('');
  }
}

// --- bind
function bind(id, fn){
  const el=$(id);
  if(!el) return;
  el.addEventListener('click', (e)=>{ e.preventDefault(); fn(); });
}

function init(){
  const v = $('debugVersion');
  if(v) v.textContent = APP_VERSION;

  // navigation
  bind('openRosterBtn', goRoster);
  bind('newPoolspelBtn', ()=>{ alert('Skapa nytt poolspel (kommer kopplas till app-vyn)'); });
  bind('goalieStatsBtn', ()=>{ alert('Kommer snart: Statistik målvakter'); });
  bind('backHomeBtn', goHome);
  bind('backFromRosterBtn', goHome);

  // add player/coach
  bind('addPlayerBtn', ()=>{
    const inp=$('newPlayer'); if(!inp) return;
    const name=String(inp.value||'').trim(); if(!name) return;
    const {players, coaches}=loadRoster();
    players.push(name);
    saveList(KEY_PLAYERS, players);
    inp.value='';
    renderRoster();
  });

  bind('addCoachBtn', ()=>{
    const inp=$('newCoach'); if(!inp) return;
    const name=String(inp.value||'').trim(); if(!name) return;
    const {players, coaches}=loadRoster();
    coaches.push(name);
    saveList(KEY_COACHES, coaches);
    inp.value='';
    renderRoster();
  });

  // edit/delete delegation
  document.body.addEventListener('click', (e)=>{
    const t = e.target;
    if(!(t instanceof HTMLElement)) return;

    const ep = t.getAttribute('data-edit-player');
    const dp = t.getAttribute('data-del-player');
    const ec = t.getAttribute('data-edit-coach');
    const dc = t.getAttribute('data-del-coach');

    if(ep != null){
      const idx = parseInt(ep,10);
      const {players, coaches}=loadRoster();
      const cur = players[idx] || '';
      const next = prompt('Redigera spelare:', cur);
      if(next==null) return;
      players[idx]=String(next).trim();
      saveList(KEY_PLAYERS, players);
      renderRoster();
    }
    if(dp != null){
      const idx = parseInt(dp,10);
      const {players}=loadRoster();
      players.splice(idx,1);
      saveList(KEY_PLAYERS, players);
      renderRoster();
    }
    if(ec != null){
      const idx = parseInt(ec,10);
      const {coaches}=loadRoster();
      const cur = coaches[idx] || '';
      const next = prompt('Redigera tränare:', cur);
      if(next==null) return;
      coaches[idx]=String(next).trim();
      saveList(KEY_COACHES, coaches);
      renderRoster();
    }
    if(dc != null){
      const idx = parseInt(dc,10);
      const {coaches}=loadRoster();
      coaches.splice(idx,1);
      saveList(KEY_COACHES, coaches);
      renderRoster();
    }
  });

  // import via textarea
  bind('importFromTextBtn', ()=>{
    const ta = $('importTextarea');
    const msg = $('importMsg');
    const data = ta ? safeJSON(ta.value) : null;
    if(!data){ if(msg) msg.textContent='✖ Ogiltig JSON'; return; }

    if(Array.isArray(data.players)) saveList(KEY_PLAYERS, data.players);
    if(Array.isArray(data.coaches)) saveList(KEY_COACHES, data.coaches);

    if(msg) msg.textContent='✔ Import klar';
    renderRoster();
  });

  bind('clearImportBtn', ()=>{
    const ta = $('importTextarea'); if(ta) ta.value='';
    const msg = $('importMsg'); if(msg) msg.textContent='';
  });

  // route on load
  const h = (location.hash||'').toLowerCase();
  if(h === '#trupp') goRoster();
  else if(h === '#app') goApp();
  else goHome();

  renderRoster();

  // SW register (cache-bust)
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('./sw.js?v=45').catch(()=>{});
  }
}

window.addEventListener('DOMContentLoaded', init);