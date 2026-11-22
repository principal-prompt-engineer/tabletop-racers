/* ---------- engine sound (game specific): one sawtooth tone whose pitch follows the first human's speed ---------- */
let osc=null,eg=null;
function engineFrame(){   // called every animation frame through mode.frame(); silent in the lobby, paused and on the results screen
  if(!AC)return;
  if(!osc){
    try{osc=AC.createOscillator();osc.type='sawtooth';eg=AC.createGain();eg.gain.value=0;osc.connect(eg);eg.connect(AC.destination);osc.start();}
    catch(e){osc=eg=null;return;}
  }
  const h=players.find(c=>c.human),sp=h?Math.hypot(h.vx,h.vy):0;
  osc.frequency.value=55+sp*.3;
  eg.gain.value=(isMuted()||!(state==='count'||state==='play'))?0:.022;
}
