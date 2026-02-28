const APP_VERSION = "v39";
console.log("APP VERSION:", APP_VERSION);


/* ---------- NAVIGATION ---------- */

function showView(name) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));

  const el = document.getElementById("view-" + name);
  if (el) el.classList.add("active");

  location.hash = name;
}

function go(name) {
  showView(name);
}

window.addEventListener("hashchange", () => {
  const hash = location.hash.replace("#", "") || "home";
  showView(hash);
});

window.addEventListener("load", () => {
  const hash = location.hash.replace("#", "") || "home";
  showView(hash);
});


/* ---------- TRUPP DATA ---------- */

let players = JSON.parse(localStorage.getItem("players") || "[]");

function savePlayers() {
  localStorage.setItem("players", JSON.stringify(players));
  renderPlayers();
}

function addPlayer() {
  const name = prompt("Namn:");
  if (!name) return;

  players.push({ name });
  savePlayers();
}

function deletePlayer(i) {
  players.splice(i, 1);
  savePlayers();
}

function renderPlayers() {
  const box = document.getElementById("playerList");
  if (!box) return;

  box.innerHTML = "";

  players.forEach((p, i) => {
    const row = document.createElement("div");
    row.className = "player-row";

    row.innerHTML = `
      <span>${p.name}</span>
      <button onclick="deletePlayer(${i})">Ta bort</button>
    `;

    box.appendChild(row);
  });
}

window.addEventListener("load", renderPlayers);


/* ---------- SERVICE WORKER ---------- */

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js?v=39")
    .then(() => console.log("SW registered"))
    .catch(err => console.log("SW error", err));
}