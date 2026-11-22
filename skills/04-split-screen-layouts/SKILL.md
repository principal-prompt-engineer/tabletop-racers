---
name: split-screen-layouts
description: Use when a same-screen game with a scrolling or fixed world must offer one shared camera, vertical split (panes side by side), horizontal split (stacked) or an automatic grid for 1 to 8 players, each pane with its own smooth camera clamped to the world. SPATIAL games only; section 7 gives the variant for non-spatial games (card, quiz, board). Do not use for single-player games or online games where each player has their own device.
---

# Split-screen layouts (spatial; needs a world)

Reference: `layoutPanes`, `splitDims`, `camTarget`, `updateCams` in `src/js/70-layout-maps.js`. Setting `CFG.screen` = `shared | vertical | horizontal | grid`, changeable live (Pause > Settings).

## 1. Meaning
- **shared**: one pane, one camera framing all humans (zooms out as they spread).
- **vertical**: dividers are vertical lines, panes side by side. **horizontal**: dividers are horizontal lines, panes stacked. **grid**: 2 columns (3 for 5+); with 2 players it picks columns on a wide window, rows on a tall one.
- One human always gets the full screen. In the lobby the world is a drifting full-screen backdrop.

## 2. Code
```js
function splitDims(n,screen){
  if(screen==='vertical'){const cols=n<=4?n:Math.ceil(n/2);return {cols,rows:Math.ceil(n/cols)};}       // dividers are vertical lines
  if(screen==='horizontal'){const rows=n<=4?n:Math.ceil(n/2);return {rows,cols:Math.ceil(n/rows)};}     // dividers are horizontal lines
  const cols=n===2?(VW>=VH?2:1):(n<=4?2:3);return {cols,rows:Math.ceil(n/cols)};                         // grid
}
function layoutPanes(){
  const hs=players.filter(c=>c.human);
  if(!hs.length)return [{x:0,y:0,w:VW,h:VH,cam,list:players,focus:null,shared:true}];
  if(hs.length===1||CFG.screen==='shared')return [{x:0,y:0,w:VW,h:VH,cam,list:hs,focus:hs.length===1?hs[0]:null,shared:hs.length>1}];
  const n=hs.length,d=splitDims(n,CFG.screen),ch=VH/d.rows,out=[];
  hs.forEach((c,i)=>{
    const r=Math.floor(i/d.cols),inRow=Math.min(d.cols,n-r*d.cols),cw=VW/inRow;
    out.push({x:(i%d.cols)*cw,y:r*ch,w:cw,h:ch,cam:c.cam,list:[c],focus:c,shared:false});
  });
  return out;
}
```

Pane = `{x,y,w,h,cam,list,focus,shared}`: `cam` is the pane's own camera (kept on the player), `list` the players it frames, `focus` the followed player (null for a shared pane). HUD, maps and clipping work per pane, so a new layout only changes `layoutPanes`.

## 3. Uneven counts
For more than 4 players vertical/horizontal wrap into two lines (5 vertical = 3 + 2). A row with fewer panes than columns gives its panes more width (`cw = VW / inRow`), so panes always tile the screen with no gap.

## 4. Camera
```js
function camTarget(list,w,h){
  let mnx=1e9,mny=1e9,mxx=-1e9,mxy=-1e9;
  for(const c of list){mnx=Math.min(mnx,c.x);mny=Math.min(mny,c.y);mxx=Math.max(mxx,c.x);mxy=Math.max(mxy,c.y);}
  let cx=(mnx+mxx)/2,cy=(mny+mxy)/2;
  if(list.length===1){cx+=list[0].vx*.25;cy+=list[0].vy*.25;}
  const base=clamp(Math.min(w,h)/820,.4,1.3);
  const sc=Math.max(clamp(Math.min(w/(mxx-mnx+460),h/(mxy-mny+460),base),.3,1.8),w/WW,h/WH);   // never zoom out past the arena
  const hw=w/(2*sc),hh=h/(2*sc);                 // keep the view inside the arena: no black borders
  cx=hw*2>=WW?WW/2:clamp(cx,hw,WW-hw);cy=hh*2>=WH?WH/2:clamp(cy,hh,WH-hh);
  return {x:cx,y:cy,s:sc};
}
```
- Look-ahead for a single player; fit-everyone for shared panes; **never zoom out past the arena**; **clamp** so the view stays inside the world (no black borders); smooth `k = 1 - exp(-5 dt)`; `snapCams()` at round start.

## 5. Drawing a pane
Clip to the pane, fill backdrop, `translate(centre) scale(cam.s) translate(-cam)`, draw world and entities y-sorted, restore; then the pane HUD translated to the pane origin (HUD code uses pane-local coordinates); dividers last (2 px black).

## 6. Tests worth keeping
Panes cover the screen within rounding; vertical panes full height; horizontal full width; 5-player dims; cameras never show outside the world (all in `tools/tests/shell.js`).

## 7. Non-spatial games (no world to scroll)
Keep `layoutPanes` and the pane object, but replace the world draw by `drawPlayerPanel(pane,player)` (hand, answer buttons, board section). Drop `camTarget`/`updateCams` and the camera clamp. `vertical/horizontal/grid/shared` still decide where each panel sits; "shared" shows one common table plus a compact strip per player. Position bars (skill 05 section 7) still work.

## Checklist
- [ ] `layoutPanes()` is the only place that knows the layout
- [ ] HUD and maps take a pane, never the full screen
- [ ] Camera clamped, scale floor (spatial) or no camera (non-spatial)
- [ ] Uneven rows widen their panes; layout switchable live

## Racer notes
`camTarget` reads the `CAM` constants in `00-core.js` (`div, lo, hi, pad, look, speed`) so a fast game can zoom and lead differently from the walker demo. Cameras still never zoom out past the world. World pictures may be painted at a higher resolution (`WS`): `drawWorldPane` scales the picture to `WW x WH`.
