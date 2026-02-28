const APP_VERSION = "v39";
console.log("APP VERSION:", APP_VERSION);

/* ---------- NAVIGATION ---------- */
function showView(name) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  const el = document.getElementById("view-" + name);
  if (el) el.classList.add("active");
  location.hash = name;
}
function go(name) { showView(name); }

window.addEventListener("hashchange", () => {
  const hash = location.hash.replace("#", "") || "home";
  showView(hash);
});
window.addEventListener("load", () => {
  const hash = location.hash.replace("#", "") || "home";
  showView(hash);
});

/* ---------- STORAGE HELPERS ---------- */
function loadArr(key){
  try { const v = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(v) ? v : []; }
  catch { return []; }
}
function saveArr(key, arr){
  localStorage.setItem(key, JSON.stringify(arr || []));
}
function normalizeName(s){
  return String(s || "").trim().replace(/\s+/g, " ");
}

/* ---------- TRUPP DATA (spelare + tränare) ---------- */
let players = loadArr("players").map(x => ({ name: normalizeName(x?.name ?? x) })).filter(x => x.name);
let coaches = loadArr("coaches").map(x => ({ name: normalizeName(x?.name ?? x) })).filter(x => x.name);

function persistAll(){
  saveArr("players", players);
  saveArr("coaches", coaches);
  renderPlayers();
  renderCoaches();
}

/* ---------- SPELARE: add/edit/delete ---------- */
function addPlayer() {
  const name = normalizeName(prompt("Ny spelare (namn):"));
  if (!name) return;
  players.push({ name });
  persistAll();
}

function editPlayer(i){
  const current = players[i]?.name || "";
  const next = normalizeName(prompt("Redigera spelare:", current));
  if (!next) return;
  players[i].name = next;
  persistAll();
}

function deletePlayer(i) {
  if (!confirm("Ta bort spelaren?")) return;
  players.splice(i, 1);
  persistAll();
}

function renderPlayers() {
  const box = document.getElementById("playerList");
  if (!box) return;

  box.innerHTML = "";
  if (!players.length){
    box.innerHTML = `<div class="small">Inga spelare än.</div>`;
    return;
  }

  players.forEach((p, i) => {
    const row = document.createElement("div");
    row.className = "player-row";
    row.innerHTML = `
      <span>${escapeHtml(p.name)}</span>
      <div style="display:flex; gap:8px;">
        <button onclick="editPlayer(${i})">Redigera</button>
        <button onclick="deletePlayer(${i})">Ta bort</button>
      </div>
    `;
    box.appendChild(row);
  });
}

/* ---------- TRÄNARE: add/edit/delete ---------- */
function addCoach() {
  const name = normalizeName(prompt("Ny tränare (namn):"));
  if (!name) return;
  coaches.push({ name });
  persistAll();
}

function editCoach(i){
  const current = coaches[i]?.name || "";
  const next = normalizeName(prompt("Redigera tränare:", current));
  if (!next) return;
  coaches[i].name = next;
  persistAll();
}

function deleteCoach(i) {
  if (!confirm("Ta bort tränaren?")) return;
  coaches.splice(i, 1);
  persistAll();
}

function renderCoaches() {
  const box = document.getElementById("coachList");
  if (!box) return;

  box.innerHTML = "";
  if (!coaches.length){
    box.innerHTML = `<div class="small">Inga tränare än.</div>`;
    return;
  }

  coaches.forEach((c, i) => {
    const row = document.createElement("div");
    row.className = "player-row";
    row.innerHTML = `
      <span>${escapeHtml(c.name)}</span>
      <div style="display:flex; gap:8px;">
        <button onclick="editCoach(${i})">Redigera</button>
        <button onclick="deleteCoach(${i})">Ta bort</button>
      </div>
    `;
    box.appendChild(row);
  });
}

/* ---------- IMPORT BACKUP JSON ---------- */
/*
Stödjer:
A) { "players": ["Namn", ...], "coaches": ["Namn", ...] }
B) { "players": [{name:"..."},...], "coaches": [{name:"..."},...] }
C) Om din backup innehåller fler fält (states osv) ignoreras de.
*/
function wireImport(){
  const input = document.getElementById("importFile");
  const msg = document.getElementById("importMsg");
  if (!input) return;

  input.addEventListener("change", async () => {
    const f = input.files && input.files[0];
    if (!f) return;

    try{
      const txt = await f.text();
      const data = JSON.parse(txt);

      const rawPlayers = Array.isArray(data.players) ? data.players : [];
      const rawCoaches = Array.isArray(data.coaches) ? data.coaches : [];

      // normalize -> objects
      const nextPlayers = rawPlayers
        .map(x => ({ name: normalizeName(x?.name ?? x) }))
        .filter(x => x.name);

      const nextCoaches = rawCoaches
        .map(x => ({ name: normalizeName(x?.name ?? x) }))
        .filter(x => x.name);

      // merge + uniq (case-insensitive)
      const uniqByName = (arr) => {
        const seen = new Set();
        const out = [];
        for (const it of arr){
          const key = it.name.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          out.push(it);
        }
        return out;
      };

      players = uniqByName(players.concat(nextPlayers));
      coaches = uniqByName(coaches.concat(nextCoaches));

      persistAll();
      if (msg) msg.innerHTML = `<span class="ok">✔ Import klar (${nextPlayers.length} spelare, ${nextCoaches.length} tränare)</span>`;
    } catch (e){
      if (msg) msg.innerHTML = `<span class="error">✖ Import misslyckades</span>`;
    } finally {
      input.value = "";
    }
  });
}

/* ---------- HTML ESCAPE ---------- */
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

/* ---------- INIT ---------- */
window.addEventListener("load", () => {
  renderPlayers();
  renderCoaches();
  wireImport();
});

/* ---------- SERVICE WORKER ---------- */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js?v=39")
    .then(() => console.log("SW registered"))
    .catch(err => console.log("SW error", err));
}