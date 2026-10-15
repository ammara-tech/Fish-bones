"use strict";
/* =====================================================================
   SOUND — sound effects and a small generative music loop, all made
   with the Web Audio API (no audio files needed).
   ===================================================================== */
const Sound = (function(){
  let ctx = null, muted = false, musicTimer = null, musicGain = null, pads = null, currentKind = null;

  function ac(){
    if(!ctx){
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if(!Ctx) return null;
      ctx = new Ctx();
    }
    return ctx;
  }
  // Browsers start audio "suspended" until the player interacts with the page.
  function isLive(){ return !muted && ctx && ctx.state === 'running'; }

  function unlock(){
    const c = ac();
    if(c && c.state === 'suspended'){
      c.resume().then(()=>{ if(currentKind && !musicTimer) startMusic(currentKind); }).catch(()=>{});
    }
  }

  function tone(freq, dur, type, vol, delay, glideTo){
    if(!isLive()) return;
    const t0 = ctx.currentTime + (delay||0);
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if(glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0+dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol||0.15, t0+0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t0+dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0); osc.stop(t0+dur+0.05);
  }

  const SFX = {
    eatGood:  ()=>{ tone(880,0.09,'triangle',0.18); tone(1320,0.12,'triangle',0.13,0.05); },
    eatBad:   ()=>{ tone(160,0.16,'sawtooth',0.16); tone(110,0.2,'square',0.12,0.05); },
    powerup:  ()=>[660,880,1100,1320].forEach((f,i)=>tone(f,0.12,'triangle',0.15,i*0.06)),
    hit:      ()=>{ tone(200,0.3,'sawtooth',0.22,0,50); tone(90,0.4,'square',0.18,0.05); },
    click:    ()=>tone(500,0.05,'square',0.08),
    select:   ()=>tone(700,0.06,'triangle',0.12),
    warn:     ()=>tone(220,0.18,'square',0.12),
    shield:   ()=>{ tone(500,0.1,'sine',0.15); tone(750,0.15,'sine',0.12,0.08); },
    gameover: ()=>[400,340,280,200,140].forEach((f,i)=>tone(f,0.25,'sawtooth',0.16,i*0.12)),
  };
  function sfx(name){ if(SFX[name]) SFX[name](); }

  // Pad + pentatonic arpeggio for an icy, aurora-ish feel. kind: 'title' | 'game'
  function startMusic(kind){
    stopMusic();
    currentKind = kind;
    if(!isLive()) return; // will start on unlock()/unmute
    const game = kind === 'game';
    const now = ctx.currentTime;

    musicGain = ctx.createGain();
    musicGain.gain.setValueAtTime(0, now);
    musicGain.gain.linearRampToValueAtTime(game ? 0.10 : 0.13, now+1.2);
    musicGain.connect(ctx.destination);

    const base = game ? 110 : 98;
    const pad = ctx.createOscillator(), pad2 = ctx.createOscillator(), padGain = ctx.createGain();
    pad.frequency.value = base; pad2.frequency.value = base*1.5;
    padGain.gain.value = 0.05;
    pad.connect(padGain); pad2.connect(padGain); padGain.connect(musicGain);
    pad.start(); pad2.start();
    pads = {pad, pad2, padGain};

    const scale = game ? [220,246.9,293.7,329.6,392,440,523.3] : [261.6,293.7,329.6,392,440,523.3];
    const tempo = game ? 230 : 330;
    let step = 0;
    musicTimer = setInterval(()=>{
      if(!isLive() || !musicGain) return;
      const idx = (step*3 + (game ? Math.floor(step/2) : 0)) % scale.length;
      const freq = scale[idx] * (step%8===0 ? 0.5 : 1);
      const t = ctx.currentTime, len = tempo/1000;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = freq;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.09, t+0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t+len*0.9);
      o.connect(g).connect(musicGain);
      o.start(t); o.stop(t+len);
      step++;
    }, tempo);
  }

  function stopMusic(){
    if(musicTimer){ clearInterval(musicTimer); musicTimer = null; }
    if(pads && ctx){
      const p = pads, g = musicGain;
      try{ p.padGain.gain.setTargetAtTime(0, ctx.currentTime, 0.1); }catch(e){}
      setTimeout(()=>{ try{ p.pad.stop(); p.pad2.stop(); if(g) g.disconnect(); }catch(e){} }, 500);
    }
    pads = null; musicGain = null;
  }

  function toggleMute(){
    muted = !muted;
    if(muted) stopMusic();
    else if(currentKind) startMusic(currentKind);
    return muted;
  }

  return { sfx, startMusic, stopMusic, toggleMute, unlock, isMuted: ()=>muted };
})();
