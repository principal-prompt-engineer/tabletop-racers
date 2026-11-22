// Rules of Tabletop Racers (the race mode and the car code). The generic shell is checked by shell.js; this file only checks the game.
const mk=require('./_harness'),file=process.argv[2];
const H=mk(file),{ev,step,tap,key,assert,sim,startPlay,setPads,mkPad}=H;
const num=v=>Math.round(v*1000)/1000;

step(5);
// ---- identity and saved data
assert(ev('APP_ID')==='tabletopRacers'&&ev('LS_CFG')==='tabletopRacers.cfg'&&ev('LS_PROF')==='tabletopRacers.profiles','storage keys are the v5 keys (saved settings and profiles stay readable)');
assert(ev('MODES.length')===1&&ev('MODES[0].id')==='race','one mode: race');
assert(ev('MODES[0].lens.length')===9&&ev('MODES[0].lens[2].v')===3&&ev('lenOf(MODES[0]).n')==='3 laps','Length row is laps 1..9, default 3');
{
  const old=mk(file,{'tabletopRacers.cfg':JSON.stringify({shapes:false,laps:5,track:2,camera:'split',padOk:'right',bump:true,bumpD:100,styleCars:'builtin'}),
    'tabletopRacers.profiles':JSON.stringify({order:['ANNA'],by:{ANNA:{v:2,dist:1234,races:7,fin:5,overall:2,wins:{Tiny:0,Easy:1,Normal:1,Pro:0,Adaptive:0},best:{'1':41.5}}}})});
  old.step(3);const e=old.ev;
  old.assert(e('lenOf(MODES[0]).v')===5&&e('CFG.laps')===undefined,'v5 setting laps:5 migrates to the Length row');
  old.assert(e('CFG.track')===2&&e('CFG.bump')===true&&e('CFG.bumpD')===100&&e('CFG.styleCars')==='builtin','track, bumpers and art style are kept');
  old.assert(e('CFG.ident')==='num'&&e('CFG.shapes')===undefined,'v5 "Map shapes: off" becomes Player marks = Number only');
  old.assert(e('CFG.screen')==='grid'&&e('CFG.padLayout')==='nintendo','old camera and padOk settings migrate (split -> grid, right -> nintendo)');
  old.assert(e('getProf("ANNA").rounds')===7&&e('getProf("ANNA").dist')===1234&&e('getProf("ANNA").best["1"]')===41.5&&e('getProf("ANNA").wins.Adaptive')===0,'v5 profile: races become rounds, distance and best lap per track survive');
  old.assert(/7 races, 5 finishes, 1234 m, 2 wins/.test(e('MODES[0].profLine(getProf("ANNA"))')),'saved player line reads: '+e('MODES[0].profLine(getProf("ANNA"))'));
}

// ---- a round: grid, progress units, laps
tap('Enter');tap('ArrowDown');tap('ArrowDown');tap('Enter');   // join, ready via level row -> ready row
ev('CFG.ai=3;CFG.track=0;CFG.bump=false;CFG.len.race=0;buildWorld(true)');   // 1 lap keeps the finish test short
ev('for(const p of slots)if(p)p.ready=true;');step(200);
assert(ev('state')==='count'&&ev('players.length')===4,'countdown running: 1 human + 3 CPU');
{
  const g=ev('players.map(c=>[Math.round(c.pi),c.maxLap])');
  assert(g.every(x=>x[0]<0&&x[1]===-1)&&new Set(g.map(x=>x[0])).size>=2,'cars start on a grid behind the line (pi negative, two rows): '+JSON.stringify(g.map(x=>x[0])));
  assert(ev('players.every(c=>c.vx===0&&c.vy===0)'),'nobody moves during the countdown');
  step(260);
  assert(ev('players.every(c=>Math.abs(c.prog-c.pi*track.step)<40)'),'c.prog follows progress(c) = pi * track.step (px, within one step of movement)');
  assert(ev('Math.abs(MODES[0].maxProgress()-track.total)<1e-6')&&ev('MODES[0].barEnd()')==='★','one lap = track.total px; bars end in a star');
}
// keyboard: up = gas, down = brake, left/right = steer, independent axes
{
  key('ArrowUp');key('ArrowLeft');const i=ev('getInput("kb0")');
  assert(i.mx===-1&&i.my===-1,'Up + Left gives full steer and full gas (no diagonal shrink)');
  key('ArrowUp','keyup');key('ArrowLeft','keyup');
  setPads([mkPad(0)]);const P=ev('findPad(pads()[0]?padId(pads()[0]):"")')?0:0;
  const p0=H.mkPad(0);p0.buttons[7]={pressed:true,value:.6};p0.buttons[1]={pressed:true,value:1};p0.axes[0]=.5;setPads([p0]);
  const pi=ev('getInput(padId(pads()[0]))');
  assert(num(pi.gas)===.6&&pi.brake===1&&pi.mx===.5,'pad: right trigger = gas, B = brake, stick left/right steers');
  p0.buttons[7]={pressed:false,value:0};p0.buttons[0]={pressed:true,value:1};setPads([p0]);
  assert(ev('getInput(padId(pads()[0])).gas')===1,'pad: A also gives gas');
  setPads([]);
}
// driving moves a car along the track
const h0=ev('players.findIndex(c=>c.human)'),before=ev('players['+h0+'].pi');
key('ArrowUp');sim(5);key('ArrowUp','keyup');
assert(ev('players['+h0+'].pi')>before+50,'holding Up drives the human forward along the track ('+Math.round(ev('players['+h0+'].pi')-before)+' indexes)');
assert(ev('players['+h0+'].dist')>=0&&ev('Math.hypot(players['+h0+'].vx,players['+h0+'].vy)')>0,'car has speed and a distance from the centre line');
// CPUs lap and finish: a 1 lap race ends with every CPU home
ev('toLobby()');step(3);ev('CFG.len.race=0;CFG.ai=3');startPlay();
sim(75);
assert(ev('players.filter(c=>!c.human&&c.finished).length')>=2,'CPU drivers finish a 1 lap race on their own ('+ev('players.filter(c=>!c.human&&c.finished).length')+' of 3 home after 75 s)');
assert(ev('players.filter(c=>!c.human&&c.finished).every(c=>c.lapTimes.length===1&&c.finT>10)'),'finishers have one lap time and a finish time');

// ---- finish, ranking, DNF text, wins only for finishers
ev('toLobby()');step(3);ev('CFG.len.race=1;CFG.ai=2');startPlay();
ev('(()=>{const [a,b,c]=players;a.pi=0;b.pi=0;c.pi=0;a.finished=true;a.finT=50;b.finished=true;b.finT=40;c.pi=3000;})()');
{
  const r=ev('MODES[0].rank(players).map(c=>c.finT||c.pi)');
  assert(r[0]===40&&r[1]===50&&r[2]===3000,'rank: finishers by finish time, then the rest by distance');
  assert(ev('MODES[0].resultText(players[1])')==='0:40.00'&&ev('MODES[0].resultText(players[2])')==='DNF','result text: finish time or DNF');
}
ev('toLobby()');step(3);
ev('addName("ZED");slots[0].name="ZED";slots[0].nameSel=nameOptions().indexOf("ZED");CFG.len.race=0;CFG.ai=1;slots[1]=null;slots[2]=null;');startPlay();
ev('(()=>{const h=players.find(c=>c.human);h.lapTimes=[44.5,41.25];h.pi=700;})()');
ev("state='done';finishRound();");
assert(ev('getProf("ZED").rounds')===1&&ev('getProf("ZED").fin')===0&&ev('getProf("ZED").dist')>0,'profile: a round counted, DNF is not a finish, distance added');
assert(ev('getProf("ZED").best[String(CFG.track)]')===41.25&&ev('getProf("ZED").best["MODES"]')===undefined,'best lap is saved per track (key = track index)');
ev('(()=>{const h=players.find(c=>c.human);h.finished=true;h.finT=30;})()');
ev("roundSaved=false;finishRound();");
assert(ev('getProf("ZED").fin')===1,'a finish is counted');

// ---- laps, stun recovery, respawn
ev('toLobby()');step(3);ev('CFG.len.race=2;CFG.ai=0;slots[1]=null;slots[2]=null;');startPlay();
{
  const c='players.find(c=>c.human)';
  ev('(()=>{const c='+c+';c.pi=track.N*1-3;})()');step(2);
  ev('(()=>{const c='+c+';const i=(0);})()');
  assert(ev(c+'.maxLap')>=0,'crossing the line starts lap counting');
  ev('(()=>{const c='+c+';c.pi=track.N+3;c.idx=3;c.x=track.px[3];c.y=track.py[3];})()');step(3);
  assert(ev(c+'.maxLap')===1&&ev(c+'.lapTimes.length')>=1,'second lap crossed: lap time recorded');
  assert(/Lap 2\/3/.test(ev('MODES[0].status('+c+')')),'status reads Lap 2/3: '+ev('MODES[0].status('+c+')'));
  // stun then heading resets to the track direction
  ev('(()=>{const c='+c+';c.stunT=.3;c.a=c.a+1.5;})()');sim(.6);
  assert(Math.abs(ev('wrap('+c+'.a-track.ta['+c+'.idx])'))<.2,'when a stun ends the car points along the track again');
  // off the table for more than 1.2 s respawns on the road (no bumpers)
  ev('(()=>{const c='+c+';const k=(c.idx+200)%track.N;c.x=track.px[k]+400;c.y=track.py[k];c.vx=c.vy=0;})()');
  step(1);const far=ev(c+'.dist');sim(2);
  assert(far>ev('track.w*1.15')&&ev(c+'.dist')<ev('track.w'),'a car left far off the road is put back on it ('+Math.round(far)+' px -> '+Math.round(ev(c+'.dist'))+' px)');
}

// ---- player marks on the cars (starter setting Player marks / names)
{
  ev('slots[0].name="ANNA";players.forEach(c=>{if(c.human&&c.slot===0)c.profName="ANNA"});CFG.names=true;CFG.ident="both";');
  H.clearTexts();step(2);
  const T=H.texts().map(x=>x.t);
  assert(T.includes('ANNA')&&T.includes('1'),'a named player shows the name above the car and the number 1 on the body');
  ev('CFG.ident="shape"');H.clearTexts();step(2);
  assert(!H.texts().some(x=>x.t==='1'),'Player marks = shape only: no number drawn on the car body');
  ev('CFG.ident="both";CFG.names=true;');
}
// ---- bumper mode: a perfect bounce and no respawn
ev('toLobby()');step(3);ev('CFG.bump=true;CFG.bumpD=0;CFG.ai=0;slots[1]=null;slots[2]=null;buildWorld();');startPlay();
{
  const c='players.find(c=>c.human)';
  ev('(()=>{const c='+c+';const T=track,i=c.idx,nx=-Math.sin(T.ta[i]),ny=Math.cos(T.ta[i]);c.x=T.px[i]+nx*(bumpLimit(T)-1);c.y=T.py[i]+ny*(bumpLimit(T)-1);c.vx=nx*300;c.vy=ny*300;c.a=T.ta[i];})()');
  step(3);
  assert(ev(c+'.dist')<=ev('bumpLimit(track)')+1.5,'bumper wall keeps the car within T.w/2 + distance ('+num(ev(c+'.dist'))+')');
  assert(ev('(()=>{const c='+c+',T=track,i=c.idx,nx=(c.x-T.px[i]),ny=(c.y-T.py[i]);return c.vx*nx+c.vy*ny<0;})()'),'the bounce sends the car back towards the road');
  const sp0=300;assert(ev('Math.hypot('+c+'.vx,'+c+'.vy)')>sp0*.6,'elastic: most of the speed is kept');
}
ev('CFG.bump=false;buildWorld();');

// ---- difficulty meaning: stun, floor, assist
assert(ev('LEVELS[0].stun')===0&&ev('LEVELS[0].floor')>0&&ev('LEVELS[2].floor')===0&&ev('LEVELS[3].stun>LEVELS[2].stun'),'Tiny never stops and keeps a speed floor; Pro stuns longer than Normal');
ev('toLobby()');step(3);ev('CFG.ai=0;slots[1]=null;slots[2]=null;slots[0].lv=0;');startPlay();
sim(3);
assert(ev('Math.hypot(players[0].vx,players[0].vy)')>=150,'Tiny speed floor: an idle Tiny car is pulled along ('+Math.round(ev('Math.hypot(players[0].vx,players[0].vy)'))+' px/s)');
ev('toLobby()');step(3);ev('slots[0].lv=2;');startPlay();sim(3);
assert(ev('Math.hypot(players[0].vx,players[0].vy)')<5,'Normal: an idle car stays put');

// ---- seed: same seed, same table clutter and same grid; different seed, different clutter
ev('toLobby()');step(3);
ev('setSeed(11);buildWorld(true)');const a=ev('JSON.stringify(G.items)');ev('setSeed(11);buildWorld(true)');const b=ev('JSON.stringify(G.items)');ev('setSeed(12);buildWorld(true)');const c3=ev('JSON.stringify(G.items)');
assert(a===b&&a!==c3&&ev('G.items.length')>=10,'props: same seed same layout, other seed other layout ('+ev('G.items.length')+' spots)');
assert(ev('G.items.every(it=>{let md=1e9;for(let i=0;i<track.N;i+=3)md=Math.min(md,Math.hypot(it.x-track.px[i],it.y-track.py[i]));return md>=track.w/2+130-1;})'),'props never sit on the road');
for(const t of [0,1,2]){ev('CFG.track='+t+';buildWorld()');assert(ev('track.N')>100&&ev('G.total')===ev('track.total'),'track '+t+' ('+ev('TRACKS['+t+'].name')+') builds');}
ev('CFG.track=0;buildWorld()');

// ---- overview map and options
assert(ev('MODES[0].marks().length')>50&&ev('MODES[0].marks().every(m=>m.x>0&&m.x<WW&&m.y>0&&m.y<WH)'),'overview map gets the track as dots');
assert(ev('lobbyRows().map(r=>r.label)').join()==='Game,Length,Rounds,Screen,Map,CPU players,Track,Bumpers','lobby rows: '+ev('lobbyRows().map(r=>r.label)').join());
ev('CFG.bump=false;ROW;lobbyRows()[7].adj(1)');assert(ev('CFG.bump')===true&&ev('CFG.bumpD')===0,'Bumpers row: Off -> On, 0');
ev('lobbyRows()[7].adj(-1)');assert(ev('CFG.bump')===false,'Bumpers row wraps back to Off');
assert(ev('SET_CATS.includes("Appearance")')&&ev('(()=>{openSettings("kb");set.cat=SET_CATS.indexOf("Appearance");const n=buildPanel(set.cat,560).length;closeSettings();return n;})()')>8,'Settings > Appearance lists art style, facing and the import slots');
console.log('done');
