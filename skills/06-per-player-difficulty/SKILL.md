---
name: per-player-difficulty
description: Use when players of different ages or skill share one round and each needs their own help level: a LEVELS table (Tiny, Easy, Normal, Pro, plus Adaptive) with parameters (assist, catch-up, stun, reach), picked per player in the lobby, with results grouped by class, and a table of what "help" means in other genres. Universal in structure; the parameters are game-specific. Do not use for games where all players must be strictly equal (ranked or competitive-only modes).
---

# Per-player difficulty

Reference: `src/js/10-levels-profiles.js`; use in `stepWalker` / `update` (`src/js/60-play.js`); class results in `finishRound`.

## 1. The table
```js
const LEVELS=[
 {name:'Tiny',as:1,cu:.7,stun:0,reach:1.8,desc:'Lots of steering help, a speed boost when you are behind, big pickup reach, soft bumps, and you never stop.'},
 {name:'Easy',as:.5,cu:.3,stun:.5,reach:1.4,desc:'Some steering help, a small boost when behind, and a short stun after a hard bump.'},
 {name:'Normal',as:0,cu:0,stun:1.2,reach:1,desc:'No help. A hard bump stops you for a moment.'},
 {name:'Pro',as:0,cu:0,stun:1.8,reach:1,desc:'No help and a longer stun after a hard bump.'},
 {name:'Adaptive',as:0,cu:0,stun:1.2,reach:1,desc:'Help adjusts as you play: lots when you trail the leader, none when you lead, so the group stays close. Never dies from bumps.'}];
function prm(c){
  if(c.lv===LV_ADAPTIVE){   // always lerp(Normal, Tiny, t) so retuning those two rows retunes Adaptive
    const t=c.assist,N=LEVELS[LV_NORMAL],T=LEVELS[LV_TINY],stun=lerp(N.stun,T.stun,t);
    return {as:lerp(N.as,T.as,t),cu:lerp(N.cu,T.cu,t),stun:stun<.2?0:stun,reach:lerp(N.reach,T.reach,t)};
  }
  if(c.lv>=0)return LEVELS[c.lv];
  return NOP;
}
```
- `as` assist strength 0..1: pulls movement towards the target (`mode.aiTarget`) only when it does not oppose the player's intent (`dot > -0.3`) and slides the player round obstacles.
- `cu` catch-up cap: speed multiplier `1 + clamp((lead - progress)/600, 0, cu)`; humans only.
- `stun` seconds frozen after a hard hit; `0` = soft bump (half speed, 0.9 s grace, never stops). `reach` multiplies pickup radius.
All gameplay reads `prm(c)`, never `LEVELS[...]`, so Adaptive can substitute live values; CPUs use `NOP` (no help, cannot be stunned).

## 2. Lobby, HUD, results
Level is a row in the player tile (Left/Right cycles, description under it). The HUD shows `lvLabel(c)`. Results show **Overall** and **By class** (strongest class first, `LV_SHOW`) so a Tiny winner is honoured within their class; profile wins are per class plus one overall.

## 3. Compatibility
New levels are appended; saved data refers to names; loops use `LEVELS.length`; missing `wins.<Level>` reads 0; fixed levels behave the same before and after Adaptive exists.

## 4. Adding a parameter
Add the key to every row, read it in one place through `prm(c)`, add it to the Adaptive blend (`lerp(Normal, Tiny, t)`), update the level descriptions (Settings > Players lists them).

## 5. What "help" means (Dot Dash and other genres)
| Genre | assist (as) | catch-up (cu) | stun | reach / forgiveness |
|---|---|---|---|---|
| Top-down walker / racer (Dot Dash, Tabletop Racers) | steering pull + slide round obstacles | speed boost when behind | freeze after hard hit | pickup radius |
| Platformer | coyote time, jump buffering, ledge snap | none, or slower hazards | respawn delay shrinks to 0 | larger hit-boxes on pickups |
| Shooter / brawler | aim assist, auto-turn | extra damage or ammo when behind | shorter hit-stun | bigger enemy hurtbox |
| Puzzle / word | hints shown, highlight valid moves | bonus time or extra tries | no penalty for mistakes | more forgiving match rules |
| Quiz / trivia | fewer options, first letter shown | bonus points for late answers | no negative marking | longer timer |
| Turn-based board | move suggestions | extra resource or draw | skip-turn penalty removed | undo allowed |
The rule: help changes how hard it is to do the thing, never the rules or the scoring, and a Tiny player must never be punished with an unrecoverable state.

## Checklist
- [ ] Gameplay reads `prm(c)` only; CPUs use `NOP`
- [ ] A soft path exists when stun is 0 (or under 0.2 s)
- [ ] Results by class; per-class wins saved
- [ ] Parameters are meaningful for this game (section 5)
