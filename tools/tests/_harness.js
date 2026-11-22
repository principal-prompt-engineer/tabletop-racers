// Shared headless harness: loads a built game file into a vm with mocked DOM, canvas, localStorage, gamepads and requestAnimationFrame.
// usage: const h=require('./_harness')(process.argv[2]);  h.ev('expr'), h.step(n frames), h.tap('KeyA'), h.assert(cond,msg), h.sim(seconds)
module.exports=function(file,preset){   // preset: {storageKey:jsonString} seeded into localStorage before the game loads (migration tests)
  const fs=require('fs'),vm=require('vm');
  const html=fs.readFileSync(file,'utf8');
  const js=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');
  const handlers={};let raf=null,T=0,pads=[];
  const store=Object.assign({},preset||{});
  const drawn=[];   // every fillText: {t,fill}; lets tests check what a screen shows and in which colour
  function mkCtx(){
    const t={};
    return new Proxy(t,{
      get(o,p){
        if(p==='fillText')return s=>{drawn.push({t:String(s),fill:o.fillStyle});};
        if(p==='measureText')return s=>({width:String(s).length*7});
        if(p==='createRadialGradient'||p==='createLinearGradient')return()=>({addColorStop(){}});
        if(p==='createPattern')return()=>({});
        if(p in o)return o[p];
        return()=>{};
      },
      set(o,p,v){o[p]=v;return true;}
    });
  }
  const mkEl=()=>({width:0,height:0,style:{},getContext:()=>mkCtx(),addEventListener(){},getBoundingClientRect:()=>({left:0,top:0,width:150,height:150})});
  const els={};
  const sb={console,Math,Array,Object,Set,Map,Float32Array,Number,String,JSON,Date,Promise,
    performance:{now:()=>T},setTimeout,
    innerWidth:1280,innerHeight:720,devicePixelRatio:1,
    document:{getElementById:id=>els[id]||(els[id]=mkEl()),createElement:()=>mkEl()},
    addEventListener:(t,f)=>{(handlers[t]=handlers[t]||[]).push(f);},
    navigator:{getGamepads:()=>pads},
    localStorage:{getItem:k=>(k in store?store[k]:null),setItem:(k,v)=>{store[k]=String(v);}},
    Image:function(){},
    requestAnimationFrame:f=>{raf=f;}
  };
  sb.window=sb;
  vm.createContext(sb);
  vm.runInContext(js,sb);
  const ev=s=>vm.runInContext(s,sb);
  const step=n=>{for(let i=0;i<n;i++){T+=16.7;const f=raf;raf=null;f(T);}};
  const key=(code,type)=>{(handlers[type||'keydown']||[]).forEach(f=>f({code,repeat:false,preventDefault(){}}));};
  const tap=code=>{key(code,'keydown');key(code,'keyup');step(1);};
  const assert=(c,m)=>{if(!c){console.log('FAIL:',m);process.exitCode=1;}else console.log('ok  :',m);};
  const sim=sec=>step(Math.round(sec*60));
  const mkPad=i=>({id:'Test Pad',index:i,connected:true,mapping:'standard',axes:[0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))});
  const setPads=a=>{pads=a;};
  // ready every joined player and run grace + countdown until the round is playing
  const startPlay=()=>{ev('for(const p of slots)if(p)p.ready=true;');step(200);step(260);};
  const texts=()=>drawn.slice(),clearTexts=()=>{drawn.length=0;};
  return {texts,clearTexts,ev,step,key,tap,assert,sim,mkPad,setPads,store,els,handlers,startPlay};
};
