/* ---------- world: the table, the track painted on it, shared round state G ---------- */
let world=null, wctx=null, seed=1;
/* G: round state shared with the mode. For the race: G.len = laps, G.t unused (the race clock is roundT), G.total = lap length in px,
   G.items = decoration spots for the table props (x, y, rot, u = which prop, k = size jitter), G.rocks = [] (nothing blocks a car). */
const G={t:0,len:0,items:[],rocks:[],zones:[],route:[],legLen:[],cum:[],total:0};
function rnd(s){let a=s;return()=>{a=(a*16807)%2147483647;return(a-1)/2147483646;};}
const curMode=()=>MODES[CFG.mode]||MODES[0];
function lenOf(m){const i=clamp(CFG.len[m.id]!=null?CFG.len[m.id]:m.lenDef,0,m.lens.length-1);return m.lens[i];}
const obstacles=()=>G.rocks;   // what blocks movement (circles {x,y,r}); the shell and the maps only ever ask for this. Props are decoration: cars drive over them.
function buildWorld(fresh){
  if(fresh||!seed)seed=1+Math.floor(rand()*2e9);   // fresh = a new round: new seed, so the table clutter is new; no argument = redraw the same table (e.g. after changing bumpers or art)
  const R=rnd(seed),m=curMode();
  G.items=[];G.rocks=[];G.zones=[];G.route=[];G.legLen=[];G.cum=[];G.total=0;G.t=0;G.len=lenOf(m).v;
  m.plan(R);m.fill(R);
  paintWorld();
}
function paintWorld(){
  const T=track;
  world=document.createElement('canvas');world.width=WW*WS;world.height=WH*WS;
  const g=world.getContext('2d');wctx=g;g.scale(WS,WS);
  const R=rnd(1234+CFG.track*77);   // the wood grain is the same every round; only the props move (G.items)
  const useTex=CFG.styleTable!=='builtin',roadImg=useTex?IMG.road:null;
  const tex=useTex?(IMG[T.tableKey]||IMG.table):null;
  if(tex){g.fillStyle=texPattern(g,tex);g.fillRect(0,0,WW,WH);}
  else{
    g.fillStyle=T.wood[0];g.fillRect(0,0,WW,WH);
    for(let y=0;y<WH;y+=170){
      g.fillStyle=R()<.5?T.wood[1]:T.wood[0];g.globalAlpha=.55;g.fillRect(0,y,WW,170);g.globalAlpha=1;
      g.fillStyle='rgba(0,0,0,.35)';g.fillRect(0,y,WW,3);
      for(let k=0;k<70;k++){g.fillStyle=`rgba(0,0,0,${.03+R()*.05})`;g.fillRect(R()*WW,y+R()*170,60+R()*320,1.5);}
      const off=R()*WW;g.fillStyle='rgba(0,0,0,.3)';g.fillRect(off,y,3,170);
    }
  }
  const vg=g.createRadialGradient(WW/2,WH/2,WH*.3,WW/2,WH/2,WW*.7);
  vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.45)');g.fillStyle=vg;g.fillRect(0,0,WW,WH);
  const propList=CFG.styleProps==='builtin'?[]:PROPS;
  if(propList.length){
    // keep each prop's natural proportions: the typical prop is about 130 table px across, a marble is much smaller, a bowl bigger
    const dims=propList.map(im=>Math.max(im.width,im.height)).sort((a,b)=>a-b),med=dims[dims.length>>1]||1;
    for(const it of G.items){
      const im=propList[Math.floor(it.u*propList.length)%propList.length],k=130/med*it.k,dw=im.width*k,dh=im.height*k;
      g.save();g.translate(it.x,it.y);g.rotate(it.rot);g.shadowColor='rgba(0,0,0,.5)';g.shadowBlur=18;g.shadowOffsetY=8;
      g.drawImage(im,-dw/2,-dh/2,dw,dh);g.restore();
    }
  }
  const path=()=>{g.beginPath();g.moveTo(T.px[0],T.py[0]);for(let i=1;i<T.N;i++)g.lineTo(T.px[i],T.py[i]);g.closePath();};
  g.lineJoin='round';g.lineCap='butt';
  g.save();g.shadowColor='rgba(0,0,0,.5)';g.shadowBlur=34;g.shadowOffsetY=12;
  path();g.setLineDash([]);g.lineWidth=T.w+26;g.strokeStyle='#d8d8d8';g.stroke();g.restore();
  path();g.lineWidth=T.w+26;g.setLineDash([26,26]);g.strokeStyle='#d6323c';g.stroke();
  g.setLineDash([]);
  path();g.lineWidth=T.w;g.strokeStyle=roadImg?texPattern(g,roadImg):'#3b3d44';g.stroke();
  if(!roadImg){
    for(let k=0;k<5000;k++){
      const i=Math.floor(R()*T.N),o=(R()-.5)*T.w*.95,nx=-Math.sin(T.ta[i]),ny=Math.cos(T.ta[i]);
      g.fillStyle=`rgba(${R()<.5?255:0},${R()<.5?255:0},${R()<.5?255:0},${.04+R()*.05})`;
      g.fillRect(T.px[i]+nx*o,T.py[i]+ny*o,2,2);
    }
  }
  path();g.lineWidth=4;g.setLineDash([22,26]);g.strokeStyle='rgba(255,255,255,.5)';g.stroke();g.setLineDash([]);
  g.save();g.translate(T.px[0],T.py[0]);g.rotate(T.ta[0]);
  const sq=T.w/10;
  for(let r=0;r<2;r++)for(let c=0;c<10;c++){g.fillStyle=(r+c)%2?'#111':'#f4f4f4';g.fillRect(-sq+r*sq,-T.w/2+c*sq,sq,sq);}
  g.restore();
  drawBumpers(g,T);
}
