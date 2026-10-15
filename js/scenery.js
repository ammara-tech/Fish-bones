"use strict";
/* =====================================================================
   SCENERY — the underwater backdrop: day/night water, light rays,
   the icy surface above, the seabed below and drifting bubbles.
   ===================================================================== */
const Scenery = (function(){
  const DAY_LENGTH = 120;   // seconds for a full day → night → day cycle
  const WATER = {
    day:   ['#1f6f9c', '#145a85', '#0a3556'],
    night: ['#0b2546', '#071a33', '#030c1c'],
  };

  let layers = null;

  function hexToRgb(h){ const n = parseInt(h.slice(1),16); return [n>>16, (n>>8)&255, n&255]; }
  function mix(a, b, k){
    const A = hexToRgb(a), B = hexToRgb(b);
    return `rgb(${A.map((v,i)=>Math.round(v+(B[i]-v)*k)).join(',')})`;
  }

  // 0 = bright day, 1 = deep night. Starts at day, darkest halfway through the cycle.
  function nightAt(elapsed){ return (1 - Math.cos(elapsed/DAY_LENGTH*Math.PI*2))/2; }

  function init(VW, VH){
    const seabed = [], kelp = [], ice = [], bubbles = [];
    for(let x=-40; x<VW+80; x+=rand(30,60)) seabed.push({x, h:rand(8,24)});
    for(let i=0;i<7;i++) kelp.push({x:rand(0,VW), h:rand(30,70), phase:rand(0,6)});
    for(let x=-60; x<VW+120; x+=rand(70,140)) ice.push({x, w:rand(50,120), d:rand(10,26)});
    for(let i=0;i<26;i++) bubbles.push({x:rand(0,VW), y:rand(0,VH), r:rand(2,6), sp:rand(10,26), drift:rand(-8,8)});
    layers = {VW, VH, seabed, kelp, ice, bubbles, scroll:0};
  }

  function update(dt, t){
    if(!layers) return;
    const {VW, VH} = layers;
    layers.scroll += dt;
    layers.bubbles.forEach(b=>{
      b.y -= b.sp*dt; b.x += Math.sin(t+b.x)*b.drift*dt;
      if(b.y<-10){ b.y = VH+10; b.x = rand(0,VW); }
    });
    // surface ice drifts slowly left and wraps around
    layers.ice.forEach(c=>{ c.x -= 12*dt; if(c.x+c.w < -60) c.x += VW+180; });
    layers.kelp.forEach(k=>{ k.x -= 18*dt; if(k.x < -20) k.x = VW+rand(10,80); });
  }

  function draw(ctx, VW, VH, elapsed, t){
    if(!layers || layers.VW!==VW || layers.VH!==VH) init(VW, VH);
    const night = nightAt(elapsed);

    // water
    const g = ctx.createLinearGradient(0,0,0,VH);
    g.addColorStop(0,   mix(WATER.day[0], WATER.night[0], night));
    g.addColorStop(0.5, mix(WATER.day[1], WATER.night[1], night));
    g.addColorStop(1,   mix(WATER.day[2], WATER.night[2], night));
    ctx.fillStyle = g; ctx.fillRect(0,0,VW,VH);

    // aurora glowing through the surface at night: soft drifting blobs of green and violet
    if(night>0.25){
      const a = (night-0.25)/0.75;
      [[0.2,'95,225,176',0.35],[0.5,'155,107,255',0.3],[0.8,'95,225,176',0.28]].forEach(([fx,rgb,alpha],i)=>{
        const cx = VW*fx + Math.sin(t*0.25+i*2)*VW*0.08;
        ctx.save();
        ctx.translate(cx, 0); ctx.scale(1, 0.45);
        const r = VW*0.32;
        const rg = ctx.createRadialGradient(0,0,0,0,0,r);
        rg.addColorStop(0, `rgba(${rgb},${alpha*a})`);
        rg.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = rg;
        ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill();
        ctx.restore();
      });
    }

    // sunbeams slanting down from the surface (fade out at night)
    const beams = 1-night;
    if(beams>0.05){
      for(let i=0;i<5;i++){
        const x = ((i+0.5)/5)*VW + Math.sin(t*0.3+i*1.7)*40;
        const w = 40 + (i%3)*25;
        const bg2 = ctx.createLinearGradient(0,0,0,VH*0.85);
        bg2.addColorStop(0, `rgba(220,245,255,${0.10*beams})`);
        bg2.addColorStop(1, 'rgba(220,245,255,0)');
        ctx.fillStyle = bg2;
        ctx.beginPath();
        ctx.moveTo(x-w/2, 0); ctx.lineTo(x+w/2, 0);
        ctx.lineTo(x+w/2-VH*0.35, VH*0.85); ctx.lineTo(x-w*1.4-VH*0.35, VH*0.85);
        ctx.closePath(); ctx.fill();
      }
    }

    // kelp swaying on the seabed
    ctx.lineCap = 'round';
    layers.kelp.forEach(k=>{
      ctx.strokeStyle = night>0.5 ? 'rgba(30,70,60,.55)' : 'rgba(40,110,90,.45)';
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(k.x, VH);
      const sway = Math.sin(t*1.4+k.phase)*10;
      ctx.quadraticCurveTo(k.x+sway, VH-k.h*0.5, k.x+sway*1.6, VH-k.h);
      ctx.stroke();
    });

    // seabed silhouette (scrolls slowly for depth)
    const off = (layers.scroll*10) % 60;
    ctx.fillStyle = mix('#0b2a3a', '#020812', night);
    ctx.beginPath(); ctx.moveTo(0, VH);
    layers.seabed.forEach(p=>ctx.lineTo(p.x-off, VH-p.h));
    ctx.lineTo(VW+80, VH); ctx.closePath(); ctx.fill();

    // bubbles
    ctx.fillStyle = night>0.5 ? 'rgba(180,230,255,0.28)' : 'rgba(220,245,255,0.35)';
    layers.bubbles.forEach(b=>{ ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,Math.PI*2); ctx.fill(); });

    // icy surface: shimmering waterline + ice slabs hanging down
    ctx.fillStyle = `rgba(200,240,255,${0.25 + 0.1*Math.sin(t*2)})`;
    ctx.beginPath(); ctx.moveTo(0,0);
    for(let x=0; x<=VW; x+=20) ctx.lineTo(x, 4+Math.sin(x*0.04+t*2)*2);
    ctx.lineTo(VW,0); ctx.closePath(); ctx.fill();
    layers.ice.forEach(c=>{
      const ig = ctx.createLinearGradient(0,0,0,c.d);
      ig.addColorStop(0, mix('#e9f8ff','#9fc2d6',night));
      ig.addColorStop(1, mix('#9fd3e8','#4f7690',night));
      ctx.fillStyle = ig;
      ctx.beginPath();
      ctx.moveTo(c.x, 0); ctx.lineTo(c.x+c.w, 0);
      ctx.lineTo(c.x+c.w-6, c.d*0.6); ctx.lineTo(c.x+c.w*0.6, c.d); ctx.lineTo(c.x+c.w*0.25, c.d*0.75); ctx.lineTo(c.x+4, c.d*0.4);
      ctx.closePath(); ctx.fill();
    });

    return night;
  }

  return {init, update, draw, nightAt};
})();
