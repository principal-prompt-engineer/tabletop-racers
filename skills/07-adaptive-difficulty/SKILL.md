---
name: adaptive-difficulty
description: Use when a same-screen game should keep mixed-skill players close together by changing each human's help live according to how far they trail the leader (rubber-band assist). Defines the "Adaptive" level blended from Normal (leading) to Tiny (last Adaptive player) using a game-supplied progress() in distance-like units (works for races, score games and last-one-standing), with the exact adaptiveStep code, constants, edge cases (eliminated, finished, CPU leader), debug overlay, tests and a caveat on tuning. Do not use when all players are on equal footing by design or the game has no measurable progress.
---

# Adaptive assist level

Requires `per-player-difficulty` (Tiny and Normal rows are blended) and `game-mode-plugins` (`progress()`). Reference: `adaptiveStep`, `ADAPT`, `prm` in `src/js/10-levels-profiles.js`; per-tick call in `update` (`src/js/60-play.js`). Universal if your game has a `progress()`; the *meaning* of help is game-specific (skill 06 section 5).

## 1. Idea
Help is proportional to the gap behind the leader: none when leading, full Tiny help for the last Adaptive player, blended in between, fading as the pack closes. Measure **distance, not rank**, so help never jumps when two players swap places.

## 2. Progress units
Every mode provides `progress(c)` in **distance-like units** (pixels of route, or `score * SCORE_UNIT`). One set of constants then works for any game. If there is no natural distance, define a unit so "about one second of normal play" is roughly `FULL_GAP`.

## 3. The code
```js
const ADAPT={FULL_GAP:300,RATE:1.5,MODE:'relative',SPAN_CAP:1200};   // FULL_GAP in progress units (about 1 s of top speed); MODE 'relative' | 'absolute'; SPAN_CAP stops one stuck player from diluting everyone else's help
function adaptiveStep(players,dt){
  const live=players.filter(c=>!c.out);          // eliminated players are neither the lead nor in the group
  let lead=-1e9;for(const c of live)lead=Math.max(lead,c.prog);
  const grp=live.filter(c=>c.human&&c.lv===LV_ADAPTIVE&&!c.finished);
  let span=ADAPT.FULL_GAP;
  if(ADAPT.MODE==='relative')for(const c of grp)span=Math.max(span,Math.min(ADAPT.SPAN_CAP,lead-c.prog));
  for(const c of grp){
    const target=clamp((lead-c.prog)/span,0,1);
    c.assist+=(target-c.assist)*Math.min(1,dt*ADAPT.RATE);
  }
  return lead;
}
```
Per tick in `update`: set `c.prog = mode.progress(c)` for everyone **before anyone moves** (snapshot), then `lead = adaptiveStep(players,dt)`; catch-up uses `lead`. `t` starts at 0 each round, is never saved, and only changes while the round is being played (the loop is not run while paused; countdown and finished players are skipped).

## 4. Who counts
- **Lead**: any live player, CPUs and finished players included (a finisher keeps their final progress). Eliminated players (`c.out`) are neither lead nor group.
- **Group**: human Adaptive players still playing. CPUs and fixed levels get nothing and never affect the span.

## 5. Blending (t = 0 is Normal, t = 1 is Tiny)
`lerp(Normal.param, Tiny.param, t)` for every parameter, so retuning those two rows retunes Adaptive. Blended stun under 0.2 s becomes the soft bump. Adaptive never eliminates anyone. Game-specific hazards (a chaser, a timer) scale by `(1 - t)`; spawn only while the factor is above 0.1 and never despawn.

## 6. Feedback and debugging
HUD level line "Adaptive - 62%" in THEME.help with a cyan ring around the character that fades with help. **F3 debug overlay** (also Settings > Display and Pause > Settings): leader progress, `FULL_GAP`, mode, and per player level, progress, gap, speed, OUT/DONE; use it while tuning.

## 7. Tuning, and an honest caveat
`FULL_GAP` smaller = tighter pack; `RATE` faster = twitchy, slower = gaps open first. **The constants (300, 1.5, 1200, divisor 600) were unit-tested but never tuned by play.** Before trusting them: playtest one strong player, one Adaptive, one child on Tiny, watch the F3 numbers, and adjust `FULL_GAP` to about one second of normal movement in *your* game.

## 8. Review notes (differences from the original skill)
Kept: distance-not-rank, snapshot per tick, human-Adaptive-only group, `FULL_GAP` floor, smoothing, per-round reset, lerp blending, soft-bump threshold, last level id, no saved state.
Added or changed: `progress()` contract (score games work; same numbers feed the bars); `SPAN_CAP` (a stuck far-behind player no longer dilutes everyone's help); `MODE:'absolute'` option; a pure, unit-tested `adaptiveStep`; `reach` in the blend; hazards scale by `(1 - t)`; elimination support.
Known limits: help depends on position only, not on how well the player plays; ties give everyone 0 help.

## Tests (tools/tests/shell.js)
Leader about 0; last about 1; 20 units behind under 0.1; CPU leader; finished skipped; assist 1 = Tiny, 0 = Normal; stuck player does not dilute; absolute mode 150/300 = 0.5; eliminated skipped; frozen while paused; live round with a forced leader.

## Checklist
- [ ] Mode supplies `progress()` and `maxProgress()`
- [ ] Snapshot, one step per tick, smoothed, reset per round, frozen when paused
- [ ] `lerp(Normal, Tiny, t)`; stun < 0.2 s = soft bump; never eliminated
- [ ] Fixed levels unchanged; Adaptive is the last level id; `wins.Adaptive` defaults to 0
- [ ] Constants tuned by play, not just by tests
