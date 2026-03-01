// app.js
const STORAGE_KEY = "nsklag:data:v1";

const DEFAULTS = {
  teams: ["Lag 1", "Lag 2", "Lag 3"],
  players: [
    "Agnes Danielsson","Alma Andersson","Ella Berg","Elsa Johansson","Ida Karlsson",
    "Julia Nilsson","Maja Eriksson","Nora Svensson","Olivia Lind","Sofia Persson"
  ],
  coaches: ["Coach 1", "Coach 2"],
  data: {} // teamId -> matchId -> matchState
};

function loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULTS);
    const parsed = JSON.parse(raw);
    return { ...structuredClone(DEFAULTS), ...parsed };
  } catch {
    return structuredClone(DEFAULTS);
  }
}

function saveAll(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let app = loadAll();

function $(sel, root=document) { return root.querySelector(sel); }
function $all(sel, root=document) { return [...root.querySelectorAll(sel)]; }

function getContext() {
  const team = $("#teamSelect").value;
  const match = $("#matchSelect").value;
  return { team, match };
}

function ensureMatchState(team, match) {
  app.data[team] ??= {};
  app.data[team][match] ??= {
    matchInfo: {
      date: "", startTime: "", opponent: "", field: "",
      squadSize: 0, onField: 0, periods: 0, periodMinutes: 0, swapSeconds: 0
    },
    selectedPlayers: [],
    goalie: "",
    coach: ""
  };
  return app.data[team][match];
}

function renderTeamAndMatchSelectors() {
  const teamSel = $("#teamSelect");
  teamSel.innerHTML = app.teams.map(t => `<option value="${t}">${t}</option>`).join("");

  const matchSel = $("#matchSelect");
  // enkelt: 1..10 matcher
  matchSel.innerHTML = Array.from({length: 10}, (_,i)=>i+1)
    .map(n => `<option value="Match ${n}">Match ${n}</option>`).join("");
}

function renderRegisterLists() {
  const playerList = $("#playersList");
  playerList.innerHTML = app.players
    .slice().sort((a,b)=>a.localeCompare(b,"sv"))
    .map(p => `<option value="${p}"></option>`).join("");

  const coachList = $("#coachesList");
  coachList.innerHTML = app.coaches
    .slice().sort((a,b)=>a.localeCompare(b,"sv"))
    .map(c => `<option value="${c}"></option>`).join("");
}

function bindViewTabs() {
  $all("[data-view]").forEach(btn => {
    btn.addEventListener("click", () => setView(btn.dataset.view));
  });
}

function setView(id) {
  $all(".view").forEach(v => v.classList.toggle("active", v.id === id));
  $all("[data-view]").forEach(b => b.classList.toggle("active", b.dataset.view === id));
}

function bindContextChange() {
  $("#teamSelect").addEventListener("change", () => loadContextIntoUI());
  $("#matchSelect").addEventListener("change", () => loadContextIntoUI());
}

function loadContextIntoUI() {
  const { team, match } = getContext();
  const st = ensureMatchState(team, match);

  // Matchinfo inputs
  $("#date").value = st.matchInfo.date;
  $("#startTime").value = st.matchInfo.startTime;
  $("#opponent").value = st.matchInfo.opponent;
  $("#field").value = st.matchInfo.field;
  $("#squadSize").value = st.matchInfo.squadSize || "";
  $("#onField").value = st.matchInfo.onField || "";
  $("#periods").value = st.matchInfo.periods || "";
  $("#periodMinutes").value = st.matchInfo.periodMinutes || "";
  $("#swapSeconds").value = st.matchInfo.swapSeconds || "";

  // Laguppställning
  const select = $("#matchPlayers");
  select.innerHTML = app.players.map(p => `<option value="${p}">${p}</option>`).join("");
  // markera valda
  [...select.options].forEach(o => o.selected = st.selectedPlayers.includes(o.value));

  // goalie/coach
  $("#goalie").innerHTML = `<option value=""></option>` + app.players.map(p => `<option value="${p}">${p}</option>`).join("");
  $("#goalie").value = st.goalie || "";

  $("#coach").innerHTML = `<option value=""></option>` + app.coaches.map(c => `<option value="${c}">${c}</option>`).join("");
  $("#coach").value = st.coach || "";
}

function bindAutoSave() {
  // Matchinfo autosave
  const map = [
    ["#date","date"],["#startTime","startTime"],["#opponent","opponent"],["#field","field"],
    ["#squadSize","squadSize"],["#onField","onField"],["#periods","periods"],
    ["#periodMinutes","periodMinutes"],["#swapSeconds","swapSeconds"]
  ];
  map.forEach(([sel,key]) => {
    $(sel).addEventListener("input", () => {
      const {team,match} = getContext();
      const st = ensureMatchState(team,match);
      const val = $(sel).value;
      st.matchInfo[key] = (["squadSize","onField","periods","periodMinutes","swapSeconds"].includes(key))
        ? Number(val || 0)
        : val;
      saveAll(app);
    });
  });

  $("#matchPlayers").addEventListener("change", () => {
    const {team,match} = getContext();
    const st = ensureMatchState(team,match);
    st.selectedPlayers = [...$("#matchPlayers").selectedOptions].map(o=>o.value);
    saveAll(app);
  });

  $("#goalie").addEventListener("change", () => {
    const {team,match} = getContext();
    const st = ensureMatchState(team,match);
    st.goalie = $("#goalie").value;
    saveAll(app);
  });

  $("#coach").addEventListener("change", () => {
    const {team,match} = getContext();
    const st = ensureMatchState(team,match);
    st.coach = $("#coach").value;
    saveAll(app);
  });
}

function bindRegisterModal() {
  $("#openRegister").addEventListener("click", () => $("#registerModal").showModal());
  $("#closeRegister").addEventListener("click", () => $("#registerModal").close());

  $("#addPlayer").addEventListener("click", () => {
    const v = $("#playerInput").value.trim();
    if (!v) return;
    if (!app.players.includes(v)) app.players.push(v);
    $("#playerInput").value = "";
    saveAll(app);
    renderRegisterLists();
    loadContextIntoUI();
  });

  $("#addCoach").addEventListener("click", () => {
    const v = $("#coachInput").value.trim();
    if (!v) return;
    if (!app.coaches.includes(v)) app.coaches.push(v);
    $("#coachInput").value = "";
    saveAll(app);
    renderRegisterLists();
    loadContextIntoUI();
  });

  $("#exportJson").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(app, null, 2)], {type:"application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "nsk-lag-backup.json";
    a.click();
    URL.revokeObjectURL(a.href);
  });

  $("#importJson").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const txt = await file.text();
    app = JSON.parse(txt);
    saveAll(app);
    renderTeamAndMatchSelectors();
    renderRegisterLists();
    loadContextIntoUI();
    e.target.value = "";
  });

  $("#resetMatch").addEventListener("click", () => {
    const {team,match} = getContext();
    if (app.data?.[team]?.[match]) {
      delete app.data[team][match];
      saveAll(app);
      loadContextIntoUI();
    }
  });
}

function registerSW() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("./sw.js").catch(()=>{});
}

document.addEventListener("DOMContentLoaded", () => {
  renderTeamAndMatchSelectors();
  renderRegisterLists();
  bindViewTabs();
  bindContextChange();
  bindAutoSave();
  bindRegisterModal();
  loadContextIntoUI();
  setView("view-matchinfo");
  registerSW();
});