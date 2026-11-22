---
name: input-devices
description: Use when a same-screen multiplayer game must accept up to 8 players from shared keyboards (4 schemes, rebindable), gamepads (Xbox/Nintendo A-B swap, hot-plug, d-pad + stick repeat) and touch (four buttons or a virtual joystick), using one device-agnostic input seam. Defines device ids, nav events {dev,act}, getInput(dev) returning a game-shaped object (NO_INPUT), key rebinding, disconnect handling. Universal. Do not use for online-only games or single-device games where one keyboard layout is enough.
---

# Input devices (universal)

Reference: `src/js/40-audio-devices.js`.

## 1. Device ids
`kb0..kb3` (four keyboard schemes), `pad:<id>#<index>` (gamepads), `touch`, `mouse`, `kb` (global keys). A player is bound to one device id for the session (`slot.dev`). Defaults: Arrows (Enter/Backspace), WASD (Space/Q), IJKL (O/U), TFGH (Y/R). Global: `Esc` pause/back, `Tab` settings, `F3` debug overlay.

## 2. Two layers
1. **Navigation events** (menus): every key / pad press becomes `{dev,act}` on `navQ`; `act` is one of `left right up down ok back menu settings esc debug any`. `processNav()` drains it once per frame into `handleNav(dev,act)`. Pads repeat after 380 ms then every 90 ms.
2. **Game input**: `getInput(dev)` is THE seam. Every control source returns the same shape, declared once as `NO_INPUT` (Dot Dash: `{mx,my}`, each -1..1, length clamped). For another game change `NO_INPUT` and the branches of `getInput`; nothing else reads raw devices. A network or AI source is one more branch.
```js
function getInput(dev){
  const s=SCHEMES.find(x=>x.id===dev);
  if(s)return norm((keys[s.r]?1:0)-(keys[s.l]?1:0),(keys[s.d]?1:0)-(keys[s.u]?1:0));
  if(dev==='touch')return CFG.touchMode==='stick'?norm(touch.sx,touch.sy):norm(touch.r-touch.l,touch.d-touch.u);
  const p=findPad(dev);
  if(!p)return NO_INPUT;
  let x=p.axes[0]||0,y=p.axes[1]||0;
  if(Math.hypot(x,y)<.18){x=0;y=0;}
  if(p.buttons[14]&&p.buttons[14].pressed)x=-1;
  if(p.buttons[15]&&p.buttons[15].pressed)x=1;
  if(p.buttons[12]&&p.buttons[12].pressed)y=-1;
  if(p.buttons[13]&&p.buttons[13].pressed)y=1;
  return norm(x,y);
}
function norm(x,y){const m=Math.hypot(x,y);return m>1?{mx:x/m,my:y/m}:{mx:x,my:y};}
```

## 3. Rebinding keys
Settings > Controls > Rebind starts `capture`; the next six key presses become Left, Right, Up, Down, OK, Back. Stored in `CFG.keys[schemeId]`, applied by `rebuildKeymap()` (also rewrites the hints shown in the lobby). Refused: Esc/Tab/F3 (reserved), a key used by another keyboard, a key already used in this capture. Esc cancels; "Reset all keys" clears `CFG.keys`.
```js
function captureKey(code){
  if(code==='Escape'){capture=null;return;}
  const sid=capture.sid;
  const used=new Set(RESERVED_KEYS);
  SCHEMES.forEach(s=>{if(s.id!==sid)[s.l,s.r,s.u,s.d,s.ok,s.bk].forEach(k=>used.add(k));});
  Object.values(capture.keys).forEach(k=>used.add(k));
  if(used.has(code)){capture.msg=keyName(code)+' is already used. Press another key.';return;}
  capture.msg='';capture.keys[BIND_STEPS[capture.step][0]]=code;capture.step++;
  if(capture.step>=BIND_STEPS.length){CFG.keys[sid]=capture.keys;saveCfg();rebuildKeymap();capture=null;}
}
```

## 4. Gamepads
- Browsers expose a pad only after its first button press (Settings > Controllers says so).
- `padSwap(p)`: index 0 is A on Xbox but B on Nintendo pads; setting Auto / Xbox / Nintendo, Auto detects `057e|nintendo|switch|joy-?con|pro controller`.
- Dead zone 0.18; d-pad buttons 12-15 override; Start (9) = menu/pause, Select (8) = settings. Identical pads share an id, so key them by `id#index` and advise colour stickers. Chrome/XInput often caps at 4 pads.

## 5. Touch
Setting "Touch controls": **Buttons** (`#tL #tR #tU #tD` set `touch.l/r/u/d`) or **Joystick** (drag inside `#stick`, vector = offset / 55 px clamped to 1 into `touch.sx/sy`). `applyTouchMode()` shows the right control; both feed `getInput('touch')`. Show them only during a round. Menus are tapped through `hits[]`.

## 6. Disconnects and audio
`devAlive(id)`: a joined pad that vanishes holds the countdown ("Waiting for Controller 2...") and pauses a running round with the reason. Audio starts on the first key/pointer; `beep(freq,dur)`; one mute (`CFG.sound`).

## 7. A = OK, B = Back, and control help text (required)
- **A = OK, B = Back, as printed on the pad.** Navigation maps OK to `padA(p)` and Back to `padB(p)`: index 0/1 on Xbox-style pads, swapped (1/0) on Nintendo pads via `padSwap`. D-pad and left stick move, Start = pause/menu, Select = settings. Never hard-code button indices 0/1 for OK/Back.
- **One `devHint(id)` function is the only source of control help text**, used by the lobby (skill 03: pre-join lines and tiles), settings and pause: keyboard scheme `Keys (Arrows), OK (Enter), Back (Backspace)` (capital K; `Keys (WASD)`, `Keys (IJKL)`, `Keys (TFGH)`) built from the live keymap so rebinding updates it; gamepad `Controller 1: OK (A), Back (B)` (always the printed names, even on Nintendo pads); generic `'pad'` = `OK (A), Back (B)` for the pre-join controller line; touch `Touch`.
```js
function devHint(id){   // what the buttons are called on this device, shown in the lobby
  const s=SCHEMES.find(x=>x.id===id);
  if(s)return s.hint;
  if(id==='touch')return 'Touch';
  if(id==='pad')return 'OK (A), Back (B)';                 // generic controller line before any pad has joined
  if(id.startsWith('pad:'))return devLabel(id)+': '+devHint('pad');
  return devLabel(id);
}
function padSwap(p){
  const m=CFG.padLayout;if(m==='nintendo')return true;if(m==='xbox')return false;
  return /057e|nintendo|switch|joy-?con|pro controller/i.test(p.id||'');
}
const padA=p=>padSwap(p)?1:0, padB=p=>padSwap(p)?0:1;
```
- In play, pad actions are separate from menu actions; do not let a menu press leak into play, or the reverse.

## Checklist
- [ ] A = OK and B = Back via `padA/padB` (Nintendo swap); `devHint` is the single source of help text
- [ ] Every control source returns the `NO_INPUT` shape
- [ ] Menus use nav events only; gameplay uses `getInput` only
- [ ] Pad A/B swap; pads announced after first press; disconnect holds the countdown
- [ ] Rebinding refuses reserved and duplicate keys; reset works
- [ ] `preventDefault` on Tab, F3, Space and arrows

## Racer notes
If a game's input axes are independent (steer + throttle), build keyboard/touch input with `axes(x,y)` rather than `norm(x,y)`: normalising a diagonal weakens both axes. Pads can add extra fields (`gas`, `brake`) beside `{mx,my}`; `shell.js` only requires `mx`/`my`.
