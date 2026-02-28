const APP_VERSION = 'v40';
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

let players = loadArr('players');
let coaches = loadArr('coaches');

function persist(){
  saveArr('players', players);
  saveArr('coaches', coaches);
  renderRoster();
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
      setTimeout(()=>{
        const inp = document.getElementById(`${k}-edit-${idx}`);
        if(inp){ inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
      }, 50);
      return;
    }

    if(action === 'save'){
      const inp = document.getElementById(`${k}-edit-${idx}`);
      const next = normalizeName(inp ? inp.value : '');
      if(!next) return;
      if(k === 'player') players[idx] = {name: next};
      else coaches[idx] = {name: next};
      editing = {kind:null, idx:-1};
      persist();
      return;
    }

    if(action === 'del'){
      if(!confirm('Ta bort?')) return;
      if(k === 'player') players.splice(idx,1);
      else coaches.splice(idx,1);
      persist();
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
    persist();
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
  persist();
}

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
    persist();
    if(msg) msg.innerHTML = `<span style="color:#1b5e20">✔ Import klar (${nextPlayers.length} spelare, ${nextCoaches.length} tränare)</span>`;
    if(ta) ta.value='';
  }catch{
    if(msg) msg.innerHTML = '<span style="color:#b00020">✖ Ogiltig JSON</span>';
  }
}
function clearImportText(){
  const ta = document.getElementById('importText');
  const msg = document.getElementById('importMsg');
  if(ta) ta.value='';
  if(msg) msg.innerHTML='';
}

// placeholders (behåll startsidan)
function createNewPoolspel(){ alert('Kommer snart: Skapa nytt poolspel.'); }

window.addEventListener('load', () => {
  const v = document.getElementById('versionBox');
  if(v) v.textContent = APP_VERSION;

  const openBtn = document.getElementById('openRosterBtn');
  const closeBtn = document.getElementById('closeRosterBtn');
  const newBtn = document.getElementById('newPoolspelBtn');
  const statsBtn = document.getElementById('goalieStatsBtn');

  if(openBtn) openBtn.addEventListener('click', openRoster);
  if(closeBtn) closeBtn.addEventListener('click', closeRoster);
  if(newBtn) newBtn.addEventListener('click', createNewPoolspel);
  if(statsBtn) statsBtn.addEventListener('click', () => alert('Kommer snart: Statistik målvakter.'));

  const modal = document.getElementById('rosterModal');
  if(modal){
    modal.addEventListener('click', (e)=>{ if(e.target === modal) closeRoster(); });
  }

  const addP = document.getElementById('addPlayerBtn');
  const addC = document.getElementById('addCoachBtn');
  if(addP) addP.addEventListener('click', ()=>addFromInput('player'));
  if(addC) addC.addEventListener('click', ()=>addFromInput('coach'));

  const np = document.getElementById('newPlayer');
  const nc = document.getElementById('newCoach');
  if(np) np.addEventListener('keydown', (e)=>{ if(e.key==='Enter') addFromInput('player'); });
  if(nc) nc.addEventListener('keydown', (e)=>{ if(e.key==='Enter') addFromInput('coach'); });

  const imp = document.getElementById('importBtn');
  const clr = document.getElementById('clearImportBtn');
  if(imp) imp.addEventListener('click', importFromText);
  if(clr) clr.addEventListener('click', clearImportText);

  renderRoster();
});

// SW
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js?v=40').catch(()=>{});
  });
}
