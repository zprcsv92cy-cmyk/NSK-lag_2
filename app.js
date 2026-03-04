/* NSK Lag v79 – allt i en fil */
const K="nsklag_v79", KL="nsklag_last_open_pool_v79";
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const uid=()=>Math.random().toString(16).slice(2)+Date.now().toString(16);
const todayISO=()=>{const d=new Date(),o=d.getTimezoneOffset()*6e4;return new Date(d.getTime()-o).toISOString().slice(0,10);}
const fmt=t=>{t=Math.max(0,Math.floor(t));const m=String(Math.floor(t/60)).padStart(2,"0");const s=String(t%60).padStart(2,"0");return `${m}:${s}`;}
const esc=s=>String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");

function read(){try{const r=localStorage.getItem(K);return r?JSON.parse(r):null}catch{return null}}
function write(){localStorage.setItem(K,JSON.stringify(state))}
function ensure(){
  const s=read(); if(s) return s;
  const init={version:"v79",createdAt:Date.now(),
    squad:{players:[],coaches:[]},
    pools:[], matchLogs:[],
    pdf:{subtitle:"Sammanställning",aiText:"",teams:{t1:[],t2:[],t3:[]}},
    match:{running:false,elapsedSec:0,period:1,line:1,activePoolId:null,log:[],
      shiftLengthSec:45,shiftRemainingSec:45,goaliePlan:[],goalieIdx:0}
  };
  localStorage.setItem(K,JSON.stringify(init)); return init;
}
let state=ensure();

/* NAV */
function showView(id){$$(".view").forEach(v=>v.classList.remove("active")); const el=$(`#view-${id}`); if(el) el.classList.add("active"); location.hash=id;}
function navTo(id){showView(id); if(id==="home") renderPools(); if(id==="squad") renderSquad(); if(id==="goalies") renderGoalies(); if(id==="match") renderMatch(); if(id==="stats") renderStats(); if(id==="pdf") renderPDF();}
function wireNav(){ $$("[data-nav]").forEach(b=>b.addEventListener("click",()=>navTo(b.getAttribute("data-nav")))); const h=(location.hash||"").replace("#",""); if(h) showView(h); }

/* POOLS */
const parseGoalies=raw=>(raw||"").split("\n").map(x=>x.trim()).filter(Boolean).map(line=>{
  const m=line.match(/^(.+?)[\s:]+(\d+)$/); if(!m) return null;
  const name=m[1].trim(); const matches=Number(m[2]); if(!name||!Number.isFinite(matches)||matches<=0) return null;
  return {playerName:name,matches};
}).filter(Boolean);

function goaliePlan(pool){
  const plan=[]; (pool.goalieMatches||[]).forEach(g=>{
    const n=String(g.playerName||"").trim(), c=Number(g.matches||0);
    if(!n||!Number.isFinite(c)||c<=0) return;
    for(let i=0;i<c;i++) plan.push(n);
  });
  return plan;
}

function renderPools(){
  const list=$("#pools-list"), empty=$("#pools-empty"); list.innerHTML="";
  const pools=[...state.pools].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  empty.hidden=pools.length!==0;
  pools.forEach(pool=>{
    const row=document.createElement("div"); row.className="item";
    const left=document.createElement("div");
    left.innerHTML=`<div class="item-title">${esc(pool.name)}</div><div class="item-meta">${esc(pool.date||"—")} • ${(pool.goalieMatches||[]).reduce((s,x)=>s+(Number(x.matches)||0),0)} målvaktsmatcher</div>`;
    const actions=document.createElement("div"); actions.className="item-actions";

    const start=document.createElement("button"); start.className="chipbtn"; start.textContent="Påbörja poolspel";
    start.onclick=()=>{localStorage.setItem(KL,pool.id);
      state.match.activePoolId=pool.id; state.match.running=false; state.match.elapsedSec=0; state.match.period=1; state.match.line=1; state.match.log=[];
      state.match.shiftRemainingSec=state.match.shiftLengthSec||45;
      state.match.goaliePlan=goaliePlan(pool); state.match.goalieIdx=0;
      write(); navTo("match");
    };

    const edit=document.createElement("button"); edit.className="chipbtn"; edit.textContent="Redigera";
    edit.onclick=()=>editPool(pool.id);

    const del=document.createElement("button"); del.className="chipbtn"; del.textContent="Ta bort";
    del.onclick=()=>{ if(!confirm(`Radera poolspel "${pool.name}"?`)) return;
      state.pools=state.pools.filter(p=>p.id!==pool.id);
      if(state.match.activePoolId===pool.id) state.match.activePoolId=null;
      write(); renderPools(); renderGoalies(); renderStats();
    };

    actions.append(start,edit,del);
    row.append(left,actions); list.append(row);
  });
}

function editPool(id){
  const pool=state.pools.find(p=>p.id===id); if(!pool) return;
  const newName=prompt("Namn:",pool.name); if(!newName) return;
  const newDate=prompt("Datum (YYYY-MM-DD):",pool.date||todayISO()); if(!newDate) return;
  const cur=(pool.goalieMatches||[]).map(x=>`${x.playerName} ${x.matches}`).join("\n");
  const raw=prompt(`Målvaktsmatcher för: ${newName}\nEn rad per spelare: "Namn antal"`,cur);
  if(raw===null) return;
  pool.name=newName.trim(); pool.date=newDate.trim(); pool.goalieMatches=parseGoalies(raw);
  write(); renderPools(); renderGoalies(); renderStats();
}

function openCreate(){
  $("#pool-name").value=""; $("#pool-date").value=todayISO(); $("#pool-goalies-raw").value="";
  $("#dlg-create").showModal();
}
function saveCreate(){
  const name=$("#pool-name").value.trim(); const date=$("#pool-date").value; const raw=$("#pool-goalies-raw").value;
  if(!name) return;
  state.pools.push({id:uid(),name,date,createdAt:Date.now(),goalieMatches:parseGoalies(raw)});
  write(); renderPools(); renderGoalies(); renderStats();
}

/* SQUAD */
function renderSquad(){
  const players=$("#players-list"), coaches=$("#coaches-list"); players.innerHTML=""; coaches.innerHTML="";
  [...state.squad.players].sort((a,b)=>(a.number||999)-(b.number||999)||a.name.localeCompare(b.name)).forEach(p=>{
    const row=document.createElement("div"); row.className="item";
    const left=document.createElement("div");
    left.innerHTML=`<div class="item-title">${esc(p.number!=null?`${p.name} (#${p.number})`:p.name)}</div><div class="item-meta">Spelare</div>`;
    const actions=document.createElement("div"); actions.className="item-actions";
    const edit=document.createElement("button"); edit.className="chipbtn"; edit.textContent="Redigera"; edit.onclick=()=>editPerson("player",p.id);
    const del=document.createElement("button"); del.className="chipbtn"; del.textContent="Ta bort"; del.onclick=()=>{if(!confirm(`Ta bort ${p.name}?`))return; state.squad.players=state.squad.players.filter(x=>x.id!==p.id); write(); renderSquad(); renderStats();};
    actions.append(edit,del); row.append(left,actions); row.addEventListener("click",e=>{if(e.target.tagName!=="BUTTON") editPerson("player",p.id)}); players.append(row);
  });
  [...state.squad.coaches].sort((a,b)=>a.name.localeCompare(b.name)).forEach(c=>{
    const row=document.createElement("div"); row.className="item";
    const left=document.createElement("div");
    left.innerHTML=`<div class="item-title">${esc(c.name)}</div><div class="item-meta">Tränare/Ledare</div>`;
    const actions=document.createElement("div"); actions.className="item-actions";
    const edit=document.createElement("button"); edit.className="chipbtn"; edit.textContent="Redigera"; edit.onclick=()=>editPerson("coach",c.id);
    const del=document.createElement("button"); del.className="chipbtn"; del.textContent="Ta bort"; del.onclick=()=>{if(!confirm(`Ta bort ${c.name}?`))return; state.squad.coaches=state.squad.coaches.filter(x=>x.id!==c.id); write(); renderSquad();};
    actions.append(edit,del); row.append(left,actions); coaches.append(row);
  });
}
function editPerson(type,id){
  if(type==="player"){
    const p=state.squad.players.find(x=>x.id===id); if(!p) return;
    const nn=prompt("Namn:",p.name); if(!nn) return;
    const nr=prompt("Nummer (valfritt):",p.number??"");
    p.name=nn.trim(); p.number=(nr===null||nr.trim()==="")?null:Number(nr);
  } else {
    const c=state.squad.coaches.find(x=>x.id===id); if(!c) return;
    const nn=prompt("Namn:",c.name); if(!nn) return;
    c.name=nn.trim();
  }
  write(); renderSquad(); renderStats();
}

/* GOALIES */
function goalieStats(){
  const per=new Map(); let total=0;
  (state.pools||[]).forEach(pool=>{
    (pool.goalieMatches||[]).forEach(g=>{
      const n=(g.playerName||"").trim(), m=Number(g.matches||0);
      if(!n||!Number.isFinite(m)||m<=0) return;
      total+=m; per.set(n,(per.get(n)||0)+m);
    });
  });
  const summary=[...per.entries()].map(([name,matches])=>({name,matches})).sort((a,b)=>b.matches-a.matches||a.name.localeCompare(b.name));
  return {totalPools:state.pools.length,totalMatches:total,unique:summary.length,summary};
}
function renderGoalies(){
  const st=goalieStats();
  $("#g-total-pools").textContent=String(st.totalPools);
  $("#g-total-matches").textContent=String(st.totalMatches);
  $("#g-unique").textContent=String(st.unique);

  const poolsEl=$("#goalie-pools"); poolsEl.innerHTML="";
  [...state.pools].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).forEach(pool=>{
    const sum=(pool.goalieMatches||[]).reduce((s,x)=>s+(Number(x.matches)||0),0);
    const row=document.createElement("div"); row.className="item";
    row.innerHTML=`<div><div class="item-title">${esc(pool.name)}</div><div class="item-meta">${esc(pool.date||"—")} • ${sum} målvaktsmatcher</div></div>`;
    const actions=document.createElement("div"); actions.className="item-actions";
    const edit=document.createElement("button"); edit.className="chipbtn"; edit.textContent="Redigera"; edit.onclick=()=>editPool(pool.id);
    actions.append(edit); row.append(actions); poolsEl.append(row);
  });

  const sumEl=$("#goalie-summary"); sumEl.innerHTML="";
  sumEl.innerHTML=st.summary.length
    ? st.summary.map(x=>`<div class="item"><div><div class="item-title">${esc(x.name)}</div><div class="item-meta">${x.matches} matcher som målvakt</div></div></div>`).join("")
    : `<div class="muted">Ingen målvaktsdata ännu.</div>`;

  const pdfGoalies=$("#pdf-goalies");
  if(pdfGoalies){
    pdfGoalies.innerHTML=st.summary.length
      ? st.summary.map(x=>`<div><b>${esc(x.name)}</b> – ${x.matches} matcher</div>`).join("")
      : `<div>—</div>`;
  }
}

/* MATCH */
let interval=null;
const activePool=()=>state.pools.find(p=>p.id===state.match.activePoolId)||null;
const currentGoalie=()=> (state.match.goaliePlan?.length? state.match.goaliePlan[Math.min(state.match.goalieIdx,state.match.goaliePlan.length-1)]:"—");

function renderMatch(){
  const pool=activePool();
  $("#active-pool-name").textContent=pool?pool.name:"—";
  $("#match-timer").textContent=fmt(state.match.elapsedSec);
  $("#match-period").textContent=String(state.match.period);
  $("#btn-start-stop").textContent=state.match.running?"Stop":"Start";
  $("#shift-seconds").value=String(state.match.shiftLengthSec||45);
  $("#shift-remaining").textContent=fmt(state.match.shiftRemainingSec||0);
  $("#current-goalie").textContent=currentGoalie();
  $("#match-log").textContent=(state.match.log||[]).join("\n");
}

function setShiftLen(){
  const v=Number($("#shift-seconds").value);
  if(!Number.isFinite(v)||v<10) return;
  state.match.shiftLengthSec=Math.floor(v);
  if(!state.match.running) state.match.shiftRemainingSec=state.match.shiftLengthSec;
  write(); renderMatch();
}
function log(line){
  const stamp=fmt(state.match.elapsedSec);
  state.match.log.push(`[${stamp}] ${line}`);
  write(); $("#match-log").textContent=state.match.log.join("\n");
}
function tick(){
  state.match.elapsedSec+=1;
  if(state.match.shiftRemainingSec>0){
    state.match.shiftRemainingSec-=1;
    if(state.match.shiftRemainingSec===0){
      log("Byte klart (timer 0)");
      try{navigator.vibrate?.([120,80,120])}catch{}
    }
  }
  $("#match-timer").textContent=fmt(state.match.elapsedSec);
  $("#shift-remaining").textContent=fmt(state.match.shiftRemainingSec);
  write();
}
function startStop(){
  const pool=activePool();
  if(!pool){alert("Välj ett poolspel först."); return;}
  setShiftLen();
  if(state.match.running){
    state.match.running=false; if(interval) clearInterval(interval); interval=null; log("Stop");
  } else {
    state.match.running=true; interval=setInterval(tick,1000); log("Start");
    const g=currentGoalie(); if(g!=="—") log(`Målvakt: ${g}`);
  }
  write(); renderMatch();
}
function pickPool(){
  if(state.pools.length===0){alert("Skapa ett poolspel först."); return;}
  const pools=[...state.pools].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  const opt=pools.map((p,i)=>`${i+1}. ${p.date||"—"} • ${p.name}`).join("\n");
  const chosen=prompt(`Välj poolspel (skriv siffra):\n\n${opt}`,"1");
  if(!chosen) return;
  const idx=Number(chosen)-1; if(!Number.isFinite(idx)||idx<0||idx>=pools.length) return;
  const pool=pools[idx];
  state.match.activePoolId=pool.id; state.match.running=false; if(interval) clearInterval(interval),interval=null;
  state.match.elapsedSec=0; state.match.period=1; state.match.line=1; state.match.log=[];
  state.match.shiftRemainingSec=state.match.shiftLengthSec||45;
  state.match.goaliePlan=goaliePlan(pool); state.match.goalieIdx=0;
  localStorage.setItem(KL,pool.id);
  write(); renderMatch();
}
function resetMatch(){
  if(!confirm("Återställ matchläge?")) return;
  state.match.running=false; if(interval) clearInterval(interval),interval=null;
  state.match.elapsedSec=0; state.match.period=1; state.match.line=1; state.match.log=[];
  state.match.shiftRemainingSec=state.match.shiftLengthSec||45; state.match.goalieIdx=0;
  write(); renderMatch();
}
function newPeriod(){ if(!activePool()) return alert("Välj ett poolspel först."); state.match.period+=1; log(`Ny period: ${state.match.period}`); write(); renderMatch(); }
function lineChange(){ if(!activePool()) return alert("Välj ett poolspel först."); state.match.line+=1; state.match.shiftRemainingSec=state.match.shiftLengthSec||45; log(`Byt femma (byte #${state.match.line})`); write(); renderMatch(); }
function nextGoalie(){
  if(!state.match.goaliePlan?.length){alert("Ingen målvaktsplan i poolspelet. Lägg in målvaktsmatcher."); return;}
  const prev=currentGoalie();
  state.match.goalieIdx=(state.match.goalieIdx+1)%state.match.goaliePlan.length;
  const now=currentGoalie();
  log(`Målvaktsbyte: ${prev} → ${now}`);
  write(); renderMatch();
}
function exportMatch(){
  const pool=activePool(); const poolName=pool?pool.name:"okänt"; const date=pool?.date||todayISO();
  const text=[
    "NSK Lag v79 - Matchlogg",
    `Pool: ${poolName}`,
    `Datum: ${date}`,
    `Byte (sek): ${state.match.shiftLengthSec||45}`,
    `Målvaktsplan: ${(state.match.goaliePlan||[]).join(", ")||"—"}`,
    "",
    ...(state.match.log||[])
  ].join("\n");
  state.matchLogs.unshift({id:uid(),poolId:pool?.id||null,poolName,date,exportedAt:new Date().toISOString(),logText:text});
  state.matchLogs=state.matchLogs.slice(0,30);
  write();
  const blob=new Blob([text],{type:"text/plain"}), url=URL.createObjectURL(blob), a=document.createElement("a");
  a.href=url; a.download=`nsk-matchlogg-${date}.txt`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  alert("Matchlogg exporterad."); renderStats();
}
async function copyMatch(){
  const txt=(state.match.log||[]).join("\n"); if(!txt.trim()) return alert("Ingen logg att kopiera.");
  try{await navigator.clipboard.writeText(txt); alert("Kopierat!")}catch{alert("Kunde inte kopiera.")}
}

/* AI */
function shuffle(a){a=[...a]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]} return a;}
function aiSchedule(pc,lines){
  const players=Array.from({length:pc},(_,i)=>`Spelare ${i+1}`), order=shuffle(players);
  const out=[`Bytesschema (AI)`,`Spelare: ${pc}, Linor: ${lines}`,""];
  let idx=0; const rounds=Math.max(6,Math.ceil(pc/lines)*3);
  for(let r=1;r<=rounds;r++){
    out.push(`Byte ${r}`);
    for(let l=1;l<=lines;l++){
      const group=[], size=Math.ceil(pc/lines);
      for(let k=0;k<size;k++){group.push(order[idx%order.length]); idx++}
      out.push(`  Linje ${l}: ${group.join(", ")}`);
    }
    out.push("");
  }
  return out.join("\n");
}

/* TEAMS */
function teams3(){
  const names=state.squad.players.map(p=>p.number!=null?`${p.name} (#${p.number})`:p.name);
  const order=shuffle(names), t=[[],[],[]]; let dir=1, i=0;
  for(const n of order){ t[i].push(n); if(dir===1){ if(i===2) dir=-1; else i++; } else { if(i===0) dir=1; else i--; } }
  return t;
}

/* STATS */
function renderStats(){
  $("#s-players").textContent=String(state.squad.players.length);
  $("#s-pools").textContent=String(state.pools.length);
  $("#s-matchlogs").textContent=String(state.matchLogs.length);
  const box=$("#stats-matchlogs"); box.innerHTML="";
  if(state.matchLogs.length===0){ box.innerHTML=`<div class="muted">Inga matchloggar ännu. Exportera från Matchläge.</div>`; return; }
  state.matchLogs.slice(0,10).forEach(lg=>{
    const row=document.createElement("div"); row.className="item";
    row.innerHTML=`<div><div class="item-title">${esc(lg.date)} • ${esc(lg.poolName)}</div><div class="item-meta">${esc(lg.exportedAt)}</div></div>`;
    const actions=document.createElement("div"); actions.className="item-actions";
    const dl=document.createElement("button"); dl.className="chipbtn"; dl.textContent="Ladda ned";
    dl.onclick=()=>{const blob=new Blob([lg.logText],{type:"text/plain"}), url=URL.createObjectURL(blob), a=document.createElement("a");
      a.href=url; a.download=`nsk-matchlogg-${lg.date}.txt`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); };
    actions.append(dl); row.append(actions); box.append(row);
  });
}

/* PDF */
function renderPDF(){
  $("#pdf-subtitle").textContent=state.pdf.subtitle||"Sammanställning";
  $("#pdf-meta").textContent=`Skapad: ${new Date().toLocaleString()}`;
  $("#pdf-team-1").innerHTML=(state.pdf.teams.t1||[]).map(x=>`<div>• ${esc(x)}</div>`).join("")||"<div>—</div>";
  $("#pdf-team-2").innerHTML=(state.pdf.teams.t2||[]).map(x=>`<div>• ${esc(x)}</div>`).join("")||"<div>—</div>";
  $("#pdf-team-3").innerHTML=(state.pdf.teams.t3||[]).map(x=>`<div>• ${esc(x)}</div>`).join("")||"<div>—</div>";
  $("#pdf-ai").textContent=state.pdf.aiText||"—";
  renderGoalies();
}
function clearPDF(){
  if(!confirm("Rensa PDF-innehåll?")) return;
  state.pdf={subtitle:"Sammanställning",aiText:"",teams:{t1:[],t2:[],t3:[]}}; write(); renderPDF();
}
function printPDF(){ navTo("pdf"); setTimeout(()=>window.print(),50); }

/* BACKUP */
function exportBackup(){
  const payload={version:state.version,exportedAt:new Date().toISOString(),data:state};
  const json=JSON.stringify(payload,null,2);
  const blob=new Blob([json],{type:"application/json"}), url=URL.createObjectURL(blob), a=document.createElement("a");
  a.href=url; a.download=`nsklag-backup-v79-${todayISO()}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  $("#backup-preview").hidden=false; $("#backup-preview").textContent=json.slice(0,8000)+(json.length>8000?"\n… (trunkerat)":"");
}
async function importBackup(file){
  const text=await file.text(); let payload;
  try{payload=JSON.parse(text)}catch{return alert("Kunde inte läsa JSON.")}
  const data=payload?.data; if(!data||!data.pools||!data.squad) return alert("Backupformat känns inte igen.");
  state=data;
  state.pdf=state.pdf||{subtitle:"Sammanställning",aiText:"",teams:{t1:[],t2:[],t3:[]}};
  state.match=state.match||{};
  state.match.shiftLengthSec=state.match.shiftLengthSec??45;
  state.match.shiftRemainingSec=state.match.shiftRemainingSec??state.match.shiftLengthSec;
  state.match.goaliePlan=state.match.goaliePlan||[];
  state.match.goalieIdx=state.match.goalieIdx||0;
  write(); renderAll(); alert("Backup importerad.");
}
function resetAll(){
  if(!confirm("Återställ allt?")) return;
  if(interval) clearInterval(interval),interval=null;
  localStorage.removeItem(K); localStorage.removeItem(KL);
  state=ensure(); renderAll();
}

/* DEMO */
function demo(){
  if(state.pools.length||state.squad.players.length){ if(!confirm("Skapa demo ändå?")) return; }
  if(state.squad.players.length===0){
    state.squad.players.push(
      {id:uid(),name:"Agnes Danielsson",number:7},
      {id:uid(),name:"Albert Zillén",number:12},
      {id:uid(),name:"Alex",number:1},
      {id:uid(),name:"Sam",number:18},
      {id:uid(),name:"Kim",number:4},
      {id:uid(),name:"Noel",number:9},
      {id:uid(),name:"Ella",number:15}
    );
  }
  state.pools.push(
    {id:uid(),name:"Hy",date:todayISO(),createdAt:Date.now(),goalieMatches:[{playerName:"Alex",matches:2},{playerName:"Sam",matches:1}]},
    {id:uid(),name:"Nyköping",date:todayISO(),createdAt:Date.now()-86400000,goalieMatches:[{playerName:"Kim",matches:1}]}
  );
  write(); renderAll();
}

/* WIRE + SW */
function renderAll(){
  renderPools(); renderSquad(); renderGoalies(); renderMatch(); renderStats(); renderPDF();
  $("#ai-player-count").value=String(Math.max(1,state.squad.players.length||1));
}
async function sw(){ if(!("serviceWorker"in navigator)) return; try{await navigator.serviceWorker.register("sw.js")}catch{} }

document.addEventListener("DOMContentLoaded",()=>{
  wireNav();
  $("#btn-create-pool").addEventListener("click",openCreate);
  $("#btn-save-pool").addEventListener("click",(e)=>{ if(!$("#pool-name").value.trim()){e.preventDefault(); return;} saveCreate(); $("#dlg-create").close(); });
  $("#btn-demo").addEventListener("click",demo);
  $("#btn-clear-pools").addEventListener("click",()=>{ if(!confirm("Rensa alla poolspel?")) return; state.pools=[]; if(state.match.activePoolId) state.match.activePoolId=null; write(); renderPools(); renderGoalies(); renderStats(); });

  $("#btn-add-player").addEventListener("click",()=>{ const name=prompt("Namn på spelare?"); if(!name) return; const nr=prompt("Nummer (valfritt):"); const number=(nr===null||nr.trim()==="")?null:Number(nr);
    state.squad.players.push({id:uid(),name:name.trim(),number:Number.isFinite(number)?number:null}); write(); renderSquad(); renderStats(); $("#ai-player-count").value=String(state.squad.players.length);
  });
  $("#btn-add-coach").addEventListener("click",()=>{ const name=prompt("Namn på tränare/ledare?"); if(!name) return; state.squad.coaches.push({id:uid(),name:name.trim()}); write(); renderSquad(); });

  $("#btn-refresh-goalies").addEventListener("click",renderGoalies);

  $("#btn-pick-pool").addEventListener("click",pickPool);
  $("#shift-seconds").addEventListener("change",setShiftLen);
  $("#btn-next-goalie").addEventListener("click",nextGoalie);
  $("#btn-start-stop").addEventListener("click",startStop);
  $("#btn-period").addEventListener("click",newPeriod);
  $("#btn-line-change").addEventListener("click",lineChange);
  $("#btn-reset-match").addEventListener("click",resetMatch);
  $("#btn-export-match").addEventListener("click",exportMatch);
  $("#btn-copy-match").addEventListener("click",copyMatch);

  $("#btn-ai-generate").addEventListener("click",()=>{ const pc=Number($("#ai-player-count").value), lines=Number($("#ai-lines").value);
    if(!Number.isFinite(pc)||pc<=0||!Number.isFinite(lines)||lines<=0) return;
    $("#ai-output").textContent=aiSchedule(pc,lines);
  });
  $("#btn-ai-copy").addEventListener("click",async()=>{ const t=$("#ai-output").textContent||""; if(!t.trim()) return alert("Generera först.");
    try{await navigator.clipboard.writeText(t); alert("Kopierat!")}catch{alert("Kunde inte kopiera.")}
  });
  $("#btn-ai-to-pdf").addEventListener("click",()=>{ const t=$("#ai-output").textContent||""; if(!t.trim()) return alert("Generera först.");
    state.pdf.aiText=t; state.pdf.subtitle="Lag + Bytesschema"; write(); navTo("pdf");
  });

  $("#btn-teams-generate").addEventListener("click",()=>{ if(state.squad.players.length===0) return alert("Lägg in spelare först.");
    const t=teams3();
    $("#team-1").innerHTML=t[0].map(n=>`<div class="pill-dark" style="margin-top:8px;">${esc(n)}</div>`).join("");
    $("#team-2").innerHTML=t[1].map(n=>`<div class="pill-dark" style="margin-top:8px;">${esc(n)}</div>`).join("");
    $("#team-3").innerHTML=t[2].map(n=>`<div class="pill-dark" style="margin-top:8px;">${esc(n)}</div>`).join("");
    state.pdf.teams={t1:t[0],t2:t[1],t3:t[2]}; write(); renderPDF();
  });
  $("#btn-teams-copy").addEventListener("click",async()=>{ const t1=$("#team-1").innerText.trim(), t2=$("#team-2").innerText.trim(), t3=$("#team-3").innerText.trim();
    if(!t1&&!t2&&!t3) return alert("Skapa lag först.");
    const text=`Lag 1:\n${t1}\n\nLag 2:\n${t2}\n\nLag 3:\n${t3}\n`;
    try{await navigator.clipboard.writeText(text); alert("Kopierat!")}catch{alert("Kunde inte kopiera.")}
  });
  $("#btn-teams-to-pdf").addEventListener("click",()=>{ if(!(state.pdf.teams.t1||[]).length) return alert("Skapa lag först."); state.pdf.subtitle="Lag 1–3"; write(); navTo("pdf"); });

  $("#btn-refresh-stats").addEventListener("click",renderStats);

  $("#btn-print").addEventListener("click",printPDF);
  $("#btn-pdf-clear").addEventListener("click",clearPDF);

  $("#btn-export").addEventListener("click",exportBackup);
  $("#file-import").addEventListener("change",async(e)=>{ const file=e.target.files?.[0]; if(!file) return; await importBackup(file); e.target.value=""; });
  $("#btn-reset-all").addEventListener("click",resetAll);

  if(!state.match.activePoolId){
    const last=localStorage.getItem(KL);
    if(last && state.pools.some(p=>p.id===last)) state.match.activePoolId=last;
  }
  if(state.match.running){ state.match.running=false; write(); }
  if(interval) clearInterval(interval),interval=null;

  renderAll(); sw();
});
