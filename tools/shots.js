#!/usr/bin/env node
/* Optional visual check (skill 10): screenshots of the main screens and every layout / map / position combination in real Chromium.
   Needs Playwright (npm i playwright; npx playwright install chromium).   Usage: node tools/shots.js [built.html] [outDir]
   Prints any page error; look at the PNGs for black borders, overlapping HUD/maps and clipped text. */
const path=require('path'),fs=require('fs');
const file=path.resolve(process.argv[2]||path.join(__dirname,'..','dist',fs.readdirSync(path.join(__dirname,'..','dist')).find(f=>f.endsWith('.html'))));
const out=path.resolve(process.argv[3]||path.join(__dirname,'..','shots'));fs.mkdirSync(out,{recursive:true});
let chromium;try{({chromium}=require('playwright'));}catch(e){console.log('Playwright not installed: skipping visual check.');process.exit(0);}
(async()=>{
  const b=await chromium.launch(),errs=[];
  const page=async(w,h)=>{const p=await b.newPage({viewport:{width:w,height:h}});p.on('pageerror',e=>errs.push(e.message));await p.goto('file://'+file+'?seed=11');await p.waitForTimeout(400);return p;};
  const shot=async(p,n)=>{await p.waitForTimeout(220);await p.screenshot({path:path.join(out,n+'.png')});};
  const p=await page(1280,720);
  await shot(p,'01-lobby-empty');
  await p.keyboard.press('Enter');await p.keyboard.press('Space');await p.keyboard.press('KeyO');await shot(p,'02-lobby-3players');
  await p.evaluate(()=>{slots[1].lv=LV_ADAPTIVE;slots[2].lv=0;CFG.ai=2;for(const q of slots)if(q)q.ready=true;});
  await p.waitForTimeout(7500);
  await p.keyboard.down('ArrowRight');await p.keyboard.down('KeyS');await p.keyboard.down('KeyL');await p.waitForTimeout(2200);
  const combos=[['vertical','world','pane','auto'],['horizontal','vertical','pane','auto'],['grid','horizontal','shared','auto'],['shared','world','pane','auto'],
    ['vertical','world','shared','top-left'],['vertical','world','shared','bottom-right'],['horizontal','horizontal','shared','left'],['vertical','vertical','shared','center']];
  for(const [s,m,sc,pos] of combos){await p.evaluate(([s,m,sc,pos])=>{CFG.screen=s;CFG.map=m;CFG.mapScope=sc;CFG.mapPos=pos;},[s,m,sc,pos]);await shot(p,`play-${s}-${m}-${sc}-${pos}`);}
  await p.evaluate(()=>{CFG.screen='vertical';CFG.map='world';CFG.mapScope='pane';CFG.mapPos='auto';CFG.debug=true;});await shot(p,'play-debug-overlay');await p.evaluate(()=>{CFG.debug=false;});
  await p.keyboard.up('ArrowRight');await p.keyboard.up('KeyS');await p.keyboard.up('KeyL');
  await p.keyboard.press('Escape');await shot(p,'pause-menu');
  await p.keyboard.press('ArrowDown');await p.keyboard.press('Enter');await shot(p,'pause-settings');
  await p.keyboard.press('ArrowDown');await p.keyboard.press('ArrowDown');await p.keyboard.press('ArrowDown');await p.keyboard.press('ArrowRight');await shot(p,'pause-settings-changed-live');
  await p.keyboard.press('Escape');await p.keyboard.press('Escape');
  await p.evaluate(()=>{players.forEach((c,i)=>{c.pi=G.len*track.N+1+(c.human?0:-300*i);});});await p.waitForTimeout(3500);await shot(p,'results');   // push every car over the line
  await p.evaluate(()=>{toLobby();});await p.keyboard.press('Tab');await p.waitForTimeout(150);
  for(let i=0;i<3;i++)await p.keyboard.press('ArrowRight');await p.keyboard.press('ArrowDown');await shot(p,'settings-controls');
  await p.keyboard.press('Enter');await shot(p,'rebind-prompt');await p.keyboard.press('Escape');
  await p.evaluate(()=>closeSettings());
  const ph=await page(390,844);
  await ph.keyboard.press('Enter');await ph.keyboard.press('Space');await shot(ph,'phone-lobby');
  await ph.evaluate(()=>{CFG.screen='horizontal';CFG.map='horizontal';for(const q of slots)if(q)q.ready=true;});await ph.waitForTimeout(7500);await shot(ph,'phone-play');
  console.log('screenshots in',out,'| page errors:',errs.length?errs:'none');await b.close();
})();
