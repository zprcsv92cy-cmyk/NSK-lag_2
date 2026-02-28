const VERSION = "v60";

const views = {
home: document.getElementById("viewHome"),
app: document.getElementById("viewApp"),
roster: document.getElementById("viewRoster"),
match: document.getElementById("viewMatch")
};

function show(view){
Object.values(views).forEach(v=>v.style.display="none");
views[view].style.display="block";
}

show("home");


/* NAVIGATION */

document.getElementById("openRosterBtn").onclick=()=>show("roster");
document.getElementById("backFromRosterBtn").onclick=()=>show("home");
document.getElementById("backHomeBtn").onclick=()=>show("home");


/* PLAYERS */

let players = JSON.parse(localStorage.getItem("players")||"[]");
let coaches = JSON.parse(localStorage.getItem("coaches")||"[]");

function saveRoster(){
localStorage.setItem("players",JSON.stringify(players));
localStorage.setItem("coaches",JSON.stringify(coaches));
renderRoster();
}

function renderRoster(){

const pList=document.getElementById("playerList");
pList.innerHTML=players.map((p,i)=>
`<div>${p} <button onclick="removePlayer(${i})">X</button></div>`
).join("");

const cList=document.getElementById("coachList");
cList.innerHTML=coaches.map((c,i)=>
`<div>${c} <button onclick="removeCoach(${i})">X</button></div>`
).join("");
}

window.removePlayer=i=>{
players.splice(i,1);
saveRoster();
};

window.removeCoach=i=>{
coaches.splice(i,1);
saveRoster();
};

document.getElementById("addPlayerBtn").onclick=()=>{
const val=document.getElementById("newPlayer").value.trim();
if(!val)return;
players.push(val);
document.getElementById("newPlayer").value="";
saveRoster();
};

document.getElementById("addCoachBtn").onclick=()=>{
const val=document.getElementById("newCoach").value.trim();
if(!val)return;
coaches.push(val);
document.getElementById("newCoach").value="";
saveRoster();
};

renderRoster();


/* POOLSPEL */

let pools=JSON.parse(localStorage.getItem("pools")||"[]");

function savePools(){
localStorage.setItem("pools",JSON.stringify(pools));
renderPools();
}

function renderPools(){

const list=document.getElementById("poolList");

if(!pools.length){
list.innerHTML="Inga poolspel";
return;
}

list.innerHTML=pools.map(p=>
`<div>
${p.date} ${p.place}
<button onclick="openPool('${p.id}')">Öppna</button>
</div>`
).join("");
}

window.openPool=id=>{
localStorage.setItem("currentPool",id);
show("app");
};

document.getElementById("newPoolspelBtn").onclick=()=>{

const date=prompt("Datum:");
if(!date)return;

const place=prompt("Plats:");
if(!place)return;

pools.push({
id:Date.now().toString(),
date,
place
});

savePools();
};

renderPools();


/* MATCH MODE */

let wakeLock=null;

async function enableWakeLock(){
try{
wakeLock=await navigator.wakeLock.request("screen");
}catch(e){}
}

document.getElementById("startMatchBtn").onclick=async()=>{

show("match");
enableWakeLock();
startClock();

};

document.getElementById("exitMatchBtn").onclick=()=>{
show("app");
stopClock();
};


/* CLOCK */

let clockInt=null;
let seconds=0;

function startClock(){

clockInt=setInterval(()=>{

seconds++;

const m=Math.floor(seconds/60).toString().padStart(2,"0");
const s=(seconds%60).toString().padStart(2,"0");

document.getElementById("matchClock").textContent=`${m}:${s}`;

},1000);

}

function stopClock(){
clearInterval(clockInt);
seconds=0;
}


/* SERVICE WORKER */

if("serviceWorker" in navigator){
navigator.serviceWorker.register("sw.js");
}