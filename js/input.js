"use strict";
/* =====================================================================
   INPUT — keyboard (arrow keys) and on-screen touch controls.
   Both always work; the platform choice only decides whether the
   touch joystick is shown.
   ===================================================================== */
const Input = (function(){
  const keys = {};
  const touch = {dx:0, dy:0, dashLeft:false, dashRight:false};

  window.addEventListener('keydown', e=>{
    keys[e.code] = true;
    if(e.code.startsWith('Arrow') || e.code==='Space') e.preventDefault();
  });
  window.addEventListener('keyup', e=>{ keys[e.code] = false; });
  // If the window loses focus mid-press, keyup never fires — don't leave keys stuck.
  window.addEventListener('blur', clear);

  /* ---- Touch joystick ---- */
  const pad = document.getElementById('touchControls');
  const stick = document.getElementById('touchStick');
  const knob = document.getElementById('touchStickKnob');
  let stickId = null, center = {x:0, y:0}, maxR = 46;

  function resetStick(){
    touch.dx = touch.dy = 0;
    knob.style.transform = '';
    stick.classList.remove('engaged');
  }
  function stickStart(e){
    const t = e.changedTouches ? e.changedTouches[0] : e;
    stickId = t.identifier===undefined ? 'mouse' : t.identifier;
    const r = stick.getBoundingClientRect();
    center = {x:r.left+r.width/2, y:r.top+r.height/2};
    maxR = r.width*0.4; // stick size changes with screen size
    stick.classList.add('engaged');
    stickMove(e);
    e.preventDefault();
  }
  function stickMove(e){
    if(stickId===null) return;
    const t = e.changedTouches ? Array.from(e.changedTouches).find(ct=>ct.identifier===stickId) : e;
    if(!t) return;
    let dx = t.clientX-center.x, dy = t.clientY-center.y;
    const dist = Math.hypot(dx,dy);
    if(dist>maxR){ dx = dx/dist*maxR; dy = dy/dist*maxR; }
    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    touch.dx = dx/maxR; touch.dy = dy/maxR;
    e.preventDefault();
  }
  function stickEnd(e){
    if(e.changedTouches && !Array.from(e.changedTouches).some(ct=>ct.identifier===stickId)) return;
    stickId = null;
    resetStick();
    e.preventDefault();
  }
  const opts = {passive:false};
  stick.addEventListener('touchstart', stickStart, opts);
  stick.addEventListener('touchmove', stickMove, opts);
  stick.addEventListener('touchend', stickEnd, opts);
  stick.addEventListener('touchcancel', stickEnd, opts);
  stick.addEventListener('mousedown', stickStart);
  window.addEventListener('mousemove', e=>{ if(stickId==='mouse') stickMove(e); });
  window.addEventListener('mouseup', e=>{ if(stickId==='mouse') stickEnd(e); });

  /* ---- Dash buttons ---- */
  function bindDash(id, prop){
    const btn = document.getElementById(id);
    const on  = e=>{ touch[prop]=true;  btn.classList.add('pressed');    e.preventDefault(); };
    const off = e=>{ touch[prop]=false; btn.classList.remove('pressed'); e.preventDefault(); };
    btn.addEventListener('touchstart', on, opts);
    btn.addEventListener('touchend', off, opts);
    btn.addEventListener('touchcancel', off, opts);
    btn.addEventListener('mousedown', on);
    btn.addEventListener('mouseup', off);
    btn.addEventListener('mouseleave', off);
  }
  bindDash('dashLeftBtn', 'dashLeft');
  bindDash('dashRightBtn', 'dashRight');

  function clear(){
    for(const k in keys) keys[k] = false;
    touch.dashLeft = touch.dashRight = false;
    stickId = null; resetStick();
  }

  function setTouchEnabled(on){
    pad.classList.toggle('active', !!on);
    if(!on) clear();
  }

  /* Combined movement: vy = up/down (-1..1), dash = left/right (-1..1), drift = small sideways nudge from the stick */
  function read(){
    let vy = touch.dy, dash = 0;
    if(keys.ArrowUp) vy -= 1;
    if(keys.ArrowDown) vy += 1;
    if(keys.ArrowLeft || touch.dashLeft) dash -= 1;
    if(keys.ArrowRight || touch.dashRight) dash += 1;
    return {vy: clamp(vy,-1,1), dash, drift: touch.dx*0.5};
  }

  return {read, clear, setTouchEnabled};
})();
