---
name: game-mode-plugins
description: Use when one shell (lobby, screens, maps, difficulty, results) must host several different games, or when building a new unrelated game on this shell. Defines the MODES array and its full hook contract (plan, fill, spawn, start, tick, touch, over, aiTarget, progress, maxProgress, barEnd, status, top, banner, rank, resultText, bestOf, drawItems, marks, options, summary), the shared round state G, elimination (c.out), teams, mode options, series of rounds, turn-based variants and a recipe. Do not use for the menu or layout code itself: those never contain game rules.
---

# Game-mode plug-ins

Reference: `src/js/30-modes.js` (rules; the template has a minimal stub), `src/js/20-world.js` (arena + `G`), `src/js/60-play.js` (loop that calls the hooks). The shell contains no rules, only hook calls; the shell test checks every mode implements every hook.

## 1. Hook contract
| hook | when | purpose |
|---|---|---|
| `id,name,desc,lens[],lenDef` | menus | name, description, length choices |
| `plan(R)` / `fill(R)` | world build | zones + route; then pickups. R is seeded |
| `spawn(k,n)` | round start | start position of player k of n |
| `start()` / `tick(dt)` | playing | reset / advance the round clock |
| `touch(c,P)` | after each move | pickups, goals, scoring (`P.reach`) |
| `over(humans)` | each step | true when the round should end (+1.2 s) |
| `aiTarget(c)` | CPU + assist | `{x,y}` to head for, or null |
| `progress(c)`, `maxProgress()`, `barEnd()` | Adaptive + bars | distance-like units, bar scale, bar end label |
| `status(c)`, `top()`, `banner(c)` | HUD | per-player line, top-centre text, banner |
| `rank(list)`, `resultText(c)`, `bestOf(c)`, `bestHigh` | results, profiles | order, text, personal best |
| `drawItems(ctx)`, `marks()` | world pane, overview map | world art; `[{x,y,col,r}]` for the map |
| `options()` | lobby + Settings > Game | mode's own rows `{label,val(),adj(d),lobby}`; `[]` if none |
| `summary()` | results | extra lines (team totals); `[]` if none |
```js
const MODES=[
 {id:'collect',name:'Collect dots',desc:'Grab as many dots as you can before time runs out. Gold dots are worth 3. Most points wins.',
  lens:[{n:'30 seconds',v:30},{n:'60 seconds',v:60},{n:'90 seconds',v:90}],lenDef:1,
  plan(R){G.zones=[{x:WW/2,y:WH/2,r:240}];},
  fill(R){for(let i=0;i<16;i++)G.items.push(newDot(R));},
  spawn(k,n){const a=k/n*Math.PI*2-Math.PI/2;return {x:WW/2+Math.cos(a)*150,y:WH/2+Math.sin(a)*150};},
```
Round state lives in `G` (`t, len, items, rocks, zones, route, legLen, cum, total`); per-player fields sit on the player (`score, leg, finished, finT, lastT, team, out`). The shell asks the world only through `obstacles()`.

## 2. Worked examples
- **Collect dots** (score): 16 dots (gold = 3) respawn; most points at the time limit wins; tie goes to who scored first. `progress = score * SCORE_UNIT`. Options: *Gold dots* (settings) and *Teams* (lobby).
- **Race to the golden dot** (finish): route of 1/3/5 dots at least 900 px apart; first to touch the golden dot wins; others ranked by progress after a 20 s timeout.

## 3. Features a mode can switch on
- **Mode options**: return rows from `options()`; store with `setOpt(mode,key,value)` / read `opt(mode,key,default)` (persisted in `CFG.opt`). `lobby:true` rows also appear on the lobby; changing one clears Ready.
- **Teams / co-op**: set `c.team` in `start()` (Dot Dash: `c.ci % 2`), keep individual scores, return team totals from `summary()` and show them in `top()`/`status()`. For co-op make `rank` return teams in one group and score the team total.
- **Elimination / last one standing**: set `c.out = true` when a player is out. The shell then skips movement, excludes them from Adaptive (not lead, not group), and ignores collisions; the mode ranks by elimination order and `over()` when one remains. Draws them ghosted.
- **Series of rounds**: the shell's `Rounds` row (1, 3, 5) runs several rounds with the same players, gives rank points (1st human = number of humans, last = 1) into `series.totals`, and shows running totals on the results screen. The mode only needs to be restartable (`plan/fill/start` idempotent).
- **Own input shape**: change `NO_INPUT` and `getInput` (skill 02); the mode reads whatever it needs in `touch`/movement code.

## 4. Recipe: new game on this shell
1. Answer the questions in `start-new-game`; copy `template/`.
2. Replace the entries of `MODES` (keep at least one); decide the progress unit first.
3. Adapt movement (`stepWalker`), art (`drawWalker`, `paintWorld`), input shape.
4. Map help to the level parameters (skill 06 section 5); keep Adaptive.
5. Keep lobby, settings, pause, results, layouts, maps untouched; add tests; `npm test`.

## 5. Turn-based variant
Keep lobby, results, profiles, series and maps (bars). Replace the real-time step by `takeTurn(player,input)`: `start()` sets whose turn it is, `touch` becomes `apply(move)`, `tick(dt)` only counts a turn timer, `over()` checks the end. Catch-up speed has no meaning; use extra resources/time instead (skill 06 table) driven by the same Adaptive `assist` value.

## 6. Rules of thumb
Work with 1 to 8 humans and 0 to 7 CPUs; `touch` idempotent after `finished`; all randomness via `rand()`/`R`; no clock = `tick` may do nothing but `over` must still end the round.

## Checklist
- [ ] Every hook implemented (no-ops, never undefined) - the shell test enforces it
- [ ] `progress`, `maxProgress`, `barEnd` in one consistent unit
- [ ] `rank` is total (no unresolved ties); `marks()` and `obstacles()` are the only data the maps read
- [ ] A test per rule (scoring, finish, end condition, options)

## Racer notes (optional hooks added while porting Tabletop Racers)
Beyond the required hooks the shell now calls these only if a mode defines them: `bestKey()` (profile key for `bestOf`, default the mode id), `stats(c,p)` (update a saved profile after a round), `profLine(p)` (text for Settings > Players), `needsFinish` (flag: wins count only for `c.finished`), `hud(p,c,hs)` (extra drawing in a pane), `frame(dt)` (every animation frame, any state), `stunWord`, and `banner(c)` may return `{t,col,sz,y}`. Per-car fields the mode needs are added in `start()`, and a mode may drive its own CPUs inside `stepWalker` (the racer ignores the shell's `aiControl`). Progress must live in `c.prog` units: keep any raw counter (the racer's `c.pi`) in another field.
