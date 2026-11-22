/* ---------- optional art (embedded by the build from art/, or imported in Settings > Appearance) ---------- */
const IMG={};

/* ---------- art import: sprite sheets are cut up by the game itself ----------
   Any flat background colour works (taken from the corners, removed by flood fill from the
   edges), so no transparency is needed. Textures are mirror-tiled, so no seamless tiles are
   needed either. Imported files are kept in IndexedDB so they survive a reload. */
const CARRAW={cars1:[],cars2:[]};let PROPS=[],CARIMG=[];
const artStatus={};let artMsg='';
const ART_SLOTS=[['cars1','Cars sheet 1'],['cars2','Cars sheet 2 (optional)'],['props','Props sheet'],
  ['table_kitchen','Kitchen table texture'],['table_desk','Study desk texture'],['table_bench','Workbench texture'],['road','Road texture']];

function rotCanvas(c,deg){
  if(!deg)return c;
  const q=Math.abs(deg)===90,o=document.createElement('canvas');
  o.width=q?c.height:c.width;o.height=q?c.width:c.height;
  const g=o.getContext('2d');g.translate(o.width/2,o.height/2);g.rotate(deg*Math.PI/180);g.drawImage(c,-c.width/2,-c.height/2);
  return o;
}
function carSprites(){
  const rot={up:90,right:0,down:-90,left:180}[CFG.carFacing];   // the game draws cars facing right
  CARIMG=[].concat(CARRAW.cars1,CARRAW.cars2).map(c=>rotCanvas(c,rot||0));
}
function spriteFor(c){
  if(CFG.styleCars==='builtin')return null;
  if(CARIMG.length)return CARIMG[c.ci%CARIMG.length];
  return IMG['car'+(c.ci%8)]||null;
}
function texPattern(g,im){
  const w=im.width,h=im.height,c=document.createElement('canvas');c.width=w*2;c.height=h*2;
  const x=c.getContext('2d');
  x.drawImage(im,0,0);
  x.save();x.translate(w*2,0);x.scale(-1,1);x.drawImage(im,0,0);x.restore();
  x.save();x.translate(0,h*2);x.scale(1,-1);x.drawImage(im,0,0);x.restore();
  x.save();x.translate(w*2,h*2);x.scale(-1,-1);x.drawImage(im,0,0);x.restore();
  const pat=g.createPattern(c,'repeat');
  if(pat&&pat.setTransform&&typeof DOMMatrix!=='undefined')pat.setTransform(new DOMMatrix().scale(900/w));  // one picture is about 900 table pixels wide
  return pat;
}
function dilate(m,w,h,R){
  /* diamond-shaped growth (R passes of a plus-shaped kernel): closes thin gaps inside one sprite
     without bridging the larger gap between neighbouring sprites */
  let a=m,b=new Uint8Array(w*h);
  for(let r=0;r<R;r++){
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const p=y*w+x;
      b[p]=(a[p]||(x>0&&a[p-1])||(x<w-1&&a[p+1])||(y>0&&a[p-w])||(y<h-1&&a[p+w]))?1:0;
    }
    const t=a===m?new Uint8Array(w*h):a;a=b;b=t;
  }
  return a;
}
function closeMask(m,w,h,r){
  const d=dilate(m,w,h,r),inv=new Uint8Array(w*h);
  for(let i=0;i<inv.length;i++)inv[i]=d[i]?0:1;
  const e=dilate(inv,w,h,r),o=new Uint8Array(w*h);     // growing the empty space = shrinking the shape
  for(let i=0;i<o.length;i++)o[i]=e[i]?0:1;
  return o;
}
function fillHoles(m,w,h){
  const seen=new Uint8Array(w*h),st=[];
  const push=p=>{if(!m[p]&&!seen[p]){seen[p]=1;st.push(p);}};
  for(let x=0;x<w;x++){push(x);push((h-1)*w+x);}
  for(let y=0;y<h;y++){push(y*w);push(y*w+w-1);}
  while(st.length){const p=st.pop(),x=p%w;if(x>0)push(p-1);if(x<w-1)push(p+1);if(p>=w)push(p-w);if(p<w*(h-1))push(p+w);}
  for(let i=0;i<m.length;i++)if(!m[i]&&!seen[i])m[i]=1;
}
/* Returns an array of sprite canvases in reading order, or null if the browser blocks reading pixels. */
function segmentSheet(img,gapClose,fillR){
  const sc=Math.min(1,1400/Math.max(img.width,img.height));
  const w=Math.max(1,Math.round(img.width*sc)),h=Math.max(1,Math.round(img.height*sc));
  const cvs=document.createElement('canvas');cvs.width=w;cvs.height=h;
  const g=cvs.getContext('2d',{willReadFrequently:true});g.drawImage(img,0,0,w,h);
  let data;try{data=g.getImageData(0,0,w,h).data;}catch(e){return null;}
  const corners=[0,(w-1)*4,(h-1)*w*4,((h-1)*w+w-1)*4];
  let br=0,bgc=0,bb=0,transparentCorner=false;
  for(const i of corners){br+=data[i];bgc+=data[i+1];bb+=data[i+2];if(data[i+3]<20)transparentCorner=true;}
  br/=4;bgc/=4;bb/=4;
  const TOL=90;
  const near=(i,tol)=>data[i+3]<20||(!transparentCorner&&Math.abs(data[i]-br)+Math.abs(data[i+1]-bgc)+Math.abs(data[i+2]-bb)<tol);
  const isBg=new Uint8Array(w*h),stack=new Int32Array(w*h);let sp=0;
  const push=p=>{if(!isBg[p]&&near(p*4,TOL)){isBg[p]=1;stack[sp++]=p;}};
  for(let x=0;x<w;x++){push(x);push((h-1)*w+x);}
  for(let y=0;y<h;y++){push(y*w);push(y*w+w-1);}
  while(sp){
    const p=stack[--sp],x=p%w,y=(p-x)/w;
    if(x>0)push(p-1);if(x<w-1)push(p+1);if(y>0)push(p-w);if(y<h-1)push(p+w);
  }
  const fg=new Uint8Array(w*h);for(let p=0;p<w*h;p++)fg[p]=isBg[p]?0:1;
  const dil=dilate(fg,w,h,gapClose!=null?gapClose:Math.max(3,Math.round(Math.max(w,h)/200)));   // joins sprite parts split by thin gaps
  const lab=new Int32Array(w*h),comps=[];let id=0;
  for(let s=0;s<w*h;s++){
    if(!dil[s]||lab[s])continue;
    id++;let n=0,minx=w,miny=h,maxx=0,maxy=0;sp=0;stack[sp++]=s;lab[s]=id;
    while(sp){
      const p=stack[--sp],x=p%w,y=(p-x)/w;
      if(fg[p]){n++;if(x<minx)minx=x;if(x>maxx)maxx=x;if(y<miny)miny=y;if(y>maxy)maxy=y;}
      if(x>0&&dil[p-1]&&!lab[p-1]){lab[p-1]=id;stack[sp++]=p-1;}
      if(x<w-1&&dil[p+1]&&!lab[p+1]){lab[p+1]=id;stack[sp++]=p+1;}
      if(y>0&&dil[p-w]&&!lab[p-w]){lab[p-w]=id;stack[sp++]=p-w;}
      if(y<h-1&&dil[p+w]&&!lab[p+w]){lab[p+w]=id;stack[sp++]=p+w;}
    }
    comps.push({id,n,minx,miny,maxx,maxy});
  }
  const minN=Math.max(300,w*h*.002);
  let keep=comps.filter(c=>c.n>=minN&&!((c.maxx-c.minx)>w*.9&&(c.maxy-c.miny)>h*.9));
  if(!keep.length)return [];
  const medN=keep.map(c=>c.n).sort((a,b)=>a-b)[keep.length>>1];
  keep=keep.filter(c=>c.n>=medN*.12);   // drop crumbs such as pencil tips and glints
  // reading order: group into rows by vertical centre, then left to right
  const medH=keep.map(c=>c.maxy-c.miny).sort((a,b)=>a-b)[keep.length>>1]||1;
  keep.forEach(c=>{c.cx=(c.minx+c.maxx)/2;c.cy=(c.miny+c.maxy)/2;});
  keep.sort((a,b)=>a.cy-b.cy);
  const rows=[];
  for(const c of keep){const r=rows[rows.length-1];if(r&&Math.abs(c.cy-r.cy)<medH*.6)r.items.push(c);else rows.push({cy:c.cy,items:[c]});}
  keep=[];for(const r of rows){r.items.sort((a,b)=>a.cx-b.cx);keep.push(...r.items);}
  const out=[],cr=fillR!=null?fillR:Math.max(4,Math.min(10,Math.round(Math.max(w,h)/100)));   // how wide a leak or notch may be and still get filled
  for(const c of keep.slice(0,12)){
    const cw=c.maxx-c.minx+1,ch=c.maxy-c.miny+1,pd=cr+2;
    const x0=Math.max(0,c.minx-pd),y0=Math.max(0,c.miny-pd),lw=Math.min(w,c.maxx+pd+1)-x0,lh=Math.min(h,c.maxy+pd+1)-y0;
    // this sprite's own pixels only, then close thin leaks (a dark stripe that touches the edge lets the
    // background colour run into the car) and fill holes the sprite fully encloses
    const lm=new Uint8Array(lw*lh);
    for(let y=0;y<lh;y++)for(let x=0;x<lw;x++){const p=(y0+y)*w+x0+x;if(lab[p]===c.id&&fg[p])lm[y*lw+x]=1;}
    const cm=closeMask(lm,lw,lh,cr);fillHoles(cm,lw,lh);
    const o=document.createElement('canvas');o.width=cw;o.height=ch;
    const og=o.getContext('2d'),od=og.createImageData(cw,ch);
    for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){
      const lx=c.minx+x-x0,ly=c.miny+y-y0,q=ly*lw+lx;
      if(!cm[q])continue;
      const i=((c.miny+y)*w+c.minx+x)*4;
      // drop the pale fringe left by anti-aliasing against the background (outer boundary only)
      const edge=lx===0||ly===0||lx===lw-1||ly===lh-1||!cm[q-1]||!cm[q+1]||!cm[q-lw]||!cm[q+lw];
      if(edge&&near(i,TOL*2))continue;
      const j=(y*cw+x)*4;od.data[j]=data[i];od.data[j+1]=data[i+1];od.data[j+2]=data[i+2];od.data[j+3]=255;
    }
    og.putImageData(od,0,0);out.push(o);
  }
  return out;
}
function useSheet(key,im){
  const list=key==='props'?segmentSheet(im,null,3):segmentSheet(im,1,null);   // cars are solid shapes that sit close together; props can be loose clusters but have fine gaps worth keeping
  if(list===null){artStatus[key]='blocked';artMsg='This browser will not read images opened straight from a file. Use Settings > Appearance > Import art instead.';return;}
  if(!list.length){artStatus[key]='no sprites found';artMsg='No sprites found. The picture needs a plain background and clear gaps between items.';return;}
  artStatus[key]=list.length+' sprites';artMsg=(key==='props'?'Props':'Cars')+': found '+list.length+' sprites.';
  if(key==='props')PROPS=list;else{CARRAW[key]=list;carSprites();}
}

/* imported art is stored as the original file blobs */
function idb(){
  return new Promise((res,rej)=>{
    if(typeof indexedDB==='undefined'){rej(new Error('no idb'));return;}
    const r=indexedDB.open('tabletopRacersArt',1);
    r.onupgradeneeded=()=>r.result.createObjectStore('art');
    r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);
  });
}
function artPut(k,blob){idb().then(db=>{db.transaction('art','readwrite').objectStore('art').put(blob,k);}).catch(()=>{});}
function artClearStore(){idb().then(db=>{db.transaction('art','readwrite').objectStore('art').clear();}).catch(()=>{});}
function restoreArt(){
  idb().then(db=>{
    const st=db.transaction('art','readonly').objectStore('art'),rq=st.openCursor();
    rq.onsuccess=()=>{const cur=rq.result;if(cur){loadArtFile(cur.key,cur.value,false);cur.continue();}};
  }).catch(()=>{});
}
const artOrigin={};
function loadArtUrl(key,url,origin){
  const im=new Image();
  im.onload=()=>{
    if(origin==='embedded'&&artOrigin[key]==='import')return;   // what you import yourself always wins
    artOrigin[key]=origin;
    if(key.startsWith('cars')||key==='props')useSheet(key,im);
    else{IMG[key]=im;artStatus[key]='image loaded';artMsg='Image loaded.';}
    if(state==='lobby')buildWorld();
  };
  im.onerror=()=>{artMsg='Could not read that image file.';};
  im.src=url;
}
function loadArtFile(key,blob,persist){
  loadArtUrl(key,URL.createObjectURL(blob),'import');
  if(persist)artPut(key,blob);
}
/* art baked into this file by the build script (art/ folder) */
function loadEmbeddedArt(){
  if(typeof EMBEDDED_ART==='undefined')return;
  for(const k of Object.keys(EMBEDDED_ART))loadArtUrl(k,EMBEDDED_ART[k],'embedded');
}
let fileIn=null,pendingKey='';
function pickArt(key){
  if(!fileIn){
    fileIn=document.createElement('input');fileIn.type='file';fileIn.accept='image/*';
    fileIn.onchange=()=>{const f=fileIn.files&&fileIn.files[0];if(f&&pendingKey)loadArtFile(pendingKey,f,true);fileIn.value='';};
  }
  pendingKey=key;if(fileIn.click)fileIn.click();
}
function clearArt(){
  artClearStore();
  CARRAW.cars1=[];CARRAW.cars2=[];PROPS=[];CARIMG=[];
  for(const [k] of ART_SLOTS){delete artStatus[k];if(k!=='cars1'&&k!=='cars2'&&k!=='props')delete IMG[k];}
  artMsg='Imported art removed.';
  buildWorld();
}


/* ---------- Settings > Appearance (game specific category, plugged into the shell through GAME_CATS) ----------
   build(info,item) gets the same two helpers as the shell's own categories. */
const GAME_CATS=[{name:'Appearance',build(info,item){
  const ks=['styleCars','styleTable','styleProps'],nb=ks.filter(k=>CFG[k]==='builtin').length;
  item('Art style',nb===3?'Built-in':(nb===0?'Imported':'Mixed'),()=>{const to=nb===0?'builtin':'imported';ks.forEach(k=>{CFG[k]=to;});saveCfg();buildWorld();},'sty',true);
  const sty=(label,key)=>item('› '+label,CFG[key]==='builtin'?'Built-in':'Imported',()=>{CFG[key]=CFG[key]==='builtin'?'imported':'builtin';saveCfg();buildWorld();},'sty:'+key,true);
  sty('Cars','styleCars');sty('Tables and road','styleTable');sty('Props','styleProps');
  info('Built-in is the original drawn look. Imported uses your pictures; anything you have not added falls back to built-in.',THEME.dim,13);
  const dirs=['up','right','down','left'];
  item('Which way cars point in your images',CFG.carFacing[0].toUpperCase()+CFG.carFacing.slice(1),d=>{
    CFG.carFacing=dirs[(dirs.indexOf(CFG.carFacing)+(d||1)+4)%4];saveCfg();carSprites();},'facing',true);
  info('Import art: pick the picture your image AI made. A plain background and clear gaps between items are all it needs. Imports are remembered in this browser.',THEME.info,13);
  for(const [k,label] of ART_SLOTS)item(label,artStatus[k]||'choose file',()=>pickArt(k),'art:'+k,false);
  item('Remove all imported art',set.confirm==='delart'?'Press again to remove':'Remove',()=>{
    if(set.confirm==='delart'){clearArt();set.confirm=null;}else{set.confirm='delart';set.confirmT=3;}
  },'delart',false);
  if(artMsg)info(artMsg,THEME.title,13);
}}];
