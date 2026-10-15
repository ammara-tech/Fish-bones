"use strict";
/* =====================================================================
   MENUS — title → platform → prey → predator → difficulty → game,
   plus pause and game-over buttons.
   ===================================================================== */
const $ = id => document.getElementById(id);
function on(id, fn){ $(id).addEventListener('click', fn); }

function backToTitle(){
  Game.stop();
  Sound.startMusic('title');
  show('screen-title');
}

/* ---- Mute (title screen + in-game buttons stay in sync) ---- */
function toggleMute(){
  const muted = Sound.toggleMute();
  document.querySelectorAll('.mute-toggle').forEach(btn=>{
    btn.textContent = muted ? '🔇' : '🔊';
    btn.title = (muted ? 'Unmute' : 'Mute') + (btn.id==='muteBtnGame' ? ' (M)' : '');
  });
}
document.querySelectorAll('.mute-toggle').forEach(btn=>btn.addEventListener('click', toggleMute));

/* ---- Title ---- */
on('playBtn',   ()=>{ Sound.sfx('select'); state.customMode = false; openPlatformSelect(); });
on('customBtn', ()=>{ Sound.sfx('select'); state.customMode = true;  openPlatformSelect(); });

['backFromPlatform','backFromPrey','backFromPred','backFromDiff','platformBack'].forEach(id=>on(id, backToTitle));
on('preyBack', ()=>show('screen-platform'));
on('predBack', ()=>show('screen-prey'));
on('diffBack', ()=>show('screen-predator'));

/* ---- Platform ---- */
function openPlatformSelect(){ renderPlatformCards(); show('screen-platform'); }
function renderPlatformCards(){
  $('platformDesktop').classList.toggle('selected', state.platform==='desktop');
  $('platformMobile').classList.toggle('selected', state.platform==='mobile');
}
on('platformDesktop', ()=>{ Sound.sfx('select'); state.platform='desktop'; renderPlatformCards(); });
on('platformMobile',  ()=>{ Sound.sfx('select'); state.platform='mobile';  renderPlatformCards(); });
on('platformNext',    ()=>{ Sound.sfx('click'); renderCharacterGrid('prey'); show('screen-prey'); });

/* ---- Prey & predator character cards ---- */
function characterCard(kind, item, selected, onPick){
  const card = document.createElement('div');
  card.className = 'card' + (selected ? ' selected' : '');
  card.innerHTML = `<div class="badge">✓</div><canvas width="120" height="84"></canvas>
    <div class="name">${item.name}</div><div class="tag">${item.tag}</div>`;
  card.addEventListener('click', ()=>{ Sound.sfx('select'); onPick(); });
  const canvas = card.querySelector('canvas');
  Object.assign(canvas.dataset, {kind, id:item.id, offset:Math.random()*5}); // animated by snow.js
  drawCharacterIcon(canvas, kind, item.id);
  return card;
}

function renderCharacterGrid(kind){
  const isPrey = kind==='prey';
  const grid = $(isPrey ? 'preyGrid' : 'predatorGrid');
  grid.innerHTML = '';
  (isPrey ? PREY_TYPES : PREDATOR_TYPES).forEach(item=>{
    const selected = isPrey ? state.prey===item.id : state.predators.includes(item.id);
    grid.appendChild(characterCard(kind, item, selected, ()=>{
      if(isPrey) state.prey = item.id;
      else togglePredator(item.id);
      renderCharacterGrid(kind);
    }));
  });
}

function togglePredator(id){
  if(!state.customMode){ state.predators = [id]; return; }
  if(!state.predators.includes(id)) state.predators.push(id);
  else if(state.predators.length>1) state.predators = state.predators.filter(x=>x!==id);
}

on('preyNext', ()=>{ Sound.sfx('click'); openPredatorSelect(); });

function openPredatorSelect(){
  if(!state.customMode) state.predators = [state.predators[0] || 'orca'];
  $('predTitleHeading').textContent = state.customMode ? 'Custom: Pick Any Combination' : 'Choose Your Predator';
  $('predSubDesc').textContent = state.customMode
    ? 'Tap all the hunters you want roaming the ice.'
    : 'Whoever hunts you across the ice.';
  renderCharacterGrid('predator');
  show('screen-predator');
}
on('predNext', ()=>{ Sound.sfx('click'); renderDiffGrid(); show('screen-difficulty'); });

/* ---- Difficulty ---- */
function renderDiffGrid(){
  const grid = $('diffGrid');
  grid.innerHTML = '';
  DIFFICULTIES.forEach(d=>{
    const card = document.createElement('div');
    card.className = 'diffcard' + (state.difficulty===d.id ? ' selected' : '');
    const best = HighScore.get(d.id);
    card.innerHTML = `<div class="lvl">${d.name}</div>
      <div class="stars">${'★'.repeat(d.stars)}${'☆'.repeat(5-d.stars)}</div>
      <div class="desc">${d.desc}</div>
      <div class="best">${best>0 ? 'Best: '+best : 'No score yet'}</div>`;
    card.addEventListener('click', ()=>{ Sound.sfx('select'); state.difficulty = d.id; renderDiffGrid(); });
    grid.appendChild(card);
  });
}
on('diffStart', ()=>{ Sound.sfx('click'); Game.start(); });

/* ---- How to Play ---- */
let howtoReturnTo = 'screen-title';
const HOWTO_ITEMS = [
  {title:'Fish',      info:'+1 to +3 points',             draw:c=>drawFish(c, 60, 42, '#5fe1b0')},
  {title:'Golden fish', info:'Rare & fast: +10 points',  draw:c=>drawGoldenFish(c, 62, 42, 0.3)},
  {title:'Bones',     info:'−2 or −3 points',             draw:c=>drawBone(c, 60, 42)},
  {title:'Pufferfish', info:'Spotty — puffs up when close. Don\'t touch!', draw:c=>{ drawPuffer(c, 36, 42, 0); drawPuffer(c, 88, 42, 1); }},
  {title:'Glaciers',  info:'Bump one and lose a life',    draw:c=>drawGlacier(c, {x:60, y:44, w:34, h:50})},
  {title:'Predators', info:'Red arrow shows the lane they charge', draw:c=>{
    drawWarning(c, 8, 1, 42, 120, 14, Math.PI/2);
    drawPredator(c, 'orca', 76, 42, -1, 0.9);
  }},
  ...Object.keys(POWERUP_STYLE).map(kind=>({
    title: POWERUP_STYLE[kind].name, info: POWERUP_STYLE[kind].info,
    draw: c=>drawPowerup(c, {kind, x:60, y:42, bob:0}),
  })),
];
function openHowTo(returnTo){
  howtoReturnTo = returnTo;
  const grid = $('howtoGrid');
  if(!grid.children.length){
    HOWTO_ITEMS.forEach(item=>{
      const el = document.createElement('div');
      el.className = 'howto-item';
      el.innerHTML = `<canvas width="120" height="84"></canvas><div class="name">${item.title}</div><div class="tag">${item.info}</div>`;
      item.draw(el.querySelector('canvas').getContext('2d'));
      grid.appendChild(el);
    });
  }
  show('screen-howto');
}
function closeHowTo(){ Sound.sfx('click'); show(howtoReturnTo); }
on('howtoBtn',       ()=>{ Sound.sfx('select'); openHowTo('screen-title'); });
on('howtoFromPause', ()=>{ Sound.sfx('click');  openHowTo('screen-pause'); });
on('howtoDone', closeHowTo);
on('backFromHowto', closeHowTo);

/* ---- In-game, pause & game over ---- */
on('pauseBtnGame',     ()=>{ Sound.sfx('click'); Game.togglePause(); });
on('resumeBtn',        ()=>{ Sound.sfx('click'); Game.togglePause(); });
on('restartFromPause', ()=>{ Sound.sfx('click'); Game.start(); });
on('quitBtn',          ()=>{ Sound.sfx('click'); backToTitle(); });
on('retryBtn',         ()=>{ Sound.sfx('click'); Game.start(); });
on('menuBtn',          ()=>{ Sound.sfx('click'); backToTitle(); });

window.addEventListener('keydown', e=>{
  if(e.repeat) return;
  if(e.code==='KeyM'){ toggleMute(); return; }
  if(isScreenActive('screen-howto')){ if(e.code==='Escape') closeHowTo(); return; }
  if((e.code==='Escape' || e.code==='KeyP') && Game.running) Game.togglePause();
});
// Pause automatically if the player switches tab or app.
document.addEventListener('visibilitychange', ()=>{
  if(document.hidden && Game.running && !Game.paused) Game.togglePause();
});
