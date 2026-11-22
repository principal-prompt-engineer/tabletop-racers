const cyc=(arr,v,d)=>arr[(arr.indexOf(v)+d+arr.length)%arr.length];
const onoff=v=>v?'On':'Off';
/* LIVE SETTINGS: one definition feeds Settings > Display (lobby) AND Pause > Settings (in game). live:true = safe to change mid-round.
   Rules that need a fresh round (game, length, rounds, CPU players, mode options) live in the Game category only. */
const SETTINGS=[
 {id:'screen',label:'Screen',live:true,val:()=>SCREEN_NAMES[CFG.screen],adj:d=>{CFG.screen=cyc(SCREENS,CFG.screen,d);saveCfg();},
  note:'One shared screen uses a single camera that keeps everyone in frame. Vertical split puts players side by side, horizontal split stacks them, grid fills a 2 x N grid. With one player the screen is always full.'},
 {id:'map',label:'Map',live:true,val:()=>MAP_NAMES[CFG.map],adj:d=>{CFG.map=cyc(MAPS,CFG.map,d);saveCfg();},
  note:'Overview map shows the track on the table. The position bars show how far each player is round the race, bottom to top or left to right.'},
 {id:'scope',label:'Map scope',live:true,val:()=>SCOPE_NAMES[CFG.mapScope],adj:d=>{CFG.mapScope=cyc(SCOPES,CFG.mapScope,d);saveCfg();}},
 {id:'mapPos',label:'Shared map position',live:true,val:()=>MAP_POS_NAMES[CFG.mapPos]+(CFG.mapScope==='shared'?'':'  (set Map scope to shared)'),adj:d=>{CFG.mapPos=cyc(MAP_POS,CFG.mapPos,d);saveCfg();},
  note:'Where the single shared map sits on the whole screen. Automatic puts it on the dividers between the panes.'},
 {id:'mapPosPane',label:'Pane map position',live:true,val:()=>MAP_POS_NAMES[CFG.mapPosPane],adj:d=>{CFG.mapPosPane=cyc(MAP_POS,CFG.mapPosPane,d);saveCfg();},
  note:'Where each per-player map sits inside its pane. Automatic uses the best corner or edge for the map type.'},
 {id:'ident',label:'Player marks',live:true,val:()=>IDENT_NAMES[CFG.ident],adj:d=>{CFG.ident=cyc(IDENTS,CFG.ident,d);saveCfg();},
  note:'How players are told apart besides colour: a shape per colour (circle, square, triangle, diamond, star, hexagon, plus, pentagon), a number (P1, P2 ...), both, or none (colour only; maps then use plain dots). Shown next to each name in the lobby, HUD and results, above the player and on the maps.'},
 {id:'names',label:'Player names above players',live:true,val:()=>onoff(CFG.names)+(anyNamed()?'':'  (nobody has picked a name yet)'),adj:d=>{CFG.names=!CFG.names;saveCfg();},
  note:'On: a player who picked a saved name (not Guest) shows that name above their character and in the HUD instead of P1, P2 ... Off: names are hidden in the game and players show P1, P2 ... Guests have no name, so they always show P1, P2 ... (results keep names).'},
 {id:'hud',label:'HUD size',live:true,val:()=>['Small','Medium','Large'][[.85,1,1.25].indexOf(CFG.hud)]||'Medium',adj:d=>{
    const v=[.85,1,1.25];let i=v.indexOf(CFG.hud);if(i<0)i=1;i=clamp(i+d,0,2);CFG.hud=v[i];saveCfg();}},
 {id:'sound',label:'Sound',live:true,val:()=>onoff(CFG.sound),adj:d=>{CFG.sound=!CFG.sound;saveCfg();}},
 {id:'touch',label:'Touch controls',live:true,val:()=>({buttons:'Buttons',stick:'Joystick'})[CFG.touchMode],adj:d=>{CFG.touchMode=cyc(TOUCH_MODES,CFG.touchMode,d);saveCfg();applyTouchMode();}},
 {id:'debug',label:'Debug overlay (F3)',live:true,val:()=>onoff(CFG.debug),adj:d=>{CFG.debug=!CFG.debug;saveCfg();},
  note:'Shows the leader, each player\'s progress, gap and help level. Useful for tuning Adaptive.'}];
const S=id=>SETTINGS.find(x=>x.id===id);
const anyNamed=()=>slots.some(p=>p&&p.name)||players.some(c=>c.human&&c.profName);   // is there any saved name the setting could show?
const liveSettings=()=>SETTINGS.filter(x=>x.live);
/* round options: shown on the lobby (a player reaches them by moving up from their Name row) and in Settings > Game */
const ROW={
 game:{label:'Game',val:()=>curMode().name,adj:d=>{CFG.mode=(CFG.mode+d+MODES.length)%MODES.length;saveCfg();buildWorld(true);}},
 length:{label:'Length',val:()=>lenOf(curMode()).n,adj:d=>{const m=curMode();CFG.len[m.id]=(clamp(CFG.len[m.id]!=null?CFG.len[m.id]:m.lenDef,0,m.lens.length-1)+d+m.lens.length)%m.lens.length;saveCfg();buildWorld(true);}},
 rounds:{label:'Rounds',val:()=>CFG.series===1?'1 (single round)':'Best of '+CFG.series+' (running totals)',adj:d=>{CFG.series=cyc(SERIES,CFG.series,d);saveCfg();}},
 screen:S('screen'),map:S('map'),
 cpu:{label:'CPU players',val:()=>String(Math.min(CFG.ai,maxAI())),adj:d=>{CFG.ai=clamp(Math.min(CFG.ai,maxAI())+d,0,maxAI());saveCfg();}}};
const modeOptions=()=>(curMode().options?curMode().options():[]);
const lobbyRows=()=>[ROW.game,ROW.length,ROW.rounds,ROW.screen,ROW.map,ROW.cpu].concat(modeOptions().filter(o=>o.lobby));
const gameRows=()=>[ROW.game,ROW.length,ROW.rounds,ROW.cpu].concat(modeOptions());
function optionsChanged(){   // changing shared options clears every Ready so nobody is rushed into a round they did not agree to
  let any=false;for(const q of slots)if(q&&q.ready){q.ready=false;any=true;}
  graceT=0;if(any){lobbyMsg='Round options changed: ready up again';lobbyMsgT=3;}
}

/* ---------- lobby ---------- */
function joinDevice(dev){
  if(slotOf(dev))return;
  const i=slots.indexOf(null);if(i<0)return;   // first gap; players keep their slot when others leave
  slots[i]={dev,slot:i,nameSel:0,name:'',row:0,lv:2,ready:false,wheel:null};
  graceT=0;
}
function leaveSlot(p){slots[p.slot]=null;graceT=0;}
function syncSel(p){const o=nameOptions();const i=p.name?o.indexOf(p.name):0;p.nameSel=i<0?0:i;if(i<0)p.name='';}
function applyNameSel(p){const o=nameOptions();p.name=(p.nameSel===0||p.nameSel===o.length-1)?'':o[p.nameSel];}
function nameTaken(p){return !!p.name&&slots.some(q=>q&&q!==p&&q.name===p.name);}
function leaveNameRow(p){   // moving off Name while "+ New" is still selected would leave a player who cannot ready: go back to Guest
  if(p.row===0&&p.nameSel===nameOptions().length-1){p.nameSel=0;p.name='';}
}
function canReady(p){return p.nameSel!==nameOptions().length-1&&!nameTaken(p);}

function lobbyNav(p,act){
  if(p.wheel){wheelNav(p,act);return;}
  if(p.ready){if(act==='back'||act==='ok'){p.ready=false;graceT=0;}return;}   // un-ready cancels a pending start
  const o=nameOptions();
  if(act==='up'){leaveNameRow(p);p.row=Math.max(-lobbyRows().length,p.row-1);return;}
  if(act==='down'){leaveNameRow(p);p.row=Math.min(2,p.row+1);return;}
  if(p.row<0){                                   // shared round options (the rows from lobbyRows())
    const rows=lobbyRows(),r=rows[Math.max(0,p.row+rows.length)];
    if(act==='left'){r.adj(-1);optionsChanged();}
    else if(act==='right'||act==='ok'){r.adj(1);optionsChanged();}
    else if(act==='back')p.row=0;
    return;
  }
  if(p.row===0){
    if(act==='left'||act==='right'){p.nameSel=(p.nameSel+(act==='left'?o.length-1:1))%o.length;applyNameSel(p);}
    else if(act==='ok'){if(p.nameSel===o.length-1)p.wheel={text:'',ch:0};else p.row=1;}
    else if(act==='back')leaveSlot(p);
  }else if(p.row===1){
    if(act==='left')p.lv=(p.lv+LEVELS.length-1)%LEVELS.length;
    else if(act==='right')p.lv=(p.lv+1)%LEVELS.length;
    else if(act==='ok')p.row=2;
    else if(act==='back')p.row=0;
  }else{
    if(act==='ok'){if(canReady(p)){p.ready=true;graceT=0;}}
    else if(act==='back')p.row=1;
  }
}
function wheelNav(p,act){
  const w=p.wheel,n=LETTERS.length;
  if(act==='left')w.ch=(w.ch+n-1)%n;
  else if(act==='right')w.ch=(w.ch+1)%n;
  else if(act==='up')w.ch=(w.ch+5)%n;
  else if(act==='down')w.ch=(w.ch+n-5)%n;
  else if(act==='ok'){
    if(LETTERS[w.ch]==='✓')finishWheel(p);
    else if(w.text.length<8)w.text+=LETTERS[w.ch];
  }
  else if(act==='menu')finishWheel(p);
  else if(act==='back'){if(w.text)w.text=w.text.slice(0,-1);else{p.wheel=null;p.nameSel=0;p.name='';}}   // cancelled: back to Guest
}
function finishWheel(p){
  const n=addName(p.wheel.text);p.wheel=null;
  if(n){p.name=n;syncSel(p);p.row=1;}else{p.nameSel=0;p.name='';}
}
function lobbyTick(dt){
  if(lobbyMsgT>0)lobbyMsgT-=dt;
  const nr=lobbyRows().length;for(const q of slots)if(q&&q.row<-nr)q.row=-nr;   // the mode changed and has fewer rows
  if(set.open)return;
  const j=slots.filter(Boolean);
  if(j.length&&j.every(p=>p.ready&&!p.wheel&&canReady(p))){
    graceT+=dt;
    if(graceT>=GRACE_START){graceT=0;startRound();}
  }else graceT=0;
}
function toLobby(){
  state='lobby';players=[];results=null;holdMsg='';firstFinT=null;roundSaved=false;set.open=false;graceT=0;
  for(const p of slots)if(p){p.ready=false;p.wheel=null;p.row=2;}
  if(IS_TOUCH&&!slotOf('touch'))joinDevice('touch');
  buildWorld(true);
  document.getElementById('touch').style.visibility='hidden';
}

/* ---------- settings ---------- */
const SET_CATS=['Game','Display','Players','Controls','Controllers'].concat(GAME_CATS.map(g=>g.name),['About']);   // GAME_CATS: categories the game adds (25-art.js)
function openSettings(dev){set.open=true;set.cat=0;set.focus='cat';set.cur=0;set.scroll=0;set.confirm=null;set.by=whoIs(dev);}
function closeSettings(){set.open=false;set.confirm=null;}
function maxAI(){return MAX_PLAYERS-Math.max(1,slots.filter(Boolean).length);}
function buildPanel(cat,maxW){
  const rows=[];
  const info=(t,c,sz)=>{sz=sz||15;for(const l of wrapLines(t,maxW,sz))rows.push({k:'i',t:l,c:c||THEME.info,sz});};
  const item=(t,v,act,key,adj)=>rows.push({k:'t',t,v,act,key,adj});
  const name=SET_CATS[cat];
  if(name==='Game'){
    gameRows().forEach(r=>item(r.label,r.val(),d=>{if(d){r.adj(d);optionsChanged();}},'game:'+r.label,true));
    info(curMode().desc,THEME.dim,13);
    info('These settings start a fresh round. Settings that can change during a round (screen, maps, sound ...) are under Display and in Pause > Settings.',THEME.dim,13);
  }else if(name==='Display'){
    SETTINGS.forEach(x=>{item(x.label,x.val(),d=>x.adj(d||1),'set:'+x.id,true);if(x.note)info(x.note,THEME.dim,13);});
  }else if(name==='Players'){
    info('Difficulty levels (picked per player in the lobby)',THEME.title,16);
    LV_SHOW.forEach(i=>info(LEVELS[i].name+': '+LEVELS[i].desc,THEME.info,13));
    info('Saved players ('+profiles.order.length+')',THEME.title,16);
    if(!profiles.order.length)info('None yet. Pick "+ New" in the lobby to create one.',THEME.dim,13);
    for(const n of profiles.order){
      const p=getProf(n),key='del:'+n;
      item(n+'   '+(curMode().profLine?curMode().profLine(p):p.rounds+' rounds, '+p.pts+' pts, '+p.overall+' wins'),set.confirm===key?'Press again to delete':'Delete',()=>{
        if(set.confirm===key){deleteName(n);set.confirm=null;}else{set.confirm=key;set.confirmT=3;}
      },key,false);
    }
    if(profiles.order.length)item('Delete all saved players',set.confirm==='delall'?'Press again to delete':'Delete all',()=>{
      if(set.confirm==='delall'){deleteAllNames();set.confirm=null;}else{set.confirm='delall';set.confirmT=3;}
    },'delall',false);
  }else if(name==='Controls'){
    info('Keyboards (up to four players share one keyboard)',THEME.title,16);
    SCHEMES.forEach((x,i)=>item('Keyboard '+(i+1)+': '+x.hint,CFG.keys[x.id]?'Rebind (custom)':'Rebind',()=>startRebind(x.id),'bind:'+x.id,false));
    info('Rebind: press Rebind, then the keys for Left, Right, Up, Down, OK and Back in that order. Esc cancels. Esc, Tab, F3 and keys used by another keyboard are refused.',THEME.dim,13);
    if(Object.keys(CFG.keys).length)item('Reset all keys to default','Reset',()=>resetKeys(),'resetkeys',false);
    info('Controllers: stick or D-pad moves. A = OK and B = Back in menus. Start = pause during a round, Select = settings in the lobby.',THEME.info,13);
    info('Any key or button joins the lobby. Tab opens settings, Esc pauses, F3 toggles the debug overlay.',THEME.dim,13);
  }else if(name==='Controllers'){
const ps=pads();
    info(ps.length+' controller'+(ps.length===1?'':'s')+' active. Browsers only reveal a controller after its first button press, so press a button on each one.','#cfd8e3',13);
    info('Controllers have no serial number and identical models share an id. Stick a coloured sticker matching the player colour on each pad. Chrome and XInput commonly cap at 4 pads, so a 5th player may need Firefox, a DirectInput pad or the keyboard.','#9aa7b8',13);
    item('A and B buttons',{auto:'Auto',xbox:'Xbox (A bottom)',nintendo:'Nintendo (A right)'}[CFG.padLayout],d=>{
      const v=['auto','xbox','nintendo'];CFG.padLayout=v[(v.indexOf(CFG.padLayout)+(d||1)+3)%3];saveCfg();
    },'padlayout',true);
    info('If OK and Back feel swapped on your pad, change this. Auto treats Nintendo pads as A on the right.','#9aa7b8',13);
    if(!ps.length)info('No controllers detected yet.','#ffd23f',14);
    for(const p of ps){
      const id=padId(p),pl=slotOf(id),down=[];
      p.buttons.forEach((b,i)=>{if(b.pressed)down.push(i);});
      info('Controller '+(p.index+1)+': '+p.id,'#fff',14);
      info('mapping: '+(p.mapping||'none')+' · '+p.buttons.length+' buttons · '+p.axes.length+' axes · rumble: '+(p.vibrationActuator?'yes':'no')+' · '+(pl?'joined as player '+(pl.slot+1):'not joined')+' · pressed: '+(down.length?down.join(', '):'none'),'#9aa7b8',12);
      item('Buzz controller '+(p.index+1),'Rumble',()=>{
        const q=findPad(id);try{if(q&&q.vibrationActuator&&q.vibrationActuator.playEffect)q.vibrationActuator.playEffect('dual-rumble',{startDelay:0,duration:500,weakMagnitude:1,strongMagnitude:1});}catch(e){}
      },'buzz:'+id,false);
    }
  }else if(GAME_CATS.some(g=>g.name===name)){
    GAME_CATS.find(g=>g.name===name).build(info,item);
  }else{
    info(APP_TITLE,THEME.title,18);
    info(buildLabel(),'#fff',15);
    info('Toy-car racing on a table for 1 to 8 players on one screen, with per-player difficulty (Tiny to Pro, or Adaptive), split screens, maps and series of races.',THEME.info,13);
    info('Limits: gamepads only appear after a first button press; browsers often cap at 4 pads.',THEME.dim,13);
  }
  return rows;
}
/* rows of the in-game settings, in the same row format as buildPanel so the same screen renderer draws both */
function liveRows(maxW){
  const rows=[];
  liveSettings().forEach(x=>{
    rows.push({k:'t',t:x.label,v:x.val(),act:d=>x.adj(d||1),key:'set:'+x.id,adj:true});
    if(x.note)for(const l of wrapLines(x.note,maxW,13))rows.push({k:'i',t:l,c:THEME.dim,sz:13});
  });
  return rows;
}
function panelItems(){return buildPanel(set.cat,560).filter(r=>r.k==='t');}
function settingsNav(dev,act){
  if(act==='esc')act='back';
  if(act==='settings'||act==='menu'){closeSettings();return;}
  if(set.focus==='cat'){                          // the section line across the top
    const n=SET_CATS.length;
    if(act==='left'||act==='right'){set.cat=(set.cat+(act==='left'?n-1:1))%n;set.cur=0;set.scroll=0;set.confirm=null;}
    else if(act==='down'||act==='ok'){if(panelItems().length){set.focus='panel';set.cur=0;set.scroll=0;}}
    else if(act==='back')closeSettings();
  }else{
    const it=panelItems();
    if(act==='up'){if(set.cur===0)set.focus='cat';else set.cur--;set.confirm=null;}
    else if(act==='down'){set.cur=Math.min(it.length-1,set.cur+1);set.confirm=null;}
    else if(act==='back'){set.focus='cat';set.confirm=null;}
    else if(it[set.cur]){
      const t=it[set.cur];
      if(act==='left'&&t.adj)t.act(-1);
      else if(act==='right'&&t.adj)t.act(1);
      else if(act==='ok')t.act(t.adj?1:0);
    }
  }
}

/* ---------- pause ---------- */
function openPause(dev,msg){
  if(state!=='play'&&state!=='count')return;
  pausePrev=state;state='paused';pauseCur=0;pauseView='menu';pauseMsg=msg||'';
  pauseBy=msg?'':'Paused by '+whoIs(dev);
  for(const k in touch)touch[k]=0;
}
function resume(){state=pausePrev;pauseMsg='';pauseView='menu';}
function pauseItems(){return ['Resume','Settings','Quit to lobby'];}
function pauseNav(act){
  if(pauseView==='settings'){                       // in-game settings: the live subset of SETTINGS, changes apply at once
    const it=liveSettings(),n=it.length;
    if(act==='up')pauseSetCur=(pauseSetCur+n-1)%n;
    else if(act==='down')pauseSetCur=(pauseSetCur+1)%n;
    else if(act==='left')it[pauseSetCur].adj(-1);
    else if(act==='right'||act==='ok')it[pauseSetCur].adj(1);
    else if(act==='back'||act==='esc'||act==='menu'||act==='pause')pauseView='menu';
    return;
  }
  if(act==='esc'||act==='menu'||act==='pause'){resume();return;}
  if(act==='up')pauseCur=(pauseCur+2)%3;
  else if(act==='down')pauseCur=(pauseCur+1)%3;
  else if(act==='back')resume();
  else if(act==='ok'){
    if(pauseCur===0)resume();
    else if(pauseCur===1){pauseView='settings';pauseSetCur=0;pauseSetScroll=0;}
    else toLobby();
  }
}
/* after a round: next round of a series, otherwise back to the lobby */
function advanceRound(){if(series.round<series.n){series.round++;startRound(true);}else toLobby();}

/* ---------- navigation dispatch ---------- */
function handleNav(dev,act){
  if(act==='debug'){CFG.debug=!CFG.debug;saveCfg();return;}
  if(capture)return;
  if(state==='lobby'){
    if(set.open){settingsNav(dev,act);return;}
    if(dev==='kb'){if(act==='settings')openSettings('kb');return;}
    const p=slotOf(dev);
    if(p&&p.wheel){wheelNav(p,act);return;}
    if(act==='settings'||act==='menu'){openSettings(dev);return;}
    if(!p){joinDevice(dev);return;}
    lobbyNav(p,act);
  }else if(state==='count'||state==='play'){
    if(act==='menu'||act==='esc'||act==='pause')openPause(dev);
  }else if(state==='paused'){
    pauseNav(act);
  }else if(state==='done'){
    if(act==='ok')advanceRound();
    else if(act==='back'||act==='menu'||act==='esc')toLobby();
  }
}
function processNav(){while(navQ.length){const ev=navQ.shift();handleNav(ev.dev,ev.act);}}

cv.addEventListener('pointerdown',e=>{
  audioInit();
  const x=e.clientX,y=e.clientY;
  for(let i=hits.length-1;i>=0;i--){const h=hits[i];if(x>=h.x&&x<=h.x+h.w&&y>=h.y&&y<=h.y+h.h){h.fn();return;}}
  if(IS_TOUCH){if(state==='paused')resume();else if(state==='done')advanceRound();}
});

