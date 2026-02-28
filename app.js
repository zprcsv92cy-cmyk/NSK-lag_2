const VERSION = "v56";

function show(view){

  document.getElementById("homeView").style.display = "none";
  document.getElementById("truppView").style.display = "none";

  document.getElementById(view + "View").style.display = "";

  history.replaceState({}, "", "#" + view);
}

window.addEventListener("load", () => {

  const hash = location.hash.replace("#","") || "home";
  show(hash);

});


// SERVICE WORKER AUTO UPDATE

if ("serviceWorker" in navigator) {

  navigator.serviceWorker.register("sw.js?v=56").then(reg => {

    if (reg.waiting) {
      reg.waiting.postMessage({ type: "SKIP_WAITING" });
    }

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });

  });

}