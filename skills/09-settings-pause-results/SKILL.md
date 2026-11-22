---
name: settings-pause-results
description: Use when a game needs the family's menu system: a tabbed Settings screen (Game, Display, Players, Controls, Controllers, About) built by one buildPanel(), a pause menu that says who paused and has an in-game Settings view with the live subset of settings (screen layout, maps and map positions, player marks, names above players, HUD, sound, touch mode, debug), a results screen with Overall / By-class columns and series totals, key rebinding, mouse/touch hit rectangles, press-again deletes and saved profiles. Universal. Do not use for games with a single fixed screen and no options.
---

# Settings, pause, results, profiles (universal)

Reference: `SETTINGS`, `buildPanel`, `pauseNav`, `handleNav` in `src/js/50-lobby-settings.js`; `drawSettings/drawPause/drawPauseSettings/drawResults/drawCapture` in `src/js/80-draw.js`.

## 1. One definition, two menus
```js
const SETTINGS=[
 ...
 {id:'debug',label:'Debug overlay (F3)',live:true,val:()=>onoff(CFG.debug),adj:d=>{CFG.debug=!CFG.debug;saveCfg();},
  note:'Shows the leader, each player\'s progress, gap and help level. Useful for tuning Adaptive.'}];
const liveSettings=()=>SETTINGS.filter(x=>x.live);
```
Each entry `{id,label,live,val(),adj(d),note}` is drawn in **Settings > Display** (with its note) and, when `live:true`, in **Pause > Settings**. Rule: settings that can change during a round are `live` and live here; rules that need a fresh round (game, length, rounds, CPU players, mode options) are in **Settings > Game** only and are not offered in game. Adding a live setting = adding one object; a setting that is unsafe mid-round gets `live:false` (it then appears in the lobby screen only).

## 2. Settings screen
`SET_CATS` = Game, Display, Players, Controls, Controllers, About, drawn as one centred line (active underlined). `buildPanel(cat,maxW)` returns rows `{k:'i',...}` (info) and `{k:'t',t,v,act,key,adj}` (item); `drawSettings` and `panelItems()` use the same list. Items: `act(d)` gets -1/+1 for adjustable rows, 0/1 for buttons. Destructive rows need **press again** (`set.confirm`, 3 s). "Opened by <player (device)>". Navigation: Left/Right sections; Down/OK enter; Up on the first row returns; Back/Start close; "▲ more / ▼ more" scrolling.
Controls has **Rebind** rows per keyboard (skill 02 section 3): a full-screen prompt asks for Left, Right, Up, Down, OK, Back in turn and shows refusals.

## 3. Pause and in-game settings
Esc / Start / touch during count or play: `state='paused'`, `pauseView='menu'`. Menu: **Resume, Settings, Quit to lobby**; it says "Paused by Player 2 (Keyboard WASD)" or the reason ("Controller disconnected: ..."). **Settings** switches `pauseView` to `'settings'`: the live list drawn by the **same renderer as the lobby settings** (`drawSettingsScreen`: SETTINGS title, "Paused by ..." line, a section line, the same grey-label / white-value rows with their notes, scroll hints, key hints), only with a slightly lighter veil so every change is visible behind it at once (switch the screen layout or move the shared map and watch). `liveRows()` builds the rows in the same format as `buildPanel`, so one renderer serves both. Up/Down move, Left/Right change, OK = next value, Back returns to the pause menu, a second Back resumes. The loop and Adaptive do not run while paused. Mouse/touch: every row has a hit rectangle.
```js
function pauseNav(act){
  if(pauseView==='settings'){                       // in-game settings: the live subset of SETTINGS, changes apply at once
    const it=liveSettings(),n=it.length;
    if(act==='up')pauseSetCur=(pauseSetCur+n-1)%n;
    else if(act==='down')pauseSetCur=(pauseSetCur+1)%n;
    else if(act==='left')it[pauseSetCur].adj(-1);
    else if(act==='right'||act==='ok')it[pauseSetCur].adj(1);
    else if(act==='back'||act==='esc'||act==='menu'||act==='pause')pauseView='menu';
    return;
  }
  if(act==='esc'||act==='menu'||act==='pause'){resume();return;}
  if(act==='up')pauseCur=(pauseCur+2)%3;
  else if(act==='down')pauseCur=(pauseCur+1)%3;
  else if(act==='back')resume();
  else if(act==='ok'){
    if(pauseCur===0)resume();
    else if(pauseCur===1){pauseView='settings';pauseSetCur=0;pauseSetScroll=0;}
    else toLobby();
  }
}
```

## 4. Results and series
State `done`. Left **Overall** (`mode.resultText(c)`), right **By class** (strongest level first); `mode.summary()` lines under the title. With `Rounds` > 1 the title reads "ROUND 2 / 3", a "Series after round 2: P1 5  P2 4" line shows running totals (rank points per round), OK = next round (same players), Back/Esc = lobby, and after the last round OK returns to the lobby. `advanceRound()` is the single hook.

## 5. Profiles
`profiles = {order:[names], by:{NAME:{v,rounds,fin,pts,overall,wins:{<Level>:n},best:{<modeId>:value}}}}` under `APP_ID` in localStorage. Names upper case, max 8, `Guest` never saved; `getProf` back-fills missing keys with 0 so new levels or modes never break old saves; bests use `mode.bestHigh`; wins count only with 2+ humans, per class and overall (per round). Deleting a profile clears it from any slot. Keep leaderboard order separate from level ids.

## 6. Mouse and touch
`hits[]` (cleared at the start of each screen draw): `{x,y,w,h,fn}`; the canvas `pointerdown` fires the last match. Every row, tab and button registers one; scaled lobby tiles use `lhit`.

## Checklist
- [ ] One `SETTINGS` array feeds Display and Pause > Settings; only `live` entries are offered in game
- [ ] One `buildPanel` feeds draw and navigation; every row has a hit rectangle
- [ ] Destructive actions need a second press; rebinding refuses reserved/duplicate keys
- [ ] Pause names who paused; loop frozen; settings changes visible behind the panel
- [ ] Series totals shown; profiles back-filled on load

## Racer notes
A game-specific settings category plugs in through `GAME_CATS` (`{name,build(info,item)}`, defined before `50-lobby-settings.js`); `SET_CATS` and `buildPanel` pick it up. Non-live entries stay out of Pause > Settings.
