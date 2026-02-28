/* app.js — v48 (komplett + PDF + rotation utan dubbelbyten + målvakt ej utespelare + smarta “Sparat”-meddelanden) */
'use strict';

const APP_VERSION = 'v48';

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
function norm(s){ return String(s || '').trim().toLowerCase(); }

// ---------- UI messages ----------
function showUiError(text){
  const msg = document.getElementById('msg');
  if (msg){
    msg.innerHTML = `<span style="color:#b00020;font-weight:900;">✖ ${escapeHtml(text)}</span>`;
    clearTimeout(window.__msgTimer);
    window.__msgTimer = setTimeout(()=>{ msg.innerHTML=''; }, 2000);
    return;
  }
  let box = document.getElementById('__toast');
  if (!box){
    box = document.createElement('div');
    box.id = '__toast';
    box.style.position = 'fixed';
    box.style.left = '12px';
    box.style.right = '12px';
    box.style.bottom = '12px';
    box.style.zIndex = '99999';
    box.style.padding = '12px 14px';
    box.style.borderRadius = '14px';
    box.style.background = '#b00020';
    box.style.color = '#fff';
    box.style.fontWeight = '900';
    box.style.display = 'none';
    box.style.boxShadow = '0 8px 24px rgba(0,0,0,.18)';
    box.addEventListener('click', ()=> box.style.display='none');
    document.body.appendChild(box);
  }
  box.textContent = text;
  box.style.display = 'block';
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(()=>{ box.style.display='none'; }, 2000);
}

function showUiOk(text='Sparat'){
  const msg = document.getElementById('msg');
  if (msg){
    msg.innerHTML = `<span style="color:#1b5e20;font-weight:900;">✔ ${escapeHtml(text)}</span>`;
    clearTimeout(window.__msgTimer);
    window.__msgTimer = setTimeout(()=>{ msg.innerHTML=''; }, 800);
    return;
  }
  let box = document.getElementById('__toastOk');
  if (!box){
    box = document.createElement('div');
    box.id = '__toastOk';
    box.style.position = 'fixed';
    box.style.left = '12px';
    box.style.right = '12px';
    box.style.bottom = '12px';
    box.style.zIndex = '99999';
    box.style.padding = '12px 14px';
    box.style.borderRadius = '14px';
    box.style.background = '#1b5e20';
    box.style.color = '#fff';
    box.style.fontWeight = '900';
    box.style.display = 'none';
    box.style.boxShadow = '0 8px 24px rgba(0,0,0,.18)';
    box.addEventListener('click', ()=> box.style.display='none');
    document.body.appendChild(box);
  }
  box.textContent = `✔ ${text}`;
  box.style.display = 'block';
  clearTimeout(window.__toastOkTimer);
  window.__toastOkTimer = setTimeout(()=>{ box.style.display='none'; }, 800);
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
  try { if (currentPoolId()) saveCurrentMatchState({ showOk: true }); } catch {}
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
  showUiOk('Poolspel skapat');
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
  showUiOk('Poolspel sparat');
  renderPoolsList();

  if(currentPoolId() === id){
    writePoolHeader(id);
    setMatchHeader(__activeTeam, __activeMatch);
  }
}
function deletePool(id){
  if(!confirm('Ta bort detta poolspel?')) return;
  const pools=loadPools().filter(x=>x.id!==id);
  savePools(pools);
  if(currentPoolId()===id) localStorage.removeItem(KEY_CURRENT_POOL);
  renderPoolsList();
  showUiOk('Poolspel borttaget');
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
  const arena=$('arena');
  if(arena && !arena.options.length){
    for(let i=1;i<=4;i++){
      const o=document.createElement('option');
      o.value=String(i);
      o.textContent=`Plan ${i}`;
      arena.appendChild(o);
    }
  }
  const teamSize=$('teamSize');
  if(teamSize && !teamSize.options.length) fillSelectRange(teamSize,1,25,1);

  const onCourt=$('onCourt');
  if(onCourt && !onCourt.options.length){
    [3,4,5].forEach(n=>{
      const o=document.createElement('option');
      o.value=String(n);
      o.textContent=String(n);
      onCourt.appendChild(o);
    });
  }

  const pc=$('periodsCount');
  if(pc && !pc.options.length){
    [1,2,3].forEach(n=>{
      const o=document.createElement('option');
      o.value=String(n);
      o.textContent=String(n);
      pc.appendChild(o);
    });
  }

  const pm=$('periodMin');
  if(pm && !pm.options.length) fillSelectRange(pm,8,20,1);

  const ss=$('shiftSec');
  if(ss && !ss.options.length) fillSelectRange(ss,30,180,5);
}

function fillRosterDropdowns(){
  const {players, coaches}=getRoster();

  const goalie=$('goalie');
  if(goalie){
    const cur=goalie.value;
    goalie.innerHTML='<option value="">Välj…</option>' + players.map(p=>`<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
    goalie.value = cur;
  }

  const coach=$('coach');
  if(coach){
    const selected=new Set(Array.from(coach.selectedOptions||[]).map(o => String(o.value||'').toLowerCase()));
    coach.innerHTML = coaches.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    for(const opt of coach.options){
      opt.selected = selected.has(String(opt.value||'').toLowerCase());
    }
  }
}

// ---------- Goalie exclusion in player selects ----------
function currentGoalieLower(){
  return norm(document.getElementById('goalie')?.value || '');
}
function cleanPlayersAgainstGoalie(playersArr, goalieLower){
  return (playersArr || []).map(x => String(x||'')).map(s=>s.trim()).map(s => (norm(s) === goalieLower ? '' : s));
}
function renderPlayersContainer(teamSizeVal, selectedPlayers){
  const cont = $('playersContainer');
  if(!cont) return;

  const {players} = getRoster();
  const goalieLower = currentGoalieLower();

  const n = Math.max(1, Math.min(25, parseInt(teamSizeVal||'10',10)||10));
  let vals = Array.isArray(selectedPlayers) ? selectedPlayers.slice(0,n) : [];
  while(vals.length < n) vals.push('');

  vals = cleanPlayersAgainstGoalie(vals, goalieLower);

  const optionsHtml =
    '<option value="">Välj…</option>' +
    players
      .filter(p => norm(p) !== goalieLower)
      .map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`)
      .join('');

  cont.innerHTML = '';
  for(let i=0;i<n;i++){
    const wrap = document.createElement('div');
    const lab = document.createElement('label');
    lab.textContent = `Spelare ${i+1}`;

    const sel = document.createElement('select');
    sel.className = 'select';
    sel.setAttribute('data-player-idx', String(i));
    sel.innerHTML = optionsHtml;
    sel.value = vals[i] || '';

    wrap.appendChild(lab);
    wrap.appendChild(sel);
    cont.appendChild(wrap);
  }
}

// ---------- Editor pointers ----------
let __activeTeam = '1';
let __activeMatch = '1';

// ---------- Header (Lag/Match + pool subtitle + opponent/time + prev/next + PDF buttons) ----------
function writePoolSubtitle(){
  const poolId = currentPoolId();
  if(!poolId) return '';
  try{
    const pools = JSON.parse(localStorage.getItem(KEY_POOLS) || '[]');
    const p = pools.find(x => x.id === poolId);
    if(!p) return '';
    return `${p.date || '—'} · ${p.place || '—'}`;
  }catch{
    return '';
  }
}

function setMatchHeader(teamNo, matchNo){
  let h = document.getElementById('matchHeader');

  const subtitle = writePoolSubtitle();

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
        <div style="font-weight:900;font-size:16px;">Lag ${escapeHtml(teamNo)} – Match ${escapeHtml(matchNo)}</div>
        <div style="font-size:13px;color:#475569;margin-top:2px;">${escapeHtml(subtitle)}</div>
        <div style="font-size:13px;color:#0f172a;margin-top:4px;font-weight:700;">${escapeHtml(meta)}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <button id="prevMatchBtn" type="button"
          style="border:0;cursor:pointer;border-radius:14px;padding:10px 12px;font-weight:900;background:#e5e7eb;color:#0f172a;">
          ← Föregående
        </button>
        <button id="nextMatchBtn" type="button"
          style="border:0;cursor:pointer;border-radius:14px;padding:10px 12px;font-weight:900;background:#e5e7eb;color:#0f172a;">
          Nästa match →
        </button>
        <button id="pdfThisBtn" type="button"
          style="border:0;cursor:pointer;border-radius:14px;padding:10px 12px;font-weight:900;background:#111827;color:#fff;">
          PDF – denna match
        </button>
        <button id="pdfAllBtn" type="button"
          style="border:0;cursor:pointer;border-radius:14px;padding:10px 12px;font-weight:900;background:#111827;color:#fff;">
          PDF – alla matcher
        </button>
      </div>
    </div>
  `;

  const prev = document.getElementById('prevMatchBtn');
  if (prev) prev.onclick = () => { goPrevMatch(); };

  const next = document.getElementById('nextMatchBtn');
  if (next) next.onclick = () => { goNextMatch(); };

  const pdfThis = document.getElementById('pdfThisBtn');
  if (pdfThis) pdfThis.onclick = () => { exportPdfThisMatch(); };

  const pdfAll = document.getElementById('pdfAllBtn');
  if (pdfAll) pdfAll.onclick = () => { exportPdfAllMatches(); };
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
function saveCurrentMatchState(opts = { showOk: false }){
  const poolId=currentPoolId();
  if(!poolId) return;

  const st=readFormState();
  saveMatchState(poolId, __activeTeam, __activeMatch, st);

  const pill=$('saveState');
  if(pill){
    pill.textContent='Sparat';
    setTimeout(()=>{ pill.textContent='Redo'; }, 600);
  }

  if (opts && opts.showOk) showUiOk('Sparat');
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

  try { saveCurrentMatchState({ showOk: true }); } catch {}

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

  try { saveCurrentMatchState({ showOk: true }); } catch {}

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
      try { saveCurrentMatchState({ showOk: true }); } catch {}
      __activeTeam = teamSel.value || '1';
      loadStateIntoForm(poolId, __activeTeam, __activeMatch);
      setMatchHeader(__activeTeam, __activeMatch);
    };
  }

  const matchCountSel=$('matchCount');
  const matchNoSel=$('matchNo');

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
      try { saveCurrentMatchState({ showOk: true }); } catch {}

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
      showUiOk('Antal matcher sparat');
    };
  }

  if(matchNoSel){
    matchNoSel.value = __activeMatch;
    matchNoSel.onchange = ()=>{
      try { saveCurrentMatchState({ showOk: true }); } catch {}
      __activeMatch = matchNoSel.value || '1';
      loadStateIntoForm(poolId, __activeTeam, __activeMatch);
      setMatchHeader(__activeTeam, __activeMatch);
    };
  }
}

// ---------- Autosave wiring (tyst) ----------
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
      if(id==='goalie'){
        const st = readFormState();
        renderPlayersContainer(st.teamSize, st.players);
      }

      saveCurrentMatchState({ showOk: false });
      setMatchHeader(__activeTeam, __activeMatch);
    });

    el.addEventListener('input', ()=>{
      saveCurrentMatchState({ showOk: false });
      setMatchHeader(__activeTeam, __activeMatch);
    });
  });

  const cont=$('playersContainer');
  if(cont){
    cont.addEventListener('change', (e)=>{
      const t=e.target;
      if(t && t.matches && t.matches('select[data-player-idx]')){
        const goalieLower = currentGoalieLower();
        if (goalieLower && norm(t.value) === goalieLower){
          t.value = '';
          showUiError('Målvakt kan inte vara utespelare.');
        }
        saveCurrentMatchState({ showOk: false });
        setMatchHeader(__activeTeam, __activeMatch);
      }
    });
  }
}

// ---------- Start pool ----------
function startPool(id){
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

// ---------- PDF + Rotation helpers ----------
function shortName(full){
  const parts = String(full || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const last = parts[parts.length - 1];
  const initial = last ? last[0].toUpperCase() : "";
  return initial ? `${first} ${initial}` : first;
}
function formatMMSS(totalSeconds){
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = String(Math.floor(s/60)).padStart(2,"0");
  const ss = String(s%60).padStart(2,"0");
  return `${mm}:${ss}`;
}
function buildShiftTimes(totalMinutes, shiftSec){
  const totalSeconds = Math.floor(totalMinutes * 60);
  const step = Math.max(1, Math.floor(shiftSec));
  const times = [];
  for (let t = totalSeconds; t > 0; t -= step){
    times.push(formatMMSS(t));
  }
  return [...new Set(times)];
}
function makeNoDoubleRotation(roster, k, times){
  const clean = (roster || []).map(x => String(x||'').trim()).filter(Boolean);
  const n = clean.length;

  if (!times || !times.length) return [];
  if (!n) return times.map(()=>[]);
  const kk = Math.min(Math.max(1, k|0), n);

  if (n <= kk){
    const fixed = clean.slice(0, kk);
    return times.map(()=>fixed);
  }

  const lineups = [];
  let start = 0;
  for (let i=0; i<times.length; i++){
    const lineup = [];
    for (let j=0; j<kk; j++){
      lineup.push(clean[(start + j) % n]);
    }
    lineups.push(lineup);
    start = (start + 1) % n;
  }
  return lineups;
}
function lineupToText(names){
  return (names||[]).map(shortName).filter(Boolean).join(", ") || "—";
}
function removeGoalieFromRoster(players, goalie){
  const g = String(goalie||'').trim().toLowerCase();
  if (!g) return players || [];
  return (players || []).filter(p => String(p||'').trim().toLowerCase() !== g);
}

function ensurePrintStyle(){
  if (document.getElementById('nskPrintStyle')) return;
  const css = `
  @media print{
    body * { visibility: hidden !important; }
    #__printArea, #__printArea * { visibility: visible !important; }
    #__printArea { position: absolute; left: 0; top: 0; width: 100%; }
  }`;
  const style = document.createElement('style');
  style.id = 'nskPrintStyle';
  style.textContent = css;
  document.head.appendChild(style);
}

function loadStateForPrint(poolId, teamNo, matchNo){
  const st = loadMatchState(poolId, teamNo, matchNo) || {};
  if (!st.teamSize) st.teamSize = '10';
  if (!st.onCourt) st.onCourt = '3';
  if (!st.periodsCount) st.periodsCount = '1';
  if (!st.periodMin) st.periodMin = '15';
  if (!st.shiftSec) st.shiftSec = '90';
  if (!st.arena) st.arena = '1';
  if (!Array.isArray(st.players)) st.players = [];
  return st;
}

function buildMatchHtml(teamNo, matchNo, st){
  const date = st.matchDate || '—';
  const time = st.matchTime || '—';
  const opp  = st.opponent || '—';
  const arena = st.arena ? `Plan ${st.arena}` : '—';
  const teamSize = st.teamSize || '—';
  const onCourt = parseInt(st.onCourt || '3', 10) || 3;
  const periods = parseInt(st.periodsCount || '1', 10) || 1;
  const periodMin = parseInt(st.periodMin || '15', 10) || 15;
  const shiftSec = parseInt(st.shiftSec || '90', 10) || 90;
  const goalie = st.goalie || '—';

  const players = Array.isArray(st.players) ? st.players.map(x=>String(x||'').trim()).filter(Boolean) : [];
  const skaters = removeGoalieFromRoster(players, goalie);

  const totalMinutes = Math.max(1, periods) * Math.max(1, periodMin);
  const times = buildShiftTimes(totalMinutes, shiftSec);
  const lineups = makeNoDoubleRotation(skaters, onCourt, times);

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;padding:18px;">
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-end;flex-wrap:wrap;">
        <div style="font-weight:900;font-size:18px;">Lag ${escapeHtml(teamNo)} – Match ${escapeHtml(matchNo)}</div>
        <div style="font-size:13px;color:#475569;">${escapeHtml(writePoolSubtitle())}</div>
      </div>

      <div style="margin-top:10px;border:1px solid rgba(15,23,42,.12);border-radius:14px;padding:12px;">
        <div style="font-weight:900;margin-bottom:6px;">Matchinfo</div>
        <div>Datum: <b>${escapeHtml(date)}</b> · Start: <b>${escapeHtml(time)}</b></div>
        <div>Motståndare: <b>${escapeHtml(opp)}</b> · Plan: <b>${escapeHtml(arena)}</b></div>
        <div style="margin-top:6px;font-size:13px;color:#475569;">
          Antal i laget: <b>${escapeHtml(teamSize)}</b> · Antal på plan: <b>${escapeHtml(onCourt)}</b> ·
          Perioder: <b>${escapeHtml(periods)}</b> · Periodtid: <b>${escapeHtml(periodMin)}</b> min ·
          Bytestid: <b>${escapeHtml(shiftSec)}</b> sek
        </div>
      </div>

      <div style="margin-top:12px;border:1px solid rgba(15,23,42,.12);border-radius:14px;padding:12px;">
        <div style="font-weight:900;margin-bottom:8px;">Uttagna spelare (ranking)</div>
        <ol style="margin:0;padding-left:20px;">
          ${players.length ? players.map(p=>`<li style="margin:4px 0;">${escapeHtml(p)}</li>`).join('') : '<li>—</li>'}
        </ol>
        <div style="margin-top:10px;">Målvakt: <b>${escapeHtml(goalie)}</b></div>
      </div>

      <div style="margin-top:12px;border:1px solid rgba(15,23,42,.12);border-radius:14px;padding:12px;">
        <div style="font-weight:900;margin-bottom:8px;">Bytesschema (inga dubbelbyten)</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr>
              <th style="text-align:left;border-bottom:1px solid rgba(15,23,42,.12);padding:6px 4px;">#</th>
              <th style="text-align:left;border-bottom:1px solid rgba(15,23,42,.12);padding:6px 4px;">Tid kvar</th>
              <th style="text-align:left;border-bottom:1px solid rgba(15,23,42,.12);padding:6px 4px;">På plan</th>
            </tr>
          </thead>
          <tbody>
            ${times.map((t,i)=>`
              <tr>
                <td style="padding:6px 4px;border-bottom:1px solid rgba(15,23,42,.08);">${i+1}</td>
                <td style="padding:6px 4px;border-bottom:1px solid rgba(15,23,42,.08);white-space:nowrap;">${escapeHtml(t)}</td>
                <td style="padding:6px 4px;border-bottom:1px solid rgba(15,23,42,.08);">${escapeHtml(lineupToText(lineups[i]||[]))}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div style="margin-top:8px;font-size:12px;color:#475569;">
          Målvakt är exkluderad från bytesschemat. Rotation roterar 1 steg per byte → max 1 byte per rad.
        </div>
      </div>

      <div style="margin-top:12px;font-size:12px;color:#475569;">
        Tips iPhone: Tryck “Skriv ut” → nyp ut i förhandsvisningen → Dela som PDF.
      </div>
    </div>
  `;
}

function withPrintArea(html){
  ensurePrintStyle();
  let area = document.getElementById('__printArea');
  if (!area){
    area = document.createElement('div');
    area.id = '__printArea';
    document.body.appendChild(area);
  }
  area.innerHTML = html;
  setTimeout(()=>window.print(), 50);
  setTimeout(()=>{ try { area.innerHTML = ''; } catch {} }, 2000);
}

function exportPdfThisMatch(){
  const poolId = currentPoolId();
  if(!poolId) return;
  try { saveCurrentMatchState({ showOk: true }); } catch {}
  const st = loadStateForPrint(poolId, __activeTeam, __activeMatch);
  withPrintArea(buildMatchHtml(__activeTeam, __activeMatch, st));
}

function exportPdfAllMatches(){
  const poolId = currentPoolId();
  if(!poolId) return;
  try { saveCurrentMatchState({ showOk: true }); } catch {}

  const matchCountSel = document.getElementById('matchCount');
  const max = parseInt(matchCountSel?.value || '4', 10) || 4;

  let all = '';
  for(let m=1; m<=max; m++){
    const st = loadStateForPrint(poolId, __activeTeam, String(m));
    all += `<div style="page-break-after:always;">${buildMatchHtml(__activeTeam, String(m), st)}</div>`;
  }
  withPrintArea(all);
}

// ---------- Delegation ----------
function bindDelegation(){
  document.body.addEventListener('click', (e)=>{
    const t=e.target;

    const start=t?.getAttribute?.('data-start-pool');
    const edit=t?.getAttribute?.('data-edit-pool');
    const del=t?.getAttribute?.('data-del-pool');
    if(start){ startPool(start); return; }
    if(edit){ editPool(edit); return; }
    if(del){ deletePool(del); return; }
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
      const reg = await navigator.serviceWorker.register('./sw.js?v=48');
      if(reg.update) reg.update();
      if(reg.waiting) reg.waiting.postMessage({type:'SKIP_WAITING'});
      navigator.serviceWorker.addEventListener('controllerchange', ()=>window.location.reload());
    }catch(e){}
  });
}
