---
name: maps
description: Use when a game needs a map or progress display with selectable type (overview map, vertical position bar, horizontal position bar, none), scope (one map per player pane or one shared map), and settable position (nine anchors, automatic, separately for the shared map and per-pane maps), with player shapes. Defines the mode hooks progress(), maxProgress(), marks(), barEnd() that feed them. The overview map needs a spatial world; the position bars work for any game (section 7). Do not use when the game has no notion of position or progress.
---

# Maps

Reference: `mapDims`, `anchorRect`, `paneMapRect`, `sharedMapRect`, `mapJobs`, `drawMap`, `drawMark` (uses `shapePath` / `drawBadge`) in `src/js/70-layout-maps.js`. Settings (all live): `CFG.map` = `world | vertical | horizontal | off`, `CFG.mapScope` = `pane | shared`, `CFG.mapPos` (shared map) and `CFG.mapPosPane` (per-pane map) = `auto | top-left | top | top-right | left | center | right | bottom-left | bottom | bottom-right`, `CFG.ident` (player marks: both | shape | num), `CFG.names` (names above players).

## 1. Kinds
- **world** (overview): arena scaled down (about 28% of pane width): obstacles (`obstacles()`), the mode's `marks()` dots, every player as a marker; the focused player has a white ring.
- **vertical bar** (bottom = start, top = finish) / **horizontal bar** (left to right): each player is a marker at `progress / maxProgress()`; the far end shows `barEnd()` ('★' for a finish line, or a number).
- Bars use the **progress contract**: `progress(c)` in distance-like units and `maxProgress()`. A race returns distance along the route; a score game `score * SCORE_UNIT`. The same numbers drive Adaptive.

## 2. Scope
**pane**: one map per pane, `focus` = that pane's player (one pane = one map). **shared**: one map, `focus = null`, drawn once on the whole screen.

## 3. Position
```js
function anchorRect(d,box,pos,m){
  m=m||10;const L=pos.indexOf('left')>=0,R=pos.indexOf('right')>=0,T=pos.indexOf('top')===0,B=pos.indexOf('bottom')===0;
  const x=L?box.x+m:R?box.x+box.w-d.w-m:box.x+(box.w-d.w)/2;
  const y=T?box.y+m:B?box.y+box.h-d.h-(IS_TOUCH?130:m):box.y+(box.h-d.h)/2;
  return {x,y,w:d.w,h:d.h};
}
```
- `auto` (default): per pane = the best corner/edge for the kind; shared = on the dividers (vertical bar on the vertical divider, horizontal bar on the horizontal divider, world map on the crossing; the right/bottom edge when there is no divider).
- Any of the nine anchors places the box with a 10 px margin (bottom anchors keep 130 px clear of touch buttons). The shared map ignores panes; the pane map is anchored inside each pane. Both are settable live in Settings > Display and Pause > Settings.
```js
function mapJobs(panes){                  // [{kind,rect,focus,clip}] to draw this frame
  const kind=CFG.map;if(kind==='off')return [];
  if(CFG.mapScope==='shared'&&panes.length>1)return [{kind,rect:sharedMapRect(kind,panes),focus:null,clip:null}];
  return panes.map(p=>({kind,rect:paneMapRect(kind,p),focus:p.focus,clip:p}));
}
```

## 4. Markers and shapes
Sort by progress; markers closer than 13 px along a bar are offset sideways in alternating lanes. `drawMark` draws the shared player badge (`drawBadge`: colour + shape per colour index, circle, square, triangle, diamond, star, hexagon, plus, pentagon; setting **Player marks**) so players are distinguishable without colour, plus a white ring for the focused player.

## 5. Drawing order
World panes, pane HUDs, dividers, maps (so a shared map can overlap dividers), countdown text.

## 6. Adding a kind or an anchor
Kind: add to `MAPS`/`MAP_NAMES` and branches in `mapDims`, `paneMapRect`, `sharedMapRect`, `drawMap`. Anchor: add to `MAP_POS`/`MAP_POS_NAMES` and `anchorRect`. Lobby, settings, pause and persistence read the arrays.

## 7. Non-spatial games
Use only the bar kinds (they need just `progress()` / `maxProgress()`), or add a `scoreboard` kind that draws one row per player. Remove the `world` kind from `MAPS`. `marks()` can return `[]`.

## Checklist
- [ ] Bars use `progress()/maxProgress()/barEnd()` from the mode; overview uses `obstacles()` and `marks()` (the shell never reads mode data)
- [ ] Per-pane maps stay inside their pane at every anchor (tested)
- [ ] Shared count = 1, per-pane = number of panes, off = 0; all nine anchors stay on screen
- [ ] Focus ring only on per-pane maps; Player marks setting respected
