/* ---------- drawing helpers ---------- */
function ordinal(n){const s=['th','st','nd','rd'],v=n%100;return n+(s[(v-20)%10]||s[v]||s[0]);}
function fmt(t){const m=Math.floor(t/60),s=t-m*60;return m+':'+(s<10?'0':'')+s.toFixed(2);}
function txt(s,x,y,size,col,al,stroke){
  ctx.font='bold '+size+'px system-ui,sans-serif';ctx.textAlign=al||'left';ctx.textBaseline='alphabetic';
  ctx.lineWidth=Math.max(3,size/6);ctx.strokeStyle='rgba(0,0,0,.75)';ctx.lineJoin='round';
  if(stroke!==false)ctx.strokeText(s,x,y);ctx.fillStyle=col||'#fff';ctx.fillText(s,x,y);
}
function wrapLines(s,maxW,size){
  ctx.font=size+'px system-ui,sans-serif';
  const w=String(s).split(' '),out=[];let l='';
  for(const x of w){const t=l?l+' '+x:x;if(ctx.measureText(t).width>maxW&&l){out.push(l);l=x;}else l=t;}
  if(l)out.push(l);return out;
}
function rrect(x,y,w,h,r,fill,stroke,lw){
  ctx.beginPath();ctx.roundRect(x,y,w,h,r);
  if(fill){ctx.fillStyle=fill;ctx.fill();}
  if(stroke){ctx.lineWidth=lw||2;ctx.strokeStyle=stroke;ctx.stroke();}
}
/* PLAYER MARKS: every player has a colour AND a shape (SHAPE_NAMES, by colour index) and a number (P1, P2 ...). CFG.ident picks both / shape only / number only / none.
   The same badge is used in the lobby (left of "P1  Red"), HUD, results, maps and above the character. */
function shapePath(x,y,r,i){
  ctx.beginPath();
  const poly=(n,rot,rr)=>{for(let k=0;k<n;k++){const a=rot+k*2*Math.PI/n,px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr;if(k)ctx.lineTo(px,py);else ctx.moveTo(px,py);}ctx.closePath();};
  switch(((i%8)+8)%8){
    case 0:ctx.arc(x,y,r,0,7);break;                                   // circle
    case 1:ctx.rect(x-r*.85,y-r*.85,r*1.7,r*1.7);break;                // square
    case 2:poly(3,-Math.PI/2,r*1.2);break;                             // triangle
    case 3:poly(4,-Math.PI/2,r*1.25);break;                            // diamond
    case 4:for(let k=0;k<10;k++){const a=-Math.PI/2+k*Math.PI/5,rr=k%2?r*.5:r*1.2,px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr;if(k)ctx.lineTo(px,py);else ctx.moveTo(px,py);}ctx.closePath();break;   // star
    case 5:poly(6,0,r*1.1);break;                                      // hexagon
    case 6:{const t=r*.4;ctx.moveTo(x-t,y-r);ctx.lineTo(x+t,y-r);ctx.lineTo(x+t,y-t);ctx.lineTo(x+r,y-t);ctx.lineTo(x+r,y+t);ctx.lineTo(x+t,y+t);ctx.lineTo(x+t,y+r);ctx.lineTo(x-t,y+r);ctx.lineTo(x-t,y+t);ctx.lineTo(x-r,y+t);ctx.lineTo(x-r,y-t);ctx.lineTo(x-t,y-t);ctx.closePath();break;}   // plus
    default:poly(5,-Math.PI/2,r*1.15);                                 // pentagon
  }
}
const identShape=()=>CFG.ident==='both'||CFG.ident==='shape', identNum=()=>CFG.ident==='both'||CFG.ident==='num', identNone=()=>CFG.ident==='none';
function drawBadge(x,y,r,c,opt){   // c = anything with {color, ci}; opt.map = thinner outline for small map markers
  shapePath(x,y,r,identShape()?c.ci:0);
  ctx.lineJoin='round';ctx.lineWidth=opt&&opt.map?2:Math.max(3,r*.32);ctx.strokeStyle='rgba(0,0,0,.75)';ctx.stroke();   // outline first, then the fill on top: the same thin outline as the text and the arrows
  ctx.fillStyle=c.color;ctx.fill();
}
/* what is written above a player in the world: their saved name (if set and CFG.names is on), otherwise P1, P2 ... (when numbers are shown) */
/* HUD name: 'P1 ANNA' for a named player, 'Player 1' for a Guest or when names are switched off (CFG.names) */
function hudName(c){return !c.human?c.label:((CFG.names&&c.profName)?c.tag+' '+c.profName:'Player '+(c.slot+1));}
function tagText(c){return (CFG.names&&c.profName)?c.profName:(identNum()?c.tag:'');}

let paneZoom=1;   // camera zoom of the pane being drawn: tags above players are enlarged when zoomed out so they stay readable
function drawWalker(c){   // a toy car (art sprite if imported, otherwise drawn), player marks (shape / number / saved name) above
  ctx.save();ctx.translate(c.x,c.y);ctx.rotate(c.a);
  if(c.inv>0&&Math.floor(c.inv*10)%2)ctx.globalAlpha=.4;
  if(c.out)ctx.globalAlpha=.3;
  const im=spriteFor(c);
  ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.ellipse(3,5,CAR.len*.55,CAR.wid*.55,0,0,7);ctx.fill();
  if(c.lv===LV_ADAPTIVE&&c.assist>.03){ctx.save();ctx.strokeStyle=THEME.help;ctx.globalAlpha*=.25+.55*c.assist;ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,0,CAR.len*.62,CAR.wid*.8,0,0,7);ctx.stroke();ctx.restore();}   // glow = Adaptive help level
  if(im){ctx.drawImage(im,-CAR.len*.62,-CAR.len*.62*im.height/im.width,CAR.len*1.24,CAR.len*1.24*im.height/im.width);}
  else{
    ctx.fillStyle='#111';
    for(const sx of[-1,1])for(const sy of[-1,1]){
      ctx.save();ctx.translate(sx*13,sy*11.5);if(sx>0)ctx.rotate((c.steerV||0)*.4);ctx.fillRect(-5,-2.5,10,5);ctx.restore();
    }
    ctx.fillStyle=c.color;ctx.beginPath();ctx.roundRect(-CAR.len/2,-CAR.wid/2+1,CAR.len,CAR.wid-2,7);ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.28)';ctx.fillRect(-CAR.len/2+3,-2,CAR.len-6,4);
    ctx.fillStyle='rgba(20,25,40,.85)';ctx.beginPath();ctx.roundRect(-8,-8,18,16,4);ctx.fill();
    ctx.fillStyle='rgba(170,215,255,.9)';ctx.fillRect(6,-6.5,3,13);
    ctx.fillStyle='#fff6b0';ctx.fillRect(CAR.len/2-3,-8,3,4);ctx.fillRect(CAR.len/2-3,4,3,4);
    ctx.fillStyle='#a00';ctx.fillRect(-CAR.len/2,-8,2.5,4);ctx.fillRect(-CAR.len/2,4,2.5,4);
  }
  ctx.restore();
  if(c.human&&identNum()){   // number on the car body: identity without colour (follows Settings > Player marks)
    ctx.save();ctx.translate(c.x,c.y);ctx.font='bold 13px system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.lineWidth=3;ctx.strokeStyle='rgba(0,0,0,.8)';ctx.strokeText(String(c.slot+1),0,1);ctx.fillStyle=THEME.text;ctx.fillText(String(c.slot+1),0,1);ctx.restore();
  }
  if(c.human){
    const k=clamp(.8/paneZoom,1,2.2);
    ctx.save();ctx.translate(c.x,c.y-28-6*k);ctx.scale(k,k);
    const label=tagText(c),sh=identShape();
    ctx.font='bold 15px system-ui';ctx.textAlign='center';
    const tw=label?ctx.measureText(label).width:0,total=tw+(sh&&label?20:0)+(sh&&!label?16:0),x0=-total/2;
    if(sh)drawBadge(x0+8,-18,8,c);                                      // shape in the player colour
    if(label){ctx.lineWidth=4;ctx.strokeStyle='#000';ctx.fillStyle='#fff';const tx=x0+(sh?20:0)+tw/2;ctx.strokeText(label,tx,-13);ctx.fillText(label,tx,-13);}
    ctx.fillStyle=c.color;ctx.strokeStyle='#000';ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(-6,-4);ctx.lineTo(6,-4);ctx.lineTo(0,4);ctx.closePath();ctx.stroke();ctx.fill();
    if(c.stunT>0){ctx.fillStyle=THEME.title;ctx.fillText('*  *',0,-34);}
    ctx.restore();
  }
}
function drawWorldPane(p){
  ctx.save();ctx.beginPath();ctx.rect(p.x,p.y,p.w,p.h);ctx.clip();
  ctx.fillStyle=THEME.bg;ctx.fillRect(p.x,p.y,p.w,p.h);
  paneZoom=p.cam.s;
  ctx.translate(p.x+p.w/2,p.y+p.h/2);ctx.scale(p.cam.s,p.cam.s);ctx.translate(-p.cam.x,-p.cam.y);
  if(world)ctx.drawImage(world,0,0,WW,WH);
  curMode().drawItems(ctx);
  const sorted=players.slice().sort((a,b)=>a.y-b.y);
  for(const c of sorted)drawWalker(c);
  ctx.restore();
}
function playerLines(c,st,x,y,hs){
  const pl=st.indexOf(c)+1;
  ctx.fillStyle=c.color;ctx.fillRect(x,y-18*hs,6,44*hs);
  const bw=14*hs,none=identNone();
  if(!none)drawBadge(x+14+bw*.6,y-6*hs,bw*.5,c);                           // badge left of the name
  txt(hudName(c),x+14+(none?0:bw*1.5),y,18*hs,THEME.text);
  txt(lvLabel(c),x+14,y+22*hs,14*hs,c.lv===LV_ADAPTIVE&&c.assist>.02?THEME.help:THEME.info);
  txt(`${ordinal(pl)} / ${players.length}   ${curMode().status(c)}`,x+14,y+42*hs,15*hs,THEME.text);
}
function drawPaneHUD(p,st){
  const hs=CFG.hud*(p.w<500?.85:1),m=curMode();
  ctx.save();ctx.beginPath();ctx.rect(p.x,p.y,p.w,p.h);ctx.clip();ctx.translate(p.x,p.y);
  if(p.focus)playerLines(p.focus,st,12,30*hs,hs);
  else p.list.forEach((c,i)=>playerLines(c,st,12,30*hs+i*54*hs,hs));
  if(state!=='lobby'){
    txt(m.top(),p.w/2,26*hs,16*hs,'#ddd','center');
    if(firstFinT!==null&&state==='play')txt('Results in '+Math.max(0,Math.ceil(FIRST_FIN_TIMEOUT-(roundT-firstFinT)))+'s',p.w/2,48*hs,15*hs,THEME.title,'center');
  }
  const c=p.focus;
  if(c&&state==='play'){
    if(c.finished)txt('FINISHED! '+ordinal(st.indexOf(c)+1),p.w/2,p.h*.25,32*hs,THEME.go,'center');
    else if(c.stunT>0)txt(m.stunWord||'BUMP!',p.w/2,p.h*.25,36*hs,THEME.title,'center');
    else{const b=m.banner(c);if(b){const o=typeof b==='string'?{t:b}:b;txt(o.t,p.w/2,p.h*(o.y||.3),(o.sz||22)*hs,o.col||THEME.title,'center');}}
  }
  if(c&&m.hud)m.hud(p,c,hs);   // optional: the mode draws its own extras inside this pane
  ctx.restore();
}
function drawFrameWorld(){
  ctx.setTransform(DPR,0,0,DPR,0,0);
  ctx.fillStyle=THEME.bg;ctx.fillRect(0,0,VW,VH);
  const panes=layoutPanes();
  for(const p of panes)drawWorldPane(p);
  if(state==='lobby')return panes;
  const st=standings();
  for(const p of panes)drawPaneHUD(p,st);
  if(panes.length>1){ctx.fillStyle='#000';for(const p of panes){ctx.fillRect(p.x,p.y,p.w,2);ctx.fillRect(p.x,p.y,2,p.h);}}
  for(const j of mapJobs(panes))drawMap(j);
  if(state==='count'){
    if(holdMsg)txt(holdMsg,VW/2,VH/2+10,26,THEME.title,'center');
    else{const n=Math.ceil(cdT-.6);txt(n>0?String(n):'GO!',VW/2,VH/2+30,120,n>0?THEME.text:THEME.go,'center');}
  }else if(state==='play'&&roundT<.9)txt('GO!',VW/2,VH/2+30,120,THEME.go,'center');
  drawDebug();
  return panes;
}

/* ---------- lobby / settings / pause / results screens ---------- */
function drawWheel(p,x,y,w,h){
  const wl=p.wheel;
  txt('Type a name',x+w/2,y+20,14,THEME.dim,'center',false);
  txt((wl.text||'_')+'_',x+w/2,y+50,26,'#fff','center');
  const n=LETTERS.length,cx=x+w/2,cy=y+h*.62,step=Math.min(26,(w-30)/9);
  for(let o=-4;o<=4;o++){
    const L=LETTERS[(wl.ch+o+n*3)%n],a=1-Math.abs(o)*.2;
    ctx.globalAlpha=Math.max(.15,a);
    txt(L,cx+o*step,cy+(o===0?8:0),o===0?32:20,o===0?THEME.title:'#fff',o===0?'center':'center',o===0);
  }
  ctx.globalAlpha=1;
  txt('◀ ▶ letter · ▲ ▼ jump · OK add · BACK delete · ✓ done',x+w/2,y+h-12,11,THEME.dim,'center',false);
}
/* The original menu look: grey label right-aligned just left of centre, white value left-aligned just right of centre.
   The row under the cursor gets a marker, a white label and a yellow value with arrows when it can be adjusted. */
function menuRow(cx,y,label,val,o){
  const sz=o.sz||22,sel=!!o.sel;
  txt((sel?'▶ ':'')+label,cx-14,y,sz,sel?'#fff':THEME.label,'right');
  if(val!=null)txt((o.adj&&sel?'◀ ':'')+val+(o.adj&&sel?' ▶':''),cx+14,y,sz,o.col||(sel?THEME.title:'#fff'),'left');
}
let LT={s:1,ox:0,oy:0};   // transform of the player cell being drawn (lobby shrinks cells to fit), so click areas stay in screen space
function lhit(x,y,w,h,fn){hits.push({x:LT.ox+x*LT.s,y:LT.oy+y*LT.s,w:w*LT.s,h:h*LT.s,fn});}
function drawPlayer(p,cx,y0,colW,bh,sz,rh){
  const col=COLORS[p.slot],hl=!p.ready&&!p.wheel;
  ctx.fillStyle=col;ctx.fillRect(cx-colW*.42,y0,colW*.84,3);
  const head='P'+(p.slot+1)+'  '+COLOR_NAMES[p.slot];
  ctx.font='bold 18px system-ui,sans-serif';const hw=ctx.measureText(head).width;
  if(identNone())txt(head,cx,y0+26,18,col,'center');
  else{drawBadge(cx-hw/2-16,y0+20,10,{color:col,ci:p.slot});             // shape badge to the left of "P1  Red"
    txt(head,cx+10,y0+26,18,col,'center');}
  txt(devHint(p.dev),cx,y0+44,12,THEME.dim,'center',false);
  if(p.wheel){drawWheel(p,cx-colW/2,y0+48,colW,bh-48);return;}
  const newName=p.nameSel===nameOptions().length-1;
  const rows=[
    {k:'Name',v:newName?'+ New':(p.name||'Guest'),adj:true,fn:()=>{leaveNameRow(p);p.row=0;}},
    {k:'Level',v:LEVELS[p.lv].name,adj:true,fn:()=>{leaveNameRow(p);p.row=1;p.lv=(p.lv+1)%LEVELS.length;}},
    {k:'Ready',v:p.ready?'READY!':'not yet',adj:false,col:p.ready?THEME.go:'#888',fn:()=>{leaveNameRow(p);p.row=2;if(p.ready){p.ready=false;graceT=0;}else if(canReady(p)){p.ready=true;graceT=0;}}}];
  rows.forEach((r,i)=>{
    const y=y0+76+i*rh;
    menuRow(cx,y,r.k,r.v,{sz,sel:hl&&p.row===i,adj:r.adj,col:r.col});
    lhit(cx-colW/2,y-sz,colW,rh,r.fn);
  });
  const ny=y0+76+3*rh;
  if(nameTaken(p))txt('that name is already in use',cx,ny,12,THEME.bad,'center',false);
  else if(hl&&p.row===1)wrapLines(LEVELS[p.lv].desc,colW-16,12).slice(0,3).forEach((l,i)=>txt(l,cx,ny+i*15,12,'#aab6c6','center',false));
}
/* one gamepad icon per connected controller, top right: see-through while only connected, solid in the player colour once joined */
function drawPadIcon(x,y,w,color,solid){
  const h=w*.62;
  ctx.save();ctx.globalAlpha=solid?1:.3;ctx.fillStyle=color;
  ctx.beginPath();
  ctx.moveTo(x+w*.22,y);ctx.lineTo(x+w*.78,y);
  ctx.quadraticCurveTo(x+w*.9,y,x+w*.95,y+h*.5);
  ctx.quadraticCurveTo(x+w,y+h*.95,x+w*.86,y+h);
  ctx.quadraticCurveTo(x+w*.74,y+h*1.02,x+w*.66,y+h*.78);
  ctx.lineTo(x+w*.34,y+h*.78);
  ctx.quadraticCurveTo(x+w*.26,y+h*1.02,x+w*.14,y+h);
  ctx.quadraticCurveTo(x,y+h*.95,x+w*.05,y+h*.5);
  ctx.quadraticCurveTo(x+w*.1,y,x+w*.22,y);
  ctx.closePath();ctx.fill();
  ctx.globalAlpha=solid?.9:.5;ctx.fillStyle='#10151c';          // d-pad and buttons cut out
  ctx.fillRect(x+w*.2,y+h*.4,w*.2,h*.12);ctx.fillRect(x+w*.24,y+h*.26,w*.12,h*.4);
  ctx.beginPath();ctx.arc(x+w*.66,y+h*.5,w*.05,0,7);ctx.arc(x+w*.78,y+h*.38,w*.05,0,7);ctx.fill();
  ctx.restore();
}
function drawPadIcons(){
  const w=38,gap=8;let x=VW-12-w;
  for(const p of pads()){
    const pl=slotOf(padId(p));
    drawPadIcon(x,12,w,pl?COLORS[pl.slot]:'#fff',!!pl);
    if(pl)txt('P'+(pl.slot+1),x+w/2,12+w*.62+16,12,COLORS[pl.slot],'center');
    x-=w+gap;if(x<8)break;
  }
}
/* Before anyone joins: only the join heading and the control help. The round options (Game, Length, Rounds, Screen, Map, CPU players, mode options)
   and the player tiles appear once the first player joins. Colours: heading go, Keyboard N = player colour N, controller = link, note = dim. */
function drawPreJoin(cx,y,compact){
  const size=compact?13:15,lineH=compact?19:23;
  y+=compact?10:34;
  txt('Press any button to join',cx,y+34,compact?24:30,THEME.go,'center');
  SCHEMES.forEach((k,i)=>txt('Keyboard '+(i+1)+':  '+devHint(k.id),cx,y+68+i*lineH,size,COLORS[i],'center',false));               // slot colour
  txt('Controller:  '+devHint('pad'),cx,y+68+SCHEMES.length*lineH,size,THEME.link,'center',false);                                  // theme link colour
  if(!pads().length)txt('Controllers appear after their first button press',cx,y+68+(SCHEMES.length+1)*lineH,size-3,THEME.dim,'center',false);
}
function drawLobby(){
  hits.length=0;
  ctx.fillStyle='rgba(0,0,0,.62)';ctx.fillRect(0,0,VW,VH);
  const cx=VW/2,compact=VH<640,j=slots.filter(Boolean);
  let y=Math.max(compact?34:46,VH*(compact?.09:.13));
  txt(APP_TITLE,cx,y,Math.min(64,VW/10,compact?44:64),THEME.title,'center');y+=compact?26:42;
  txt(APP_TAGLINE,cx,y,compact?15:18,'#ddd','center');y+=compact?30:46;
  if(!j.length){drawPreJoin(cx,y,compact);drawLobbyFooter(cx,j);return;}   // nothing but the join help until a button is pressed
  // shared round options, exactly like the first menu
  const dense=lobbyRows().length>6,sz=compact?(dense?16:18):(dense?20:22),rh=compact?(dense?24:28):(dense?28:34);   // more rows = tighter rows
  const LR=lobbyRows();
  LR.forEach((r,i)=>{
    const here=j.filter(p=>!p.ready&&!p.wheel&&p.row===i-LR.length),sel=here.length>0;
    menuRow(cx,y,r.label,r.val(),{sz,sel,adj:true});
    ctx.font='bold '+sz+'px system-ui,sans-serif';
    const lw=ctx.measureText((sel?'▶ ':'')+r.label).width;
    here.forEach((p,k)=>drawBadge(cx-14-lw-18-k*18,y-sz*.32,sz*.3,{color:COLORS[p.slot],ci:p.slot},{map:true}));   // whose cursor is here: that player's badge
    hits.push({x:cx-300,y:y-sz,w:600,h:rh,fn:()=>{r.adj(1);optionsChanged();}});
    y+=rh;
  });
  y+=compact?8:18;
  // players: fixed-size tiles in a centred grid. Tiles keep their size while they fit: a full row wraps to a new row first, and only when
  // the rows no longer fit the screen do the tiles shrink. The "press any button" tile is just another tile at the end (the only one when nobody has joined).
  const hs=compact?12:15,hh=compact?16:20;
  const items=j.map(p=>({p}));if(slots.includes(null))items.push({join:true});
  const n=items.length,prh=compact?26:30,psz=compact?16:18,bh=76+3*prh+54,nw=272,nh=j.length?bh+6:84;   // the lone join tile needs no player-sized height
  const availW=VW-24,availH=Math.max(120,VH-(IS_TOUCH?150:100)-y-44);
  let cols=Math.min(n,Math.max(1,Math.floor(availW/nw))),sc=1;
  if(Math.ceil(n/cols)*nh>availH){       // wrapping is not enough: pick the column count that keeps tiles biggest
    let best=0;
    for(let c=1;c<=n;c++){const r=Math.ceil(n/c),q=Math.min(1,availW/(c*nw),availH/(r*nh));if(q>best+1e-6){best=q;cols=c;}}
    sc=Math.max(.45,best);
  }
  const rows=Math.ceil(n/cols);
  items.forEach((it,k)=>{
    const r=Math.floor(k/cols),inRow=Math.min(cols,n-r*cols);          // each row is centred on its own
    const gx=(VW-inRow*nw*sc)/2+(k%cols)*nw*sc,gy=y+r*nh*sc;
    ctx.save();ctx.translate(gx,gy);ctx.scale(sc,sc);LT={s:sc,ox:gx,oy:gy};
    const lx=nw/2;
    if(it.p)drawPlayer(it.p,lx,0,nw-10,bh,psz,prh);
    else{
      ctx.fillStyle=THEME.go;ctx.fillRect(lx-(nw-10)*.42,0,(nw-10)*.84,3);
      txt('Press any button',lx,36,psz+4,THEME.go,'center');
      txt('to join',lx,36+psz+10,psz+4,THEME.go,'center');
    }
    ctx.restore();LT={s:1,ox:0,oy:0};
  });
  y+=rows*nh*sc+8;
  y=Math.min(y,VH-(IS_TOUCH?150:100));
  if(j.length&&j.every(p=>p.ready)&&graceT>0){
    txt('Starting in '+Math.max(0,Math.ceil(GRACE_START-graceT))+'...',cx,y+16,30,THEME.go,'center');
    txt('anyone: BACK to cancel',cx,y+42,15,THEME.hint,'center',false);
  }else if(j.length){
    wrapLines('Up/Down choose a row · Left/Right change · OK select · BACK step back · everyone ready = round starts',Math.min(VW-40,780),15)
      .forEach((l,i)=>txt(l,cx,y+16+i*20,15,THEME.hint,'center',false));
  }
  drawLobbyFooter(cx,j);
}
/* pad icons, status message, bottom line, settings hit area, touch START: shared by the pre-join screen and the full lobby */
function drawLobbyFooter(cx,j){
  drawPadIcons();
  if(lobbyMsgT>0)txt(lobbyMsg,cx,VH-(IS_TOUCH?76:46),16,THEME.title,'center');
  const np=pads().length;
  txt(buildLabel(),12,VH-12,12,'#888','left',false);
  txt('Tab / Select = settings   ·   '+np+' controller'+(np===1?'':'s'),VW-12,VH-12-(VW<640?16:0),13,THEME.hint,'right',false);
  hits.push({x:VW-340,y:VH-32,w:340,h:32,fn:()=>openSettings('mouse')});
  if(IS_TOUCH&&j.length){
    rrect(cx-90,VH-64,180,44,12,THEME.go);txt('START',cx,VH-34,24,'#06240f','center',false);
    hits.push({x:cx-90,y:VH-64,w:180,h:44,fn:()=>startRound()});
  }
}
/* ONE renderer for the lobby settings and the in-game (pause) settings, so both look identical:
   o = {veil, sub, cats[], cat, focus('cat'|'panel'), st{cur,scroll}, rows(maxW), confirm, pick(itemIdx,row), pickCat(i), hint} */
function drawSettingsScreen(o){
  ctx.fillStyle='rgba(0,0,0,'+o.veil+')';ctx.fillRect(0,0,VW,VH);
  const cx=VW/2,compact=VH<640,st=o.st;
  let y=Math.max(compact?34:44,VH*(compact?.08:.11));
  txt('SETTINGS',cx,y,Math.min(compact?40:56,VW/10),THEME.title,'center');y+=compact?22:28;
  txt(o.sub,cx,y,14,THEME.link,'center',false);y+=compact?26:34;
  // sections as one centred line
  let tsz=VW<640?13:17,gap=VW<640?12:28,ws,total;
  for(;;){ctx.font='bold '+tsz+'px system-ui,sans-serif';
    ws=o.cats.map(n=>ctx.measureText(n).width);total=ws.reduce((a,b)=>a+b,0)+gap*(o.cats.length-1);
    if(total<=VW-16||tsz<=9)break;tsz--;gap=Math.max(8,gap-1);}
  let tx=cx-total/2;
  o.cats.forEach((n,i)=>{
    const on=i===o.cat,col=on?(o.focus==='cat'?THEME.title:'#fff'):'#8b97a8';
    txt(n,tx,y,tsz,col,'left',on);
    if(on){ctx.fillStyle=col;ctx.fillRect(tx,y+6,ws[i],3);}
    const ii=i;hits.push({x:tx-6,y:y-tsz-4,w:ws[i]+12,h:tsz+16,fn:()=>o.pickCat(ii)});
    tx+=ws[i]+gap;
  });
  y+=compact?22:30;
  // rows: the same grey-label / white-value look as the first menu
  const bottom=VH-(compact?46:58),rowH=compact?27:32,vis=Math.max(3,Math.floor((bottom-y)/rowH)),sz=compact?17:20;
  const mw=Math.min(VW-40,720),rows=o.rows(mw);
  const itemIdx=[];rows.forEach((r,i)=>{if(r.k==='t')itemIdx.push(i);});
  if(st.cur>=itemIdx.length)st.cur=Math.max(0,itemIdx.length-1);
  const cr=itemIdx[st.cur];
  if(cr!==undefined){if(cr<st.scroll)st.scroll=cr;if(cr>=st.scroll+vis)st.scroll=cr-vis+1;}
  st.scroll=clamp(st.scroll,0,Math.max(0,rows.length-vis));
  for(let i=st.scroll;i<Math.min(rows.length,st.scroll+vis);i++){
    const r=rows[i],ry=y+(i-st.scroll)*rowH+rowH*.7;
    if(r.k==='i'){txt(r.t,cx,ry,r.sz,r.c,'center',false);continue;}
    const sel=o.focus==='panel'&&itemIdx[st.cur]===i,warn=o.confirm===r.key;
    menuRow(cx,ry,r.t,r.v,{sz,sel,adj:r.adj,col:warn?'#ff8a8a':(!r.adj&&!sel?THEME.link:undefined)});
    const ii=itemIdx.indexOf(i);
    hits.push({x:cx-mw/2,y:ry-sz,w:mw,h:rowH,fn:()=>o.pick(ii,r)});
  }
  if(st.scroll>0)txt('▲ more',VW-16,y+10,13,THEME.hint,'right',false);
  if(st.scroll+vis<rows.length)txt('▼ more',VW-16,bottom+4,13,THEME.hint,'right',false);
  drawPadIcons();
  const hl=wrapLines(o.hint,VW-40,14);
  hl.forEach((l,i)=>txt(l,cx,VH-12-(hl.length-1-i)*18,14,THEME.hint,'center',false));
}
function drawSettings(){
  hits.length=0;
  if(capture){drawCapture();return;}
  drawSettingsScreen({veil:.74,sub:'Opened by '+set.by,cats:SET_CATS,cat:set.cat,focus:set.focus,st:set,rows:mw=>buildPanel(set.cat,mw),confirm:set.confirm,
    pickCat:i=>{set.cat=i;set.focus='cat';set.cur=0;set.scroll=0;set.confirm=null;},
    pick:(ii,r)=>{set.focus='panel';set.cur=ii;r.act(r.adj?1:0);},
    hint:set.focus==='cat'?'Left/Right choose a section · Down or OK opens it · BACK or Start closes':'Up/Down move · Left/Right adjust · OK select · BACK to sections · Start closes'});
}
function drawPause(){
  hits.length=0;
  if(pauseView==='settings'){drawPauseSettings();return;}
  ctx.fillStyle='rgba(0,0,0,.65)';ctx.fillRect(0,0,VW,VH);
  const cx=VW/2;let y=VH*.28;
  txt('PAUSED',cx,y,56,THEME.title,'center');y+=40;
  txt(pauseMsg||pauseBy,cx,y,20,pauseMsg?'#ff8a8a':THEME.link,'center');y+=54;
  pauseItems().forEach((t,i)=>{
    const on=i===pauseCur;
    txt(t,cx,y,26,on?'#fff':THEME.label,'center');
    if(on){ctx.font='bold 26px system-ui,sans-serif';txt('▶',cx-ctx.measureText(t).width/2-24,y,26,THEME.title,'center');}
    const idx=i;hits.push({x:cx-150,y:y-28,w:300,h:40,fn:()=>{pauseCur=idx;pauseNav('ok');}});
    y+=46;
  });
  txt('Up/Down · OK select · BACK resumes',cx,y+10,15,THEME.hint,'center',false);
}
/* Pause > Settings: the live subset of SETTINGS drawn by the SAME renderer as the lobby settings (title, "opened by" line, section line, rows with notes).
   The veil is a little lighter so the world behind (maps, layout, shared map position) is still visible while you change things. */
const pauseSt={get cur(){return pauseSetCur;},set cur(v){pauseSetCur=v;},get scroll(){return pauseSetScroll;},set scroll(v){pauseSetScroll=v;}};
function drawPauseSettings(){
  drawSettingsScreen({veil:.68,sub:pauseBy||pauseMsg,cats:['Display'],cat:0,focus:'panel',st:pauseSt,rows:liveRows,confirm:null,
    pickCat:()=>{},pick:(ii,r)=>{pauseSetCur=ii;r.act(1);},
    hint:'Up/Down move · Left/Right change · OK next value · BACK returns to pause'});
}
/* F3: leader, and per player progress / gap / help, the numbers Adaptive works from */
function drawDebug(){
  if(!CFG.debug||!players.length)return;
  const hs=12,lh=16,lines=['DEBUG  lead '+Math.round(dbg.lead)+'  FULL_GAP '+ADAPT.FULL_GAP+'  '+ADAPT.MODE+'  t '+roundT.toFixed(1)];
  for(const c of players){const gap=Math.max(0,dbg.lead-c.prog);lines.push(c.label.slice(0,10)+'  '+lvLabel(c)+'  prog '+Math.round(c.prog)+'  gap '+Math.round(gap)+'  v '+Math.round(Math.hypot(c.vx,c.vy))+(c.out?'  OUT':'')+(c.finished?'  DONE':''));}
  ctx.font=hs+'px monospace';let w=0;for(const l of lines)w=Math.max(w,ctx.measureText(l).width);
  const x=8,y=VH-lines.length*lh-(IS_TOUCH?140:10);
  rrect(x-4,y-14,w+12,lines.length*lh+8,6,'rgba(0,0,0,.7)');
  lines.forEach((l,i)=>{ctx.font=hs+'px monospace';ctx.textAlign='left';ctx.fillStyle=i?'#d6f5d6':THEME.title;ctx.fillText(l,x,y+i*lh);});
}
function drawResults(){
  hits.length=0;
  ctx.fillStyle='rgba(0,0,0,.78)';ctx.fillRect(0,0,VW,VH);
  if(!results)return;
  const cx=VW/2,two=VW>=760&&results.classes.length>0;
  txt(results.n>1?'ROUND '+results.round+' / '+results.n:'RESULTS',cx,Math.min(50,VH*.09),44,THEME.title,'center');
  results.summary.forEach((l,i)=>txt(l,cx,Math.min(50,VH*.09)+24+i*20,16,THEME.link,'center',false));
  const colW=two?Math.min(380,VW/2-30):Math.min(420,VW-40);
  const lx=two?cx-colW-14:cx-colW/2,y0=Math.min(84,VH*.15);
  const rowH=Math.min(34,(VH-y0-80)/Math.max(results.overall.length+1,6));
  txt('Overall',lx,y0+14,18,THEME.link,null,false);
  results.overall.forEach((c,i)=>{
    const y=y0+36+i*rowH;
    ctx.fillStyle=c.color;ctx.fillRect(lx,y-rowH*.62,6,rowH*.8);
    if(!identNone())drawBadge(lx+20,y-rowH*.22,rowH*.27,c);
    txt((i+1)+'.  '+c.label,lx+(identNone()?14:44),y,rowH*.62,'#fff');
    txt(curMode().resultText(c),lx+colW,y,rowH*.6,c.finished||c.score?'#fff':THEME.hint,'right');
  });
  if(results.classes.length){
    const rx=two?cx+14:lx;let y=two?y0+14:y0+36+results.overall.length*rowH+24;
    txt(results.multi?'By class (strongest first)':'Your level',rx,y,18,THEME.link,null,false);y+=rowH;
    for(const cl of results.classes){
      txt(LEVELS[cl.lv].name,rx,y,rowH*.62,THEME.title,null,false);y+=rowH*.9;
      cl.list.forEach((c,i)=>{
        if(!identNone())drawBadge(rx+16,y-rowH*.2,rowH*.26,c);
        txt((i+1)+'. '+c.label,rx+(identNone()?14:34),y,rowH*.58,'#fff',null,false);
        txt(curMode().resultText(c),rx+colW,y,rowH*.56,c.finished?'#fff':THEME.hint,'right',false);
        y+=rowH*.85;
      });
      y+=rowH*.2;
    }
  }
  if(results.n>1){   // running totals for a series of rounds
    const tl=Object.keys(series.totals).map(k=>({k:+k,v:series.totals[k]})).sort((a,b)=>b.v-a.v);
    const line='Series after round '+results.round+': '+tl.map(t=>'P'+(t.k+1)+' '+t.v).join('   ');
    wrapLines(line,VW-40,16).forEach((l,i)=>txt(l,cx,VH-70+i*20,16,THEME.title,'center',false));
  }
  const more=results.n>1&&results.round<results.n;
  txt(more?(IS_TOUCH?'Tap for next round':'OK = next round   ·   BACK = lobby'):(IS_TOUCH?'Tap for lobby':'OK / BACK = lobby'),cx,VH-24,22,THEME.go,'center');
}


function drawCapture(){
  ctx.fillStyle='rgba(0,0,0,.8)';ctx.fillRect(0,0,VW,VH);
  const cx=VW/2,sc=SCHEMES.find(x=>x.id===capture.sid),st=BIND_STEPS[capture.step];
  txt('REBIND KEYS',cx,VH*.25,44,THEME.title,'center');
  txt('Keyboard '+(SCHEMES.indexOf(sc)+1)+'  ('+sc.n+')',cx,VH*.25+34,18,THEME.link,'center',false);
  txt('Press the key for',cx,VH*.45,22,THEME.label,'center');
  txt(st[1].toUpperCase(),cx,VH*.45+60,64,THEME.text,'center');
  txt('step '+(capture.step+1)+' of '+BIND_STEPS.length+'   ·   Esc cancels',cx,VH*.45+100,15,THEME.hint,'center',false);
  if(capture.msg)txt(capture.msg,cx,VH*.45+136,18,THEME.bad,'center',false);
}
