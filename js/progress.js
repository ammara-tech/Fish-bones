"use strict";
/* =====================================================================
   PROGRESS — achievements, unlockable characters and the daily
   challenge. Everything is saved in the browser (localStorage).
   ===================================================================== */
const Progress = (function(){
  const KEY = 'icyCuisineProgress';
  const blank = ()=>({achievements:{}, games:0, powerupsSeen:[], daily:{}, lastDaily:null, streak:0});
  let data = load();

  function load(){
    try{ return Object.assign(blank(), JSON.parse(localStorage.getItem(KEY)||'{}')); }
    catch(e){ return blank(); }
  }
  function save(){ try{ localStorage.setItem(KEY, JSON.stringify(data)); }catch(e){} }

  /* ---- Achievements ----
     check(run) gets the current run's stats (see Game) and returns true once earned.
     `unlocks` names the character it unlocks, if any. */
  const ACHIEVEMENTS = [
    {id:'first_bite',  icon:'🐟', name:'First Bite',      desc:'Eat your first fish',                   unlocks:'polarbear', check:r=>r.fishEaten>=1},
    {id:'wave_3',      icon:'🌊', name:'Rough Waters',    desc:'Reach wave 3',                          unlocks:'walrus',    check:r=>r.wave>=3},
    {id:'combo_x3',    icon:'🔥', name:'On a Roll',       desc:'Eat 10 fish in a row (x3 combo)',       unlocks:'squid',     check:r=>r.bestCombo>=10},
    {id:'golden',      icon:'✨', name:'Gold Rush',       desc:'Catch a golden fish',                   unlocks:'narwhal',   check:r=>r.goldenEaten>=1},
    {id:'close_5',     icon:'💨', name:'By a Whisker',   desc:'5 close calls in one run',              unlocks:'seal',      check:r=>r.closeCalls>=5},
    {id:'games_10',    icon:'🎮', name:'Regular',         desc:'Play 10 games',                         unlocks:'leopardseal', check:(r,d)=>d.games>=10},
    {id:'fish_50',     icon:'🍽️', name:'Hungry Hunter',   desc:'Eat 50 fish in one run',                check:r=>r.fishEaten>=50},
    {id:'combo_25',    icon:'⚡', name:'Unstoppable',     desc:'Eat 25 fish in a row',                  check:r=>r.bestCombo>=25},
    {id:'wave_5',      icon:'⛈️', name:'Storm Survivor',  desc:'Reach wave 5',                          check:r=>r.wave>=5},
    {id:'clean_plate', icon:'🦴', name:'Clean Plate',     desc:'Score 30 without eating a single bone', check:r=>r.score>=30 && r.bonesEaten===0},
    {id:'collector',   icon:'🎒', name:'Collector',       desc:'Use every kind of power-up (any runs)', check:(r,d)=>Object.keys(POWERUP_STYLE).every(k=>d.powerupsSeen.includes(k))},
    {id:'thin_ice',    icon:'🧊', name:'Thin Ice',        desc:'Score 25 on Extreme',                   check:r=>r.difficulty==='extreme' && r.score>=25},
    {id:'boss_dodger', icon:'👑', name:'Boss Dodger',     desc:'Survive 2 minutes on Boss Level',       check:r=>r.difficulty==='boss' && r.elapsed>=120},
    {id:'daily_diver', icon:'📅', name:'Daily Diver',     desc:'Finish a daily challenge',              check:r=>r.daily && r.finished},
  ];

  const STARTERS = ['penguin', 'orca']; // always available

  function has(id){ return !!data.achievements[id]; }

  // Called during and after every run; returns achievements earned just now.
  function check(run){
    run.powerupsTaken.forEach(k=>{ if(!data.powerupsSeen.includes(k)) data.powerupsSeen.push(k); });
    const earned = ACHIEVEMENTS.filter(a=>!has(a.id) && a.check(run, data));
    if(earned.length){ earned.forEach(a=>data.achievements[a.id] = Date.now()); save(); }
    return earned;
  }

  function finishRun(run){
    data.games++;
    run.finished = true;
    if(run.daily) recordDaily(run.score);
    const earned = check(run);
    save();
    return earned;
  }

  /* ---- Unlockable characters ---- */
  function unlockFor(charId){ return ACHIEVEMENTS.find(a=>a.unlocks===charId); }
  function isUnlocked(charId){
    if(STARTERS.includes(charId)) return true;
    const a = unlockFor(charId);
    return !a || has(a.id);
  }

  /* ---- Daily challenge: same setup for everyone on the same date ---- */
  const TWISTS = [
    {id:'goldrush', name:'Gold Rush',       desc:'Golden fish are 4× as common'},
    {id:'puffers',  name:'Puffer Party',    desc:'Twice as many pufferfish'},
    {id:'speedy',   name:'Strong Currents', desc:'Everything moves 15% faster'},
    {id:'powerful', name:'Power Surge',     desc:'Power-ups come twice as often'},
    {id:'boneyard', name:'Boneyard',        desc:'Extra bones — but fish are worth more'},
  ];

  function todayKey(d){
    d = d || new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  // Small seeded random number generator so the date always gives the same setup
  function seededRandom(seedText){
    let h = 1779033703 ^ seedText.length;
    for(let i=0;i<seedText.length;i++){ h = Math.imul(h ^ seedText.charCodeAt(i), 3432918353); h = h<<13 | h>>>19; }
    return function(){
      h = Math.imul(h ^ h>>>16, 2246822507); h = Math.imul(h ^ h>>>13, 3266489909);
      return ((h ^= h>>>16) >>> 0) / 4294967296;
    };
  }

  function dailySetup(date){
    const key = todayKey(date);
    const rnd = seededRandom('icy-'+key);
    const pickR = arr=>arr[Math.floor(rnd()*arr.length)];
    const levels = ['easy','medium','medium','hard','hard','extreme'];
    const predatorCount = 1 + Math.floor(rnd()*3);
    const pool = PREDATOR_TYPES.map(p=>p.id);
    const predators = [];
    while(predators.length<predatorCount){
      const p = pickR(pool);
      if(!predators.includes(p)) predators.push(p);
    }
    return {
      key, daily:true,
      prey: pickR(PREY_TYPES).id,
      predators,
      difficulty: pickR(levels),
      twist: pickR(TWISTS),
    };
  }

  function recordDaily(score){
    const key = todayKey();
    data.daily[key] = Math.max(data.daily[key]||0, score);
    if(data.lastDaily!==key){
      const yesterday = todayKey(new Date(Date.now()-864e5));
      data.streak = data.lastDaily===yesterday ? data.streak+1 : 1;
      data.lastDaily = key;
    }
    save();
  }
  function dailyBest(){ return data.daily[todayKey()]||0; }
  function streak(){
    const key = todayKey(), yesterday = todayKey(new Date(Date.now()-864e5));
    return (data.lastDaily===key || data.lastDaily===yesterday) ? data.streak : 0;
  }

  // Wipe achievements, unlocks, daily results and every level's best score
  function reset(){
    data = blank(); save();
    DIFFICULTIES.forEach(d=>{ try{ localStorage.removeItem(HighScore.key(d.id)); }catch(e){} });
  }

  return {
    ACHIEVEMENTS, has, check, finishRun, isUnlocked, unlockFor, reset,
    dailySetup, dailyBest, streak, todayKey,
    count: ()=>Object.keys(data.achievements).length,
  };
})();

/* Twists change the level's tuning for the daily challenge */
function applyTwist(params, twist){
  const p = Object.assign({}, params, {goldenChance:GOLDEN_FISH.chance, fishValueMul:1, powerupEvery:1});
  if(!twist) return p;
  switch(twist.id){
    case 'goldrush': p.goldenChance = GOLDEN_FISH.chance*4; break;
    case 'puffers':  p.pufferRatio *= 2; break;
    case 'speedy':   p.fishSpeed *= 1.15; p.predSpeed *= 1.15; break;
    case 'powerful': p.powerupEvery = 0.5; break;
    case 'boneyard': p.boneRatio = Math.min(0.55, p.boneRatio+0.12); p.fishValueMul = 2; break;
  }
  return p;
}
