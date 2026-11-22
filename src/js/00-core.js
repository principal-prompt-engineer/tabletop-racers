/* =====================================================================
   TABLETOP RACERS: toy-car racing on a table, on the game-template shell (skills 01-10).
   The game is the 'race' mode in 30-modes.js (rules), 15-tracks.js (track geometry, bumpers), 25-art.js (sprite
   sheets and art import) and the car code in 60-play.js (stepWalker) and 80-draw.js (drawWalker). Everything else is the reusable shell:
     CFG        saved settings (game, length, screen layout, map type/scope, CPU count, sound, HUD size)
     THEME      palette + fonts (the look and feel, see skill 01)
     LEVELS     per-player difficulty table incl. Adaptive (skill 07)
     MODES      game-mode plug-ins: the ONLY place game rules live (skill 08)
     devices    keyboards (4 schemes), gamepads, touch -> nav events {dev,act}
     slots[8]   lobby players (fixed slots; slot index = colour)
     players[]     players in a round (humans carry dev/slot/lv, CPUs have lv = -1)
     getInput() THE input seam: NO_INPUT-shaped object {mx,my} for a device id
     SETTINGS   live (in-game) settings: one definition feeds Settings > Display AND the pause-menu settings
   ===================================================================== */

// Maintenance: do not edit these two lines by hand. tools/build.js (or build.ps1) writes the real build time
// into the built file; here they stay as the 'unknown' placeholder.
const BUILD_STAMP='unknown'; // BUILD_STAMP
const BUILD_VERSION=1; // BUILD_VERSION
function buildLabel(){return BUILD_STAMP==='unknown'?'Build unknown (v'+BUILD_VERSION+')':'Build '+BUILD_STAMP;}

const APP_ID='tabletopRacers', APP_TITLE='TABLETOP RACERS', APP_TAGLINE='Toy-car racing on the kitchen table';   // APP_ID kept from v5: saved settings and profiles stay readable
const cv=document.getElementById('c'), ctx=cv.getContext('2d');
let VW=0,VH=0,DPR=1;
function resize(){DPR=Math.min(devicePixelRatio||1,2);VW=innerWidth;VH=innerHeight;cv.width=VW*DPR;cv.height=VH*DPR;}
addEventListener('resize',resize);resize();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
/* seeded random: ALL gameplay randomness goes through rand() so a round can be replayed (add ?seed=123 to the URL, or call setSeed in tests) */
let _rs=1;
function setSeed(n){_rs=(Math.floor(Math.abs(n))%2147483646)+1;}
function rand(){_rs=(_rs*16807)%2147483647;return (_rs-1)/2147483646;}
setSeed((typeof location!=='undefined'&&/[?&]seed=(\d+)/.exec(location.search||''))?+/[?&]seed=(\d+)/.exec(location.search)[1]:Date.now());
const lerp=(a,b,t)=>a+(b-a)*t;
const IS_TOUCH='ontouchstart' in window;
const WW=3400, WH=2400, WS=IS_TOUCH?1:1.5;   // table size in px; the table picture is painted at WS x for sharp zooms
const MAX_SLOTS=8, MAX_PLAYERS=8;        // one per colour; CPU players fill what is left
const CAR={max:480,acc:600,len:44,wid:24};   // top speed px/s, acceleration px/s2, drawn size
const WALK={max:CAR.max,acc:CAR.acc,r:15};   // what the shell reads: body radius (car-to-car distance 2r = 30 px)
const COLORS=['#e63946','#2a9df4','#ffd23f','#3ddc84','#ff8c42','#b862e8','#f2f2f2','#ff5fa2'];
const COLOR_NAMES=['Red','Blue','Yellow','Green','Orange','Purple','White','Pink'];
const SHAPE_NAMES=['circle','square','triangle','diamond','star','hexagon','plus','pentagon'];   // one shape per player colour (drawn by shapePath)
const IDENTS=['both','shape','num','none'], IDENT_NAMES={both:'Shape + number',shape:'Shape only',num:'Number only',none:'None'};
const CRASH_V=170, HIT_V=170, GRACE_START=2.5, FIRST_FIN_TIMEOUT=30;   // CRASH_V: speed of a hard hit; HIT_V: closing speed of a hard car-to-car hit
const NO_INPUT={mx:0,my:0,gas:0,brake:0};   // one player's input: mx = steer (-1..1); my up = gas, down = brake (keys, touch); gas / brake = pad buttons and triggers
/* the look: dark warm backdrop, translucent black overlays, yellow titles, grey labels, white values, green = go */
const THEME={bg:'#120d0a',title:'#ffd23f',text:'#fff',label:'#aaa',dim:'#9aa7b8',hint:'#999',info:'#cfd8e3',link:'#cfe8ff',go:'#3ddc84',bad:'#ff6b6b',help:'#8fe3ff'};
/* camera feel (skill 04): view width = min(pane w,h) / div, clamped to lo..hi; pad = extra room round the players when one pane frames
   several; look = how far ahead of a single player the camera leads; speed = how much a single player's view widens at top speed */
const CAM={div:560,lo:.55,hi:1.6,pad:520,look:.3,speed:.14};

/* ---------- storage ---------- */
const LS_PROF=APP_ID+'.profiles', LS_CFG=APP_ID+'.cfg';
function lsGet(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch(e){return d;}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}

/* ---------- configuration ---------- */
const SCREENS=['shared','vertical','horizontal','grid'], MAPS=['world','vertical','horizontal','off'], SCOPES=['pane','shared'];
const MAP_POS=['auto','top-left','top','top-right','left','center','right','bottom-left','bottom','bottom-right'];
const MAP_POS_NAMES={auto:'Automatic','top-left':'Top left',top:'Top',  'top-right':'Top right',left:'Left',center:'Centre',right:'Right','bottom-left':'Bottom left',bottom:'Bottom','bottom-right':'Bottom right'};
const SERIES=[1,3,5], TOUCH_MODES=['buttons','stick'];
const SCREEN_NAMES={shared:'One shared screen',vertical:'Vertical split (side by side)',horizontal:'Horizontal split (stacked)',grid:'Grid split'};
const MAP_NAMES={world:'Overview map',vertical:'Vertical position bar',horizontal:'Horizontal position bar',off:'No map'};
const SCOPE_NAMES={pane:'One per player pane',shared:'One shared map'};
const CFG=Object.assign({mode:0,len:{},opt:{},series:1,ai:3,screen:'grid',map:'world',mapScope:'pane',mapPos:'auto',mapPosPane:'auto',ident:'both',names:true,touchMode:'buttons',keys:{},debug:false,padLayout:'auto',sound:true,hud:1,
  track:0,bump:false,bumpD:0,carFacing:'up',styleCars:'imported',styleTable:'imported',styleProps:'imported'},lsGet(LS_CFG,{}));
/* settings saved by older versions (v5 and earlier) */
if('camera' in CFG){CFG.screen=CFG.camera==='shared'?'shared':'grid';delete CFG.camera;}
if('padOk' in CFG){if(!lsGet(LS_CFG,{}).padLayout)CFG.padLayout=CFG.padOk;delete CFG.padOk;}
if(CFG.padLayout==='right')CFG.padLayout='nintendo';else if(CFG.padLayout==='bottom')CFG.padLayout='xbox';
if('laps' in CFG){if(CFG.len.race==null)CFG.len.race=clamp((CFG.laps|0)-1,0,8);delete CFG.laps;}   // v5 saved 'laps' (1..9); now the Length row of the race mode (index = laps - 1)
if('shapes' in CFG){if(CFG.shapes===false&&!lsGet(LS_CFG,{}).ident)CFG.ident='num';delete CFG.shapes;}   // v5 'Map shapes' off -> numbers only, plain dots on maps
if(SCREENS.indexOf(CFG.screen)<0)CFG.screen='vertical';
if(MAPS.indexOf(CFG.map)<0)CFG.map='world';
if(SCOPES.indexOf(CFG.mapScope)<0)CFG.mapScope='pane';
if(['auto','xbox','nintendo'].indexOf(CFG.padLayout)<0)CFG.padLayout='auto';
if(!CFG.len||typeof CFG.len!=='object')CFG.len={};
if(!CFG.opt||typeof CFG.opt!=='object')CFG.opt={};
if(!CFG.keys||typeof CFG.keys!=='object')CFG.keys={};
if(MAP_POS.indexOf(CFG.mapPos)<0)CFG.mapPos='auto';
if(MAP_POS.indexOf(CFG.mapPosPane)<0)CFG.mapPosPane='auto';
if(SERIES.indexOf(CFG.series)<0)CFG.series=1;
if(TOUCH_MODES.indexOf(CFG.touchMode)<0)CFG.touchMode='buttons';
if(IDENTS.indexOf(CFG.ident)<0)CFG.ident='both';
CFG.names=CFG.names!==false;CFG.debug=!!CFG.debug;
CFG.bump=!!CFG.bump;CFG.bumpD=+CFG.bumpD||0;
if(['up','right','down','left'].indexOf(CFG.carFacing)<0)CFG.carFacing='up';
for(const k of ['styleCars','styleTable','styleProps'])if(CFG[k]!=='builtin')CFG[k]='imported';
function saveCfg(){lsSet(LS_CFG,CFG);}
const isMuted=()=>!CFG.sound;
