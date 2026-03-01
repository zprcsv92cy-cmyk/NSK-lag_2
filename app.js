let players = JSON.parse(localStorage.getItem("players") || "[]");
let coaches = JSON.parse(localStorage.getItem("coaches") || "[]");
let pools = JSON.parse(localStorage.getItem("pools") || "[]");

function save() {
  localStorage.setItem("players", JSON.stringify(players));
  localStorage.setItem("coaches", JSON.stringify(coaches));
  localStorage.setItem("pools", JSON.stringify(pools));
}

function showTab(id) {
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

function addPlayer() {
  const name = document.getElementById("playerName").value.trim();
  if (!name) return;
  players.push(name);
  document.getElementById("playerName").value = "";
  save();
  renderPlayers();
}

function removePlayer(i) {
  players.splice(i,1);
  save();
  renderPlayers();
}

function renderPlayers() {
  const list = document.getElementById("playerList");
  list.innerHTML = "";

  players.forEach((p,i)=>{
    const li = document.createElement("li");
    li.innerHTML = `
      ${p}
      <button onclick="removePlayer(${i})">Ta bort</button>
    `;
    list.appendChild(li);
  });
}

function addCoach() {
  const name = document.getElementById("coachName").value.trim();
  if (!name) return;
  coaches.push(name);
  document.getElementById("coachName").value = "";
  save();
  renderCoaches();
}

function renderCoaches() {
  const box = document.getElementById("coachList");
  box.innerHTML = "";

  coaches.forEach((c,i)=>{
    const span = document.createElement("span");
    span.textContent = c + " ✕";
    span.onclick = () => {
      coaches.splice(i,1);
      save();
      renderCoaches();
    };
    box.appendChild(span);
  });
}

function createPool() {
  const date = document.getElementById("poolDate").value;
  const place = document.getElementById("poolPlace").value;

  if (!date) return;

  pools.push({
    date,
    place
  });

  save();
  renderPools();
}

function renderPools() {
  const list = document.getElementById("poolList");
  list.innerHTML = "";

  pools.forEach((p,i)=>{
    const div = document.createElement("div");
    div.className = "pool";
    div.innerHTML = `
      <strong>${p.date}</strong> • ${p.place || ""}
      <div>
        <button onclick="deletePool(${i})">Ta bort</button>
      </div>
    `;
    list.appendChild(div);
  });
}

function deletePool(i) {
  pools.splice(i,1);
  save();
  renderPools();
}

function renderGoalieStats() {
  const box = document.getElementById("goalieStatsList");
  box.innerHTML = "Kommer i nästa version";
}

renderPlayers();
renderCoaches();
renderPools();
renderGoalieStats();