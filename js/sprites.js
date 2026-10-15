"use strict";
/* =====================================================================
   SPRITES — every character and item is drawn with canvas shapes.
   All functions take the 2D context to draw on.
   ===================================================================== */

function blob(ctx, x, y, rx, ry, rot){
  ctx.save(); ctx.translate(x,y); ctx.rotate(rot||0);
  ctx.beginPath(); ctx.ellipse(0,0,rx,ry,0,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

// Eyes blink for a moment every few seconds (offset keeps characters out of sync)
function eyeOpen(t, offset){ return ((t + (offset||0)) % 3.4) < 0.13 ? 0.15 : 1; }

// Draws a filled shape rotated around a pivot point (for flippers, tails, paws)
function limb(ctx, px, py, angle, draw){
  ctx.save(); ctx.translate(px,py); ctx.rotate(angle); draw(); ctx.restore();
}

/* ---- Prey (all face right; t = animation time in seconds) ---- */
const PREY_DRAW = {
  penguin(ctx, t){
    const flap = Math.sin(t*9)*0.55, kick = Math.sin(t*11)*0.45;
    ctx.fillStyle='#0f1923';
    limb(ctx, -2,-2, 0.5+flap*0.6, ()=>blob(ctx,-4,9,4,10,0.2));           // back flipper
    ctx.fillStyle='#16222e'; blob(ctx,0,0,16,20);
    ctx.fillStyle='#eef5f7'; blob(ctx,2,4,10,14);
    ctx.fillStyle='#f0a857';
    limb(ctx, 4,16, 0.3+kick, ()=>blob(ctx,4,0,4.5,2.6));                    // feet paddle
    limb(ctx,-4,16,-0.3-kick, ()=>blob(ctx,-3,0,4.5,2.6));
    ctx.beginPath(); ctx.moveTo(14,-2); ctx.lineTo(24,0); ctx.lineTo(14,3); ctx.fill();
    ctx.fillStyle='#1d2c3b';
    limb(ctx, 1,-3, 0.35+flap, ()=>blob(ctx,-3,9,4,11,0.15));                // front flipper
    ctx.fillStyle='#fff'; blob(ctx,7,-8,2.4,2.6*eyeOpen(t));
    ctx.fillStyle='#111'; blob(ctx,8,-8,1.1,1.3*eyeOpen(t));
  },
  walrus(ctx, t){
    const paddle = Math.sin(t*6)*0.5, breathe = 1+Math.sin(t*2.5)*0.03;
    ctx.fillStyle='#6f5444';
    limb(ctx,-20,6, Math.sin(t*6+1)*0.4, ()=>{ blob(ctx,-6,-4,7,3.5,-0.4); blob(ctx,-6,4,7,3.5,0.4); }); // tail flippers
    ctx.fillStyle='#8a6d5a'; blob(ctx,0,2,22*breathe,16*breathe);
    ctx.fillStyle='#7a5f4d';
    limb(ctx,0,12, 0.4+paddle, ()=>blob(ctx,-2,6,5,9,0.2));                  // front flipper
    ctx.fillStyle='#a7876f'; blob(ctx,10,4,10,9);
    ctx.strokeStyle='#f4f4ee'; ctx.lineWidth=2.6; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(12,10); ctx.lineTo(10,20); ctx.moveTo(17,10); ctx.lineTo(19,20); ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,.5)'; ctx.lineWidth=1;                 // whiskers
    ctx.beginPath(); ctx.moveTo(18,4); ctx.lineTo(24,2); ctx.moveTo(18,6); ctx.lineTo(24,7); ctx.stroke();
    ctx.fillStyle='#241a12'; blob(ctx,8,-2,1.6,1.8*eyeOpen(t,1.1));
  },
  squid(ctx, t){
    const pulse = Math.sin(t*5);
    ctx.fillStyle='#9a58c2';
    limb(ctx,0,-20, 0, ()=>{ blob(ctx,-6,0,7,3,-0.5+pulse*0.25); blob(ctx,6,0,7,3,0.5-pulse*0.25); }); // top fins
    ctx.fillStyle='#b06bd6'; blob(ctx,0,-4,14+pulse, 18-pulse);
    ctx.fillStyle='#c98be8';
    for(let i=-2;i<=2;i++){
      const sway = Math.sin(t*6 + i*0.9)*4;
      ctx.beginPath(); ctx.moveTo(i*5,10);
      ctx.quadraticCurveTo(i*6+sway,24,i*3+sway*1.4,28+pulse*2);
      ctx.quadraticCurveTo(i*6+sway*0.6,22,i*5+2,10); ctx.fill();
    }
    const e = eyeOpen(t,0.6);
    ctx.fillStyle='#fff'; blob(ctx,-5,-8,3,3.4*e); blob(ctx,5,-8,3,3.4*e);
    ctx.fillStyle='#241a2c'; blob(ctx,-5,-8,1.3,1.5*e); blob(ctx,5,-8,1.3,1.5*e);
  },
  seal(ctx, t){
    const swish = Math.sin(t*8)*0.45;
    ctx.fillStyle='#4a6676';
    limb(ctx,-19,0, swish, ()=>{ blob(ctx,-6,-4,7,3.2,-0.5); blob(ctx,-6,4,7,3.2,0.5); }); // tail flipper
    ctx.fillStyle='#5b7a8c'; blob(ctx,0,0,20,13);
    ctx.fillStyle='#dfeff5'; blob(ctx,-10,-2,8,7);
    ctx.fillStyle='#4a6676';
    limb(ctx,4,8, 0.5+Math.sin(t*8+1)*0.4, ()=>blob(ctx,-2,5,3.5,7,0.2));    // front flipper
    ctx.fillStyle='#defbff'; blob(ctx,14,0,6,7);
    ctx.fillStyle='#1a2a30'; blob(ctx,16,-1,1.4,1.6*eyeOpen(t,2.0));
  },
};

/* ---- Predators (face right before flipping) ---- */
const PREDATOR_DRAW = {
  polarbear(ctx, t){
    const paw = a=>Math.sin(t*7+a)*4;
    ctx.fillStyle='#dfe5dc';
    blob(ctx,-14+paw(0),14+paw(1.5)*0.5,5,4); blob(ctx,10+paw(3),14+paw(4.5)*0.5,5,4); // paddling paws
    ctx.fillStyle='#f2f5f0'; blob(ctx,0,2,24,15);
    ctx.fillStyle='#e6ebe3'; blob(ctx,-6+paw(1.5),15+paw(0)*0.5,5,4); blob(ctx,16+paw(4.5),13+paw(3)*0.5,5,4);
    ctx.fillStyle='#fff'; blob(ctx,16,-2,10,9);
    ctx.fillStyle='#e9eee7'; blob(ctx,22,-8,3.4,3.4);
    ctx.fillStyle='#1a1a1a'; blob(ctx,25,-2,1.6,1.6);
    ctx.fillStyle='#111'; blob(ctx,15,-4,1.3,1.4*eyeOpen(t,0.3));
  },
  orca(ctx, t){
    const tail = Math.sin(t*6)*0.35;
    ctx.fillStyle='#131320';
    limb(ctx,-24,0, tail, ()=>{ ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-12,-9); ctx.lineTo(-10,5); ctx.fill(); });
    blob(ctx,0,0,26,13);
    ctx.fillStyle='#f4f4f4'; blob(ctx,-4,5,14,6,0.1);
    ctx.fillStyle='#131320'; ctx.beginPath(); ctx.moveTo(-4,-14); ctx.lineTo(4,-14); ctx.lineTo(-2,2); ctx.fill();
    limb(ctx,4,8, 0.4+Math.sin(t*6+1)*0.3, ()=>blob(ctx,-3,4,3,7,0.3));      // pectoral fin
    ctx.fillStyle='#fff'; blob(ctx,14,-4,2.6,3.4,0.3);
    ctx.fillStyle='#111'; blob(ctx,15,-3,1.3,1.5*eyeOpen(t,1.7));
  },
  narwhal(ctx, t){
    const tail = Math.sin(t*5.5)*0.35;
    ctx.fillStyle='#6f8a9a';
    limb(ctx,-21,0, tail, ()=>{ ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-11,-8); ctx.lineTo(-9,6); ctx.fill(); });
    ctx.fillStyle='#8fa9b8'; blob(ctx,0,0,22,12);
    ctx.fillStyle='#7a95a5';
    for(let i=0;i<4;i++) blob(ctx,-10+i*6,-3+(i%2)*4,1.8,1.4);               // mottled spots
    ctx.strokeStyle='#e8eef0'; ctx.lineWidth=3; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(22,-4); ctx.lineTo(44,-14); ctx.stroke();
    ctx.strokeStyle='rgba(150,160,165,.6)'; ctx.lineWidth=1;                 // spiral on the tusk
    for(let i=0;i<4;i++){ const k=26+i*4.5; ctx.beginPath(); ctx.moveTo(k,-5.5-i*2); ctx.lineTo(k+1.5,-7.5-i*2); ctx.stroke(); }
    ctx.fillStyle='#6f8a9a'; limb(ctx,4,7, 0.4+Math.sin(t*5.5+1)*0.3, ()=>blob(ctx,-2,4,3,6,0.3));
    ctx.fillStyle='#111'; blob(ctx,14,-4,1.3,1.5*eyeOpen(t,2.4));
  },
  leopardseal(ctx, t){
    const wave = Math.sin(t*7);
    ctx.fillStyle='#5f6e50';
    limb(ctx,-23,0, wave*0.45, ()=>{ blob(ctx,-6,-4,7,3,-0.5); blob(ctx,-6,4,7,3,0.5); });
    ctx.fillStyle='#7a8a6a'; blob(ctx,0,wave*1.2,24,12);
    ctx.fillStyle='#5f6e50';
    for(let i=0;i<6;i++) blob(ctx,-14+i*7,-2+((i%2)*5)+wave*1.2,2.2,2.2);
    ctx.fillStyle='#eef0e6'; blob(ctx,14,3,9,6);
    // jaws snap open and shut
    const jaw = Math.max(0, Math.sin(t*4))*0.35;
    ctx.fillStyle='#3a1f1f'; limb(ctx,14,4, jaw, ()=>{ ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(10,0); ctx.lineTo(0,2); ctx.fill(); });
    ctx.fillStyle='#111'; blob(ctx,16,-2,1.3,1.4*eyeOpen(t,0.9));
  },
};

function drawPrey(ctx, id, x, y, facing, scale, t){
  ctx.save(); ctx.translate(x,y); ctx.scale(facing*scale, scale);
  (PREY_DRAW[id] || PREY_DRAW.penguin)(ctx, t||0);
  ctx.restore();
}
function drawPredator(ctx, id, x, y, facing, scale, t){
  ctx.save(); ctx.translate(x,y); ctx.scale(facing*scale, scale);
  (PREDATOR_DRAW[id] || PREDATOR_DRAW.orca)(ctx, t||0);
  ctx.restore();
}

/* Small preview used on the selection cards */
function drawCharacterIcon(canvas, kind, id, t){
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const draw = kind==='prey' ? drawPrey : drawPredator;
  draw(ctx, id, canvas.width/2, canvas.height/2+6+Math.sin((t||0)*2)*2, 1, 1.5, t);
}

/* ---- Items ---- */
function drawFish(ctx, x, y, hue){
  ctx.save(); ctx.translate(x,y);
  ctx.fillStyle=hue;
  ctx.beginPath(); ctx.ellipse(0,0,13,8,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-12,0); ctx.lineTo(-20,-7); ctx.lineTo(-20,7); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.6)'; ctx.beginPath(); ctx.arc(5,-2,2,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

// Rare, fast and worth 10 — shimmers as it swims
function drawGoldenFish(ctx, x, y, t){
  ctx.save(); ctx.translate(x,y);
  ctx.shadowColor='rgba(255,215,90,.9)'; ctx.shadowBlur=14;
  const g = ctx.createLinearGradient(-14,-9,14,9);
  g.addColorStop(0,'#fff3b0'); g.addColorStop(.5,'#ffcf3f'); g.addColorStop(1,'#e59a12');
  ctx.fillStyle=g;
  ctx.beginPath(); ctx.ellipse(0,0,15,9,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-13,0); ctx.lineTo(-23,-8); ctx.lineTo(-23,8); ctx.fill();
  ctx.shadowBlur=0;
  ctx.fillStyle='#5a3a00'; ctx.beginPath(); ctx.arc(6,-2,1.8,0,Math.PI*2); ctx.fill();
  // moving glint
  ctx.globalAlpha = 0.5+0.5*Math.sin(t*6);
  ctx.fillStyle='#fff';
  ctx.beginPath(); ctx.moveTo(-3,-10); ctx.lineTo(-1,-5); ctx.lineTo(4,-4); ctx.lineTo(-1,-3); ctx.lineTo(-3,2); ctx.lineTo(-5,-3); ctx.lineTo(-10,-4); ctx.lineTo(-5,-5); ctx.fill();
  ctx.restore();
}

// Looks a lot like a normal fish until you get close — then it puffs up into a spiky ball.
// puff: 0 (calm) .. 1 (fully puffed)
function drawPuffer(ctx, x, y, puff){
  ctx.save(); ctx.translate(x,y);
  const rx = 13 + puff*9, ry = 8 + puff*14;
  if(puff>0.05){
    ctx.strokeStyle='#f5f0d6'; ctx.lineWidth=2; ctx.lineCap='round';
    for(let i=0;i<14;i++){
      const a = i/14*Math.PI*2, len = 7*puff;
      const ex = Math.cos(a)*rx, ey = Math.sin(a)*ry;
      ctx.beginPath(); ctx.moveTo(ex,ey); ctx.lineTo(ex+Math.cos(a)*len, ey+Math.sin(a)*len); ctx.stroke();
    }
  }
  ctx.fillStyle='#e8d27a';
  ctx.beginPath(); ctx.ellipse(0,0,rx,ry,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-rx+1,0); ctx.lineTo(-rx-7,-6); ctx.lineTo(-rx-7,6); ctx.fill();
  ctx.fillStyle='#8a6a2a'; // tell-tale spots
  [[-5,-3],[1,3],[-1,-6],[-7,3]].forEach(([sx,sy])=>{ ctx.beginPath(); ctx.arc(sx*(1+puff*0.6), sy*(1+puff*0.9), 1.6+puff, 0, Math.PI*2); ctx.fill(); });
  ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(rx*0.45,-ry*0.3,2.6+puff,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#111'; ctx.beginPath(); ctx.arc(rx*0.45+0.6,-ry*0.3,1.3+puff*0.5,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

// Icy shell drawn over a predator frozen by the Freeze power-up
function drawFrozenShell(ctx, x, y, w, h){
  ctx.save();
  ctx.fillStyle='rgba(200,240,255,.45)'; ctx.strokeStyle='rgba(255,255,255,.8)'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.ellipse(x,y,w*0.62,h*0.9,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,.7)';
  ctx.beginPath(); ctx.ellipse(x-w*0.25,y-h*0.45,w*0.12,h*0.18,-0.5,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawBone(ctx, x, y){
  ctx.save(); ctx.translate(x,y);
  ctx.strokeStyle=ctx.fillStyle='#e6e6e0'; ctx.lineWidth=5; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(-10,0); ctx.lineTo(10,0); ctx.stroke();
  // knobbly ends on both sides
  [-1,1].forEach(side=>{
    const bx = side*12;
    ctx.beginPath(); ctx.arc(bx,-3,3.4,0,Math.PI*2); ctx.arc(bx,3,3.4,0,Math.PI*2); ctx.fill();
  });
  ctx.restore();
}

function drawGlacier(ctx, o){
  const g = ctx.createLinearGradient(o.x-o.w/2,o.y-o.h/2,o.x+o.w/2,o.y+o.h/2);
  g.addColorStop(0,'#dff4fb'); g.addColorStop(1,'#8fc7dc');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(o.x-o.w/2,   o.y-o.h/2);
  ctx.lineTo(o.x+o.w*0.1, o.y-o.h/2-8);
  ctx.lineTo(o.x+o.w/2,   o.y-o.h/2+6);
  ctx.lineTo(o.x+o.w/2-4, o.y+o.h/2);
  ctx.lineTo(o.x-o.w/2+6, o.y+o.h/2+6);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.5)'; ctx.lineWidth=1.5; ctx.stroke();
}

// name/info are used by the How to Play screen
const POWERUP_STYLE = {
  shield:{color:'#8fd9e8', glyph:'S',  name:'Shield',   info:'Blocks the next hit'},
  magnet:{color:'#e85b5b', glyph:'M',  name:'Magnet',   info:'Pulls nearby fish to you'},
  slow:  {color:'#9b6bff', glyph:'Z',  name:'Slow-mo',  info:'Slows everything down'},
  mult:  {color:'#f0e090', glyph:'x2', name:'Double',   info:'Double points — bones too!'},
  speed: {color:'#ffb36b', glyph:'»',  name:'Speed',    info:'Swim much faster'},
  freeze:{color:'#e6f7ff', glyph:'❄',  name:'Freeze',   info:'Predators freeze solid'},
};
function drawPowerup(ctx, pu){
  const style = POWERUP_STYLE[pu.kind];
  ctx.save(); ctx.translate(pu.x, pu.y+Math.sin(pu.bob)*4);
  ctx.globalAlpha=.9; ctx.fillStyle=style.color;
  ctx.beginPath(); ctx.arc(0,0,15,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#0b2a45'; ctx.font='bold 15px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(style.glyph,0,1);
  ctx.restore();
}

/* Giant boss — the orca has its own detailed drawing, others are scaled up */
function drawBoss(ctx, b){
  const t = b.anim||0;
  if(b.type!=='orca'){ drawPredator(ctx, b.type, b.x, b.y, b.dir, 3.4, t); return; }
  ctx.save(); ctx.translate(b.x,b.y); ctx.scale(b.dir,1);
  ctx.fillStyle='#131320';
  limb(ctx,-86,0, Math.sin(t*4)*0.3, ()=>{ ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-32,-24); ctx.lineTo(-26,16); ctx.fill(); });
  ctx.beginPath(); ctx.ellipse(0,0,90,44,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#f4f4f4'; ctx.beginPath(); ctx.ellipse(-10,16,46,20,0.1,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#131320'; ctx.beginPath(); ctx.moveTo(-6,-46); ctx.lineTo(10,-46); ctx.lineTo(-2,6); ctx.fill();
  ctx.fillStyle='#fff'; ctx.beginPath(); ctx.ellipse(46,-10,8,10,0.3,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#111'; ctx.beginPath(); ctx.arc(49,-8,4,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

/* Flashing red arrow + lane line shown just before something charges */
function drawWarning(ctx, edgeX, dir, y, width, size, t){
  ctx.save();
  ctx.globalAlpha = 0.5+0.4*Math.sin(t);
  ctx.fillStyle='#e85b5b';
  ctx.beginPath(); ctx.moveTo(edgeX,y-size); ctx.lineTo(edgeX+dir*size*1.2,y); ctx.lineTo(edgeX,y+size); ctx.fill();
  ctx.restore();
  ctx.save(); ctx.strokeStyle='rgba(232,91,91,.35)'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(width,y); ctx.stroke();
  ctx.restore();
}
