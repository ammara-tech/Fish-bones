(function(){
"use strict";

/* ============================= AUDIO ============================= */
const Audio_ = (function(){
  let ctx=null, muted=false, musicTimer=null, musicGain=null, currentLoop=null;
  function ac(){ if(!ctx){ ctx = new (window.AudioContext||window.webkitAudioContext)(); } return ctx; }
  function tone(freq,dur,type,vol,delay,glideTo){
    if(muted) return;
    const c = ac(); const t0 = c.currentTime + (delay||0);
    const osc = c.createOscillator(); const gain = c.createGain();
    osc.type = type||'sine'; osc.frequency.setValueAtTime(freq,t0);
    if(glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0+dur);
    gain.gain.setValueAtTime(0,t0);
    gain.gain.linearRampToValueAtTime(vol||0.15, t0+0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t0+dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t0); osc.stop(t0+dur+0.05);
  }
  function sfx(name){
    if(muted) return;
    switch(name){
      case 'eatGood': tone(880,0.09,'triangle',0.18); tone(1320,0.12,'triangle',0.13,0.05); break;
      case 'eatBad': tone(160,0.16,'sawtooth',0.16); tone(110,0.2,'square',0.12,0.05); break;
      case 'powerup': [660,880,1100,1320].forEach((f,i)=>tone(f,0.12,'triangle',0.15,i*0.06)); break;
      case 'hit': tone(200,0.3,'sawtooth',0.22,0,50); tone(90,0.4,'square',0.18,0.05); break;
      case 'click': tone(500,0.05,'square',0.08); break;
      case 'select': tone(700,0.06,'triangle',0.12); break;
      case 'warn': tone(220,0.18,'square',0.12); break;
      case 'shield': tone(500,0.1,'sine',0.15); tone(750,0.15,'sine',0.12,0.08); break;
      case 'gameover': [400,340,280,200,140].forEach((f,i)=>tone(f,0.25,'sawtooth',0.16,i*0.12)); break;
      case 'win': [520,660,780,1040].forEach((f,i)=>tone(f,0.2,'triangle',0.16,i*0.1)); break;
    }
  }
  // simple generative music loop: pad + arpeggio, pentatonic scale for icy/aurora feel
  function startMusic(kind){
    stopMusic();
    if(muted) return;
    const c = ac();
    musicGain = c.createGain(); musicGain.gain.value = 0.0;
    musicGain.connect(c.destination);
    musicGain.gain.linearRampToValueAtTime(kind==='game'?0.10:0.13, c.currentTime+1.2);
    // pad
    const pad = c.createOscillator(); const pad2 = c.createOscillator();
    pad.type='sine'; pad2.type='sine';
    pad.frequency.value = kind==='game'?110:98;
    pad2.frequency.value = (kind==='game'?110:98)*1.5;
    const padGain = c.createGain(); padGain.gain.value=0.05;
    pad.connect(padGain); pad2.connect(padGain); padGain.connect(musicGain);
    pad.start(); pad2.start();
    currentLoop = {pad,pad2,padGain};
    const scale = kind==='game' ? [220,246.9,293.7,329.6,392,440,523.3] : [261.6,293.7,329.6,392,440,523.3];
    let step=0;
    const tempo = kind==='game'?230:330;
    function scheduleNote(){
      if(muted || !musicGain) return;
      const c2 = ac();
      const idx = (step*3+ (kind==='game'?Math.floor(step/2):0)) % scale.length;
      const freq = scale[idx] * (step%8===0?0.5:1);
      const o = c2.createOscillator(); const g = c2.createGain();
      o.type='triangle'; o.frequency.value=freq;
      g.gain.setValueAtTime(0, c2.currentTime);
      g.gain.linearRampToValueAtTime(0.09, c2.currentTime+0.02);
      g.gain.exponentialRampToValueAtTime(0.001, c2.currentTime+ (tempo/1000)*0.9);
      o.connect(g).connect(musicGain);
      o.start(); o.stop(c2.currentTime+ (tempo/1000));
      step++;
    }
    musicTimer = setInterval(scheduleNote, tempo);
  }
  function stopMusic(){
    if(musicTimer){ clearInterval(musicTimer); musicTimer=null; }
    if(currentLoop){
      try{ currentLoop.padGain.gain.linearRampToValueAtTime(0, ac().currentTime+0.4); }catch(e){}
      const l = currentLoop; currentLoop=null;
      setTimeout(()=>{ try{l.pad.stop(); l.pad2.stop();}catch(e){} },500);
    }
    musicGain=null;
  }
  function toggleMute(){
    muted=!muted;
    if(muted) stopMusic();
    return muted;
  }
  return {sfx, startMusic, stopMusic, toggleMute, isMuted:()=>muted, unlock:()=>ac()};
})();

/* ============================= STATE ============================= */
const PREY_TYPES = [
  {id:'penguin', name:'Penguin', tag:'Balanced', color:'#1c2b3a', accent:'#f0a857'},
  {id:'walrus', name:'Walrus', tag:'Tanky & Slow', color:'#8a6d5a', accent:'#eee'},
  {id:'squid', name:'Squid', tag:'Agile', color:'#b06bd6', accent:'#e8b8ff'},
  {id:'seal', name:'Seal', tag:'Fast', color:'#5b7a8c', accent:'#dfeff5'},
];
const PREDATOR_TYPES = [
  {id:'polarbear', name:'Polar Bear', tag:'Heavy charger', color:'#f2f5f0'},
  {id:'orca', name:'Orca', tag:'Fast striker', color:'#1a1a2a'},
  {id:'narwhal', name:'Narwhal', tag:'Tusk lunge', color:'#8fa9b8'},
  {id:'leopardseal', name:'Leopard Seal', tag:'Erratic', color:'#7a8a6a'},
];
const DIFFICULTIES = [
  {id:'easy', name:'Easy', stars:1, desc:'Slow currents, forgiving lanes.'},
  {id:'medium', name:'Medium', stars:2, desc:'A steady hunt begins.'},
  {id:'hard', name:'Hard', stars:3, desc:'Predators strike quicker.'},
  {id:'extreme', name:'Extreme', stars:4, desc:'One hit. Thin ice everywhere.'},
  {id:'boss', name:'Boss Level', stars:5, desc:'A giant predator trails right behind you and strikes at your exact spot — more join in as your score climbs.'},
];

const state = {
  preyP1:'penguin',
  predators:['orca'], customMode:false,
  difficulty:'medium',
  platform:'desktop',
};

let highScore = 0;
try{ highScore = parseInt(localStorage.getItem('icyCuisineHighScore')||'0',10) || 0; }catch(e){}

/* ============================= SCREEN NAV ============================= */
function show(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if(typeof updateRotateHint==='function') updateRotateHint();
}
function backToTitle(){ Game.stop(); Audio_.startMusic('title'); show('screen-title'); }

document.getElementById('muteBtn').addEventListener('click', ()=>{
  const m = Audio_.toggleMute();
  document.getElementById('muteBtn').textContent = m ? '🔇' : '🔊';
  if(!m){
    const activeGame = document.getElementById('screen-game').classList.contains('active');
    Audio_.startMusic(activeGame ? 'game' : 'title');
  }
});

document.getElementById('playBtn').addEventListener('click', ()=>{ Audio_.unlock(); Audio_.sfx('select'); state.customMode=false; openPlatformSelect(); });
document.getElementById('customBtn').addEventListener('click', ()=>{ Audio_.unlock(); state.customMode=true; openPlatformSelect(); });
document.getElementById('backFromPlatform').addEventListener('click', backToTitle);
document.getElementById('backFromPrey').addEventListener('click', backToTitle);
document.getElementById('backFromPred').addEventListener('click', backToTitle);
document.getElementById('backFromDiff').addEventListener('click', backToTitle);
document.getElementById('platformBack').addEventListener('click', backToTitle);
document.getElementById('preyBack').addEventListener('click', ()=>show('screen-platform'));
document.getElementById('predBack').addEventListener('click', ()=>show('screen-prey'));
document.getElementById('diffBack').addEventListener('click', ()=>show('screen-predator'));

/* ---- Platform select ---- */
function openPlatformSelect(){
  renderPlatformCards();
  show('screen-platform');
}
function renderPlatformCards(){
  const dCard = document.getElementById('platformDesktop');
  const mCard = document.getElementById('platformMobile');
  dCard.classList.toggle('selected', state.platform==='desktop');
  mCard.classList.toggle('selected', state.platform==='mobile');
}
document.getElementById('platformDesktop').addEventListener('click', ()=>{
  Audio_.sfx('select'); state.platform='desktop'; renderPlatformCards();
});
document.getElementById('platformMobile').addEventListener('click', ()=>{
  Audio_.sfx('select'); state.platform='mobile'; renderPlatformCards();
});
document.getElementById('platformNext').addEventListener('click', ()=>{
  Audio_.sfx('click');
  openPreySelect();
});

/* ---- Prey select ---- */
function openPreySelect(){
  renderPreyGrid();
  document.getElementById('preyTitleHeading').textContent = 'Choose Your Prey';
  document.getElementById('preySubDesc').textContent = 'Pick who braves the ice water.';
  show('screen-prey');
}
function renderPreyGrid(){
  const grid = document.getElementById('preyGrid');
  grid.innerHTML='';
  PREY_TYPES.forEach(p=>{
    const sel = state.preyP1===p.id;
    const card = document.createElement('div');
    card.className = 'card'+(sel?' selected':'');
    card.innerHTML = `<div class="badge">✓</div><canvas width="120" height="84"></canvas><div class="name">${p.name}</div><div class="tag">${p.tag}</div>`;
    card.addEventListener('click', ()=>{
      Audio_.sfx('select');
      state.preyP1=p.id;
      renderPreyGrid();
    });
    grid.appendChild(card);
    drawCharacterIcon(card.querySelector('canvas'), 'prey', p.id);
  });
}
document.getElementById('preyNext').addEventListener('click', ()=>{
  Audio_.sfx('click');
  state.customMode=false;
  openPredatorSelect();
});

/* ---- Predator select ---- */
function openPredatorSelect(){
  if(!state.customMode) state.predators = [state.predators[0]||'orca'];
  renderPredatorGrid();
  document.getElementById('predTitleHeading').textContent = state.customMode ? 'Custom: Pick Any Combination' : 'Choose Your Predator';
  document.getElementById('predSubDesc').textContent = state.customMode ? 'Tap all the hunters you want roaming the ice.' : 'Whoever hunts you across the ice.';
  show('screen-predator');
}
function renderPredatorGrid(){
  const grid = document.getElementById('predatorGrid');
  grid.innerHTML='';
  PREDATOR_TYPES.forEach(pr=>{
    const sel = state.predators.includes(pr.id);
    const card = document.createElement('div');
    card.className='card'+(sel?' selected':'');
    card.innerHTML = `<div class="badge">✓</div><canvas width="120" height="84"></canvas><div class="name">${pr.name}</div><div class="tag">${pr.tag}</div>`;
    card.addEventListener('click', ()=>{
      Audio_.sfx('select');
      if(state.customMode){
        if(state.predators.includes(pr.id)){
          if(state.predators.length>1) state.predators = state.predators.filter(x=>x!==pr.id);
        } else state.predators.push(pr.id);
      } else {
        state.predators=[pr.id];
      }
      renderPredatorGrid();
    });
    grid.appendChild(card);
    drawCharacterIcon(card.querySelector('canvas'), 'predator', pr.id);
  });
}
document.getElementById('predNext').addEventListener('click', ()=>{
  Audio_.sfx('click');
  renderDiffGrid();
  show('screen-difficulty');
});

/* ---- Difficulty select ---- */
function renderDiffGrid(){
  const grid = document.getElementById('diffGrid');
  grid.innerHTML='';
  DIFFICULTIES.forEach(d=>{
    const sel = state.difficulty===d.id;
    const card = document.createElement('div');
    card.className='diffcard'+(sel?' selected':'');
    card.innerHTML = `<div class="lvl">${d.name}</div><div class="stars">${'★'.repeat(d.stars)}${'☆'.repeat(5-d.stars)}</div><div class="desc">${d.desc}</div>`;
    card.addEventListener('click', ()=>{ Audio_.sfx('select'); state.difficulty=d.id; renderDiffGrid(); });
    grid.appendChild(card);
  });
}
document.getElementById('diffStart').addEventListener('click', ()=>{
  Audio_.sfx('click');
  startGame();
});

/* ============================= CHARACTER ICON DRAWING ============================= */
function drawCharacterIcon(canvas, kind, id){
  const ctx = canvas.getContext('2d');
  const w=canvas.width,h=canvas.height;
  ctx.clearRect(0,0,w,h);
  ctx.save();
  ctx.translate(w/2,h/2+6);
  ctx.scale(1.5,1.5);
  if(kind==='prey') drawPrey(ctx,id,0,0,1,1);
  else drawPredator(ctx,id,0,0,1,1);
  ctx.restore();
}

function roundedBlob(ctx,x,y,rx,ry,rot){
  ctx.save(); ctx.translate(x,y); ctx.rotate(rot||0);
  ctx.beginPath(); ctx.ellipse(0,0,rx,ry,0,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawPrey(ctx,id,x,y,facing,scale){
  ctx.save(); ctx.translate(x,y); ctx.scale(facing*scale, scale);
  if(id==='penguin'){
    ctx.fillStyle='#16222e'; roundedBlob(ctx,0,0,16,20,0);
    ctx.fillStyle='#eef5f7'; roundedBlob(ctx,2,4,10,14,0);
    ctx.fillStyle='#f0a857'; ctx.beginPath(); ctx.moveTo(14,-2); ctx.lineTo(24,0); ctx.lineTo(14,3); ctx.fill();
    ctx.fillStyle='#f0a857'; roundedBlob(ctx,10,16,4,3,0.3); roundedBlob(ctx,-6,16,4,3,-0.3);
    ctx.fillStyle='#fff'; roundedBlob(ctx,7,-8,2.4,2.6,0);
    ctx.fillStyle='#111'; roundedBlob(ctx,8,-8,1.1,1.3,0);
  } else if(id==='walrus'){
    ctx.fillStyle='#8a6d5a'; roundedBlob(ctx,0,2,22,16,0);
    ctx.fillStyle='#a7876f'; roundedBlob(ctx,10,4,10,9,0);
    ctx.strokeStyle='#f4f4ee'; ctx.lineWidth=2.6; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(12,10); ctx.lineTo(10,20); ctx.moveTo(17,10); ctx.lineTo(19,20); ctx.stroke();
    ctx.fillStyle='#241a12'; roundedBlob(ctx,8,-2,1.6,1.8,0);
  } else if(id==='squid'){
    ctx.fillStyle='#b06bd6'; roundedBlob(ctx,0,-4,14,18,0);
    ctx.fillStyle='#c98be8';
    for(let i=-2;i<=2;i++){ ctx.beginPath(); ctx.moveTo(i*5,10); ctx.quadraticCurveTo(i*6,24,i*3,28); ctx.quadraticCurveTo(i*6,22,i*5,10); ctx.fill(); }
    ctx.fillStyle='#fff'; roundedBlob(ctx,-5,-8,3,3.4,0); roundedBlob(ctx,5,-8,3,3.4,0);
    ctx.fillStyle='#241a2c'; roundedBlob(ctx,-5,-8,1.3,1.5,0); roundedBlob(ctx,5,-8,1.3,1.5,0);
  } else if(id==='seal'){
    ctx.fillStyle='#5b7a8c'; roundedBlob(ctx,0,0,20,13,0);
    ctx.fillStyle='#defbff'; roundedBlob(ctx,-14,0,6,7,0);
    ctx.fillStyle='#dfeff5'; roundedBlob(ctx,10,-2,8,7,0);
    ctx.fillStyle='#1a2a30'; roundedBlob(ctx,-16,-1,1.4,1.6,0);
  }
  ctx.restore();
}

function drawPredator(ctx,id,x,y,facing,scale){
  ctx.save(); ctx.translate(x,y); ctx.scale(facing*scale, scale);
  if(id==='polarbear'){
    ctx.fillStyle='#f2f5f0'; roundedBlob(ctx,0,2,24,15,0);
    ctx.fillStyle='#fff'; roundedBlob(ctx,16,-2,10,9,0);
    ctx.fillStyle='#e9eee7'; roundedBlob(ctx,22,-8,3.4,3.4,0);
    ctx.fillStyle='#1a1a1a'; roundedBlob(ctx,25,-2,1.6,1.6,0);
    ctx.fillStyle='#111'; roundedBlob(ctx,15,-4,1.3,1.4,0);
  } else if(id==='orca'){
    ctx.fillStyle='#131320'; roundedBlob(ctx,0,0,26,13,0);
    ctx.fillStyle='#f4f4f4'; roundedBlob(ctx,-4,5,14,6,0.1);
    ctx.fillStyle='#131320'; ctx.beginPath(); ctx.moveTo(-4,-14); ctx.lineTo(4,-14); ctx.lineTo(-2,2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-26,0); ctx.lineTo(-36,-8); ctx.lineTo(-34,4); ctx.fill();
    ctx.fillStyle='#fff'; roundedBlob(ctx,14,-4,2.6,3.4,0.3);
    ctx.fillStyle='#111'; roundedBlob(ctx,15,-3,1.3,1.5,0);
  } else if(id==='narwhal'){
    ctx.fillStyle='#8fa9b8'; roundedBlob(ctx,0,0,22,12,0);
    ctx.strokeStyle='#e8eef0'; ctx.lineWidth=3; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(22,-4); ctx.lineTo(44,-14); ctx.stroke();
    ctx.fillStyle='#111'; roundedBlob(ctx,14,-4,1.3,1.5,0);
    ctx.fillStyle='#6f8a9a'; ctx.beginPath(); ctx.moveTo(-22,0); ctx.lineTo(-32,-8); ctx.lineTo(-30,6); ctx.fill();
  } else if(id==='leopardseal'){
    ctx.fillStyle='#7a8a6a'; roundedBlob(ctx,0,0,24,12,0);
    ctx.fillStyle='#5f6e50';
    for(let i=0;i<6;i++){ roundedBlob(ctx,-14+i*7,-2+((i%2)*5), 2.2,2.2,0); }
    ctx.fillStyle='#eef0e6'; roundedBlob(ctx,14,3,9,6,0);
    ctx.fillStyle='#111'; roundedBlob(ctx,16,-2,1.3,1.4,0);
  }
  ctx.restore();
}

/* ---- Real viewport height fix (mobile browser chrome resizes the address
   bar, so 100vh alone is unreliable) + orientation "please rotate" hint ---- */
function setVH(){
  document.documentElement.style.setProperty('--vh', (window.innerHeight*0.01)+'px');
}
function updateRotateHint(){
  const hint = document.getElementById('rotateHint');
  if(!hint) return;
  const isMobileMode = typeof state!=='undefined' && state.platform==='mobile';
  const inGame = document.getElementById('screen-game') && document.getElementById('screen-game').classList.contains('active');
  const portrait = window.innerHeight > window.innerWidth;
  hint.classList.toggle('show', !!(isMobileMode && inGame && portrait));
}
setVH();

/* ============================= GAME ============================= */
const canvas = document.getElementById('gameCanvas');
const ctx2d = canvas.getContext('2d');
let VW=960, VH=540;
function fitCanvas(){
  const wrap = document.getElementById('gameCanvasWrap');
  const rect = wrap.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio||1, 2);
  canvas.width = Math.max(1,Math.round(rect.width*dpr)); canvas.height = Math.max(1,Math.round(rect.height*dpr));
  ctx2d.setTransform(dpr,0,0,dpr,0,0);
  VW = rect.width; VH = rect.height;
  updateRotateHint();
}
let resizeRAF=null;
function scheduleFit(){
  setVH();
  if(resizeRAF) cancelAnimationFrame(resizeRAF);
  resizeRAF = requestAnimationFrame(fitCanvas);
}
window.addEventListener('resize', scheduleFit);
window.addEventListener('orientationchange', scheduleFit);

const DIFF_PARAMS = {
  easy:    {fishSpeed:150, predSpeed:170, fishRate:0.95, obsRate:0.6,  predRate:0.42, lives:4, boneRatio:0.30, warnTime:0.85},
  medium:  {fishSpeed:195, predSpeed:225, fishRate:1.15, obsRate:0.85, predRate:0.65, lives:3, boneRatio:0.36, warnTime:0.65},
  hard:    {fishSpeed:200, predSpeed:250, fishRate:1.35, obsRate:1.1,  predRate:0.9,  lives:2, boneRatio:0.40, warnTime:0.5},
  extreme: {fishSpeed:285, predSpeed:350, fishRate:1.55, obsRate:1.35, predRate:1.2,  lives:1, boneRatio:0.46, warnTime:0.38},
  boss:    {fishSpeed:185, predSpeed:210, fishRate:1.2,  obsRate:0.85, predRate:0.6,  lives:2, boneRatio:0.36, warnTime:0.55, isBoss:true},
};

// Difficulty ramps up the longer a run lasts: capped multiplier applied to
// spawn speed & spawn rate so every level gets a "slight challenge" over time.
function getIntensity(elapsedSec){
  return 1 + Math.min(elapsedSec/70, 0.6); // up to +60% after ~70s
}

const keys = {};
window.addEventListener('keydown', e=>{
  keys[e.code]=true;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
  if(e.code==='Escape' || e.code==='KeyP'){ if(Game.running) Game.togglePause(); }
});
window.addEventListener('keyup', e=>{ keys[e.code]=false; });

/* ---------------- Touch controls (mobile mode) ---------------- */
const touch = { active:false, dx:0, dy:0, dashLeft:false, dashRight:false };
(function setupTouchControls(){
  const wrap = document.getElementById('touchControls');
  const stick = document.getElementById('touchStick');
  const knob = document.getElementById('touchStickKnob');
  const dashLeftBtn = document.getElementById('dashLeftBtn');
  const dashRightBtn = document.getElementById('dashRightBtn');
  let stickId = null, stickCenter = {x:0,y:0};
  const MAX_R = 46;

  function setEnabled(on){
    wrap.classList.toggle('active', !!on);
    touch.active = !!on;
    if(!on) resetStick();
  }
  function resetStick(){
    touch.dx=0; touch.dy=0;
    knob.style.transform = 'translate(-50%,-50%)';
    stick.classList.remove('engaged');
  }
  function stickStart(e){
    const t = e.changedTouches ? e.changedTouches[0] : e;
    stickId = t.identifier===undefined ? 'mouse' : t.identifier;
    const r = stick.getBoundingClientRect();
    stickCenter = {x:r.left+r.width/2, y:r.top+r.height/2};
    stick.classList.add('engaged');
    stickMove(e);
    e.preventDefault();
  }
  function stickMove(e){
    if(stickId===null) return;
    let t = e;
    if(e.changedTouches){
      t = Array.from(e.changedTouches).find(ct=>ct.identifier===stickId);
      if(!t) return;
    }
    let dx = t.clientX - stickCenter.x, dy = t.clientY - stickCenter.y;
    const dist = Math.hypot(dx,dy);
    if(dist>MAX_R){ dx = dx/dist*MAX_R; dy = dy/dist*MAX_R; }
    knob.style.transform = `translate(${dx-26}px, ${dy-26}px)`;
    touch.dx = dx/MAX_R; touch.dy = dy/MAX_R;
    e.preventDefault();
  }
  function stickEnd(e){
    if(e.changedTouches){
      const still = Array.from(e.changedTouches).some(ct=>ct.identifier===stickId);
      if(!still) return;
    }
    stickId = null;
    resetStick();
    e.preventDefault();
  }
  stick.addEventListener('touchstart', stickStart, {passive:false});
  stick.addEventListener('touchmove', stickMove, {passive:false});
  stick.addEventListener('touchend', stickEnd, {passive:false});
  stick.addEventListener('touchcancel', stickEnd, {passive:false});
  stick.addEventListener('mousedown', stickStart);
  window.addEventListener('mousemove', e=>{ if(stickId==='mouse') stickMove(e); });
  window.addEventListener('mouseup', e=>{ if(stickId==='mouse') stickEnd(e); });

  function bindDash(btn, prop){
    const on = e=>{ touch[prop]=true; btn.classList.add('pressed'); e.preventDefault(); };
    const off = e=>{ touch[prop]=false; btn.classList.remove('pressed'); e.preventDefault(); };
    btn.addEventListener('touchstart', on, {passive:false});
    btn.addEventListener('touchend', off, {passive:false});
    btn.addEventListener('touchcancel', off, {passive:false});
    btn.addEventListener('mousedown', on);
    btn.addEventListener('mouseup', off);
    btn.addEventListener('mouseleave', off);
  }
  bindDash(dashLeftBtn,'dashLeft');
  bindDash(dashRightBtn,'dashRight');

  touch.setEnabled = setEnabled;
})();

function rand(a,b){ return a+Math.random()*(b-a); }
function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

const Game = (function(){
  let running=false, paused=false, rafId=null, lastT=0;
  let players=[], fishes=[], bones=[], obstacles=[], predators=[], powerups=[], particles=[];
  let scoreP1=0, elapsed=0, params=null, bg=null, bosses=[];
  let spawnTimers={fish:0, obs:0, pred:0, pu:0};
  let ended=false;

  function initBG(){
    bg = { bubbles:[], floes:[] };
    for(let i=0;i<26;i++) bg.bubbles.push({x:rand(0,VW), y:rand(0,VH), r:rand(2,6), sp:rand(10,26), drift:rand(-8,8)});
    for(let i=0;i<5;i++) bg.floes.push({x:rand(0,VW), y:rand(30,VH-30), w:rand(60,140), sp:rand(14,26)});
  }

  function makePlayer(idx, preyId, x){
    return {idx, preyId, x, y:VH/2 + (idx===1?-40:40), targetY:VH/2, vy:0, r:22, alive:true,
      shield:false, shieldT:0, magnetT:0, slowT:0, multT:0, invulnT:0.8, bob:Math.random()*10};
  }

  function start(){
    ended=false;
    params = DIFF_PARAMS[state.difficulty];
    show('screen-game');
    fitCanvas(); initBG();
    players=[]; fishes=[]; bones=[]; obstacles=[]; predators=[]; powerups=[]; particles=[]; bosses=[];
    scoreP1=0; elapsed=0;
    spawnTimers={fish:0.4, obs:1.2, pred:1.6, pu:4};
    players.push(makePlayer(1, state.preyP1, VW*0.16));
    players.forEach(p=>p.lives=params.lives);
    updateHUDStatic();
    running=true; paused=false;
    lastT = performance.now();
    Audio_.startMusic('game');
    if(touch.setEnabled) touch.setEnabled(state.platform==='mobile');
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);
  }
  function stop(){ running=false; cancelAnimationFrame(rafId); Audio_.stopMusic(); if(touch.setEnabled) touch.setEnabled(false); }
  function togglePause(){
    if(!running) return;
    paused=!paused;
    if(paused){ show('screen-pause'); }
    else { show('screen-game'); lastT=performance.now(); rafId=requestAnimationFrame(loop); }
  }

  function updateHUDStatic(){
    renderLives();
  }
  function renderLives(){
    const l1 = document.getElementById('livesP1'); l1.innerHTML='';
    for(let i=0;i<params.lives;i++){ const d=document.createElement('div'); d.className='life-dot'+(i<playerLivesLeft(1)?'':' off'); l1.appendChild(d); }
  }
  function playerLivesLeft(idx){
    const p = players.find(pp=>pp.idx===idx);
    return p ? p.lives : 0;
  }

  function spawnFish(){
    const intensity = getIntensity(elapsed);
    const bad = Math.random() < params.boneRatio;
    const y = rand(50, VH-50);
    if(bad){
      bones.push({x:VW+30, y, r:14, sp:params.fishSpeed*intensity*rand(0.8,1.15), val:-(2+Math.floor(Math.random()*2)), wob:Math.random()*10});
    } else {
      fishes.push({x:VW+30, y, r:13, sp:params.fishSpeed*intensity*rand(0.8,1.2), val:1+Math.floor(Math.random()*3), wob:Math.random()*10,
        hue: pick(['#8fd9e8','#5fe1b0','#f0e090','#f0a857'])});
    }
  }
  function spawnObstacle(){
    const intensity = getIntensity(elapsed);
    const y = rand(70, VH-70);
    obstacles.push({x:VW+40, y, w:rand(34,54), h:rand(50,90), sp:params.fishSpeed*0.85*intensity});
  }
  function spawnPredator(){
    if(params.isBoss) return; // boss handled separately
    const intensity = getIntensity(elapsed);
    const fromLeft = Math.random()<0.5;
    const y = rand(60, VH-60);
    const type = pick(state.predators.length?state.predators:['orca']);
    predators.push({type, x: fromLeft ? -60 : VW+60, y, dir: fromLeft?1:-1,
      sp: params.predSpeed*intensity*rand(0.9,1.2), warn:params.warnTime, phase:'warn', w:56, h:30});
  }
  function spawnPowerup(){
    const kinds=['shield','magnet','slow','mult'];
    powerups.push({kind:pick(kinds), x:VW+30, y:rand(60,VH-60), r:15, sp:params.fishSpeed*0.9, bob:0});
  }
  function spawnBoss(slot){
    const trailGap = VW*0.26+slot*90;
    const anchor = players[0] || {x:VW*0.16, y:VH/2};
    bosses.push({slot, trailGap, x:anchor.x-trailGap, y:anchor.y, r:70-slot*3, hp:6, phase:'lurk',
      t:0, dir:-1, cool:rand(1.0,1.8), warnT:0, lungeT:0});
  }
  // Boss level: starts at 1 giant predator, adds a 2nd at 25 score, a 3rd at 50 score.
  const BOSS_SCORE_THRESHOLDS = [0, 25, 50];
  function updateBossSpawns(){
    if(elapsed<1.2) return;
    const topScore = scoreP1;
    let desired = 1;
    for(let i=0;i<BOSS_SCORE_THRESHOLDS.length;i++){ if(topScore>=BOSS_SCORE_THRESHOLDS[i]) desired=i+1; }
    while(bosses.length<desired){ spawnBoss(bosses.length); }
  }

  function loop(t){
    if(!running || paused) return;
    let dt = Math.min((t-lastT)/1000, 0.035); lastT=t;
    elapsed += dt;
    update(dt);
    draw();
    rafId = requestAnimationFrame(loop);
  }

  function update(dt){
    // background
    bg.bubbles.forEach(b=>{ b.y -= b.sp*dt; b.x += Math.sin(elapsed+b.x)* b.drift*dt; if(b.y<-10){ b.y=VH+10; b.x=rand(0,VW);} });
    bg.floes.forEach(f=>{ f.x -= f.sp*dt; if(f.x<-160) f.x=VW+rand(0,160); });

    // players
    players.forEach(p=>{
      if(!p.alive) return;
      p.invulnT = Math.max(0,p.invulnT-dt);
      p.shieldT = Math.max(0,p.shieldT-dt); p.shield = p.shieldT>0;
      p.magnetT = Math.max(0,p.magnetT-dt);
      p.multT = Math.max(0,p.multT-dt);
      const speed=280;
      const hSpeed=360; // fast forward/back dodge
      if(state.platform==='mobile'){
        // virtual joystick: analog vertical move, dash buttons for horizontal
        p.y += touch.dy*speed*dt;
        if(touch.dashLeft) p.x -= hSpeed*dt;
        if(touch.dashRight) p.x += hSpeed*dt;
        // allow slight horizontal drift from the stick too
        p.x += touch.dx*speed*0.5*dt;
      } else {
        const up=keys['ArrowUp'], down=keys['ArrowDown'], left=keys['ArrowLeft'], right=keys['ArrowRight'];
        if(up) p.y -= speed*dt;
        if(down) p.y += speed*dt;
        if(left) p.x -= hSpeed*dt;
        if(right) p.x += hSpeed*dt;
      }
      p.y = Math.max(30, Math.min(VH-30, p.y));
      p.x = Math.max(VW*0.05, Math.min(VW*0.46, p.x));
      p.bob += dt*4;
    });
    if(players.every(p=>!p.alive)){ endGame(); return; }

    const slowFactor = players.some(p=>p.slowT>0) ? 0.45 : 1;
    if(players.some(p=>p.slowT>0)) players.forEach(p=>p.slowT=Math.max(0,p.slowT-dt));

    // spawns
    const spawnIntensity = getIntensity(elapsed);
    spawnTimers.fish -= dt; if(spawnTimers.fish<=0){ spawnFish(); spawnTimers.fish = rand(0.5,0.9)/(params.fishRate*spawnIntensity); }
    spawnTimers.obs -= dt; if(spawnTimers.obs<=0){ spawnObstacle(); spawnTimers.obs = rand(1.4,2.2)/(params.obsRate*spawnIntensity); }
    if(!params.isBoss){
      spawnTimers.pred -= dt; if(spawnTimers.pred<=0){ spawnPredator(); spawnTimers.pred = rand(1.6,2.6)/(params.predRate*spawnIntensity); }
    } else {
      updateBossSpawns();
    }
    spawnTimers.pu -= dt; if(spawnTimers.pu<=0){ spawnPowerup(); spawnTimers.pu = rand(7,11); }

    // fish
    for(let i=fishes.length-1;i>=0;i--){
      const f=fishes[i]; f.x -= f.sp*slowFactor*dt; f.wob+=dt*4;
      let eaten=false;
      players.forEach(p=>{ if(!p.alive) return;
        const magnetR = p.magnetT>0?90:0;
        const d=Math.hypot(f.x-p.x, f.y-p.y);
        if(magnetR>0 && d<magnetR){ f.x += (p.x-f.x)*0.12; f.y += (p.y-f.y)*0.12; }
        if(d < f.r+p.r){ eaten=true; addScore(p, f.val); spawnParticles(f.x,f.y,f.hue,6); Audio_.sfx('eatGood'); }
      });
      if(eaten || f.x<-30) fishes.splice(i,1);
    }
    for(let i=bones.length-1;i>=0;i--){
      const b=bones[i]; b.x -= b.sp*slowFactor*dt; b.wob+=dt*4;
      let eaten=false;
      players.forEach(p=>{ if(!p.alive) return;
        const d=Math.hypot(b.x-p.x,b.y-p.y);
        if(d < b.r+p.r){ eaten=true; addScore(p,b.val); spawnParticles(b.x,b.y,'#e0e0e0',6); Audio_.sfx('eatBad'); }
      });
      if(eaten || b.x<-30) bones.splice(i,1);
    }
    // obstacles (glaciers) - vertical dodge, damages on hit
    for(let i=obstacles.length-1;i>=0;i--){
      const o=obstacles[i]; o.x -= o.sp*slowFactor*dt;
      players.forEach(p=>{
        if(!p.alive || p.invulnT>0) return;
        if(Math.abs(o.x-p.x)<o.w/2+p.r*0.7 && Math.abs(o.y-p.y)<o.h/2+p.r*0.7){
          if(p.shield){ p.shield=false; p.shieldT=0; p.invulnT=1.0; spawnParticles(p.x,p.y,'#8fd9e8',10); Audio_.sfx('shield'); }
          else damagePlayer(p, false);
        }
      });
      if(o.x < -80) obstacles.splice(i,1);
    }
    // predators
    for(let i=predators.length-1;i>=0;i--){
      const pr=predators[i];
      if(pr.phase==='warn'){
        pr.warn -= dt;
        if(pr.warn<=0){ pr.phase='charge'; Audio_.sfx('warn'); }
      } else {
        pr.x += pr.dir * pr.sp * slowFactor * dt;
        players.forEach(p=>{
          if(!p.alive || p.invulnT>0) return;
          if(Math.abs(pr.x-p.x)<pr.w/2+p.r*0.75 && Math.abs(pr.y-p.y)<pr.h/2+p.r*0.75){
            if(p.shield){ p.shield=false; p.shieldT=0; p.invulnT=1.0; spawnParticles(p.x,p.y,'#8fd9e8',10); Audio_.sfx('shield'); }
            else damagePlayer(p, true);
          }
        });
        if(pr.x < -100 || pr.x > VW+100) predators.splice(i,1);
      }
    }
    // boss(es) — shadow the prey closely, then surprise-lunge straight at their exact spot
    if(params.isBoss){
      const bIntensity = getIntensity(elapsed);
      bosses.forEach(boss=>{
        boss.t += dt;
        let target=null, bestD=Infinity;
        players.forEach(p=>{ if(!p.alive) return; const d=Math.hypot(p.x-boss.x,p.y-boss.y); if(d<bestD){bestD=d; target=p;} });

        if(boss.phase==='lurk'){
          // trails right behind the prey's exact position — moves the instant they move
          if(target){
            const desiredX = target.x - boss.trailGap;
            const followRate = Math.min(1, dt*3.2*bIntensity);
            boss.x += (desiredX-boss.x)*followRate;
            boss.y += (target.y-boss.y)*followRate;
          }
          boss.y = Math.max(40, Math.min(VH-40, boss.y));
          boss.dir = -1;
          boss.cool -= dt;
          if(boss.cool<=0){ boss.phase='warn'; boss.warnT=0.3; boss.lungeTx=target?target.x:boss.x; boss.lungeTy=target?target.y:boss.y; Audio_.sfx('warn'); }
        } else if(boss.phase==='warn'){
          // brief telegraph right before the ambush — short on purpose, it's a surprise
          boss.warnT -= dt;
          boss.dir = 1;
          if(boss.warnT<=0){ boss.phase='lunge'; boss.lungeT=0.5; }
        } else if(boss.phase==='lunge'){
          // homes in on the prey's live position — a true strike at their exact spot
          const spd = 480*bIntensity;
          const dx = (target?target.x:boss.lungeTx)-boss.x, dy=(target?target.y:boss.lungeTy)-boss.y;
          const dist = Math.hypot(dx,dy)||1;
          boss.x += dx/dist*spd*dt;
          boss.y += dy/dist*spd*dt;
          boss.dir = dx<0 ? -1 : 1;
          boss.lungeT -= dt;
          if(boss.lungeT<=0 || dist<20) boss.phase='retreat';
        } else if(boss.phase==='retreat'){
          // peels off after the strike, then resumes trailing at a safe distance
          if(target){
            const d = Math.hypot(target.x-boss.trailGap-boss.x, target.y-boss.y);
            boss.x += (target.x-boss.trailGap-boss.x)*Math.min(1,dt*1.6*bIntensity);
            boss.y += (target.y-boss.y)*Math.min(1,dt*1.6*bIntensity);
            boss.dir = -1;
            if(d<24){ boss.phase='lurk'; boss.cool = rand(1.3,2.2)/bIntensity; }
          } else { boss.phase='lurk'; boss.cool = rand(1.3,2.2)/bIntensity; }
        }

        players.forEach(p=>{
          if(!p.alive || p.invulnT>0) return;
          const d=Math.hypot(boss.x-p.x, boss.y-p.y);
          if(d < boss.r*0.8+p.r*0.7){
            if(p.shield){ p.shield=false; p.shieldT=0; p.invulnT=1.0; spawnParticles(p.x,p.y,'#8fd9e8',10); Audio_.sfx('shield'); }
            else damagePlayer(p,true);
          }
        });
      });
    }
    // powerups
    for(let i=powerups.length-1;i>=0;i--){
      const pu=powerups[i]; pu.x -= pu.sp*dt; pu.bob+=dt*3;
      let taken=false;
      players.forEach(p=>{ if(!p.alive) return;
        const d=Math.hypot(pu.x-p.x, pu.y-p.y);
        if(d < pu.r+p.r){ taken=true; applyPowerup(p, pu.kind); Audio_.sfx('powerup'); }
      });
      if(taken || pu.x<-30) powerups.splice(i,1);
    }
    // particles
    for(let i=particles.length-1;i>=0;i--){ const pt=particles[i]; pt.x+=pt.vx*dt; pt.y+=pt.vy*dt; pt.life-=dt; if(pt.life<=0) particles.splice(i,1); }

    updateChips();
    renderLives();
    document.getElementById('scoreP1').textContent = scoreP1;
  }

  function addScore(p, val){
    const mult = p.multT>0?2:1;
    scoreP1 = Math.max(0, scoreP1 + val*mult);
  }
  function damagePlayer(p, fatal){
    p.invulnT = 1.0;
    p.lives -= 1;
    spawnParticles(p.x,p.y,'#e85b5b',14);
    Audio_.sfx('hit');
    flashWarn(p.x,p.y);
    if(p.lives<=0 || fatal && params.lives===1){ p.lives=0; p.alive=false; }
    if(players.every(pp=>!pp.alive)) endGame();
  }
  function flashWarn(x,y){
    const el=document.getElementById('warnFlash');
    el.style.setProperty('--wx', (x/VW*100)+'%'); el.style.setProperty('--wy',(y/VH*100)+'%');
    el.style.opacity='1'; setTimeout(()=>{el.style.opacity='0';},180);
  }
  function applyPowerup(p, kind){
    if(kind==='shield'){ p.shield=true; p.shieldT=8; }
    else if(kind==='magnet'){ p.magnetT=6; }
    else if(kind==='slow'){ p.slowT=5; }
    else if(kind==='mult'){ p.multT=8; }
  }
  function updateChips(){
    const anyP = idx => players.find(p=>p.idx===idx);
    const p1 = anyP(1);
    document.getElementById('chip-shield').classList.toggle('active', !!(p1&&p1.shieldT>0));
    document.getElementById('chip-magnet').classList.toggle('active', !!(p1&&p1.magnetT>0));
    document.getElementById('chip-slow').classList.toggle('active', !!(p1&&p1.slowT>0));
    document.getElementById('chip-mult').classList.toggle('active', !!(p1&&p1.multT>0));
  }
  function spawnParticles(x,y,color,n){
    for(let i=0;i<n;i++) particles.push({x,y,vx:rand(-80,80),vy:rand(-80,80),life:rand(0.3,0.6),color});
  }

  // init lives on players when start()
  function initLives(){ players.forEach(p=>p.lives=params.lives); }

  function endGame(){
    if(ended) return; ended=true;
    running=false; cancelAnimationFrame(rafId); Audio_.stopMusic(); Audio_.sfx('gameover');
    const finalScore = scoreP1;
    if(finalScore>highScore){ highScore=finalScore; try{localStorage.setItem('icyCuisineHighScore', String(highScore));}catch(e){} }
    document.getElementById('finalScore').textContent = finalScore;
    document.getElementById('gameoverHeadline').textContent = 'Game Over';
    document.getElementById('resultLine').textContent = `Score: ${scoreP1}`;
    document.getElementById('highscoreLine').textContent = 'Best: '+highScore;
    show('screen-gameover');
  }

  /* ---------------- DRAW ---------------- */
  function draw(){
    ctx2d.clearRect(0,0,VW,VH);
    // sky/water gradient
    const grad = ctx2d.createLinearGradient(0,0,0,VH);
    grad.addColorStop(0,'#0d3a5c'); grad.addColorStop(0.5,'#0a2e4d'); grad.addColorStop(1,'#071f38');
    ctx2d.fillStyle=grad; ctx2d.fillRect(0,0,VW,VH);
    // ice floes silhouettes
    ctx2d.fillStyle='rgba(180,225,240,0.10)';
    bg.floes.forEach(f=>{ ctx2d.beginPath(); ctx2d.ellipse(f.x,f.y,f.w/2,14,0,0,Math.PI*2); ctx2d.fill(); });
    // bubbles
    ctx2d.fillStyle='rgba(220,245,255,0.35)';
    bg.bubbles.forEach(b=>{ ctx2d.beginPath(); ctx2d.arc(b.x,b.y,b.r,0,Math.PI*2); ctx2d.fill(); });

    // obstacles (glaciers)
    obstacles.forEach(o=>{
      ctx2d.save();
      const g = ctx2d.createLinearGradient(o.x-o.w/2,o.y-o.h/2,o.x+o.w/2,o.y+o.h/2);
      g.addColorStop(0,'#dff4fb'); g.addColorStop(1,'#8fc7dc');
      ctx2d.fillStyle=g;
      ctx2d.beginPath();
      ctx2d.moveTo(o.x-o.w/2,o.y-o.h/2);
      ctx2d.lineTo(o.x+o.w*0.1,o.y-o.h/2-8);
      ctx2d.lineTo(o.x+o.w/2,o.y-o.h/2+6);
      ctx2d.lineTo(o.x+o.w/2-4,o.y+o.h/2);
      ctx2d.lineTo(o.x-o.w/2+6,o.y+o.h/2+6);
      ctx2d.closePath(); ctx2d.fill();
      ctx2d.strokeStyle='rgba(255,255,255,.5)'; ctx2d.lineWidth=1.5; ctx2d.stroke();
      ctx2d.restore();
    });

    // fish
    fishes.forEach(f=>{ drawFish(f.x,f.y+Math.sin(f.wob)*3,f.hue,f.val); });
    bones.forEach(b=>{ drawBone(b.x,b.y+Math.sin(b.wob)*3); });
    // powerups
    powerups.forEach(pu=>{ drawPowerupIcon(pu); });

    // predator warning telegraphs
    predators.forEach(pr=>{
      if(pr.phase==='warn'){
        const edgeX = pr.dir===1 ? 30 : VW-30;
        ctx2d.save();
        ctx2d.globalAlpha = 0.5+0.4*Math.sin(elapsed*20);
        ctx2d.fillStyle='#e85b5b';
        ctx2d.beginPath(); ctx2d.moveTo(edgeX,pr.y-18); ctx2d.lineTo(edgeX+ (pr.dir*22),pr.y); ctx2d.lineTo(edgeX,pr.y+18); ctx2d.fill();
        ctx2d.restore();
        ctx2d.save(); ctx2d.strokeStyle='rgba(232,91,91,.35)'; ctx2d.lineWidth=2;
        ctx2d.beginPath(); ctx2d.moveTo(0,pr.y); ctx2d.lineTo(VW,pr.y); ctx2d.stroke(); ctx2d.restore();
      } else {
        drawPredator(ctx2d, pr.type, pr.x, pr.y, pr.dir===1?1:-1, 1.15);
      }
    });

    bosses.forEach(b=>{
      if(b.phase==='warn'){
        // short surprise telegraph at the left edge, right at the boss's lane
        ctx2d.save();
        ctx2d.globalAlpha = 0.5+0.4*Math.sin(elapsed*30);
        ctx2d.fillStyle='#e85b5b';
        ctx2d.beginPath(); ctx2d.moveTo(0,b.y-22); ctx2d.lineTo(26,b.y); ctx2d.lineTo(0,b.y+22); ctx2d.fill();
        ctx2d.restore();
        ctx2d.save(); ctx2d.strokeStyle='rgba(232,91,91,.35)'; ctx2d.lineWidth=2;
        ctx2d.beginPath(); ctx2d.moveTo(0,b.y); ctx2d.lineTo(VW,b.y); ctx2d.stroke(); ctx2d.restore();
      }
      if(b.x > -100) drawBossOrca(b); // stays hidden off-screen while lurking
    });

    // players
    players.forEach(p=>{
      if(!p.alive) return;
      const flick = p.invulnT>0 ? (Math.sin(elapsed*30)>0) : true;
      if(!flick) return;
      ctx2d.save();
      if(p.shield){
        ctx2d.strokeStyle='rgba(143,217,232,.8)'; ctx2d.lineWidth=3;
        ctx2d.beginPath(); ctx2d.arc(p.x,p.y+Math.sin(p.bob)*4,30,0,Math.PI*2); ctx2d.stroke();
      }
      drawPrey(ctx2d, p.preyId, p.x, p.y+Math.sin(p.bob)*4, 1, 1.4);
      ctx2d.restore();
    });

    // particles
    particles.forEach(pt=>{
      ctx2d.save(); ctx2d.globalAlpha = Math.max(0,pt.life/0.6); ctx2d.fillStyle=pt.color;
      ctx2d.beginPath(); ctx2d.arc(pt.x,pt.y,3,0,Math.PI*2); ctx2d.fill(); ctx2d.restore();
    });

    // vignette
    const vg = ctx2d.createRadialGradient(VW/2,VH/2,VH*0.35,VW/2,VH/2,VH*0.9);
    vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,.35)');
    ctx2d.fillStyle=vg; ctx2d.fillRect(0,0,VW,VH);
  }

  function drawFish(x,y,hue,val){
    ctx2d.save(); ctx2d.translate(x,y);
    ctx2d.fillStyle=hue;
    ctx2d.beginPath(); ctx2d.ellipse(0,0,13,8,0,0,Math.PI*2); ctx2d.fill();
    ctx2d.beginPath(); ctx2d.moveTo(-12,0); ctx2d.lineTo(-20,-7); ctx2d.lineTo(-20,7); ctx2d.fill();
    ctx2d.fillStyle='rgba(255,255,255,.6)'; ctx2d.beginPath(); ctx2d.arc(5,-2,2,0,Math.PI*2); ctx2d.fill();
    ctx2d.restore();
  }
  function drawBone(x,y){
    ctx2d.save(); ctx2d.translate(x,y); ctx2d.strokeStyle='#e6e6e0'; ctx2d.fillStyle='#e6e6e0'; ctx2d.lineWidth=5; ctx2d.lineCap='round';
    ctx2d.beginPath(); ctx2d.moveTo(-10,0); ctx2d.lineTo(10,0); ctx2d.stroke();
    [[-10,0],[10,0]].forEach(([bx,by])=>{ ctx2d.beginPath(); ctx2d.arc(bx-4,by-3,3.4,0,Math.PI*2); ctx2d.arc(bx-4,by+3,3.4,0,Math.PI*2); ctx2d.fill(); });
    ctx2d.restore();
  }
  function drawPowerupIcon(pu){
    const y = pu.y+Math.sin(pu.bob)*4;
    ctx2d.save(); ctx2d.translate(pu.x,y);
    const colors={shield:'#8fd9e8',magnet:'#e85b5b',slow:'#9b6bff',mult:'#f0e090'};
    ctx2d.fillStyle=colors[pu.kind]; ctx2d.globalAlpha=.9;
    ctx2d.beginPath(); ctx2d.arc(0,0,15,0,Math.PI*2); ctx2d.fill();
    ctx2d.fillStyle='#0b2a45'; ctx2d.font='bold 15px Arial'; ctx2d.textAlign='center'; ctx2d.textBaseline='middle';
    const glyph={shield:'S',magnet:'M',slow:'Z',mult:'x2'};
    ctx2d.fillText(glyph[pu.kind],0,1);
    ctx2d.restore();
  }
  function drawBossOrca(b){
    ctx2d.save(); ctx2d.translate(b.x,b.y);
    ctx2d.scale(b.dir===-1?-1:1,1);
    ctx2d.fillStyle='#131320';
    ctx2d.beginPath(); ctx2d.ellipse(0,0,90,44,0,0,Math.PI*2); ctx2d.fill();
    ctx2d.fillStyle='#f4f4f4'; ctx2d.beginPath(); ctx2d.ellipse(-10,16,46,20,0.1,0,Math.PI*2); ctx2d.fill();
    ctx2d.fillStyle='#131320'; ctx2d.beginPath(); ctx2d.moveTo(-6,-46); ctx2d.lineTo(10,-46); ctx2d.lineTo(-2,6); ctx2d.fill();
    ctx2d.beginPath(); ctx2d.moveTo(-90,0); ctx2d.lineTo(-118,-22); ctx2d.lineTo(-112,14); ctx2d.fill();
    ctx2d.fillStyle='#fff'; ctx2d.beginPath(); ctx2d.ellipse(46,-10,8,10,0.3,0,Math.PI*2); ctx2d.fill();
    ctx2d.fillStyle='#111'; ctx2d.beginPath(); ctx2d.arc(49,-8,4,0,Math.PI*2); ctx2d.fill();
    ctx2d.restore();
  }

  return {
    start, stop, togglePause,
    get running(){ return running; },
  };
})();

function startGame(){ Game.start(); }

/* ---------------- Screen wiring: pause / game over / hud buttons ---------------- */
document.getElementById('pauseBtnGame').addEventListener('click', ()=>{ Audio_.sfx('click'); Game.togglePause(); });
document.getElementById('resumeBtn').addEventListener('click', ()=>{ Audio_.sfx('click'); Game.togglePause(); });
document.getElementById('restartFromPause').addEventListener('click', ()=>{ Audio_.sfx('click'); Game.start(); });
document.getElementById('quitBtn').addEventListener('click', ()=>{ Audio_.sfx('click'); Game.stop(); Audio_.startMusic('title'); show('screen-title'); });
document.getElementById('retryBtn').addEventListener('click', ()=>{ Audio_.sfx('click'); Game.start(); });
document.getElementById('menuBtn').addEventListener('click', ()=>{ Audio_.sfx('click'); show('screen-title'); });

/* ---------------- Boot ---------------- */
setVH();
fitCanvas();
Audio_.startMusic('title');
show('screen-title');

})();

