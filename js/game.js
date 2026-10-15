"use strict";
/* =====================================================================
   GAME — the main loop: spawning, movement, collisions and drawing.
   Works for one player, or two players sharing a keyboard.
   ===================================================================== */
const Game = (function(){
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const $id = id => document.getElementById(id);
  const hud = {flash: $id('warnFlash'), countdown: $id('countdown'), banner: $id('waveBanner')};
  const PLAYER_COLORS = ['#5fe1b0', '#f0a857']; // P1 green, P2 amber (labels in 2-player)

  let VW = 960, VH = 540;
  let running = false, paused = false, ended = false, rafId = null, lastT = 0;
  let players = [], params = null, setup = null;
  let anim = 0;                        // always-running clock for character animation
  let fishes = [], bones = [], puffers = [], obstacles = [], predators = [], bosses = [], powerups = [], particles = [], floaters = [];
  let elapsed = 0, wave = 1, shownWave = -1, achievementTimer = 0;
  let timers = {fish:0, obs:0, pred:0, pu:0};
  let shake = 0;                       // screen-shake strength in px, fades out
  const COUNT_STEP = 0.7;              // seconds per "3", "2", "1"
  let countdownT = 0, goT = 0, shownCount = null, bannerTimer = null;

  const twoPlayer = ()=>players.length>1;
  const alivePlayers = ()=>players.filter(p=>p.alive);
  const anyPlayer = key=>players.some(p=>p.alive && p[key]>0);   // world-wide power-ups (slow, freeze)
  const topScore = ()=>Math.max(...players.map(p=>p.score));

  /* ---------------- Canvas sizing ---------------- */
  function fitCanvas(){
    const rect = $id('gameCanvasWrap').getBoundingClientRect();
    if(rect.width===0 || rect.height===0) return; // game screen hidden (menu/pause) — keep last size
    const dpr = Math.min(window.devicePixelRatio||1, 2);
    canvas.width = Math.round(rect.width*dpr);
    canvas.height = Math.round(rect.height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    VW = rect.width; VH = rect.height;
  }

  /* ---------------- Lifecycle ---------------- */
  /* setup = {prey, prey2?, predators, difficulty, twist?, daily?} — see menus.js.
     A prey2 means two players. */
  function start(newSetup){
    if(newSetup) setup = newSetup;
    params = applyTwist(DIFF_PARAMS[setup.difficulty], setup.twist);
    show('screen-game');
    fitCanvas();
    Scenery.init(VW, VH);

    const preyIds = setup.prey2 ? [setup.prey, setup.prey2] : [setup.prey];
    players = preyIds.map((id, i)=>makePlayer(id, i, preyIds.length));
    buildHud();

    fishes = []; bones = []; puffers = []; obstacles = []; predators = []; bosses = [];
    powerups = []; particles = []; floaters = [];
    elapsed = 0; wave = 1; shownWave = -1; shake = 0; anim = 0; achievementTimer = 0;
    countdownT = COUNT_STEP*3; goT = 0; shownCount = null;
    timers = {fish:0.4, obs:1.2, pred:1.6, pu:4};
    ended = false; running = true; paused = false;
    hideBanner();

    Input.clear();
    Input.setTouchEnabled(state.platform==='mobile' && !twoPlayer());
    Sound.startMusic('game');
    lastT = performance.now();
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);
  }

  function makePlayer(preyId, index, count){
    const prey = findById(PREY_TYPES, preyId);
    const maxLives = params.lives + prey.stats.bonusLives;
    const p = {
      index, preyId: prey.id, stats: prey.stats, r: prey.stats.radius,
      control: count===1 ? 'solo' : (index===0 ? 'p1' : 'p2'),
      color: PLAYER_COLORS[index],
      x: VW*0.16, y: count===1 ? VH/2 : VH*(index===0 ? 0.38 : 0.62),
      alive: true, lives: maxLives, maxLives, invulnT: 0, bob: Math.random()*10,
      score: 0, combo: 0, bestCombo: 0, fishEaten: 0, closeCalls: 0, bonesEaten: 0, goldenEaten: 0,
      powerupsTaken: new Set(),
    };
    Object.keys(POWERUP_STYLE).forEach(kind=>p[kind+'T'] = 0);
    return p;
  }

  function stop(){
    running = false; paused = false;
    cancelAnimationFrame(rafId);
    hideCount(); hideBanner();
    Sound.stopMusic();
    Input.setTouchEnabled(false);
  }

  function togglePause(){
    if(!running) return;
    paused = !paused;
    Input.clear();
    if(paused){
      cancelAnimationFrame(rafId);
      show('screen-pause');
    } else {
      show('screen-game');
      fitCanvas(); // the window may have been resized/rotated while paused
      lastT = performance.now();
      rafId = requestAnimationFrame(loop);
    }
  }

  function loop(t){
    if(!running || paused) return;
    const dt = Math.min((t-lastT)/1000, 0.035);
    lastT = t;
    anim += dt;
    if(countdownT>0) updateCountdown(dt);
    else { elapsed += dt; update(dt); }
    if(running) draw();
    if(running) rafId = requestAnimationFrame(loop);
  }

  /* ---------------- HUD (one panel per player) ---------------- */
  function buildHud(){
    const wrap = $id('hudPanels');
    wrap.innerHTML = '';
    players.forEach(p=>{
      const panel = document.createElement('div');
      panel.className = 'hud-panel';
      if(twoPlayer()) panel.style.setProperty('--player', p.color);
      const label = twoPlayer() ? `<span class="hud-tag">P${p.index+1}</span>` : 'Score:';
      panel.innerHTML = `<div class="hud-score">${label} <span class="hud-points"${p.index===0 ? ' id="scoreP1"' : ''}>0</span></div>
        <div class="hud-lives"></div>
        <div class="hud-meta">${p.index===0 ? '<span class="hud-wave">Wave 1</span>' : ''}<span class="hud-combo"></span></div>
        <div class="powerup-indicators"></div>`;
      const chips = {};
      Object.keys(POWERUP_STYLE).forEach(kind=>{
        const chip = document.createElement('div');
        chip.className = 'pu-chip';
        chip.style.setProperty('--chip', POWERUP_STYLE[kind].color);
        panel.querySelector('.powerup-indicators').appendChild(chip);
        chips[kind] = {el: chip, shown: ''};
      });
      wrap.appendChild(panel);
      p.hud = {
        panel, chips,
        score: panel.querySelector('.hud-points'),
        lives: panel.querySelector('.hud-lives'),
        wave: panel.querySelector('.hud-wave'),
        combo: panel.querySelector('.hud-combo'),
        shown: {score:-1, lives:-1, combo:-1, alive:true},
      };
    });
  }

  function updateHUD(){
    players.forEach(p=>{
      const h = p.hud, s = h.shown;
      if(p.score!==s.score){ h.score.textContent = p.score; s.score = p.score; }
      if(p.combo!==s.combo){
        const mult = comboMultiplier(p.combo);
        h.combo.textContent = p.combo>=2 ? `Combo ${p.combo}${mult>1 ? ' · x'+mult : ''}` : '';
        h.combo.classList.toggle('hot', mult>1);
        s.combo = p.combo;
      }
      if(p.lives!==s.lives){
        h.lives.innerHTML = '';
        for(let i=0;i<p.maxLives;i++){
          const dot = document.createElement('div');
          dot.className = 'life-dot' + (i<p.lives ? '' : ' off');
          h.lives.appendChild(dot);
        }
        s.lives = p.lives;
      }
      if(p.alive!==s.alive){ h.panel.classList.toggle('out', !p.alive); s.alive = p.alive; }
      for(const kind in h.chips){
        const t = p[kind+'T'];
        const text = t>0 ? `${POWERUP_STYLE[kind].name} ${Math.ceil(t)}s` : '';
        const chip = h.chips[kind];
        if(text!==chip.shown){ chip.el.textContent = text; chip.el.classList.toggle('active', t>0); chip.shown = text; }
      }
    });
    if(wave!==shownWave){ players[0].hud.wave.textContent = `Wave ${wave}`; shownWave = wave; }
  }

  /* ---------------- Spawning ---------------- */
  function spawnFish(){
    const speed = params.fishSpeed*getIntensity(elapsed);
    const y = rand(50, VH-50);
    const roll = Math.random();
    if(roll < params.boneRatio){
      bones.push({x:VW+30, y, r:14, sp:speed*rand(0.8,1.15), val:-(2+Math.floor(Math.random()*2)), wob:Math.random()*10});
    } else if(roll < params.boneRatio + params.pufferRatio){
      puffers.push({x:VW+30, y, sp:speed*rand(0.7,0.95), puff:0, wob:Math.random()*10});
    } else if(Math.random() < params.goldenChance){
      fishes.push({x:VW+30, y, r:15, sp:speed*GOLDEN_FISH.speedMul, val:GOLDEN_FISH.value, wob:0, golden:true, hue:'#ffcf3f'});
    } else {
      fishes.push({x:VW+30, y, r:13, sp:speed*rand(0.8,1.2), val:(1+Math.floor(Math.random()*3))*params.fishValueMul, wob:Math.random()*10,
        hue: pick(['#8fd9e8','#5fe1b0','#f0e090','#f0a857'])});
    }
  }
  function spawnObstacle(){
    obstacles.push({x:VW+40, y:rand(70,VH-70), w:rand(34,54), h:rand(50,90), sp:params.fishSpeed*0.85*getIntensity(elapsed)});
  }
  function spawnPredator(){
    const type = findById(PREDATOR_TYPES, pick(setup.predators.length ? setup.predators : ['orca']));
    const fromLeft = Math.random()<0.5;
    const y = rand(60, VH-60);
    predators.push({
      type: type.id, x: fromLeft ? -60 : VW+60, y, baseY: y, dir: fromLeft ? 1 : -1,
      sp: params.predSpeed*type.stats.speedMul*getIntensity(elapsed)*rand(0.9,1.2),
      w: type.stats.w, h: type.stats.h, weave: type.stats.weave, age: Math.random()*6, seed: Math.random()*10,
      warn: params.warnTime, phase:'warn', hitBy: new Set(), scoredBy: new Set(),
    });
  }
  function spawnPowerup(){
    powerups.push({kind:pick(Object.keys(POWERUP_STYLE)), x:VW+30, y:rand(60,VH-60), r:15, sp:params.fishSpeed*0.9, bob:0});
  }
  function spawnBoss(slot){
    const trailGap = VW*0.26 + slot*90;
    const type = setup.predators[slot % setup.predators.length] || 'orca';
    const anchor = alivePlayers()[0] || players[0];
    bosses.push({slot, type, trailGap, x:anchor.x-trailGap, y:anchor.y, r:70-slot*3,
      phase:'lurk', dir:-1, cool:rand(1.0,1.8), warnT:0, lungeT:0, minDist:Infinity, hit:false, target:null});
  }
  function updateBossSpawns(){
    if(elapsed<1.2) return;
    const wanted = BOSS_SCORE_THRESHOLDS.filter(s=>topScore()>=s).length;
    while(bosses.length<wanted) spawnBoss(bosses.length);
  }

  /* ---------------- Countdown "3, 2, 1, Go!" ---------------- */
  // Players can already swim around, but nothing spawns or moves yet.
  function updateCountdown(dt){
    countdownT -= dt;
    updateBackground(dt);
    players.forEach(p=>movePlayer(p, dt));
    updateEffects(dt);
    if(countdownT<=0){ countdownT = 0; goT = 0.6; showCount('Go!'); Sound.sfx('go'); }
    else {
      const n = Math.ceil(countdownT/COUNT_STEP);
      if(n!==shownCount){ showCount(String(n)); Sound.sfx('count'); }
    }
    updateHUD();
  }
  function showCount(text){
    shownCount = text === 'Go!' ? null : Number(text);
    const el = hud.countdown;
    el.textContent = text;
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); // restart the CSS animation
  }
  function hideCount(){ hud.countdown.textContent = ''; hud.countdown.classList.remove('pop'); }

  /* ---------------- Waves ---------------- */
  function checkWave(){
    const w = waveAt(elapsed);
    if(w===wave) return;
    wave = w;
    const bonus = WAVE_BONUS*(wave-1);
    alivePlayers().forEach(p=>p.score += bonus);
    showBanner(`Wave ${wave}`, `+${bonus} bonus · the water gets rougher`);
    Sound.sfx('wave');
  }
  function showBanner(title, sub){
    hud.banner.querySelector('.wave-title').textContent = title;
    hud.banner.querySelector('.wave-sub').textContent = sub;
    hud.banner.classList.remove('show'); void hud.banner.offsetWidth; hud.banner.classList.add('show');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(hideBanner, 2400);
  }
  function hideBanner(){ clearTimeout(bannerTimer); hud.banner.classList.remove('show'); }

  /* ---------------- Update ---------------- */
  function updateBackground(dt){ Scenery.update(dt, anim); }

  function movePlayer(p, dt){
    if(!p.alive) return;
    const move = Input.read(p.control);
    const boost = p.speedT>0 ? 1.5 : 1;
    p.y += move.vy*p.stats.speed*boost*dt;
    p.x += (move.dash*p.stats.dash + move.drift*p.stats.speed)*boost*dt;
    p.y = clamp(p.y, 30, VH-30);
    p.x = clamp(p.x, VW*0.05, VW*0.46);
    p.bob += dt*4;
    if(p.speedT>0 && Math.random()<0.4) particles.push({x:p.x-p.r, y:p.y+rand(-8,8), vx:rand(-160,-90), vy:rand(-10,10), life:0.3, color:'#ffb36b'});
  }

  // particles, floating text and screen shake
  function updateEffects(dt){
    for(let i=particles.length-1;i>=0;i--){
      const pt = particles[i]; pt.x += pt.vx*dt; pt.y += pt.vy*dt; pt.life -= dt;
      if(pt.life<=0) particles.splice(i,1);
    }
    for(let i=floaters.length-1;i>=0;i--){
      const fl = floaters[i]; fl.y -= 38*dt; fl.life -= dt;
      if(fl.life<=0) floaters.splice(i,1);
    }
    shake = Math.max(0, shake - dt*45);
  }

  // first living player within reach(p) of the point (x, y)
  function touching(x, y, reach){
    return alivePlayers().find(p=>Math.hypot(x-p.x, y-p.y) < reach(p));
  }

  function update(dt){
    const intensity = getIntensity(elapsed);
    if(goT>0){ goT -= dt; if(goT<=0) hideCount(); }
    checkWave();
    updateBackground(dt);

    players.forEach(p=>{
      p.invulnT = Math.max(0, p.invulnT-dt);
      for(const kind in POWERUP_STYLE) p[kind+'T'] = Math.max(0, p[kind+'T']-dt);
    });
    // Slow-mo and Freeze affect the whole sea, whoever picked them up
    const slow = anyPlayer('slowT') ? 0.45 : 1;
    const frozen = anyPlayer('freezeT');

    players.forEach(p=>movePlayer(p, dt));

    // spawns
    timers.fish -= dt; if(timers.fish<=0){ spawnFish(); timers.fish = rand(0.5,0.9)/(params.fishRate*intensity); }
    timers.obs  -= dt; if(timers.obs<=0){ spawnObstacle(); timers.obs = rand(1.4,2.2)/(params.obsRate*intensity); }
    if(params.isBoss) updateBossSpawns();
    else if(!frozen){ timers.pred -= dt; if(timers.pred<=0){ spawnPredator(); timers.pred = rand(1.6,2.6)/(params.predRate*intensity); } }
    timers.pu -= dt; if(timers.pu<=0){ spawnPowerup(); timers.pu = rand(7,11)*params.powerupEvery; }

    // good fish (a magnet pulls them toward its owner)
    for(let i=fishes.length-1;i>=0;i--){
      const f = fishes[i]; f.x -= f.sp*slow*dt; f.wob += dt*4;
      if(f.golden && Math.random()<0.3) particles.push({x:f.x-12, y:f.y+rand(-6,6), vx:rand(-40,-10), vy:rand(-20,20), life:0.4, color:'#ffe27a'});
      const puller = alivePlayers().find(p=>p.magnetT>0 && Math.hypot(f.x-p.x, f.y-p.y)<90);
      if(puller){ f.x += (puller.x-f.x)*0.12; f.y += (puller.y-f.y)*0.12; }
      const eater = touching(f.x, f.y, p=>f.r+p.r);
      if(eater){ eatFish(eater, f); fishes.splice(i,1); }
      else if(f.x<-30) fishes.splice(i,1);
    }
    // bones — break your combo
    for(let i=bones.length-1;i>=0;i--){
      const b = bones[i]; b.x -= b.sp*slow*dt; b.wob += dt*4;
      const eater = touching(b.x, b.y, p=>b.r+p.r);
      if(eater){
        addPoints(eater, b.val, b.x, b.y);
        eater.bonesEaten++;
        breakCombo(eater);
        spawnParticles(b.x,b.y,'#e0e0e0',6); Sound.sfx('eatBad'); bones.splice(i,1);
      }
      else if(b.x<-30) bones.splice(i,1);
    }
    // pufferfish — puff up when anyone gets close; touching one hurts
    for(let i=puffers.length-1;i>=0;i--){
      const pf = puffers[i]; pf.x -= pf.sp*slow*dt; pf.wob += dt*3;
      const near = alivePlayers().some(p=>Math.hypot(pf.x-p.x, pf.y-p.y)<130);
      pf.puff = clamp(pf.puff + (near ? dt*5 : -dt*2), 0, 1);
      const victim = touching(pf.x, pf.y, p=>11+pf.puff*12 + p.r*0.75);
      if(victim){
        spawnParticles(pf.x,pf.y,'#f5f0d6',10);
        hitPlayer(victim, false);
        puffers.splice(i,1);
      }
      else if(pf.x<-40) puffers.splice(i,1);
    }
    // glaciers
    for(let i=obstacles.length-1;i>=0;i--){
      const o = obstacles[i]; o.x -= o.sp*slow*dt;
      alivePlayers().forEach(p=>{
        if(Math.abs(o.x-p.x)<o.w/2+p.r*0.7 && Math.abs(o.y-p.y)<o.h/2+p.r*0.7) hitPlayer(p, false);
      });
      if(o.x<-80) obstacles.splice(i,1);
    }
    // predators: flash a warning, then charge across their lane (Freeze stops them dead)
    for(let i=predators.length-1;i>=0;i--){
      const pr = predators[i];
      if(frozen) continue;
      if(pr.phase==='warn'){
        pr.warn -= dt;
        if(pr.warn<=0){ pr.phase='charge'; Sound.sfx('warn'); }
        continue;
      }
      const before = players.map(p=>pr.x - p.x);
      pr.age += dt;
      pr.x += pr.dir*pr.sp*slow*dt;
      if(pr.weave) pr.y = clamp(pr.baseY + Math.sin(pr.age*3.2)*pr.weave, 30, VH-30);
      alivePlayers().forEach(p=>{
        const gapY = Math.abs(pr.y-p.y) - (pr.h/2 + p.r*0.75);
        if(Math.abs(pr.x-p.x)<pr.w/2+p.r*0.75 && gapY<0){ pr.hitBy.add(p.index); hitPlayer(p, true); }
        // close call: it swept past by a whisker
        else if(!pr.scoredBy.has(p.index) && !pr.hitBy.has(p.index)
          && Math.sign(before[p.index])!==Math.sign(pr.x-p.x) && gapY>=0 && gapY<CLOSE_CALL.margin){
          pr.scoredBy.add(p.index);
          closeCall(p, CLOSE_CALL.points);
        }
      });
      if(pr.x<-100 || pr.x>VW+100) predators.splice(i,1);
    }
    if(params.isBoss && !frozen) updateBosses(dt, intensity, slow);
    // powerups
    for(let i=powerups.length-1;i>=0;i--){
      const pu = powerups[i]; pu.x -= pu.sp*dt; pu.bob += dt*3;
      const taker = touching(pu.x, pu.y, p=>pu.r+p.r);
      if(taker){
        taker[pu.kind+'T'] = POWERUP_DURATIONS[pu.kind];
        taker.powerupsTaken.add(pu.kind);
        addFloater(pu.x, pu.y-10, POWERUP_STYLE[pu.kind].name+'!', POWERUP_STYLE[pu.kind].color);
        Sound.sfx(pu.kind==='freeze' ? 'freeze' : 'powerup');
        powerups.splice(i,1);
      }
      else if(pu.x<-30) powerups.splice(i,1);
    }
    updateEffects(dt);
    updateHUD();

    // achievements are for solo runs; checked twice a second so they pop up mid-run
    if(!twoPlayer()){
      achievementTimer -= dt;
      if(achievementTimer<=0){ achievementTimer = 0.5; Progress.check(runStats(players[0])).forEach(announceAchievement); }
    }
  }

  function runStats(p){
    return {score:p.score, wave, elapsed, fishEaten:p.fishEaten, bestCombo:p.bestCombo, closeCalls:p.closeCalls,
      bonesEaten:p.bonesEaten, goldenEaten:p.goldenEaten, powerupsTaken:[...p.powerupsTaken],
      difficulty:setup.difficulty, daily:!!setup.daily, finished:false};
  }
  function announceAchievement(a){
    const reward = a.unlocks ? ` — unlocked ${findById(PREY_TYPES.concat(PREDATOR_TYPES), a.unlocks).name}!` : '';
    toast(`<span class="toast-icon">${a.icon}</span><span><b>${a.name}</b><br>${a.desc}${reward}</span>`);
    Sound.sfx('achievement');
  }

  // Bosses shadow the nearest prey, then surprise-lunge at their exact spot.
  function updateBosses(dt, intensity, slow){
    bosses.forEach(boss=>{
      // pick the closest living player as the target
      let p = null, bestD = Infinity;
      alivePlayers().forEach(pl=>{ const d = Math.hypot(pl.x-boss.x, pl.y-boss.y); if(d<bestD){ bestD = d; p = pl; } });
      if(!p) return;
      const reach = boss.r*0.8 + p.r*0.7;
      if(boss.phase==='lurk'){
        const rate = Math.min(1, dt*3.2*intensity*slow);
        boss.x += (p.x-boss.trailGap-boss.x)*rate;
        boss.y += (p.y-boss.y)*rate;
        boss.y = clamp(boss.y, 40, VH-40);
        boss.dir = -1;
        boss.cool -= dt*slow;
        if(boss.cool<=0){ boss.phase='warn'; boss.warnT=0.3; Sound.sfx('warn'); }
      } else if(boss.phase==='warn'){
        boss.warnT -= dt;
        boss.dir = 1;
        if(boss.warnT<=0){ boss.phase='lunge'; boss.lungeT=0.5; boss.minDist=Infinity; boss.hit=false; boss.target=p; }
      } else if(boss.phase==='lunge'){
        const spd = 480*intensity*slow;
        const dx = p.x-boss.x, dy = p.y-boss.y;
        const dist = Math.hypot(dx,dy) || 1;
        boss.x += dx/dist*spd*dt;
        boss.y += dy/dist*spd*dt;
        boss.dir = dx<0 ? -1 : 1;
        boss.minDist = Math.min(boss.minDist, Math.hypot(boss.x-p.x, boss.y-p.y));
        boss.lungeT -= dt;
        if(boss.lungeT<=0 || dist<20){
          boss.phase='retreat';
          if(!boss.hit && boss.target && boss.target.alive && boss.minDist-reach < CLOSE_CALL.margin*1.5) closeCall(boss.target, CLOSE_CALL.bossPoints);
        }
      } else if(boss.phase==='retreat'){
        const tx = p.x-boss.trailGap, rate = Math.min(1, dt*1.6*intensity*slow);
        boss.x += (tx-boss.x)*rate;
        boss.y += (p.y-boss.y)*rate;
        boss.dir = -1;
        if(Math.hypot(tx-boss.x, p.y-boss.y)<24){ boss.phase='lurk'; boss.cool = rand(1.3,2.2)/intensity; }
      }
      alivePlayers().forEach(pl=>{
        if(Math.hypot(boss.x-pl.x, boss.y-pl.y) < boss.r*0.8 + pl.r*0.7){ boss.hit = true; hitPlayer(pl, true); }
      });
    });
  }

  /* ---------------- Scoring & damage ---------------- */
  function eatFish(p, f){
    p.combo++; p.fishEaten++;
    p.bestCombo = Math.max(p.bestCombo, p.combo);
    const mult = comboMultiplier(p.combo);
    addPoints(p, f.val*mult, f.x, f.y, f.golden);
    if(mult > comboMultiplier(p.combo-1)){
      addFloater(p.x, p.y-44, `Combo x${mult}!`, '#f0a857', true);
      Sound.sfx('combo');
    }
    if(f.golden){ p.goldenEaten++; spawnParticles(f.x,f.y,'#ffcf3f',16); Sound.sfx('golden'); }
    else { spawnParticles(f.x,f.y,f.hue,6); Sound.sfx('eatGood'); }
  }

  function breakCombo(p){
    if(p.combo>=COMBO_STEP) addFloater(p.x, p.y-44, 'Combo lost', '#b7c4cc');
    p.combo = 0;
  }

  function closeCall(p, points){
    p.closeCalls++;
    p.score += points;
    addFloater(p.x, p.y-46, `Close call! +${points}`, '#9b6bff', true);
    Sound.sfx('closeCall');
  }

  // The Double power-up multiplies everything — bonuses and bone penalties alike.
  function addPoints(p, val, x, y, big){
    const points = val*(p.multT>0 ? 2 : 1);
    p.score = Math.max(0, p.score + points);
    addFloater(x, y-12, (points>0 ? '+' : '−') + Math.abs(points), points>0 ? (big ? '#ffd75a' : '#5fe1b0') : '#ff8a8a', big || Math.abs(points)>=4);
  }

  // Floating "+3" / "−2" / "Shield!" text that drifts up and fades
  function addFloater(x, y, text, color, big){
    floaters.push({x, y, text, color, size: big ? 24 : 19, life:0.9});
  }

  function addShake(px){ if(!reduceMotion()) shake = Math.max(shake, px); }

  // fatal = predator/boss bite; on 1-life levels (Extreme) that's an instant knock-out.
  function hitPlayer(p, fatal){
    if(!p.alive || p.invulnT>0) return;
    if(p.shieldT>0){
      p.shieldT = 0; p.invulnT = 1.0;
      spawnParticles(p.x,p.y,'#8fd9e8',10); Sound.sfx('shield');
      addFloater(p.x, p.y-30, 'Blocked!', '#8fd9e8'); addShake(5);
      return;
    }
    p.invulnT = 1.0;
    p.lives -= 1;
    breakCombo(p);
    spawnParticles(p.x,p.y,'#e85b5b',14);
    Sound.sfx('hit');
    flashWarn(p.x,p.y);
    addShake(12);
    addFloater(p.x, p.y-30, '−1 ♥', '#ff8a8a', true);
    if(p.lives<=0 || (fatal && params.lives===1)){
      p.lives = 0; p.alive = false;
      if(twoPlayer() && alivePlayers().length) addFloater(p.x, p.y-60, `P${p.index+1} is out!`, p.color, true);
      if(!alivePlayers().length) endGame();
    }
  }

  function flashWarn(x,y){
    hud.flash.style.setProperty('--wx', (x/VW*100)+'%');
    hud.flash.style.setProperty('--wy', (y/VH*100)+'%');
    hud.flash.style.opacity = '1';
    setTimeout(()=>{ hud.flash.style.opacity = '0'; }, 180);
  }

  function spawnParticles(x,y,color,n){
    for(let i=0;i<n;i++) particles.push({x, y, vx:rand(-80,80), vy:rand(-80,80), life:rand(0.3,0.6), color});
  }

  function endGame(){
    if(ended) return;
    ended = true;
    updateHUD();
    stop();
    Sound.sfx('gameover');
    const level = findById(DIFFICULTIES, setup.difficulty);
    const statsLine = p=>`${p.fishEaten} fish · best combo ${p.bestCombo} · ${p.closeCalls} close call${p.closeCalls===1?'':'s'}`;

    if(twoPlayer()){
      const [a, b] = players;
      const names = players.map(p=>findById(PREY_TYPES, p.preyId).name);
      $id('gameoverHeadline').textContent = a.score===b.score ? "It's a tie!" : `Player ${a.score>b.score ? 1 : 2} wins!`;
      $id('finalScore').textContent = `${a.score} – ${b.score}`;
      $id('resultLine').textContent = `${level.name} · ${names[0]} vs ${names[1]} · reached wave ${wave}`;
      $id('runStats').textContent = `P1: ${statsLine(a)}\nP2: ${statsLine(b)}`;
      $id('highscoreLine').textContent = 'Two-player match';
      $id('newBestBadge').classList.add('hidden');
      $id('shareDailyBtn').classList.add('hidden');
      show('screen-gameover');
      return;
    }

    const p = players[0];
    let newBest, bestText;
    if(setup.daily){
      const before = Progress.dailyBest();
      newBest = p.score>before;
      bestText = `Today's best: ${Math.max(before, p.score)}`;
    } else {
      const result = HighScore.submit(level.id, p.score);
      newBest = result.isNew;
      bestText = `Best on ${level.name}: ${result.best}`;
    }
    newBest = newBest && p.score>0;
    Progress.finishRun(runStats(p)).forEach(announceAchievement);

    $id('gameoverHeadline').textContent = newBest ? 'New Best!' : 'Game Over';
    $id('finalScore').textContent = p.score;
    $id('resultLine').textContent = setup.daily
      ? `Daily challenge · ${setup.twist.name} · reached wave ${wave}`
      : `${level.name} · ${findById(PREY_TYPES, p.preyId).name} · reached wave ${wave}`;
    $id('runStats').textContent = statsLine(p);
    $id('highscoreLine').textContent = bestText;
    $id('newBestBadge').classList.toggle('hidden', !newBest);
    $id('shareDailyBtn').classList.toggle('hidden', !setup.daily);
    show('screen-gameover');
  }

  /* ---------------- Draw ---------------- */
  function draw(){
    const frozen = anyPlayer('freezeT');
    ctx.save();
    if(shake>0) ctx.translate(rand(-shake,shake), rand(-shake,shake));
    const night = Scenery.draw(ctx, VW, VH, elapsed, anim);
    // at night, creatures get a faint moonlit outline so dark ones stay visible
    const glow = night>0.35 ? (night-0.35)/0.65 : 0;
    const lit = draw=>{
      if(!glow) return draw();
      ctx.save(); ctx.shadowColor = `rgba(175,225,255,${0.85*glow})`; ctx.shadowBlur = 10*glow;
      draw(); ctx.restore();
    };

    obstacles.forEach(o=>drawGlacier(ctx, o));
    fishes.forEach(f=>{
      if(f.golden) drawGoldenFish(ctx, f.x, f.y, elapsed);
      else drawFish(ctx, f.x, f.y+Math.sin(f.wob)*3, f.hue);
    });
    puffers.forEach(pf=>drawPuffer(ctx, pf.x, pf.y+Math.sin(pf.wob)*3*(1-pf.puff), pf.puff));
    bones.forEach(b=>drawBone(ctx, b.x, b.y+Math.sin(b.wob)*3));
    powerups.forEach(pu=>drawPowerup(ctx, pu));

    predators.forEach(pr=>{
      if(pr.phase==='warn'){ if(!frozen) drawWarning(ctx, pr.dir===1 ? 30 : VW-30, pr.dir, pr.y, VW, 18, elapsed*20); }
      else {
        lit(()=>drawPredator(ctx, pr.type, pr.x, pr.y, pr.dir, 1.15, frozen ? pr.seed : anim+pr.seed));
        if(frozen) drawFrozenShell(ctx, pr.x, pr.y, pr.w*1.15, pr.h*1.15);
      }
    });
    bosses.forEach(b=>{
      if(b.phase==='warn' && !frozen) drawWarning(ctx, 0, 1, b.y, VW, 22, elapsed*30);
      if(b.x > -140){ // mostly off-screen while lurking
        b.anim = frozen ? (b.anim||0) : anim + b.slot*1.3;
        lit(()=>drawBoss(ctx, b));
        if(frozen) drawFrozenShell(ctx, b.x, b.y, 200, 70);
      }
    });

    // players (flicker while invulnerable)
    players.forEach(p=>{
      if(!p.alive || (p.invulnT>0 && Math.sin(elapsed*30)<=0)) return;
      const y = p.y+Math.sin(p.bob)*4;
      if(p.shieldT>0){
        ctx.strokeStyle='rgba(143,217,232,.8)'; ctx.lineWidth=3;
        ctx.beginPath(); ctx.arc(p.x,y,p.r+8,0,Math.PI*2); ctx.stroke();
      }
      if(p.magnetT>0){
        ctx.strokeStyle='rgba(232,91,91,.25)'; ctx.lineWidth=2; ctx.setLineDash([6,8]);
        ctx.beginPath(); ctx.arc(p.x,y,90,elapsed*2,elapsed*2+Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
      }
      lit(()=>drawPrey(ctx, p.preyId, p.x, y, 1, 1.4, anim*(p.speedT>0 ? 1.6 : 1) + p.index*0.7));
      if(twoPlayer()) drawPlayerTag(p, y);
    });

    particles.forEach(pt=>{
      ctx.save(); ctx.globalAlpha = Math.max(0,pt.life/0.6); ctx.fillStyle = pt.color;
      ctx.beginPath(); ctx.arc(pt.x,pt.y,3,0,Math.PI*2); ctx.fill(); ctx.restore();
    });

    floaters.forEach(fl=>{
      ctx.save();
      ctx.globalAlpha = Math.min(1, fl.life/0.4);
      ctx.font = `800 ${fl.size}px 'Baloo 2', 'Nunito', sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(6,18,31,.8)'; ctx.lineJoin = 'round';
      ctx.strokeText(fl.text, fl.x, fl.y);
      ctx.fillStyle = fl.color; ctx.fillText(fl.text, fl.x, fl.y);
      ctx.restore();
    });
    ctx.restore(); // end of screen shake

    // icy tint while Freeze is active, slow-mo purple tint
    if(frozen){ ctx.fillStyle='rgba(190,235,255,.08)'; ctx.fillRect(0,0,VW,VH); }
    else if(anyPlayer('slowT')){ ctx.fillStyle='rgba(155,107,255,.06)'; ctx.fillRect(0,0,VW,VH); }

    // vignette
    const vg = ctx.createRadialGradient(VW/2,VH/2,VH*0.35,VW/2,VH/2,VH*0.9);
    vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,.35)');
    ctx.fillStyle = vg; ctx.fillRect(0,0,VW,VH);
  }

  // "P1" / "P2" bubble above each player in two-player mode
  function drawPlayerTag(p, y){
    const ty = y - p.r*1.4 - 14;
    ctx.save();
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.ellipse(p.x, ty, 14, 9, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(p.x-4, ty+7); ctx.lineTo(p.x, ty+13); ctx.lineTo(p.x+4, ty+7); ctx.fill();
    ctx.fillStyle = '#0b2a45'; ctx.font = "800 11px 'Baloo 2', 'Nunito', sans-serif";
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`P${p.index+1}`, p.x, ty+1);
    ctx.restore();
  }

  return {
    start, stop, togglePause, fitCanvas,
    restart(){ start(); },
    get setup(){ return setup; },
    get running(){ return running; },
    get paused(){ return paused; },
    // read-only snapshot, handy for debugging in the browser console
    debug(){
      const p = players[0] || {};
      return {score:p.score, wave, combo:p.combo, bestCombo:p.bestCombo, fishEaten:p.fishEaten, closeCalls:p.closeCalls, elapsed,
        players: players.map(pl=>({score:pl.score, lives:pl.lives, alive:pl.alive}))};
    },
  };
})();
