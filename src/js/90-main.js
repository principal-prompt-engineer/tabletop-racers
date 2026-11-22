/* ---------- main loop and start-up (keep start-up calls here, last) ---------- */
function frame(ts){
  const dt0=Math.min(.1,(ts-last)/1000||0);last=ts;
  pollPads();processNav();
  if(set.confirmT>0){set.confirmT-=dt0;if(set.confirmT<=0)set.confirm=null;}
  if(state==='lobby'){
    lobbyTick(dt0);
    const t=ts/1000;cam.x=WW/2+Math.cos(t*.15)*300;cam.y=WH/2+Math.sin(t*.12)*200;cam.s=clamp(Math.min(VW,VH)/900,.35,1);
  }else if(state==='count'||state==='play'||state==='done'){
    acc+=dt0;let n=0;
    while(acc>=1/60&&n<5){update(1/60);acc-=1/60;n++;if(state==='paused'||state==='lobby')break;}
    if(n===5)acc=0;
    if(state!=='paused'&&state!=='lobby')updateCams(dt0);
  }
  const fm=curMode();if(fm.frame)fm.frame(dt0);   // optional per-frame hook of the mode (engine sound)
  drawFrameWorld();
  if(state==='lobby'){if(set.open)drawSettings();else drawLobby();}
  else if(state==='paused')drawPause();
  else if(state==='done')drawResults();
  else hits.length=0;
  requestAnimationFrame(frame);
}
buildWorld(true);
loadEmbeddedArt();
restoreArt();
if(IS_TOUCH)joinDevice('touch');
requestAnimationFrame(frame);
