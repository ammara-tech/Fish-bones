"use strict";
/* =====================================================================
   MENU SNOW & LIVING CARDS — gentle snowfall over the menus, and the
   characters on the selection cards swim on the spot.
   Pauses itself during gameplay.
   ===================================================================== */
(function(){
  const canvas = document.getElementById('snowCanvas');
  const ctx = canvas.getContext('2d');
  const COUNT = 70;
  let flakes = [], W = 0, H = 0, last = performance.now();

  function resize(){
    const dpr = Math.min(window.devicePixelRatio||1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W*dpr); canvas.height = Math.round(H*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  function makeFlake(top){
    return {x:rand(0,W), y: top ? rand(-H*0.2,-5) : rand(0,H), r:rand(1,3.2), sp:rand(18,48), sway:rand(0.5,1.6), ph:rand(0,6)};
  }

  function frame(now){
    const dt = Math.min((now-last)/1000, 0.05); last = now;
    const inGame = isScreenActive('screen-game');
    canvas.style.display = inGame ? 'none' : 'block';
    if(!inGame){
      ctx.clearRect(0,0,W,H);
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      // "Reduce motion" setting: fewer, slower flakes
      const calm = reduceMotion(), SPEED = calm ? 0.35 : 1;
      (calm ? flakes.slice(0,25) : flakes).forEach(f=>{
        f.y += f.sp*SPEED*dt;
        f.x += Math.sin(now/1000*f.sway + f.ph)*12*dt*SPEED;
        if(f.y > H+5){ Object.assign(f, makeFlake(true)); }
        ctx.globalAlpha = 0.35 + f.r/5;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI*2); ctx.fill();
      });
      ctx.globalAlpha = 1;
      // characters on the visible selection cards swim on the spot
      document.querySelectorAll('.screen.active canvas[data-kind]').forEach(c=>
        drawCharacterIcon(c, c.dataset.kind, c.dataset.id, now/1000 + Number(c.dataset.offset||0))
      );
    }
    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', ()=>{ resize(); });
  resize();
  for(let i=0;i<COUNT;i++) flakes.push(makeFlake(false));
  requestAnimationFrame(frame);
})();
