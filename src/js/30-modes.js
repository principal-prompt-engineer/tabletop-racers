/* ---------- game modes: plug-ins (skill 08). The shell never knows the rules, it only calls these hooks ----------
   THIS FILE IS THE GAME'S RULES. One mode here: 'race' (laps round a track on a table; first across the line wins).
   Required hooks (the shell test checks every mode implements all of them):
   plan(R) fill(R) spawn(k,n) start() tick(dt) touch(c,P) over(humans) aiTarget(c) progress(c) maxProgress() barEnd()
   status(c) top() banner(c) rank(list) resultText(c) bestOf(c) bestHigh drawItems(x) marks() options() summary()
   Optional hooks this game uses (the shell calls them only if present):
   bestKey()   key under which bestOf() is saved in a profile (default: the mode id). Here: the track, so each track keeps its own best lap.
   stats(c,p)  update a profile p after a round (here: metres driven)
   profLine(p) one line about a saved player for Settings > Players
   hud(p,c,hs) extra drawing inside one player's pane (here: the speed bar), p = pane, c = its player, hs = HUD scale
   frame(dt)   once per animation frame in every state (here: engine sound level)
   banner(c) may return a string or {t,col,sz,y}.

   PROGRESS UNIT: px of route driven (c.pi * track.step). c.pi is the raw track-index progress (N indexes = one lap, negative on the grid);
   the shell copies progress(c) into c.prog every step, for Adaptive and for the position bars.
   Per-car fields added in start(): a (heading), idx, pi, dist (px from the road centre line), maxLap, lapStart, lapTimes, offT, steerV, lane, bumpT, wasStun. */
function opt(m,k,d){const o=CFG.opt[m.id];return o&&o[k]!=null?o[k]:d;}
function setOpt(m,k,v){(CFG.opt[m.id]=CFG.opt[m.id]||{})[k]=v;saveCfg();}
const progressOf=c=>(c.pi||0)*(track?track.step:0);
/* start grid: two columns, a row every 7 track indexes (70 px), the first row 4 indexes behind the line */
function gridSlot(k){
  const T=track,row=Math.floor(k/2),side=k%2?1:-1,back=4+row*7,idx=(T.N-back)%T.N;
  const nx=-Math.sin(T.ta[idx]),ny=Math.cos(T.ta[idx]),off=side*T.w*.2;
  return {x:T.px[idx]+nx*off,y:T.py[idx]+ny*off,a:T.ta[idx],idx,back};
}
let _marksFor=null,_marks=[];
const rankRace=list=>list.slice().sort((a,b)=>{
  if(a.finished&&b.finished)return a.finT-b.finT||a.ci-b.ci;
  if(a.finished)return-1;if(b.finished)return 1;
  return b.pi-a.pi||a.ci-b.ci;
});
const MODES=[
 {id:'race',name:'Table race',desc:'Race laps round a track on a table. First across the line wins; crashing stops you for a moment. Help for weaker players is chosen per player (Tiny, Easy, Adaptive ...).',
  lens:[1,2,3,4,5,6,7,8,9].map(n=>({n:n+(n===1?' lap':' laps'),v:n})),lenDef:2,
  plan(R){track=buildTrack(TRACKS[CFG.track]);G.total=track.total;},
  fill(R){   // decoration spots for the table props: clear of the road, new every round (seeded)
    const T=track;let placed=0,tries=0;
    while(placed<22&&tries<600){
      tries++;const x=150+R()*(WW-300),y=150+R()*(WH-300);
      let md=1e9;for(let i=0;i<T.N;i+=3)md=Math.min(md,Math.hypot(x-T.px[i],y-T.py[i]));
      if(md<T.w/2+130)continue;
      G.items.push({x,y,rot:R()*6.283,u:R(),k:.8+R()*.4});placed++;
    }
  },
  spawn(k,n){const g=gridSlot(k);return {x:g.x,y:g.y};},
  start(){
    players.forEach((c,k)=>{
      const g=gridSlot(k);
      c.x=g.x;c.y=g.y;c.a=g.a;c.idx=g.idx;c.pi=-g.back;c.dist=0;c.vx=c.vy=0;
      c.maxLap=-1;c.lapStart=0;c.lapTimes=[];c.offT=0;c.steerV=0;c.bumpT=0;c.wasStun=false;
      c.skill=.86+rand()*.12;c.lane=rand()*2-1;c.prog=progressOf(c);
    });
    G.t=0;
  },
  tick(dt){G.t+=dt;},
  touch(c,P){   // after the car moved: stun recovery, off-table respawn, laps, finish
    const T=track;
    if(c.stunT>0)c.wasStun=true;else if(c.wasStun){c.wasStun=false;c.a=T.ta[c.idx];}   // heading resets to straight when the stun ends
    if(!CFG.bump&&c.dist>T.w*1.15){c.offT+=1/60;if(c.offT>1.2)respawn(c);}else c.offT=0;   // bumper mode has walls instead
    const lap=Math.floor(c.pi/T.N);
    if(lap>c.maxLap){if(lap>=1)c.lapTimes.push(roundT-c.lapStart);c.lapStart=roundT;c.maxLap=lap;}
    if(!c.finished&&c.pi>=G.len*T.N){c.finished=true;c.finT=roundT;if(c.human)beep(660,.3);}
  },
  over(humans){return humans.every(c=>c.finished);},
  aiTarget(c){   // the point on the track a little ahead of the car (CPU driving and the Tiny/Easy steering help both aim here)
    const T=track,sp=Math.hypot(c.vx,c.vy),ti=((c.idx||0)+12+Math.floor(sp/28))%T.N,lane=(c.lane||0)*T.w*.22;
    return {x:T.px[ti]-Math.sin(T.ta[ti])*lane,y:T.py[ti]+Math.cos(T.ta[ti])*lane};
  },
  progress(c){return progressOf(c);},
  maxProgress(){return G.len*G.total;},
  barEnd(){return '★';},
  status(c){return 'Lap '+clamp(Math.floor((c.pi||0)/track.N)+1,1,G.len)+'/'+G.len;},
  top(){return fmt(Math.max(0,roundT));},
  banner(c){
    const tvx=Math.cos(track.ta[c.idx]),tvy=Math.sin(track.ta[c.idx]);
    if(c.vx*tvx+c.vy*tvy<-70)return {t:'WRONG WAY',col:'#ff5252',sz:32,y:.25};
    if(c.offT>.2)return 'Back on the table!';
    return null;
  },
  rank:rankRace,
  resultText(c){return c.finished?fmt(c.finT):'DNF';},
  bestOf(c){return c.lapTimes&&c.lapTimes.length?Math.min.apply(null,c.lapTimes):null;}, bestHigh:false,
  stunWord:'CRASH!',
  hud(p,c,hs){   // speed bar bottom left of the pane
    const sp=Math.hypot(c.vx,c.vy),bw=Math.min(150,p.w*.4),by=p.h-(IS_TOUCH?130:30);
    ctx.fillStyle='rgba(0,0,0,.45)';ctx.fillRect(12,by,bw,12);
    ctx.fillStyle=c.color;ctx.fillRect(12,by,bw*clamp(sp/CAR.max,0,1),12);
  },
  needsFinish:true,   // a win only counts for a car that finished
  bestKey(){return String(CFG.track);},
  stats(c,p){p.dist+=Math.max(0,c.pi||0)*track.step/10;},
  profLine(p){return p.rounds+' races, '+p.fin+' finishes, '+Math.round(p.dist)+' m, '+p.overall+' wins';},
  options(){return [
    {label:'Track',lobby:true,val:()=>TRACKS[CFG.track].name,adj:d=>{CFG.track=(CFG.track+d+TRACKS.length)%TRACKS.length;saveCfg();buildWorld();}},
    {label:'Bumpers',lobby:true,val:()=>!CFG.bump?'Off':'On, '+CFG.bumpD,
     adj:d=>{                       // Off, then each distance in turn (wraps round)
       const n=BUMP_STEPS.length+1,i=((CFG.bump?1+Math.max(0,BUMP_STEPS.indexOf(CFG.bumpD)):0)+d+n)%n;
       CFG.bump=i>0;if(i>0)CFG.bumpD=BUMP_STEPS[i-1];saveCfg();buildWorld();}}];},
  summary(){return [];},
  marks(){   // the track as a dotted line for the overview map (cached per track)
    if(_marksFor!==track){_marksFor=track;_marks=[];for(let i=0;i<track.N;i+=4)_marks.push({x:track.px[i],y:track.py[i],col:'rgba(255,255,255,.4)',r:2.4});}
    return _marks;
  },
  drawItems(x){},   // everything static is painted once into the table picture (paintWorld); skid marks are added to it as cars drift
  frame(dt){engineFrame();}}
];
CFG.mode=clamp(CFG.mode|0,0,MODES.length-1);
