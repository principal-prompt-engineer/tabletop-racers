/* ---------- round setup ---------- */
function startRound(next){   // next=true: another round of the same series (keeps totals)
  const hum=slots.filter(Boolean);
  if(!hum.length)return;
  if(!next){series.n=CFG.series;series.round=1;series.totals={};}
  buildWorld(true);
  const m=curMode(),aiN=clamp(CFG.ai,0,MAX_PLAYERS-hum.length);
  const used=new Set(hum.map(p=>p.slot)),free=[];
  for(let i=0;i<MAX_PLAYERS;i++)if(!used.has(i))free.push(i);
  const roles=[];
  for(let i=0;i<aiN;i++)roles.push({ai:true,ci:free[i%free.length],n:i+1});
  hum.forEach(p=>roles.push({ai:false,p}));
  players=[];
  roles.forEach((r,k)=>{
    const sp=m.spawn(k,roles.length),human=!r.ai,ci=human?r.p.slot:r.ci,tag=human?'P'+(r.p.slot+1):'CPU';
    players.push({human,dev:human?r.p.dev:null,slot:human?r.p.slot:-1,tag,
      label:human?(r.p.name?tag+' '+r.p.name:'Player '+(r.p.slot+1)):'CPU '+r.n,profName:human?r.p.name:'',
      lv:human?r.p.lv:-1,assist:0,stunT:0,grace:0,ci,color:COLORS[ci%8],
      x:sp.x,y:sp.y,vx:0,vy:0,score:0,leg:0,prog:0,lastT:0,finished:false,finT:0,inv:0,out:false,team:-1,
      skill:.8+rand()*.15,wob:rand()*6,cam:{x:sp.x,y:sp.y,s:.6}});
  });
  for(const c of players)c.prog=m.progress(c);
  state='count';cdT=3.6;roundT=0;doneT=0;holdMsg='';firstFinT=null;results=null;roundSaved=false;set.open=false;
  m.start();snapCams();
  if(IS_TOUCH)document.getElementById('touch').style.visibility='visible';
}

/* ---------- movement, assist, AI ---------- */
function aiControl(c){
  const t=curMode().aiTarget(c);
  if(!t)return NO_INPUT;
  let dx=t.x-c.x,dy=t.y-c.y;const d=Math.hypot(dx,dy)||1;dx/=d;dy/=d;
  const w=Math.sin(roundT*1.3+c.wob)*.18;                      // a little wander so CPUs are not clones
  const ax=dx-dy*w,ay=dy+dx*w,m=Math.hypot(ax,ay)||1;
  return {mx:ax/m*c.skill,my:ay/m*c.skill};
}
/* ---- the car (game specific): track position, CPU driver, physics ---- */
function locate(c){   // where on the track is this car: nearest track index (searched near the last one), px from the centre line, raw progress c.pi
  const T=track,N=T.N;let best=1e18,bi=c.idx;
  for(let o=-30;o<=30;o++){const i=(c.idx+o+N)%N,dx=c.x-T.px[i],dy=c.y-T.py[i],d=dx*dx+dy*dy;if(d<best){best=d;bi=i;}}
  if(best>250*250){best=1e18;for(let i=0;i<N;i++){const dx=c.x-T.px[i],dy=c.y-T.py[i],d=dx*dx+dy*dy;if(d<best){best=d;bi=i;}}}
  let d=bi-c.idx;if(d<-N/2)d+=N;if(d>N/2)d-=N;
  c.pi+=d;c.idx=bi;c.dist=Math.sqrt(best);
}
function driveAI(c){   // CPU driver (also drives a finished car round at 40% speed): steer at the look-ahead point, brake for bends, ease off when ahead of the humans
  const T=track,N=T.N,t=curMode().aiTarget(c);
  const steer=clamp(wrap(Math.atan2(t.y-c.y,t.x-c.x)-c.a)*2.5,-1,1);
  const curv=Math.abs(wrap(T.ta[(c.idx+40)%N]-T.ta[c.idx]));
  let hs=0,hn=0;for(const q of players)if(q.human){hs+=q.pi;hn++;}
  let rb=1;if(hn&&!c.finished)rb=1+clamp((hs/hn-c.pi)/(N*.25),-1,1)*.07;
  let tv=CAR.max*c.skill*rb*(1-.45*Math.min(1,curv/1.3));
  if(c.dist>T.w*.5)tv*=.8;
  if(c.finished)tv*=.4;
  const vf=c.vx*Math.cos(c.a)+c.vy*Math.sin(c.a);
  return {mx:steer,my:0,gas:vf<tv?1:0,brake:vf>tv*1.12?Math.min(1,(vf-tv)/100):0};
}
/* bumper wall: a perfect bounce. The part of the velocity heading into the wall is reversed at the same speed it arrived. */
function bumperHit(c,dt){
  const T=track,lim=bumpLimit(T);
  if(c.bumpT>0)c.bumpT-=dt||0;
  locate(c);
  if(c.dist<=lim)return;
  const i=c.idx,d=c.dist||1,nx=(c.x-T.px[i])/d,ny=(c.y-T.py[i])/d;
  c.x=T.px[i]+nx*lim;c.y=T.py[i]+ny*lim;
  const vn=c.vx*nx+c.vy*ny;
  if(vn>0){
    c.vx-=2*vn*nx;c.vy-=2*vn*ny;   // elastic bounce: flip the velocity along the wall normal, keep the part along the wall
    const fx=Math.cos(c.a),fy=Math.sin(c.a),fn=fx*nx+fy*ny;   // the car turns with it, otherwise it is left pointing into the wall
    if(fn>0)c.a=Math.atan2(fy-2*fn*ny,fx-2*fn*nx);
    if(vn>90&&!(c.bumpT>0)){beep(190,.06);c.bumpT=.15;}
  }
  c.dist=lim;
}
function respawn(c){const T=track,i=c.idx;c.x=T.px[i];c.y=T.py[i];c.a=T.ta[i];c.vx=c.vy=0;c.offT=0;c.inv=1.6;}
/* one car for one 1/60 s step. inp = NO_INPUT shape; boost = catch-up factor; P = difficulty parameters */
function stepWalker(c,inp,dt,P,boost){
  const T=track,N=T.N;
  locate(c);
  if(state!=='count'&&(!c.human||c.finished))inp=driveAI(c);
  const steer=clamp(inp.mx||0,-1,1),gas=clamp(Math.max(inp.gas||0,-(inp.my||0)),0,1),brake=clamp(Math.max(inp.brake||0,inp.my||0),0,1);
  const floorOn=state==='play'&&!c.finished;
  const fx=Math.cos(c.a),fy=Math.sin(c.a),rx=-fy,ry=fx;
  let vf=c.vx*fx+c.vy*fy,vl=c.vx*rx+c.vy*ry;
  const onRoad=c.dist<=T.w/2+4;
  const accS=CAR.acc*boost;                       // catch-up scales top speed and acceleration together
  const drag=(onRoad?1:3.4)*CAR.acc/CAR.max;
  if(gas>0)vf+=accS*gas*dt;
  if(brake>0){if(vf>5)vf-=950*dt*brake;else vf-=380*dt*brake;}
  vf-=vf*drag*dt;vf=Math.max(vf,-150);
  if(floorOn&&P.floor>0&&vf<P.floor)vf=Math.min(P.floor,vf+CAR.acc*1.2*dt);   // speed floor: never grinds to a halt
  vl*=Math.exp(-(onRoad?6.2:4)*dt);
  const sp=Math.abs(vf);
  let da=3.3*steer*clamp(vf/180,-1,1)*(1-.32*sp/CAR.max)*dt;
  if(P.as>0&&sp>60){
    if(Math.abs(steer)<.1)da+=wrap(T.ta[(c.idx+4)%N]-c.a)*Math.min(1,dt*2*P.as);          // self-centring along the track
    const e=clamp((c.dist-T.w*.3)/(T.w*.25),0,1);
    if(e>0){const ti=(c.idx+10)%N;da+=wrap(Math.atan2(T.py[ti]-c.y,T.px[ti]-c.x)-c.a)*P.as*e*3*dt;} // pull back from the road edge
  }
  c.a+=da;c.steerV=steer;
  const nfx=Math.cos(c.a),nfy=Math.sin(c.a),nrx=-nfy,nry=nfx;
  c.vx=nfx*vf+nrx*vl;c.vy=nfy*vf+nry*vl;
  c.x+=c.vx*dt;c.y+=c.vy*dt;
  if(Math.abs(vl)>105&&onRoad&&wctx){   // skid marks are drawn into the table picture
    wctx.fillStyle='rgba(10,10,10,.16)';
    for(const q of[-1,1]){wctx.fillRect(c.x-nfx*14+nrx*q*9-1.5,c.y-nfy*14+nry*q*9-1.5,3,3);}
  }
  if(CFG.bump)bumperHit(c,dt);
}
function crashHit(c){
  if(!c.human||c.stunT>0||c.grace>0)return;
  const P=prm(c);
  if(P.stun<=0){c.vx*=.5;c.vy*=.5;c.grace=.9;}        // soft bump: keep going at half speed
  else{c.stunT=P.stun;c.grace=P.stun+.9;c.vx=c.vy=0;}
}
function collide(){
  for(let i=0;i<players.length;i++)for(let j=i+1;j<players.length;j++){
    const a=players[i],b=players[j];if(a.inv>0||b.inv>0||a.out||b.out)continue;
    const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),min=WALK.r*2;
    if(d<min&&d>.01){
      const nx=dx/d,ny=dy/d,ov=(min-d)/2;
      a.x-=nx*ov;a.y-=ny*ov;b.x+=nx*ov;b.y+=ny*ov;
      const rv=(a.vx-b.vx)*nx+(a.vy-b.vy)*ny;
      if(rv>0){
        const im=rv*.65;a.vx-=im*nx;a.vy-=im*ny;b.vx+=im*nx;b.vy+=im*ny;
        if(rv>HIT_V&&state==='play'){crashHit(a);crashHit(b);}
      }
    }
  }
}
function missingDevice(){
  for(const c of players)if(c.human&&!devAlive(c.dev))return c.label+' ('+devLabel(c.dev)+')';
  return '';
}

/* ---------- one fixed 1/60 s step ---------- */
function update(dt){
  const m=curMode();
  if(state==='count'){
    const miss=missingDevice();
    if(miss){holdMsg='Waiting for '+miss+'...';return;}   // countdown holds while a joined device is missing
    holdMsg='';
    const before=Math.ceil(cdT);cdT-=dt;
    if(Math.ceil(cdT)!==before&&cdT>0&&cdT<3)beep(440,.12);
    if(cdT<=0){state='play';beep(880,.4);}
  }else if(state==='play'){
    const miss=missingDevice();
    if(miss){openPause('kb','Controller disconnected: '+miss);return;}
  }
  if(state==='play'){m.tick(dt);roundT+=dt;}else if(state==='done')roundT+=dt;
  const humans=players.filter(c=>c.human);
  // snapshot of every player's progress before anyone moves, so update order never decides who gets help
  for(const c of players)c.prog=m.progress(c);
  const lead=state==='play'?adaptiveStep(players,dt):Math.max.apply(null,players.filter(c=>!c.out).map(c=>c.prog).concat([0]));
  dbg.lead=lead;
  for(const c of players){
    const P=prm(c);
    if(c.out){c.vx=c.vy=0;continue;}                  // eliminated (set by the mode): no movement, no help, not the lead
    if(c.inv>0)c.inv-=dt;
    if(c.grace>0)c.grace-=dt;
    if(c.stunT>0){c.stunT-=dt;c.vx=c.vy=0;if(c.stunT<=0)c.stunT=0;}
    else{
      let inp;
      if(state==='count'||c.finished)inp=NO_INPUT;
      else if(c.human)inp=getInput(c.dev);
      else inp=aiControl(c);
      let boost=1;
      if(c.human&&state==='play'&&P.cu>0)boost=1+clamp((lead-c.prog)/600,0,P.cu);   // catch-up speed boost
      stepWalker(c,inp,dt,P,boost);
    }
    if(state==='play'&&!c.finished){
      const was=c.finished;m.touch(c,P);
      if(c.finished&&!was&&c.human&&humans.length>1&&firstFinT===null)firstFinT=roundT;
    }
  }
  collide();
  if(state==='play'){
    const timedOut=firstFinT!==null&&roundT-firstFinT>=FIRST_FIN_TIMEOUT;
    if(m.over(humans)||timedOut){doneT+=dt;if(doneT>1.2||timedOut){state='done';finishRound();}}
  }
}
const standings=()=>curMode().rank(players);
const rankHumans=list=>curMode().rank(list);
function finishRound(){
  if(roundSaved)return;roundSaved=true;
  const m=curMode(),st=standings(),humans=players.filter(c=>c.human);
  const won=c=>!m.needsFinish||c.finished;       // a race win only counts for a car that crossed the line
  for(const c of players)c.prog=m.progress(c);
  const classes=[];
  for(const lv of LV_SHOW){
    const list=rankHumans(humans.filter(c=>c.lv===lv));
    if(list.length)classes.push({lv,list});
  }
  const hr0=rankHumans(humans);                // series points: 1st human gets n, last gets 1
  hr0.forEach((c,i)=>{series.totals[c.slot]=(series.totals[c.slot]||0)+(humans.length-i);});
  results={overall:st,classes,multi:humans.length>1,summary:m.summary?m.summary():[],round:series.round,n:series.n};
  for(const c of humans){                      // saved profiles: named players only
    if(!c.profName)continue;
    const p=getProf(c.profName);
    p.rounds++;if(c.finished)p.fin++;p.pts+=c.score||0;
    if(m.stats)m.stats(c,p);                    // optional: the mode keeps its own profile numbers
    const b=m.bestOf(c),bk=m.bestKey?m.bestKey():m.id;
    if(b!=null){const old=p.best[bk];if(old==null||(m.bestHigh?b>old:b<old))p.best[bk]=b;}
  }
  if(humans.length>1){
    const hr=rankHumans(humans);
    if(hr[0].profName&&won(hr[0]))getProf(hr[0].profName).overall++;
    for(const cl of classes){const w=cl.list[0];if(w.profName&&won(w))getProf(w.profName).wins[LEVELS[cl.lv].name]++;}
  }
  saveProfiles();
}
