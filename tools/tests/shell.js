// Generic shell checks. Uses only the shell API (no game-specific rules), so it also runs against the empty template.
const h=require('./_harness')(process.argv[2]);const {ev,step,key,tap,assert,sim,startPlay,store}=h;

step(5);
assert(ev('state')==='lobby','starts in lobby');
assert(ev('MODES.length')>=1,'at least one game mode registered');
const HOOKS=['plan','fill','spawn','start','tick','touch','over','aiTarget','progress','maxProgress','status','top','banner','rank','resultText','bestOf','drawItems','marks','barEnd','options','summary'];
assert(ev('MODES.every(m=>'+JSON.stringify(HOOKS)+'.every(k=>typeof m[k]==="function"))'),'every mode implements the full hook contract');

// ---- pre-join screen: only the join help, in the right colours; no round options until a button is pressed
h.clearTexts();step(2);
{
  const T=h.texts(),find=t=>T.find(x=>x.t.startsWith(t)),C=ev('COLORS'),TH=ev('THEME');
  assert(find('Press any button to join')&&find('Press any button to join').fill===TH.go,'pre-join heading is drawn in THEME.go');
  for(let i=0;i<4;i++){
    const l=find('Keyboard '+(i+1)+':');
    assert(l&&l.fill===C[i]&&l.t==='Keyboard '+(i+1)+':  '+ev('devHint("kb'+i+'")'),'pre-join Keyboard '+(i+1)+' line: text from devHint, drawn in slot '+(i+1)+' colour');
  }
  assert(find('Keyboard 1:').t==='Keyboard 1:  Keys (Arrows), OK (Enter), Back (Backspace)'&&find('Keyboard 2:').t.startsWith('Keyboard 2:  Keys (WASD)'),'help text starts with a capital: Keys (Arrows), Keys (WASD) ...');
  const cl=find('Controller:');assert(cl&&cl.fill===TH.link&&cl.t==='Controller:  OK (A), Back (B)','pre-join Controller line in THEME.link, text from devHint');
  const nt=find('Controllers appear');assert(nt&&nt.fill===TH.dim,'"Controllers appear..." note in THEME.dim while no pad is listed');
  assert(!['Game','Length','Rounds','Screen','Map','CPU players','Teams'].some(l=>T.some(x=>x.t===l)),'no round option rows before a button is pressed');
  assert(!T.some(x=>/^P1/.test(x.t)),'no player tiles before a button is pressed');
}
h.setPads([h.mkPad(0)]);h.clearTexts();step(2);
assert(!h.texts().some(x=>x.t.startsWith('Controllers appear')),'the note disappears once a controller is listed');
assert(ev('devHint("pad:Test Pad#0")')==='Controller 1: OK (A), Back (B)','devHint for a pad shows the printed names A / B');
assert(ev('padA({id:"Test Pad"})')===0&&ev('padB({id:"Test Pad"})')===1&&ev('padA({id:"Nintendo Switch Pro Controller"})')===1&&ev('padB({id:"Nintendo Switch Pro Controller"})')===0,'A = OK and B = Back, with the Nintendo index swap');
h.setPads([]);

// ---- join, ready, auto-start
tap('Enter');assert(ev('slots[0]&&slots[0].dev')==='kb0','kb0 joined slot 0');
h.clearTexts();step(2);
assert(h.texts().some(x=>x.t==='P1  Red'),'colour name next to P1 is capitalised (P1  Red)');
assert(ev('nameOptions()[nameOptions().length-1]')==='+ New','the new-name entry reads "+ New"');
assert(h.texts().some(x=>x.t==='Length')&&h.texts().some(x=>x.t==='Game'),'round options appear after the first join');
assert(!h.texts().some(x=>x.t==='Press any button to join'),'pre-join heading and help lines disappear after the first join');
tap('ArrowDown');tap('ArrowRight');tap('ArrowDown');
assert(ev('slots[0].lv')===3,'level changed to Pro with right arrow');
tap('ArrowLeft');tap('Enter');assert(ev('slots[0].ready')===true,'player ready');
step(200);assert(ev('state')==='count','auto-start grace then countdown');
step(260);assert(ev('state')==='play','countdown finishes -> play');
assert(ev('players.length')===1+ev('CFG.ai'),'1 human + CPU players');
assert(ev('layoutPanes().length')===1,'one human = one full pane');

// ---- pause menu and in-game settings
tap('Escape');assert(ev('state')==='paused'&&ev('pauseView')==='menu','Esc pauses');
assert(/Paused by/.test(ev('pauseBy')),'pause says who: '+ev('pauseBy'));
assert(ev('pauseItems()').indexOf('Settings')===1,'pause menu has a Settings entry');
tap('ArrowDown');tap('Enter');assert(ev('pauseView')==='settings','Pause > Settings opens the in-game settings');
h.clearTexts();step(2);
{const T=h.texts().map(x=>x.t);assert(T.includes('SETTINGS')&&T.includes('Display')&&T.includes('Player marks')&&T.some(t=>/Paused by/.test(t)),'in-game settings use the lobby settings layout: SETTINGS title, section line, same rows, who opened it');}
const live=ev('liveSettings().map(s=>s.id)');
for(const id of ['screen','map','scope','mapPos','mapPosPane','ident','names','hud','sound','touch','debug'])assert(live.includes(id),'in-game setting available: '+id);
assert(!live.includes('game')&&!live.includes('cpu'),'round rules (game, CPU players) are not changeable in game');
const m0=ev('CFG.map');tap('ArrowDown');tap('ArrowRight');
assert(ev('CFG.map')!==m0,'changing a setting in the pause menu applies at once (map '+m0+' -> '+ev('CFG.map')+')');
ev('pauseSetCur=0');const s0=ev('CFG.screen');tap('ArrowRight');assert(ev('CFG.screen')!==s0,'screen layout can change while paused');
tap('Escape');assert(ev('pauseView')==='menu'&&ev('state')==='paused','Back leaves the settings view, stays paused');
tap('Escape');assert(ev('state')==='play','Esc resumes');
step(3);   // draws with the changed settings

// ---- back to lobby, 3 humans, layouts
ev('toLobby()');step(3);
assert(ev('slots[0]&&slots[0].dev')==='kb0','slot kept');
tap('Space');tap('KeyO');
assert(ev('slots.filter(Boolean).length')===3,'three players joined');
ev('CFG.ai=2');startPlay();
assert(ev('state')==='play','3 human round running');
const L={};
for(const s of ['shared','vertical','horizontal','grid']){ev('CFG.screen="'+s+'"');L[s]=ev('layoutPanes().map(p=>[p.x,p.y,p.w,p.h].map(Math.round))');}
assert(L.shared.length===1,'shared screen: one pane');
assert(L.vertical.length===3&&L.vertical.every(p=>p[1]===0&&p[3]===720),'vertical split: 3 side-by-side panes, full height');
assert(L.horizontal.length===3&&L.horizontal.every(p=>p[0]===0&&p[2]===1280),'horizontal split: 3 stacked panes, full width');
assert(L.grid.length===3,'grid split: 3 panes');
for(const s of ['vertical','horizontal','grid']){const area=L[s].reduce((a,p)=>a+p[2]*p[3],0);assert(Math.abs(area-1280*720)<2000,s+' panes cover the whole screen');}
const d5=ev('splitDims(5,"vertical")'),d5h=ev('splitDims(5,"horizontal")');
assert(d5.cols===3&&d5.rows===2,'5 players vertical = 3+2');assert(d5h.rows===3&&d5h.cols===2,'5 players horizontal = 3 rows x 2 cols');
// cameras never show outside the world
ev('CFG.screen="vertical"');sim(2);
assert(ev('layoutPanes().every(p=>{const hw=p.w/(2*p.cam.s),hh=p.h/(2*p.cam.s);return p.cam.x-hw>=-2&&p.cam.x+hw<=WW+2&&p.cam.y-hh>=-2&&p.cam.y+hh<=WH+2})'),'cameras stay inside the arena');

// ---- maps: kinds and scopes
for(const k of ['world','vertical','horizontal','off']){
  ev('CFG.map="'+k+'";CFG.mapScope="pane"');
  assert(ev('mapJobs(layoutPanes()).length')===(k==='off'?0:3),'map '+k+' / per pane');
  ev('CFG.mapScope="shared"');
  assert(ev('mapJobs(layoutPanes()).length')===(k==='off'?0:1),'map '+k+' / shared');
}
// ---- shared map position is settable
ev('CFG.mapScope="shared";CFG.mapPos="auto";CFG.map="world"');
const auto=ev('(()=>{const r=sharedMapRect("world",layoutPanes());return [r.x,r.w]})()');
assert(Math.abs(auto[0]+auto[1]/2-640)<2,'automatic: shared map centred on the vertical divider');
const pos={};
for(const p of ev('MAP_POS.slice(1)')){
  ev('CFG.mapPos='+JSON.stringify(p));
  for(const k of ['world','vertical','horizontal']){
    const r=ev('sharedMapRect('+JSON.stringify(k)+',layoutPanes())');
    assert(r.x>=0&&r.y>=0&&r.x+r.w<=1280&&r.y+r.h<=720,'shared '+k+' map at '+p+' stays on screen');
    if(k==='world')pos[p]=r;
  }
}
assert(pos['top-left'].x===10&&pos['top-left'].y===10,'top-left anchors to the corner');
assert(Math.abs(pos['top-right'].x+pos['top-right'].w-1270)<1,'top-right anchors to the right edge');
assert(Math.abs(pos['bottom'].x+pos['bottom'].w/2-640)<1&&pos['bottom'].y>pos['top'].y,'bottom is centred horizontally and below top');
assert(Math.abs(pos.center.x+pos.center.w/2-640)<1&&Math.abs(pos.center.y+pos.center.h/2-360)<1,'center is the screen centre');
assert(pos.left.x<pos.right.x,'left is left of right');
ev('CFG.mapPos="bottom-right"');const jb=ev('mapJobs(layoutPanes())[0].rect');assert(jb.x>640&&jb.y>360,'mapJobs uses the chosen position');
// pane map position
ev('CFG.mapScope="pane";CFG.mapPosPane="bottom-left"');
assert(ev('layoutPanes().every(p=>{const r=paneMapRect("world",p);return r.x===p.x+10&&r.x+r.w<=p.x+p.w&&r.y>p.y+p.h/2})'),'pane map position: bottom-left inside every pane');
ev('CFG.mapPosPane="auto";CFG.mapPos="auto"');
for(const k of ['world','vertical','horizontal']){ev('CFG.map="'+k+'"');step(3);}
assert(ev('state')==='play','drawing every map kind did not break the round');
for(const m of ['shape','num','none','both']){ev('CFG.ident="'+m+'"');step(2);}
assert(ev('[0,1,2,3,4,5,6,7].every(i=>{shapePath(10,10,6,i);return true})')&&ev('SHAPE_NAMES.join()')==='circle,square,triangle,diamond,star,hexagon,plus,pentagon','all 8 player shapes draw (circle, square, triangle, diamond, star, hexagon, plus, pentagon)');
assert(ev('(()=>{CFG.ident="num";const a=identShape();CFG.ident="shape";const b=identNum();CFG.ident="none";const c=identShape()||identNum();const n=identNone();CFG.ident="both";return !a&&!b&&!c&&n&&identShape()&&identNum()&&!identNone()})()'),'Player marks setting: both / shape only / number only / none');
assert(ev('IDENTS.join()')==='both,shape,num,none'&&ev('IDENT_NAMES.none')==='None','Player marks can be set to None');

// ---- debug overlay
ev('CFG.debug=false');key('F3');step(2);assert(ev('CFG.debug')===true,'F3 toggles the debug overlay');step(3);key('F3','keyup');tap('F3');assert(ev('CFG.debug')===false,'F3 toggles it off again');

// ---- Adaptive (pure step)
const A=ev('(()=>{ADAPT.MODE="relative";const mk=(p,lv,h)=>({human:h,lv:lv,assist:0,finished:false,prog:p});const a=mk(1000,LV_ADAPTIVE,true),b=mk(400,LV_ADAPTIVE,true),c=mk(0,LV_NORMAL,true);const cs=[a,b,c];for(let i=0;i<600;i++)adaptiveStep(cs,1/60);return [a.assist,b.assist,c.assist];})()');
assert(A[0]<.01,'leading Adaptive player gets no help ('+A[0].toFixed(3)+')');
assert(A[1]>.95,'last Adaptive player gets full Tiny help ('+A[1].toFixed(3)+')');
assert(A[2]===0,'fixed-level players are never touched');
const B=ev('(()=>{const a={human:true,lv:LV_ADAPTIVE,assist:0,finished:false,prog:1000},b={human:true,lv:LV_ADAPTIVE,assist:0,finished:false,prog:980};for(let i=0;i<600;i++)adaptiveStep([a,b],1/60);return b.assist;})()');
assert(B<.1,'20 units behind is below FULL_GAP: only light help ('+B.toFixed(3)+')');
const C=ev('(()=>{const cpu={human:false,lv:-1,assist:0,finished:false,prog:2000},a={human:true,lv:LV_ADAPTIVE,assist:0,finished:false,prog:0};for(let i=0;i<600;i++)adaptiveStep([cpu,a],1/60);return a.assist;})()');
assert(C>.95,'a CPU can be the leader that an Adaptive human chases ('+C.toFixed(3)+')');
const D=ev('(()=>{const a={human:true,lv:LV_ADAPTIVE,assist:0,finished:true,prog:0},b={human:true,lv:LV_NORMAL,assist:0,finished:false,prog:900};for(let i=0;i<60;i++)adaptiveStep([a,b],1/60);return a.assist;})()');
assert(D===0,'a finished player leaves the group (no updates)');
assert(ev('(()=>{const a={lv:LV_ADAPTIVE,assist:1};const p=prm(a),t=LEVELS[LV_TINY];return p.as===t.as&&p.cu===t.cu&&p.stun===0&&p.reach===t.reach;})()'),'assist 1 equals the Tiny row (stun below 0.2 s becomes soft bump)');
assert(ev('(()=>{const a={lv:LV_ADAPTIVE,assist:0};const p=prm(a),n=LEVELS[LV_NORMAL];return p.as===n.as&&p.cu===n.cu&&Math.abs(p.stun-n.stun)<1e-9;})()'),'assist 0 equals the Normal row');
const H=ev('(()=>{const lead={human:false,lv:-1,assist:0,finished:false,prog:5000},a={human:true,lv:LV_ADAPTIVE,assist:0,finished:false,prog:4400},stuck={human:true,lv:LV_ADAPTIVE,assist:0,finished:false,prog:0};for(let i=0;i<600;i++)adaptiveStep([lead,a,stuck],1/60);return a.assist;})()');
assert(H>.45,'SPAN_CAP: a stuck far-behind Adaptive player does not dilute the others ('+H.toFixed(2)+')');
const I=ev('(()=>{ADAPT.MODE="absolute";const lead={human:false,lv:-1,assist:0,finished:false,prog:1000},a={human:true,lv:LV_ADAPTIVE,assist:0,finished:false,prog:850};for(let i=0;i<600;i++)adaptiveStep([lead,a],1/60);const r=a.assist;ADAPT.MODE="relative";return r;})()');
assert(Math.abs(I-.5)<.02,'absolute mode: help = gap / FULL_GAP ('+I.toFixed(2)+')');
// elimination support: an out player is neither lead nor in the group
const O=ev('(()=>{const out={human:false,lv:-1,assist:0,finished:false,prog:9000,out:true},lead={human:false,lv:-1,assist:0,finished:false,prog:1000},a={human:true,lv:LV_ADAPTIVE,assist:0,finished:false,prog:900},gone={human:true,lv:LV_ADAPTIVE,assist:0,finished:false,prog:0,out:true};for(let i=0;i<600;i++)adaptiveStep([out,lead,a,gone],1/60);return [a.assist,gone.assist];})()');
assert(O[0]<.4&&O[1]===0,'eliminated players: not the lead (help stays light), and get no help ('+O.map(v=>v.toFixed(2))+')');

// ---- live Adaptive in a round
ev('toLobby()');step(3);
ev('slots[1].lv=LV_ADAPTIVE;slots[0].lv=LV_NORMAL;slots[2]=null;CFG.ai=1;');startPlay();
assert(ev('state')==='play','adaptive round running');
ev('players.find(c=>c.slot===0).prog=0;');
ev('(()=>{const m=curMode(),c=players.find(c=>c.slot===0);const orig=m.progress;m.progress=q=>q===c?5000:orig.call(m,q);})()');
sim(4);
assert(ev('players.find(c=>c.slot===1).assist')>.5,'trailing Adaptive human gets help in a live round ('+ev('players.find(c=>c.slot===1).assist').toFixed(2)+')');
assert(ev('dbg.lead')>=5000,'debug overlay reads the lead');
tap('Escape');const a1=ev('players.find(c=>c.slot===1).assist');sim(2);
assert(ev('players.find(c=>c.slot===1).assist')===a1,'assist is frozen while paused');
tap('Escape');

// ---- eliminated player does not move
ev('(()=>{const c=players.find(c=>c.slot===0);c.out=true;c.vx=300;c.vy=0;c.x=500;c.y=500;})()');sim(1);
assert(ev('(()=>{const c=players.find(c=>c.slot===0);return c.x===500&&c.vx===0})()'),'an eliminated player (c.out) is skipped by movement');

// ---- series of rounds with running totals
ev('toLobby()');step(3);
ev('CFG.series=3;CFG.ai=1;slots[2]=null;');startPlay();
assert(ev('series.n')===3&&ev('series.round')===1,'series of 3 rounds starts at round 1');
ev("state='done';finishRound();");
assert(ev('Object.keys(series.totals).length')===2,'series totals recorded for both humans');
assert(ev('results.n')===3&&ev('results.round')===1,'results know the round number');
tap('Enter');assert(ev('series.round')===2&&ev('state')==='count','OK starts round 2 with the same players');
assert(ev('Object.keys(series.totals).length')===2,'totals kept between rounds');
ev("state='done';finishRound();");tap('Enter');ev("state='done';finishRound();");
assert(ev('series.round')===3,'round 3 reached');
tap('Enter');assert(ev('state')==='lobby','after the last round OK returns to the lobby');
ev('CFG.series=3;');startPlay();ev("state='done';finishRound();");tap('Backspace');tap('Escape');assert(ev('state')==='lobby','Back/Esc on results leaves the series');
ev('CFG.series=1');

// ---- lobby rows follow the mode; cursor clamps
assert(ev('lobbyRows().length')>=6,'lobby shows the base rows ('+ev('lobbyRows().map(r=>r.label)')+')');
assert(ev('gameRows().map(r=>r.label)').includes('Rounds'),'Settings > Game lists Rounds');
ev('slots[0].row=-99');step(2);assert(ev('slots[0].row')>=-ev('lobbyRows().length'),'lobby cursor is clamped to the available rows');

// ---- key rebinding
ev("openSettings('kb')");ev('startRebind("kb1")');
for(const k of ['KeyZ','KeyJ','KeyX','KeyC','KeyV','KeyB','KeyN']){key(k);}
assert(ev('capture===null')&&ev('CFG.keys.kb1.l')==='KeyZ'&&ev('CFG.keys.kb1.bk')==='KeyN','rebinding assigns six keys in order (a key used by another keyboard, J, was refused)');
assert(ev('KEYMAP.KeyZ[1]')==='left'&&ev('KEYMAP.KeyA')===undefined,'keymap rebuilt: Z is left, old A is free');
assert(/Z/.test(ev('SCHEMES[1].hint')),'hint shows the new keys: '+ev('SCHEMES[1].hint'));
ev('startRebind("kb1")');key('Escape');assert(ev('capture===null'),'Esc cancels a rebind');
ev('startRebind("kb1")');key('Tab');assert(ev('capture!==null')&&/already used/.test(ev('capture.msg')),'reserved keys (Tab) are refused');ev('capture=null');
ev('resetKeys()');assert(ev('KEYMAP.KeyA[1]')==='left'&&ev('Object.keys(CFG.keys).length')===0,'Reset restores default keys');
ev('closeSettings()');

// ---- touch controls
ev('CFG.touchMode="stick";touch.sx=.6;touch.sy=-.8;');const ti=ev('getInput("touch")');
assert(Math.abs(ti.mx-.6)<1e-9&&Math.abs(ti.my+.8)<1e-9,'joystick mode reports the stick vector');
ev('CFG.touchMode="buttons";touch.l=0;touch.r=1;touch.u=0;touch.d=0;');assert(ev('getInput("touch").mx')===1,'button mode reports the d-pad');
ev('applyTouchMode()');

// ---- seeded random: replayable rounds
ev('setSeed(42)');const r1=[ev('rand()'),ev('rand()')];ev('setSeed(42)');const r2=[ev('rand()'),ev('rand()')];
assert(r1[0]===r2[0]&&r1[1]===r2[1],'setSeed makes rand() repeatable');
ev('toLobby()');step(3);
ev('setSeed(5);buildWorld(true)');const w1=ev('JSON.stringify(G.rocks)+JSON.stringify(G.items)');
ev('setSeed(5);buildWorld(true)');const w2=ev('JSON.stringify(G.rocks)+JSON.stringify(G.items)');
ev('setSeed(6);buildWorld(true)');const w3=ev('JSON.stringify(G.rocks)+JSON.stringify(G.items)');
assert(w1===w2,'same seed builds the same world');assert(w1!==w3,'different seed builds a different world');

// ---- names above players: a saved name replaces P1 / P2 above the character; Guests keep P#; a setting turns names off
ev('toLobby()');step(3);
ev('slots[0].name="ANNA";slots[1].name="";CFG.ai=0;CFG.names=true;CFG.ident="both";');startPlay();
h.clearTexts();step(2);
{const T=h.texts().map(x=>x.t);
 assert(T.includes('ANNA')&&!T.includes('P1'),'named player: the name is shown above the character instead of P1');
 assert(T.includes('P2'),'Guest keeps P2 above the character');}
ev('CFG.names=false');h.clearTexts();step(2);
{const T=h.texts().map(x=>x.t);assert(T.includes('P1')&&!T.includes('ANNA'),'setting "Player names above players" off: P1 again above the player');
 assert(!T.includes('P1 ANNA')&&T.includes('Player 1'),'names off: the HUD also drops the name (Player 1)');}
ev('CFG.names=true');h.clearTexts();step(2);
{const T=h.texts().map(x=>x.t);assert(T.includes('P1 ANNA'),'names on: HUD shows P1 ANNA');}
assert(ev('S("names").val()').indexOf('nobody')<0,'with a named player the setting shows plain On / Off');
ev('slots[0].name="";players.forEach(c=>{c.profName=""})');assert(/nobody has picked a name/.test(ev('S("names").val()')),'the setting says so when nobody has a name (why nothing would change)');
ev('slots[0].name="ANNA";players.forEach(c=>{if(c.human&&c.slot===0)c.profName="ANNA"});CFG.names=false');
ev('CFG.names=true;CFG.ident="shape"');h.clearTexts();step(2);
{const T=h.texts().map(x=>x.t);assert(T.includes('ANNA')&&!T.includes('P2'),'shape-only marks: Guests show only their shape, named players still show the name');}
ev('CFG.ident="none"');h.clearTexts();step(2);
{const T=h.texts().map(x=>x.t);assert(T.includes('ANNA')&&!T.includes('P2')&&!T.includes('P1'),'Player marks = None: only a saved name is shown above a player, never P# or a shape');}
ev('CFG.ident="both"');ev('toLobby()');step(3);

// ---- profiles
ev('addName("ANNA");getProf("ANNA").rounds++;');
assert(ev('getProf("ANNA").wins.Adaptive')===0,'new level key reads as 0 for saved profiles');
assert(JSON.parse(store[ev('LS_PROF')]).by.ANNA.v===1,'profile saved under the app id');

// ---- settings screens draw and every category builds
ev('openSettings("kb")');
for(let i=0;i<ev('SET_CATS.length');i++){ev('set.cat='+i);step(2);assert(ev('buildPanel(set.cat,560).length')>0,'settings category '+ev('SET_CATS['+i+']')+' builds');}
ev('closeSettings()');
assert(ev('buildLabel()').startsWith('Build '),'build label present');
console.log('done');
