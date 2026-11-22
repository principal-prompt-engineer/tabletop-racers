---
name: lobby-join-ready
description: Use when a local multiplayer game needs a lobby: nothing but the join help (keyboard lines in player colours, controller line, note) until a button is pressed, then press-to-join, up to 8 fixed colour slots, per-player Name / Level / Ready rows, shared round options (Game, Length, Rounds, Screen, Map, CPU players, plus the mode's own options) reached by moving up from the Name row, a letter wheel for names, gamepad icons and per-tile control help from devHint, auto-start after everyone is ready with a cancelable 2.5 s grace, and option changes that clear Ready. Universal. Do not use for online matchmaking or single-player start screens.
---

# Lobby: join, choose, ready (universal)

Reference: `src/js/50-lobby-settings.js` (logic), `drawLobby/drawPlayer/drawWheel` in `src/js/80-draw.js`.

## 1. Slots
`slots[8]` (null = empty). `joinDevice(dev)` takes the first gap, so players keep their colour when others leave. Slot = `{dev,slot,nameSel,name,row,lv,ready,wheel}`. Any press from an unjoined device joins; Back on the Name row leaves.

## 2. Rows
Per player, cursor `row`: `-N..-1` shared round options, `0` Name, `1` Level, `2` Ready. Up from Name climbs into the shared rows; Left/Right change, OK advances, Back steps back.
```js
const ROW={
 game:{label:'Game',val:()=>curMode().name,adj:d=>{CFG.mode=(CFG.mode+d+MODES.length)%MODES.length;saveCfg();buildWorld(true);}},
 length:{label:'Length',val:()=>lenOf(curMode()).n,adj:d=>{const m=curMode();CFG.len[m.id]=(clamp(CFG.len[m.id]!=null?CFG.len[m.id]:m.lenDef,0,m.lens.length-1)+d+m.lens.length)%m.lens.length;saveCfg();buildWorld(true);}},
 rounds:{label:'Rounds',val:()=>CFG.series===1?'1 (single round)':'Best of '+CFG.series+' (running totals)',adj:d=>{CFG.series=cyc(SERIES,CFG.series,d);saveCfg();}},
 screen:S('screen'),map:S('map'),
 cpu:{label:'CPU players',val:()=>String(Math.min(CFG.ai,maxAI())),adj:d=>{CFG.ai=clamp(Math.min(CFG.ai,maxAI())+d,0,maxAI());saveCfg();}}};
const modeOptions=()=>(curMode().options?curMode().options():[]);
const lobbyRows=()=>[ROW.game,ROW.length,ROW.rounds,ROW.screen,ROW.map,ROW.cpu].concat(modeOptions().filter(o=>o.lobby));
const gameRows=()=>[ROW.game,ROW.length,ROW.rounds,ROW.cpu].concat(modeOptions());
function optionsChanged(){   // changing shared options clears every Ready so nobody is rushed into a round they did not agree to
  let any=false;for(const q of slots)if(q&&q.ready){q.ready=false;any=true;}
  graceT=0;if(any){lobbyMsg='Round options changed: ready up again';lobbyMsgT=3;}
}
```
- **One definition per option**: `ROW.*` objects `{label,val(),adj(d)}`. Lobby rows = base rows + the mode's `options()` flagged `lobby:true`; Settings > Game shows the base rows (without Screen/Map, which live in Display) + *all* mode options. Add a row = add one object.
- A mode can have fewer or more rows than the previous one: `lobbyTick` clamps every cursor to `-lobbyRows().length`.
- `optionsChanged()` clears every Ready and shows "Round options changed: ready up again".
- **Rounds** row (1, 3, 5): a series; see skill 09 section 4 for totals.

## 3. Name
Options: `Guest`, saved names, `+ New` (opens the **letter wheel**: Left/Right letter, Up/Down jump 5, OK adds, Back deletes or cancels to Guest, `✓` or Start finishes; max 8 chars, upper case). `nameTaken(p)` blocks Ready ("that name is already in use"). Leaving the Name row while "+ New name" is selected resets to Guest.

## 4. Start
`lobbyTick`: when every joined player is ready (none in the wheel) count `graceT`; at `GRACE_START` (2.5 s) call `startRound()`. Anyone pressing Back/OK on READY cancels. Touch shows START. CPU players fill `MAX_PLAYERS - humans` up to `CFG.ai`.

## 5. Layout and mouse
Player tiles fixed 272 px wide in a centred grid; wrap first, shrink (min 0.45) only when rows no longer fit; the last tile is always "Press any button to join". Row spacing tightens when there are more than six round rows. One gamepad icon per connected pad (see-through = connected, solid colour = joined). Every row registers a hit rectangle (`lhit`).

## 6. Before the first button press (required)
Until the first player joins the lobby shows **only** the title, the tagline, the join heading with its control help lines (section 7) and the footer. **Do not draw the round options (Game, Length, Rounds, Screen, Map, CPU players, mode options such as Teams) or any player tile until someone has joined**; they appear with the first join, and the "Press any button to join" tile then becomes the last tile. `drawLobby` returns early through `drawPreJoin` while `slots` is empty.

## 7. Colours of the pre-join help lines (required)
- Before anyone has joined, under the "Press any button to join" heading, draw one help line per keyboard scheme, then one controller line, then (only if no gamepads are listed) a small note.
- **Keyboard N line**: drawn in the colour of player slot N (the colour that player gets once they join, `COLORS[i]`): Keyboard 1 uses slot 1's colour, Keyboard 2 slot 2's, and so on. Never use one neutral colour for all keyboard lines.
- **Controller line** (`Controller:  OK (A), Back (B)`): `THEME.link`, a light neutral that is not any player colour, because a controller has no fixed slot until it joins.
- **"Controllers appear after their first button press" note**: `THEME.dim`, slightly smaller than the other lines, and only while `pads()` is empty.
- **"Press any button to join" heading**: `THEME.go`.
- All colours come from the player palette and theme tokens; no literal hex values in the lobby code. Text for the keyboard and controller lines comes from `devHint(id)` (skill 02), never typed inline. The lines disappear once the first player joins.
```js
function drawPreJoin(cx,y,compact){
  const size=compact?13:15,lineH=compact?19:23;
  y+=compact?10:34;
  txt('Press any button to join',cx,y+34,compact?24:30,THEME.go,'center');
  SCHEMES.forEach((k,i)=>txt('Keyboard '+(i+1)+':  '+devHint(k.id),cx,y+68+i*lineH,size,COLORS[i],'center',false));               // slot colour
  txt('Controller:  '+devHint('pad'),cx,y+68+SCHEMES.length*lineH,size,THEME.link,'center',false);                                  // theme link colour
  if(!pads().length)txt('Controllers appear after their first button press',cx,y+68+(SCHEMES.length+1)*lineH,size-3,THEME.dim,'center',false);
}
```

## 8. Control help text and gamepad icons (required)
- **Every player tile** shows its own `devHint(dev)` under the "P1  Red" line (shape badge to its left) (12 px, `dim`), so each player sees exactly which keys or buttons are theirs. Text comes from `devHint(id)` (skill 02), so rebinding is reflected.
- **Gamepad icons**: one pad icon per connected controller in the top-right corner, 38 px, spaced 8 px apart. Connected but not joined = see-through white (30% alpha). Joined = solid in the player's colour with `P#` under it. Browsers only report a pad after its first button press, hence the pre-join note.
- Bottom-right: `Tab / Select = settings   ·   N controller(s)`; bottom-left: the build label. A pending message (`lobbyMsg`, e.g. "Round options changed: ready up again") sits above the footer.
- **A = OK, B = Back as printed on the pad**, Nintendo swap handled (skill 02 section 7): never hard-code button indices 0/1 for OK/Back.
- The pre-join screen, pad icons and footer are shared through `drawLobbyFooter(cx,j)`.

## Appendix: reference code (`src/js/80-draw.js`)
```js
function drawPadIcon(x,y,w,color,solid){
  const h=w*.62;
  ctx.save();ctx.globalAlpha=solid?1:.3;ctx.fillStyle=color;
  ctx.beginPath();
  ctx.moveTo(x+w*.22,y);ctx.lineTo(x+w*.78,y);
  ctx.quadraticCurveTo(x+w*.9,y,x+w*.95,y+h*.5);
  ctx.quadraticCurveTo(x+w,y+h*.95,x+w*.86,y+h);
  ctx.quadraticCurveTo(x+w*.74,y+h*1.02,x+w*.66,y+h*.78);
  ctx.lineTo(x+w*.34,y+h*.78);
  ctx.quadraticCurveTo(x+w*.26,y+h*1.02,x+w*.14,y+h);
  ctx.quadraticCurveTo(x,y+h*.95,x+w*.05,y+h*.5);
  ctx.quadraticCurveTo(x+w*.1,y,x+w*.22,y);
  ctx.closePath();ctx.fill();
  ctx.globalAlpha=solid?.9:.5;ctx.fillStyle='#10151c';          // d-pad and buttons cut out
  ctx.fillRect(x+w*.2,y+h*.4,w*.2,h*.12);ctx.fillRect(x+w*.24,y+h*.26,w*.12,h*.4);
  ctx.beginPath();ctx.arc(x+w*.66,y+h*.5,w*.05,0,7);ctx.arc(x+w*.78,y+h*.38,w*.05,0,7);ctx.fill();
  ctx.restore();
}
function drawPadIcons(){
  const w=38,gap=8;let x=VW-12-w;
  for(const p of pads()){
    const pl=slotOf(padId(p));
    drawPadIcon(x,12,w,pl?COLORS[pl.slot]:'#fff',!!pl);
    if(pl)txt('P'+(pl.slot+1),x+w/2,12+w*.62+16,12,COLORS[pl.slot],'center');
    x-=w+gap;if(x<8)break;
  }
}
function drawLobbyFooter(cx,j){
  drawPadIcons();
  if(lobbyMsgT>0)txt(lobbyMsg,cx,VH-(IS_TOUCH?76:46),16,THEME.title,'center');
  const np=pads().length;
  txt(buildLabel(),12,VH-12,12,'#888','left',false);
  txt('Tab / Select = settings   ·   '+np+' controller'+(np===1?'':'s'),VW-12,VH-12-(VW<640?16:0),13,THEME.hint,'right',false);
  hits.push({x:VW-340,y:VH-32,w:340,h:32,fn:()=>openSettings('mouse')});
  if(IS_TOUCH&&j.length){
    rrect(cx-90,VH-64,180,44,12,THEME.go);txt('START',cx,VH-34,24,'#06240f','center',false);
    hits.push({x:cx-90,y:VH-64,w:180,h:44,fn:()=>startRound()});
  }
}
```

## Checklist
- [ ] Slot index = colour, stable while others leave
- [ ] Each shared option is one `{label,val,adj}` object; mode options come from `options()`
- [ ] Changing a shared option un-readies everyone; cursor clamps when rows change
- [ ] Letter wheel, duplicate-name guard, Guest fallback
- [ ] Auto-start grace is cancelable
- [ ] Nothing but the join heading and help lines is shown before the first button press (no round options, no tiles)
- [ ] Pre-join help lines: Keyboard N in slot N's player colour, Controller line in `THEME.link`, "Controllers appear..." note in `THEME.dim`; no literal hex values
- [ ] Keyboard and controller help lines shown before anyone joins; each tile shows its device's `devHint`
- [ ] Pad icons top right: see-through when connected, solid colour + P# when joined
- [ ] OK = A and Back = B on every pad (Nintendo swap handled); `devHint` is the single source of help text
