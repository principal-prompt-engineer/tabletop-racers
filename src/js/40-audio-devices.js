/* ---------- audio: lazy start on the first key press, short square-wave beeps ---------- */
let AC=null;
function audioInit(){
  if(AC)return;
  try{AC=new(window.AudioContext||window.webkitAudioContext)();}catch(e){AC=null;}
}
function beep(f,d){
  if(!AC||isMuted())return;d=d||.15;
  const o=AC.createOscillator(),g=AC.createGain();o.type='square';o.frequency.value=f;
  g.gain.setValueAtTime(.07,AC.currentTime);g.gain.exponentialRampToValueAtTime(.001,AC.currentTime+d);
  o.connect(g);g.connect(AC.destination);o.start();o.stop(AC.currentTime+d);
}

/* ---------- device layer ---------- */
const SCHEMES=[
 {id:'kb0',n:'Arrows',l:'ArrowLeft',r:'ArrowRight',u:'ArrowUp',d:'ArrowDown',ok:'Enter',bk:'Backspace',okn:'Enter',bkn:'Backspace'},
 {id:'kb1',n:'WASD',l:'KeyA',r:'KeyD',u:'KeyW',d:'KeyS',ok:'Space',bk:'KeyQ',okn:'Space',bkn:'Q'},
 {id:'kb2',n:'IJKL',l:'KeyJ',r:'KeyL',u:'KeyI',d:'KeyK',ok:'KeyO',bk:'KeyU',okn:'O',bkn:'U'},
 {id:'kb3',n:'TFGH',l:'KeyF',r:'KeyH',u:'KeyT',d:'KeyG',ok:'KeyY',bk:'KeyR',okn:'Y',bkn:'R'}];
/* key names for hints; rebinding (Settings > Controls) overrides a scheme through CFG.keys[schemeId] */
const KEY_ARROWS={ArrowLeft:'Left',ArrowRight:'Right',ArrowUp:'Up',ArrowDown:'Down'};
const keyName=c=>KEY_ARROWS[c]||String(c).replace(/^Key|^Digit/,'');
const DEFAULT_KEYS=SCHEMES.map(s=>({l:s.l,r:s.r,u:s.u,d:s.d,ok:s.ok,bk:s.bk}));
const RESERVED_KEYS=['Escape','Tab','F3'];
const KEYMAP={};
function rebuildKeymap(){
  for(const k in KEYMAP)delete KEYMAP[k];
  SCHEMES.forEach((s,i)=>{
    Object.assign(s,DEFAULT_KEYS[i],CFG.keys[s.id]||{});
    s.okn=keyName(s.ok);s.bkn=keyName(s.bk);
    s.hint='Keys ('+(CFG.keys[s.id]?[s.l,s.u,s.d,s.r].map(keyName).join(' '):s.n)+'), OK ('+s.okn+'), Back ('+s.bkn+')';
    KEYMAP[s.l]=[s.id,'left'];KEYMAP[s.r]=[s.id,'right'];KEYMAP[s.u]=[s.id,'up'];KEYMAP[s.d]=[s.id,'down'];KEYMAP[s.ok]=[s.id,'ok'];KEYMAP[s.bk]=[s.id,'back'];
  });
  KEYMAP.Escape=['kb','esc'];KEYMAP.Tab=['kb','settings'];KEYMAP.F3=['kb','debug'];
}
rebuildKeymap();
/* rebinding: Settings > Controls starts a capture; the next six key presses become Left, Right, Up, Down, OK, Back */
const BIND_STEPS=[['l','Left'],['r','Right'],['u','Up'],['d','Down'],['ok','OK'],['bk','Back']];
let capture=null;
function startRebind(sid){capture={sid,step:0,keys:{},msg:''};}
function captureKey(code){
  if(code==='Escape'){capture=null;return;}
  const sid=capture.sid;
  const used=new Set(RESERVED_KEYS);
  SCHEMES.forEach(s=>{if(s.id!==sid)[s.l,s.r,s.u,s.d,s.ok,s.bk].forEach(k=>used.add(k));});
  Object.values(capture.keys).forEach(k=>used.add(k));
  if(used.has(code)){capture.msg=keyName(code)+' is already used. Press another key.';return;}
  capture.msg='';capture.keys[BIND_STEPS[capture.step][0]]=code;capture.step++;
  if(capture.step>=BIND_STEPS.length){CFG.keys[sid]=capture.keys;saveCfg();rebuildKeymap();capture=null;}
}
function resetKeys(){CFG.keys={};saveCfg();rebuildKeymap();}
const keys={}, navQ=[], padSt={};
const touch={l:0,r:0,u:0,d:0,sx:0,sy:0};

const padId=p=>'pad:'+p.id+'#'+p.index;
function pads(){
  let a=[];try{a=navigator.getGamepads?navigator.getGamepads():[];}catch(e){}
  const out=[];for(const p of a)if(p&&p.connected!==false)out.push(p);return out;
}
function findPad(id){for(const p of pads())if(padId(p)===id)return p;return null;}
function devLabel(id){
  if(id==='kb')return 'Keyboard';
  if(id==='touch')return 'Touch';
  if(id==='mouse')return 'Mouse';
  if(id.startsWith('kb')){const s=SCHEMES.find(x=>x.id===id);return 'Keyboard ('+(s?s.n:id)+')';}
  const m=/#(\d+)$/.exec(id);return 'Controller '+((m?+m[1]:0)+1);
}
function devHint(id){   // what the buttons are called on this device, shown in the lobby
  const s=SCHEMES.find(x=>x.id===id);
  if(s)return s.hint;
  if(id==='touch')return 'Touch';
  if(id==='pad')return 'OK (A), Back (B)';                 // generic controller line before any pad has joined
  if(id.startsWith('pad:'))return devLabel(id)+': '+devHint('pad');
  return devLabel(id);
}
/* A = OK, B = Back as printed on the pad. The standard mapping puts index 0 at the bottom, which is A on Xbox pads but B on Nintendo pads. */
function padSwap(p){
  const m=CFG.padLayout;if(m==='nintendo')return true;if(m==='xbox')return false;
  return /057e|nintendo|switch|joy-?con|pro controller/i.test(p.id||'');
}
const padA=p=>padSwap(p)?1:0, padB=p=>padSwap(p)?0:1;
function devAlive(id){return id.startsWith('pad:')?!!findPad(id):true;}
function slotOf(dev){return slots.find(s=>s&&s.dev===dev)||null;}
function whoIs(dev){
  const p=slotOf(dev);
  if(p)return (p.name||('Player '+(p.slot+1)))+' ('+devLabel(dev)+')';
  return devLabel(dev);
}

addEventListener('keydown',e=>{
  if(capture){e.preventDefault();if(!e.repeat)captureKey(e.code);return;}
  keys[e.code]=true;
  if(e.code==='Tab'||e.code==='F3'||e.code==='Space'||e.code.startsWith('Arrow'))e.preventDefault();
  audioInit();
  if(e.repeat)return;
  const m=KEYMAP[e.code];if(m)navQ.push({dev:m[0],act:m[1]});
});
addEventListener('keyup',e=>{keys[e.code]=false;});

function pollPads(){
  const now=performance.now();
  for(const p of pads()){
    const id=padId(p);let st=padSt[id];if(!st)st=padSt[id]={b:[],h:{}};
    const bt=Array.from(p.buttons,b=>!!b.pressed);
    let any=false;for(let i=0;i<bt.length;i++)if(bt[i]&&!st.b[i])any=true;
    const edge=i=>bt[i]&&!st.b[i];
    if(edge(padA(p)))navQ.push({dev:id,act:'ok'});
    else if(edge(padB(p)))navQ.push({dev:id,act:'back'});
    else if(edge(9))navQ.push({dev:id,act:'menu'});
    else if(edge(8))navQ.push({dev:id,act:'settings'});
    else if(any)navQ.push({dev:id,act:'any'});
    const ax=p.axes[0]||0,ay=p.axes[1]||0;
    const dirs={left:bt[14]||ax<-.5,right:bt[15]||ax>.5,up:bt[12]||ay<-.5,down:bt[13]||ay>.5};
    for(const k in dirs){
      const h=st.h[k];
      if(dirs[k]){
        if(!h){st.h[k]={n:now+380};navQ.push({dev:id,act:k});}           // first press, then repeat after 380 ms
        else if(now>=h.n){h.n=now+90;navQ.push({dev:id,act:k});}        // then every 90 ms
      }else if(h)delete st.h[k];
    }
    st.b=bt;
  }
}

/* THE input seam: every control source (keyboard, pad, touch, later network or AI) returns the same shape (NO_INPUT in 00-core):
   mx = steer -1..1;  my = up (-1) gas, down (+1) brake for keys, touch buttons and the touch stick;  gas / brake = 0..1 from pad buttons and triggers.
   The car code reads both: gas = max(gas, -my), brake = max(brake, my). Add fields here and nowhere else. */
function getInput(dev){
  const s=SCHEMES.find(x=>x.id===dev);
  if(s)return axes((keys[s.r]?1:0)-(keys[s.l]?1:0),(keys[s.d]?1:0)-(keys[s.u]?1:0));
  if(dev==='touch')return CFG.touchMode==='stick'?axes(touch.sx,touch.sy):axes(touch.r-touch.l,touch.d-touch.u);
  const p=findPad(dev);
  if(!p)return NO_INPUT;
  let x=p.axes[0]||0;if(Math.abs(x)<.15)x=0;           // stick left/right steers; stick up/down does nothing, as in v5
  if(p.buttons[14]&&p.buttons[14].pressed)x=-1;
  if(p.buttons[15]&&p.buttons[15].pressed)x=1;
  const bv=i=>p.buttons[i]?(p.buttons[i].pressed?Math.max(1,p.buttons[i].value||0):(p.buttons[i].value||0)):0;
  const tr=p.buttons[7]?p.buttons[7].value:0,tl=p.buttons[6]?p.buttons[6].value:0;   // right trigger / A = gas, left trigger / B = brake
  return {mx:clamp(x,-1,1),my:0,gas:Math.max(tr,bv(padA(p))?1:0),brake:Math.max(tl,bv(padB(p))?1:0)};
}
function axes(x,y){return {mx:clamp(x,-1,1),my:clamp(y,-1,1)};}   // a car's steering and pedals are separate axes: Left + Up must not weaken either (norm() would)
function norm(x,y){const m=Math.hypot(x,y);return m>1?{mx:x/m,my:y/m}:{mx:x,my:y};}
function bindTouch(id,k){
  const e=document.getElementById(id);
  const on=ev=>{touch[k]=1;ev.preventDefault();},off=ev=>{touch[k]=0;ev.preventDefault();};
  e.addEventListener('pointerdown',on);e.addEventListener('pointerup',off);e.addEventListener('pointercancel',off);e.addEventListener('pointerleave',off);
}
bindTouch('tL','l');bindTouch('tR','r');bindTouch('tU','u');bindTouch('tD','d');
/* virtual joystick (Settings > Display > Touch controls): drag inside #stick, vector = offset / 55 px, clamped to 1 */
function bindStick(){
  const e=document.getElementById('stick'),kn=document.getElementById('knob');if(!e||!e.addEventListener)return;
  const mv=ev=>{const r=e.getBoundingClientRect(),dx=ev.clientX-(r.left+r.width/2),dy=ev.clientY-(r.top+r.height/2),m=Math.hypot(dx,dy)||1,k=Math.min(1,m/55);
    touch.sx=dx/m*k;touch.sy=dy/m*k;if(kn&&kn.style){kn.style.transform='translate('+touch.sx*55+'px,'+touch.sy*55+'px)';}ev.preventDefault();};
  const off=ev=>{touch.sx=touch.sy=0;if(kn&&kn.style)kn.style.transform='translate(0,0)';ev.preventDefault();};
  e.addEventListener('pointerdown',mv);e.addEventListener('pointermove',ev=>{if(touch.sx||touch.sy||ev.buttons)mv(ev);});
  e.addEventListener('pointerup',off);e.addEventListener('pointercancel',off);
}
function applyTouchMode(){
  const stick=CFG.touchMode==='stick';
  for(const id of ['tL','tR','tU','tD']){const e=document.getElementById(id);if(e&&e.style)e.style.display=stick?'none':'flex';}
  const st=document.getElementById('stick');if(st&&st.style)st.style.display=stick?'block':'none';
  touch.l=touch.r=touch.u=touch.d=touch.sx=touch.sy=0;
}
bindStick();applyTouchMode();
if(IS_TOUCH)document.getElementById('touch').style.display='block';


/* ---------- game state ---------- */
let state='lobby',players=[],cdT=0,roundT=0,doneT=0,acc=0,last=0,graceT=0,holdMsg='',firstFinT=null,results=null,roundSaved=false;
let pausePrev='play',pauseBy='',pauseCur=0,pauseMsg='',pauseView='menu',pauseSetCur=0,pauseSetScroll=0;
const series={n:1,round:1,totals:{}};   // several rounds in a row with running totals (lobby row 'Rounds')
const dbg={lead:0};                       // read by the F3 debug overlay
const slots=new Array(MAX_SLOTS).fill(null);
const cam={x:WW/2,y:WH/2,s:.5};
const set={open:false,cat:0,focus:'cat',cur:0,scroll:0,by:'',confirm:null,confirmT:0};
const hits=[];
const LETTERS='ABCDEFGHIJKLMNOPQRSTUVWXYZ✓'.split('');
let lobbyMsg='',lobbyMsgT=0;
