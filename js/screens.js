"use strict";
/* =====================================================================
   SCREENS & VIEWPORT — switching screens, real mobile viewport height,
   and the "turn your phone sideways" hint.
   ===================================================================== */

function show(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active', s.id===id));
  updateRotateHint();
}
function isScreenActive(id){ return document.getElementById(id).classList.contains('active'); }

// Mobile browser toolbars resize the page, so 100vh alone is unreliable.
function setVH(){
  document.documentElement.style.setProperty('--vh', (window.innerHeight*0.01)+'px');
}

function updateRotateHint(){
  const portrait = window.innerHeight > window.innerWidth;
  const needed = state.platform==='mobile' && isScreenActive('screen-game') && portrait;
  document.getElementById('rotateHint').classList.toggle('show', needed);
}
