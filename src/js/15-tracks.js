/* ---------- tracks and bumper walls (game specific: the shell never reads these, only the race mode and the car code do) ---------- */
const wrap=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a;};
let track=null;   // the track of the current round, built by buildTrack() from TRACKS[CFG.track]
const TRACKS=[
 {name:'Kitchen Table',w:150,tableKey:'table_kitchen',wood:['#9a6a3c','#8a5a30'],
  pts:[[600,500],[1500,350],[2500,500],[2900,1000],[2500,1500],[1900,1300],[1500,1700],[800,1800],[400,1300],[500,900]]},
 {name:'Study Desk',w:140,tableKey:'table_desk',wood:['#3f6b4f','#365c44'],
  pts:[[800,400],[1600,500],[2400,350],[3000,800],[2700,1300],[2000,1000],[1400,1400],[2000,1900],[1000,1900],[400,1500],[300,900]]},
 {name:'Workbench',w:130,tableKey:'table_bench',wood:['#8d8f94','#7c7f85'],
  pts:[[700,600],[1300,400],[1900,700],[2500,450],[2900,900],[2500,1300],[1900,1100],[1500,1500],[2100,1900],[1200,2000],[600,1700],[900,1200],[400,1000]]}
];
CFG.track=clamp(CFG.track|0,0,TRACKS.length-1);


/* ---------- track building ---------- */
function buildTrack(t){
  const P=t.pts,n=P.length,dense=[];
  for(let i=0;i<n;i++){
    const p0=P[(i-1+n)%n],p1=P[i],p2=P[(i+1)%n],p3=P[(i+2)%n];
    for(let s=0;s<40;s++){
      const u=s/40,u2=u*u,u3=u2*u;
      const f=k=>0.5*((2*p1[k])+(-p0[k]+p2[k])*u+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*u2+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*u3);
      dense.push([f(0),f(1)]);
    }
  }
  const L=dense.length,cum=[0];
  for(let i=0;i<L;i++){const a=dense[i],b=dense[(i+1)%L];cum.push(cum[i]+Math.hypot(b[0]-a[0],b[1]-a[1]));}
  const total=cum[L],N=Math.round(total/10);
  const px=new Float32Array(N),py=new Float32Array(N),ta=new Float32Array(N);
  let j=0;
  for(let k=0;k<N;k++){
    const tg=k*total/N;
    while(cum[j+1]<tg)j++;
    const a=dense[j],b=dense[(j+1)%L],seg=cum[j+1]-cum[j]||1,u=(tg-cum[j])/seg;
    px[k]=a[0]+(b[0]-a[0])*u;py[k]=a[1]+(b[1]-a[1])*u;
  }
  for(let i=0;i<N;i++){const a=(i-1+N)%N,b=(i+1)%N;ta[i]=Math.atan2(py[b]-py[a],px[b]-px[a]);}
  let mnx=1e9,mny=1e9,mxx=-1e9,mxy=-1e9;
  for(let i=0;i<N;i++){mnx=Math.min(mnx,px[i]);mny=Math.min(mny,py[i]);mxx=Math.max(mxx,px[i]);mxy=Math.max(mxy,py[i]);}
  return {name:t.name,w:t.w,N,px,py,ta,total,step:total/N,tableKey:t.tableKey,wood:t.wood,bb:[mnx,mny,mxx,mxy]};
}
/* ---------- bumper mode ----------
   The wall is the line where a car's centre is exactly T.w/2 + CFG.bumpD from the middle of the road (so 0 = right at the road edge,
   never on dirt). It follows the road on both sides. For big distances the offset line would fold over itself on tight bends and run
   across other parts of the track, so a bumper piece is only drawn where its nearest road really is the stretch it is following.
   The physics uses the same rule (distance to the nearest road), so the drawing and the wall always agree. */
const BUMP_STEPS=[0,30,60,100,150,200,300,400];
const bumpLimit=T=>T.w/2+CFG.bumpD;
function bumperRuns(T){
  const R=bumpLimit(T)+20,N=T.N,out=[];
  const okAt=(x,y)=>{
    if(x<24||y<24||x>WW-24||y>WH-24)return false;
    const r2=(R-4)*(R-4);
    for(let k=0;k<N;k++){const dx=x-T.px[k],dy=y-T.py[k];if(dx*dx+dy*dy<r2)return false;}
    return true;
  };
  for(const side of[-1,1]){
    const pts=[],ok=[];
    for(let i=0;i<N;i++){
      const x=T.px[i]-Math.sin(T.ta[i])*R*side,y=T.py[i]+Math.cos(T.ta[i])*R*side;
      pts.push([x,y]);ok.push(okAt(x,y));
    }
    let st=ok.indexOf(false);
    if(st<0){out.push({pts:pts.concat([pts[0]])});continue;}
    let run=[];
    for(let k=1;k<=N;k++){
      const i=(st+k)%N;
      if(ok[i])run.push(pts[i]);else{if(run.length>1)out.push({pts:run});run=[];}
    }
    if(run.length>1)out.push({pts:run});
  }
  return out;
}
function drawBumpers(g,T){
  if(!CFG.bump)return;
  const runs=bumperRuns(T);
  g.save();g.lineJoin='round';g.lineCap='round';
  for(const pass of[0,1,2]){
    for(const r of runs){
      g.beginPath();r.pts.forEach((q,i)=>i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]));
      if(pass===0){g.shadowColor='rgba(0,0,0,.55)';g.shadowBlur=14;g.shadowOffsetY=6;g.lineWidth=16;g.strokeStyle='#e9e9e9';g.setLineDash([]);}
      else if(pass===1){g.shadowColor='transparent';g.lineWidth=16;g.strokeStyle='#d6323c';g.setLineDash([22,22]);}
      else{g.lineWidth=4;g.strokeStyle='rgba(255,255,255,.55)';g.setLineDash([]);}
      g.stroke();
    }
  }
  g.restore();
}
