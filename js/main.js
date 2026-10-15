"use strict";
/* =====================================================================
   BOOT — runs last, once every other script has loaded.
   ===================================================================== */

// Audio can only start after the player interacts with the page.
['pointerdown','keydown','touchstart'].forEach(evt=>
  window.addEventListener(evt, ()=>Sound.unlock(), {passive:true})
);

let resizeRAF = null;
function onResize(){
  setVH();
  cancelAnimationFrame(resizeRAF);
  resizeRAF = requestAnimationFrame(()=>{ Game.fitCanvas(); updateRotateHint(); });
}
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', onResize);

setVH();
Sound.startMusic('title');
refreshTitle();
show('screen-title');
