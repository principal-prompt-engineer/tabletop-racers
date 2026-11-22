---
name: look-and-feel
description: Use when a canvas game should look and feel like the Dot Dash / Tabletop Racers family: dark warm backdrop, big yellow outlined titles, grey-label / white-value menu rows with a yellow cursor value, translucent black overlays, green "go" accents, per-player colour bars, colour-independent player marks. Defines THEME tokens and the drawing helpers (txt, rrect, wrapLines, menuRow). Universal: works for any game. Do not use for DOM/HTML-form interfaces or games with a very different visual identity on purpose.
---

# Look and feel (universal)

One canvas, no DOM menus. Everything is drawn with a few helpers so a new game inherits the style by calling them. Reference: `src/js/00-core.js` (THEME) and the top of `src/js/80-draw.js`.

## 1. THEME tokens (never hard-code colours in screens)
```
bg #120d0a   backdrop            title #ffd23f  titles, section names, cursor value, heads-up messages
text #fff    primary values      label #aaa     unselected row labels
dim #9aa7b8  secondary notes     hint #999      key hints
info #cfd8e3 explanations        link #cfe8ff   small headers / "who did this"
go #3ddc84   ready, finished     bad #ff6b6b    errors, delete confirmations
help #8fe3ff anything about assistance (Adaptive %, help ring)         floor/frame  playing surface
```
Player colours `COLORS[slot]`: red, blue, yellow, green, orange, purple, white, pink. Slot index IS the colour, so a player keeps one colour for the whole session.

## 2. Helpers (copy as-is)
```js
function txt(s,x,y,size,col,al,stroke){
  ctx.font='bold '+size+'px system-ui,sans-serif';ctx.textAlign=al||'left';ctx.textBaseline='alphabetic';
  ctx.lineWidth=Math.max(3,size/6);ctx.strokeStyle='rgba(0,0,0,.75)';ctx.lineJoin='round';
  if(stroke!==false)ctx.strokeText(s,x,y);ctx.fillStyle=col||'#fff';ctx.fillText(s,x,y);
}
```
```js
function rrect(x,y,w,h,r,fill,stroke,lw){
  ctx.beginPath();ctx.roundRect(x,y,w,h,r);
  if(fill){ctx.fillStyle=fill;ctx.fill();}
  if(stroke){ctx.lineWidth=lw||2;ctx.strokeStyle=stroke;ctx.stroke();}
}
```
```js
/* The original menu look: grey label right-aligned just left of centre, white value left-aligned just right of centre.
   The row under the cursor gets a marker, a white label and a yellow value with arrows when it can be adjusted. */
function menuRow(cx,y,label,val,o){
  const sz=o.sz||22,sel=!!o.sel;
  txt((sel?'▶ ':'')+label,cx-14,y,sz,sel?'#fff':THEME.label,'right');
  if(val!=null)txt((o.adj&&sel?'◀ ':'')+val+(o.adj&&sel?' ▶':''),cx+14,y,sz,o.col||(sel?THEME.title:'#fff'),'left');
}
```

- `wrapLines(s,maxW,size)` word-wraps with `measureText`; `ordinal(n)`, `fmt(seconds)` (m:ss.cc).
- **menuRow is the signature**: label right-aligned just left of centre (grey, white when selected, "▶ " prefix), value left-aligned just right of centre (white, yellow with ◀ ▶ when adjustable and selected). Lobby, settings, pause and in-game settings all use it, so every menu lines up on one centre axis.
- Overlays over the live world: lobby `rgba(0,0,0,.62)`, settings `.74`, pause `.65`, results `.78`; the in-game settings panel uses a light `.28` veil plus a `.72` panel so changes are visible behind it.

## 3. Screen conventions
- Title `min(64, VW/10)` THEME.title centred ~13% down; subtitle 18 px `#ddd`. Compact mode when `VH<640`; dense rows shrink (`dense?20:22`).
- Hints at the bottom in `hint` colour, 14-15 px, wrapped. Build label bottom-left, "Tab / Select = settings" bottom-right.
- Player tile: 3 px colour bar, a **shape badge** then "P1  Red" (colour name capitalised), device hint, then rows. HUD per pane: colour bar + name (18 px), level line (14 px, THEME.help when Adaptive helps), rank + status (15 px), timer top-centre, banners at 25% of pane height, 120 px "GO!" in the centre.
- Touch: 84 px translucent round buttons (or the 150 px joystick); every menu row has a hit rectangle.

## 4. Colour-independent identity (accessibility)
Never rely on colour alone. Every player has a **colour, a shape and a number**: shapes by colour index (`SHAPE_NAMES`: circle, square, triangle, diamond, star, hexagon, plus, pentagon), numbers P1, P2 ... One setting, **Player marks** (`CFG.ident`: Shape + number / Shape only / Number only / **None**), controls it everywhere (None = colour only: no badge or number in the lobby, HUD, results or above characters, maps use plain colour dots; a saved name above a player is still shown, see Player names above players), and one pair of helpers draws it (**outline first, thin, fill on top**: `rgba(0,0,0,.75)` stroke of `max(3, r*.32)` px, 2 px on map markers, rounded joins, exactly like the outline of `txt()` and the ◀ ▶ arrows; never stroke after the fill, it eats into the shape): `shapePath(x,y,r,i)` and `drawBadge(x,y,r,c,opt)` (`c` = anything with `{color,ci}`). The badge appears **left of "P1  Red"** on every lobby tile, left of the name in the HUD and in the results rows, as the cursor marker on lobby option rows (whose cursor is here), on every map, and **above the character** in the world, scaled up when the camera is zoomed out. Above the character the text is the player's saved name when one is set and the setting **Player names above players** is on, otherwise P1, P2 ...; Guests have no name and always show P#. The same setting decides whether the HUD reads "P1 ANNA" or "Player 1" (`hudName`); the results screen keeps names. Because a toggle with no visible effect looks broken, the setting's value reads "(nobody has picked a name yet)" when no player has a name.

## 5. Making a different game keep the look
Change only `APP_TITLE`, `APP_TAGLINE`, `THEME.floor/frame`, `paintWorld` and the character art. Leave menus, HUD and helpers alone.

## Checklist
- [ ] No literal hex colours in screen code; use THEME
- [ ] All menu rows via `menuRow`; all text via `txt`
- [ ] Menus are translucent overlays over the live world
- [ ] Identity works without colour (number, label, shape)
- [ ] Compact variant checked at 1280x560 and 390x844
