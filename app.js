'use strict';

const APP_VERSION = 'v45';

function $(id){ return document.getElementById(id); }

// ---------- SAFE BIND ----------
function bind(id, fn){
  const el = $(id);
  if (!el) return;
  el.addEventListener('click', e=>{
    e.preventDefault();
    try { fn(); }
    catch(err){
      console.error('Button error:', id, err);
      alert('Fel uppstod — se console');
    }
  });
}

// ---------- TEST FUNCTIONS ----------
function openRoster(){
  alert('Roster öppnas (test OK)');
}

function createPool(){
  alert('Skapa poolspel (test OK)');
}

function goalieStats(){
  alert('Statistik målvakter (test OK)');
}

// ---------- INIT ----------
function init(){

  const vb = $('versionBox');
  if (vb) vb.textContent = APP_VERSION;

  bind('openRosterBtn', openRoster);
  bind('newPoolspelBtn', createPool);
  bind('goalieStatsBtn', goalieStats);

  console.log('NSK init OK', APP_VERSION);
}

window.addEventListener('DOMContentLoaded', init);


// ---------- SERVICE WORKER ----------
if ('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('./sw.js?v=45');
  });
}