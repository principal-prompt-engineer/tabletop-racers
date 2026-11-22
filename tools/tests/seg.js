// Tests the sprite-sheet segmentation with a mock canvas that has real pixel buffers.
const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync(process.argv[2],'utf8');
const js=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');
let raf=null;
function mkCanvas(){
  const c={width:0,height:0,style:{},_b:null,addEventListener(){}};
  const buf=()=>{if(!c._b||c._b.length!==c.width*c.height*4)c._b=new Uint8ClampedArray(c.width*c.height*4);return c._b;};
  c.getContext=()=>new Proxy({
    drawImage(src,dx,dy,dw,dh){
      const sw=src.width,sh=src.height,sp=src.pix||src._b;dw=dw||sw;dh=dh||sh;const b=buf();
      for(let y=0;y<dh;y++)for(let x=0;x<dw;x++){
        const X=Math.floor(dx+x),Y=Math.floor(dy+y);if(X<0||Y<0||X>=c.width||Y>=c.height)continue;
        const sx=Math.min(sw-1,Math.floor(x*sw/dw)),sy=Math.min(sh-1,Math.floor(y*sh/dh));
        for(let k=0;k<4;k++)b[(Y*c.width+X)*4+k]=sp[(sy*sw+sx)*4+k];
      }
    },
    getImageData(x,y,w,h){return {data:buf().slice(),width:w,height:h};},
    createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4),width:w,height:h};},
    putImageData(d,x,y){const b=buf();for(let j=0;j<d.height;j++)for(let i=0;i<d.width;i++)for(let k=0;k<4;k++)b[((y+j)*c.width+x+i)*4+k]=d.data[(j*d.width+i)*4+k];}
  },{get(o,p){if(p in o)return o[p];return ()=>({addColorStop(){}});},set(o,p,v){o[p]=v;return true;}});
  return c;
}
const els={};
const sb={console,Math,Array,Object,Set,Map,Float32Array,Int32Array,Uint8Array,Uint8ClampedArray,Number,String,JSON,Date,Promise,
  performance:{now:()=>0},setTimeout,innerWidth:1280,innerHeight:720,devicePixelRatio:1,
  document:{getElementById:id=>els[id]||(els[id]=mkCanvas()),createElement:()=>mkCanvas()},
  addEventListener(){},navigator:{getGamepads:()=>[]},localStorage:{getItem:()=>null,setItem(){}},
  Image:function(){},requestAnimationFrame:f=>{raf=f;}};
sb.window=sb;vm.createContext(sb);vm.runInContext(js,sb);
const ev=s=>vm.runInContext(s,sb);
function assert(c,m){if(!c){console.log('FAIL:',m);process.exitCode=1;}else console.log('ok  :',m);}

// synthetic sheet: 1000x500 near-white noisy background, 8 cars in 2 rows of 4
const W=1000,H=500,pix=new Uint8ClampedArray(W*H*4);
for(let i=0;i<W*H;i++){const n=Math.floor(Math.random()*8);pix[i*4]=250-n;pix[i*4+1]=250-n;pix[i*4+2]=250-n;pix[i*4+3]=255;}
function rect(x0,y0,w,h,col){for(let y=y0;y<y0+h;y++)for(let x=x0;x<x0+w;x++){const i=(y*W+x)*4;pix[i]=col[0];pix[i+1]=col[1];pix[i+2]=col[2];pix[i+3]=255;}}
const cols=[[230,57,70],[42,157,244],[255,210,63],[61,220,132],[255,140,66],[184,98,232],[242,242,242],[255,95,162]];
cols.forEach((col,k)=>{
  const row=Math.floor(k/4),cx=125+(k%4)*250,cy=125+row*250;
  rect(cx-35,cy-65,70,130,[20,20,20]);          // dark outline
  rect(cx-31,cy-61,62,122,col);                  // body (white car included)
  if(k===0){rect(cx-45,cy-40,10,20,[20,20,20]);rect(cx-47,cy-38,12,16,[20,20,20]);} // wheel nub touching the body
  if(k===2){rect(cx+35,cy-30,4,20,[20,20,20]);}  // part separated by a 0 px gap
});
rect(10,10,3,3,[0,0,0]);                          // stray speck, must be dropped
sb.fake={width:W,height:H,pix};
const list=ev('segmentSheet(fake)');
assert(Array.isArray(list)&&list.length===8,'found 8 sprites (got '+(list&&list.length)+')');
const dims=list.map(c=>c.width+'x'+c.height);
console.log('sizes:',dims.join(' '));
assert(list.every(c=>c.height>=125&&c.height<=135),'sprite heights are about the car height');
// reading order: first row left to right then second row; verify by body colour at the middle pixel
const mid=c=>{const i=((c.height>>1)*c.width+(c.width>>1))*4;return [c._b[i],c._b[i+1],c._b[i+2]];};
const ok=list.every((c,k)=>{const m=mid(c),e=cols[k];return Math.abs(m[0]-e[0])+Math.abs(m[1]-e[1])+Math.abs(m[2]-e[2])<20;});
assert(ok,'reading order matches colour order (incl. white car kept, background removed)');
// white car body must not have been eaten by the background removal
const wc=list[6],wi=((wc.height>>1)*wc.width+(wc.width>>1))*4;
assert(wc._b[wi+3]===255,'white car interior stays opaque');
// corners of a sprite are transparent
assert(list[0]._b[3]===0,'background inside the sprite box (corner) is transparent');
// pipeline: useSheet + rotation
ev('useSheet("cars1",fake)');
assert(ev('CARIMG.length')===8,'cars loaded into CARIMG');
assert(ev('CARIMG[3].width')>ev('CARIMG[3].height'),'facing "up" sheet is rotated to face right');
ev('CFG.carFacing="right";carSprites()');
assert(ev('CARIMG[3].height')>ev('CARIMG[3].width'),'facing "right" leaves sprite as is');
assert(ev('spriteFor({ci:10})')!==null,'spriteFor wraps around');
// props use the same path
ev('useSheet("props",fake)');
assert(ev('PROPS.length')===8,'props sheet found 8 items');
// settings Appearance panel builds (its category index is looked up, it is no longer fixed)
ev("var AP=SET_CATS.indexOf(\"Appearance\")");
ev('set.open=true;');
const rows=ev('buildPanel(AP,560).length');
assert(rows>10,'Appearance panel has import rows ('+rows+')');
// art style: built-in vs imported
assert(ev('spriteFor({ci:0})')!==null,'imported style uses the sheet cars');
const k=n=>ev("buildPanel(AP,560).find(r=>r.key==='"+n+"')");
ev("buildPanel(AP,560).find(r=>r.key==='sty').act(1)");
assert(ev("CFG.styleCars==='builtin'&&CFG.styleTable==='builtin'&&CFG.styleProps==='builtin'"),'Art style master switch sets all three to built-in');
assert(ev('spriteFor({ci:0})')===null,'built-in style ignores imported cars (original look)');
ev("buildPanel(AP,560).find(r=>r.key==='sty:styleCars').act(1)");
assert(ev("CFG.styleCars==='imported'&&CFG.styleTable==='builtin'"),'per-category switch flips only cars');
assert(k('sty').v==='Mixed','master row shows Mixed');
ev("buildPanel(AP,560).find(r=>r.key==='sty').act(1)");
assert(ev("CFG.styleCars==='imported'&&CFG.styleTable==='imported'&&CFG.styleProps==='imported'"),'master switch from Mixed goes to imported');
console.log('done');
