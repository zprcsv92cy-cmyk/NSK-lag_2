/* NSK Lag — app.js v45 */
/* Failsafe navigation + button handling */

const VERSION = "v45";

document.addEventListener("DOMContentLoaded", () => {
  console.log("NSK Lag", VERSION);

  initNavigation();
  initButtons();
  showVersion();
});


/* ------------------- VERSION ------------------- */

function showVersion() {
  const v = document.getElementById("appVersion");
  if (v) v.textContent = VERSION;
}


/* ------------------- NAVIGATION ------------------- */

function initNavigation() {
  window.addEventListener("hashchange", renderRoute);
  renderRoute();
}

function renderRoute() {
  const hash = location.hash || "#home";

  hideAllViews();

  if (hash === "#trupp") {
    show("truppView");
  } 
  else if (hash === "#pool") {
    show("poolView");
  } 
  else {
    show("homeView");
  }
}

function hideAllViews() {
  document.querySelectorAll(".view").forEach(v => {
    v.style.display = "none";
  });
}

function show(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = "block";
}


/* ------------------- BUTTONS ------------------- */

function initButtons() {

  // Delegation = fungerar även om element skapas senare
  document.body.addEventListener("click", (e) => {

    const btn = e.target.closest("[data-nav]");
    if (btn) {
      const target = btn.dataset.nav;
      location.hash = target;
      return;
    }

    if (e.target.id === "btnOpenTrupp") {
      location.hash = "#trupp";
      return;
    }

    if (e.target.id === "btnCreatePool") {
      location.hash = "#pool";
      return;
    }

  });
}


/* ------------------- STORAGE HELPERS ------------------- */

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function load(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}