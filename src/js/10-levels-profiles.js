/* ---------- difficulty levels (skill 06 + 07) ---------- */
/* What "help" means in a race (skill 06): as = steering assist 0..1 (self-centres along the track, pulls back from the road edge),
   cu = catch-up cap (extra top speed and acceleration when behind the leader), stun = crash stun (s; 0 = soft bump, keep going at half speed),
   floor = speed floor px/s (the car never grinds to a halt). */
const LEVELS=[
 {name:'Tiny',as:1,cu:.7,stun:0,floor:200,desc:'Lots of steering help, a speed boost when you are behind, soft bumps, and you never stop.'},
 {name:'Easy',as:.5,cu:.3,stun:.5,floor:0,desc:'Some steering help, a small boost when behind, and a short stun after a hard crash.'},
 {name:'Normal',as:0,cu:0,stun:1.2,floor:0,desc:'No help. A hard crash stops you for a moment.'},
 {name:'Pro',as:0,cu:0,stun:1.8,floor:0,desc:'No help and a longer stun after a hard crash.'},
 {name:'Adaptive',as:0,cu:0,stun:1.2,floor:0,desc:'Help adjusts as you race: lots when you trail the leader, none when you lead, so the group stays close. Never dies from crashing.'}];
const LV_TINY=0, LV_NORMAL=2, LV_ADAPTIVE=4, LV_SHOW=[3,2,4,1,0];   // LV_SHOW = results order: strongest class first
const ADAPT={FULL_GAP:300,RATE:1.5,MODE:'relative',SPAN_CAP:1200};   // FULL_GAP in px of route (v5 used 400; shell.js pins 300 for its absolute-mode check; untuned by play, about 0.6 s of top speed); MODE 'relative' | 'absolute'; SPAN_CAP stops one stuck player from diluting everyone else's help
const NOP={as:0,cu:0,stun:-1,floor:0};
function prm(c){
  if(c.lv===LV_ADAPTIVE){   // always lerp(Normal, Tiny, t) so retuning those two rows retunes Adaptive
    const t=c.assist,N=LEVELS[LV_NORMAL],T=LEVELS[LV_TINY],stun=lerp(N.stun,T.stun,t);
    return {as:lerp(N.as,T.as,t),cu:lerp(N.cu,T.cu,t),stun:stun<.2?0:stun,floor:lerp(N.floor,T.floor,t)};
  }
  if(c.lv>=0)return LEVELS[c.lv];
  return NOP;
}
function lvLabel(c){return c.lv===LV_ADAPTIVE?'Adaptive - '+Math.round(c.assist*100)+'%':(c.lv>=0?LEVELS[c.lv].name:'CPU');}
/* One tick of Adaptive. `players` already carry c.prog (progress in distance-like units) taken from a snapshot
   before anyone moved. Group = human Adaptive players still playing; the lead may be anyone. */
function adaptiveStep(players,dt){
  const live=players.filter(c=>!c.out);          // eliminated players are neither the lead nor in the group
  let lead=-1e9;for(const c of live)lead=Math.max(lead,c.prog);
  const grp=live.filter(c=>c.human&&c.lv===LV_ADAPTIVE&&!c.finished);
  let span=ADAPT.FULL_GAP;
  if(ADAPT.MODE==='relative')for(const c of grp)span=Math.max(span,Math.min(ADAPT.SPAN_CAP,lead-c.prog));
  for(const c of grp){
    const target=clamp((lead-c.prog)/span,0,1);
    c.assist+=(target-c.assist)*Math.min(1,dt*ADAPT.RATE);
  }
  return lead;
}

/* ---------- profiles (saved names, skill 09) ---------- */
let profiles=lsGet(LS_PROF,{order:[],by:{}});
if(!profiles||!Array.isArray(profiles.order)||!profiles.by)profiles={order:[],by:{}};
function saveProfiles(){lsSet(LS_PROF,profiles);}
function blankProfile(){return {v:1,rounds:0,fin:0,pts:0,dist:0,overall:0,wins:{},best:{}};}   // dist = metres driven; best = best lap seconds per track (key = track index)
function getProf(n){   // missing fields read as 0 so old saves keep working when levels or modes are added
  let p=profiles.by[n];if(!p)p=profiles.by[n]=blankProfile();
  p.wins=p.wins||{};for(const l of LEVELS)p.wins[l.name]=p.wins[l.name]||0;
  if(p.rounds==null&&p.races!=null)p.rounds=p.races;     // v5 profiles counted 'races'
  p.best=p.best||{};['rounds','fin','pts','dist','overall'].forEach(k=>{p[k]=p[k]||0;});p.v=1;return p;
}
profiles.order.forEach(getProf);
function addName(n){
  n=String(n).trim().toUpperCase().slice(0,8);if(!n)return '';
  getProf(n);profiles.order=[n].concat(profiles.order.filter(x=>x!==n));saveProfiles();return n;
}
function deleteName(n){
  delete profiles.by[n];profiles.order=profiles.order.filter(x=>x!==n);saveProfiles();
  for(const p of slots)if(p&&p.name===n){p.name='';p.nameSel=0;}
}
function deleteAllNames(){profiles={order:[],by:{}};saveProfiles();for(const p of slots)if(p){p.name='';p.nameSel=0;}}
const nameOptions=()=>['Guest'].concat(profiles.order,['+ New']);
