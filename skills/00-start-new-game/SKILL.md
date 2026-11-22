---
name: start-new-game
description: Use FIRST when starting any new same-screen multiplayer game from the Dot Dash / game-template shell. Asks the questions that decide the design (real-time or turn-based, scrolling world or fixed screen, input shape, what "progress" and "help" mean), maps the answers to which of the other skills to follow, says what to keep, rewrite or delete in the template, and gives a first-hour milestone list. Do not use for single-player games, web apps without a shared screen, or for changes to an existing game that already follows these skills (go straight to the specific skill).
---

# Start a new game on the shell

Skills 01, 02, 03, 06, 07 (core), 09 and 10 are **universal**. Skills 04, 05 and parts of 07 and 08 assume a **spatial world** (scrolling arena, moving players). Decide which kind of game you have before writing code.

## 1. Questions to settle (write the answers in the project README)
| # | Question | Decides |
|---|---|---|
| 1 | Real-time (movement, reflexes) or turn-based / round-based? | turn-based: keep the lobby/menus, replace `update(dt)` by a turn handler and drop catch-up speed; see skill 08 section 5 |
| 2 | Does the game have a **spatial world** that scrolls or fits on one screen? | spatial: skills 04 + 05 as written; non-spatial: one panel per player (skill 04 section 7), bars-only maps (05 section 7) |
| 3 | What does one player's input look like? (`{mx,my}`, `{steer,gas}`, `{choice}`, ...) | `NO_INPUT` + `getInput` (skill 02) |
| 4 | What is **progress**: one number per player in distance-like units? | `mode.progress()` (feeds Adaptive and the position bars) |
| 5 | What is **help**: how can the game be made easier without changing the rules? | the `LEVELS` parameters (skill 06 section 6 has a table per genre) |
| 6 | Win condition: score at a time limit, first to a goal, last one standing, team total, series of rounds? | the mode hooks (`over`, `rank`, `summary`, `c.out`, `series`) |
| 7 | Players per screen? How many CPU players? | `MAX_PLAYERS`, layouts, AI |
| 8 | Is there a world to draw (floor, obstacles) and what do characters look like? | `paintWorld`, `obstacles()`, `drawWalker` |

## 2. Recipe
1. Copy the `template/` folder (it already builds and passes `tools/tests/shell.js`). Set `APP_ID`, `APP_TITLE`, `APP_TAGLINE`, `THEME` in `00-core.js`.
2. Replace the placeholder mode in `30-modes.js` (skill 08). Implement every hook; decide the progress unit first.
3. Adapt movement and art: `stepWalker` (60-play), `drawWalker` and `paintWorld` (80-draw, 20-world). Change `NO_INPUT` and `getInput` if the input shape differs.
4. Give the levels a meaning for your game (skill 06 section 6), keep the Adaptive blend (skill 07) and tune `FULL_GAP` to about one second of normal play.
5. Keep lobby, settings, pause, results, layouts and maps untouched. Add tests for the rules next to `shell.js`. Run `npm test`.

## 3. First-hour milestones
- [ ] `npm test` green on the untouched template
- [ ] Game name, colours, tagline changed; builds
- [ ] One mode plays start to finish with 1 human + CPU
- [ ] Two humans in vertical split with a map; Pause > Settings works
- [ ] Adaptive Tiny / Normal rows retuned; F3 overlay shows sensible gaps
- [ ] Rules covered by a test file; screenshots checked (`npm run shots`)

## 4. What to keep, rewrite, delete
- **Keep as is**: 00-core (except constants), 10 (except the levels' meaning), 40-audio-devices, 50-lobby-settings, 70-layout-maps (spatial), 80-draw menus/HUD helpers, tools/.
- **Rewrite**: 30-modes, `stepWalker`, `drawWalker`, `paintWorld`, `20-world` obstacle generation, level descriptions.
- **Delete if not needed**: `crashHit`/`stun` (no collisions), `reach` (no pickups), catch-up boost (no speed), `obstacles()` (no obstacles; return `[]`).

## 5. Pitfalls
- Randomness outside `rand()` makes rounds unreproducible and tests flaky.
- Putting game rules in the shell files defeats the template: they belong in `30-modes.js`.
- Choosing a progress unit late: Adaptive and the bars both depend on it.
