"use strict";
/* =====================================================================
   SETTINGS — player preferences saved in the browser:
   music & sound-effect volume, and "reduce motion".
   ===================================================================== */
const Settings = (function(){
  const KEY = 'icyCuisineSettings';
  const systemReducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const defaults = {music:70, sfx:80, reduceMotion:systemReducedMotion};
  const listeners = [];
  let values = load();

  function load(){
    try{ return Object.assign({}, defaults, JSON.parse(localStorage.getItem(KEY)||'{}')); }
    catch(e){ return Object.assign({}, defaults); }
  }
  function apply(){
    // CSS uses this class to switch off decorative animations
    document.documentElement.classList.toggle('reduce-motion', !!values.reduceMotion);
  }
  function set(key, value){
    values[key] = value;
    try{ localStorage.setItem(KEY, JSON.stringify(values)); }catch(e){}
    apply();
    listeners.forEach(fn=>fn(key, value));
  }
  apply();

  return {
    get: key=>values[key],
    set,
    onChange: fn=>listeners.push(fn),
  };
})();

function reduceMotion(){ return !!Settings.get('reduceMotion'); }
