"use strict";
/* =====================================================================
   GAME DATA — characters, difficulty tuning and the player's setup.
   ===================================================================== */

// Prey stats: speed = up/down, dash = left/right, radius = hitbox size.
const PREY_TYPES = [
  {id:'penguin', name:'Penguin', tag:'Balanced',     stats:{speed:280, dash:360, radius:22, bonusLives:0}},
  {id:'walrus',  name:'Walrus',  tag:'Tanky & Slow', stats:{speed:225, dash:300, radius:26, bonusLives:1}},
  {id:'squid',   name:'Squid',   tag:'Agile',        stats:{speed:300, dash:390, radius:17, bonusLives:0}},
  {id:'seal',    name:'Seal',    tag:'Fast',         stats:{speed:335, dash:440, radius:22, bonusLives:0}},
];

// Predator stats: speedMul scales charge speed, w/h = hitbox, weave = vertical zig-zag size.
const PREDATOR_TYPES = [
  {id:'polarbear',   name:'Polar Bear',   tag:'Heavy charger', stats:{speedMul:0.85, w:68, h:38, weave:0}},
  {id:'orca',        name:'Orca',         tag:'Fast striker',  stats:{speedMul:1.25, w:60, h:30, weave:0}},
  {id:'narwhal',     name:'Narwhal',      tag:'Tusk lunge',    stats:{speedMul:1.0,  w:84, h:28, weave:0}},
  {id:'leopardseal', name:'Leopard Seal', tag:'Erratic',       stats:{speedMul:1.05, w:58, h:30, weave:45}},
];

const DIFFICULTIES = [
  {id:'easy',    name:'Easy',       stars:1, desc:'Slow currents, forgiving lanes.'},
  {id:'medium',  name:'Medium',     stars:2, desc:'A steady hunt begins.'},
  {id:'hard',    name:'Hard',       stars:3, desc:'Predators strike quicker.'},
  {id:'extreme', name:'Extreme',    stars:4, desc:'One hit. Thin ice everywhere.'},
  {id:'boss',    name:'Boss Level', stars:5, desc:'A giant predator trails right behind you and strikes at your exact spot — more join in as your score climbs.'},
];

const DIFF_PARAMS = {
  easy:    {fishSpeed:150, predSpeed:170, fishRate:0.95, obsRate:0.6,  predRate:0.42, lives:4, boneRatio:0.30, pufferRatio:0.06, warnTime:0.85},
  medium:  {fishSpeed:195, predSpeed:225, fishRate:1.15, obsRate:0.85, predRate:0.65, lives:3, boneRatio:0.36, pufferRatio:0.09, warnTime:0.65},
  hard:    {fishSpeed:200, predSpeed:250, fishRate:1.35, obsRate:1.1,  predRate:0.9,  lives:2, boneRatio:0.40, pufferRatio:0.12, warnTime:0.5},
  extreme: {fishSpeed:285, predSpeed:350, fishRate:1.55, obsRate:1.35, predRate:1.2,  lives:1, boneRatio:0.46, pufferRatio:0.15, warnTime:0.38},
  boss:    {fishSpeed:185, predSpeed:210, fishRate:1.2,  obsRate:0.85, predRate:0.6,  lives:2, boneRatio:0.36, pufferRatio:0.09, warnTime:0.55, isBoss:true},
};

/* ---- Waves: every WAVE_LENGTH seconds things get faster and busier ---- */
const WAVE_LENGTH = 30;        // seconds per wave
const WAVE_BONUS = 5;          // bonus points per wave reached (wave 3 → +10)
function waveAt(elapsedSec){ return 1 + Math.floor(elapsedSec/WAVE_LENGTH); }
// +20% speed & spawn rate per wave, capped at +80% (wave 5)
function getIntensity(elapsedSec){ return 1 + Math.min((waveAt(elapsedSec)-1)*0.2, 0.8); }

/* ---- Combos: every 5 fish in a row without a bone or hit raises the multiplier ---- */
const COMBO_STEP = 5;
const COMBO_MAX = 3;           // highest combo multiplier
function comboMultiplier(combo){ return Math.min(COMBO_MAX, 1 + Math.floor(combo/COMBO_STEP)); }

/* ---- Special fish ---- */
const GOLDEN_FISH = {chance:0.05, value:10, speedMul:1.8};
const CLOSE_CALL = {margin:26, points:3, bossPoints:5}; // dodge within `margin` px for a bonus

const POWERUP_DURATIONS = {shield:8, magnet:6, slow:5, mult:8, speed:6, freeze:4};

// Boss level: 1 giant predator from the start, a 2nd at 25 points, a 3rd at 50.
const BOSS_SCORE_THRESHOLDS = [0, 25, 50];

function findById(list, id){ return list.find(x=>x.id===id) || list[0]; }

function rand(a,b){ return a+Math.random()*(b-a); }
function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function clamp(v,lo,hi){ return Math.max(lo, Math.min(hi, v)); }

/* ---- The player's current setup ---- */
const isTouchDevice = window.matchMedia && window.matchMedia('(pointer:coarse)').matches;
const state = {
  prey:'penguin',
  predators:['orca'],
  customMode:false,
  difficulty:'medium',
  platform: isTouchDevice ? 'mobile' : 'desktop',
};

/* ---- Best score for each level (saved in the browser) ---- */
const HighScore = {
  key(level){ return 'icyCuisineHighScore:'+level; },
  get(level){
    try{ return parseInt(localStorage.getItem(this.key(level))||'0',10) || 0; }catch(e){ return 0; }
  },
  // Returns {best, isNew}
  submit(level, score){
    const previous = this.get(level);
    const isNew = score > previous;
    if(isNew){ try{ localStorage.setItem(this.key(level), String(score)); }catch(e){} }
    return {best: Math.max(previous, score), isNew};
  },
};

// Respect the player's "reduce motion" system setting (used for screen shake).
const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
