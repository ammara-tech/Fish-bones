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

/* ---- Title ---- */
on('muteBtn', ()=>{
  const muted = Sound.toggleMute();
  $('muteBtn').textContent = muted ? '🔇' : '🔊';
  $('muteBtn').title = muted ? 'Unmute' : 'Mute';
});
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
  drawCharacterIcon(card.querySelector('canvas'), kind, item.id);
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
    card.innerHTML = `<div class="lvl">${d.name}</div>
      <div class="stars">${'★'.repeat(d.stars)}${'☆'.repeat(5-d.stars)}</div>
      <div class="desc">${d.desc}</div>`;
    card.addEventListener('click', ()=>{ Sound.sfx('select'); state.difficulty = d.id; renderDiffGrid(); });
    grid.appendChild(card);
  });
}
on('diffStart', ()=>{ Sound.sfx('click'); Game.start(); });

/* ---- In-game, pause & game over ---- */
on('pauseBtnGame',     ()=>{ Sound.sfx('click'); Game.togglePause(); });
on('resumeBtn',        ()=>{ Sound.sfx('click'); Game.togglePause(); });
on('restartFromPause', ()=>{ Sound.sfx('click'); Game.start(); });
on('quitBtn',          ()=>{ Sound.sfx('click'); backToTitle(); });
on('retryBtn',         ()=>{ Sound.sfx('click'); Game.start(); });
on('menuBtn',          ()=>{ Sound.sfx('click'); backToTitle(); });

window.addEventListener('keydown', e=>{
  if((e.code==='Escape' || e.code==='KeyP') && Game.running) Game.togglePause();
});
// Pause automatically if the player switches tab or app.
document.addEventListener('visibilitychange', ()=>{
  if(document.hidden && Game.running && !Game.paused) Game.togglePause();
});
