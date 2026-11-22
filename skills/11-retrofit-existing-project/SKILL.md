---
name: retrofit-existing-project
description: Use when an EXISTING game or project must be brought up to the Dot Dash / game-template shell, or when a skills-only update "missed a lot". Explains why the skills alone are not enough, gives the transplant order (copy the shell code, then port the game rules into 30-modes), an index of every shell feature with its function names, skill and the shell.js check that proves it, and the usual gaps. Do not use for a brand-new game (use start-new-game and copy the template instead).
---

# Retrofit an existing project

## 1. Why a skills-only update misses things
The skills **describe**; the code **implements**. Several required details (pre-join help colours, pad icons, `devHint`, `padA/padB`, the debug overlay, series totals, the single SETTINGS list, `obstacles()` / `marks()` / `barEnd()`) live as exact functions and tests, not as prose an assistant can reliably rebuild. So:
- **New game**: use the whole starter (`template/`, or `game-template-starter.zip`). Do not rebuild the shell from the skills.
- **Existing game**: transplant the shell *code*, then port the game rules into it (section 2). The skills explain the decisions; the code and `shell.js` are the specification.
- Only if you must keep your own code base: copy the units in section 3, in that order, and use `shell.js` as the acceptance test.

## 2. Transplant procedure (recommended)
1. Copy `template/` to a new folder (it builds and passes `shell.js`). Set `APP_ID` (reuse your old id to keep saved settings and profiles), `APP_TITLE`, `APP_TAGLINE`, `THEME`.
2. Port the game rules into `src/js/30-modes.js`: one mode per game type, every hook implemented (skill 08). Map old code: start positions to `spawn`, per-frame rules to `tick` / `touch` / `over`, win logic to `rank` / `resultText`, HUD text to `status` / `top` / `banner`, world drawing to `drawItems`, minimap data to `marks()`.
3. Port movement, art and world: `stepWalker` (60-play), `drawWalker` (80-draw), `paintWorld` and `obstacles()` (20-world). If the input shape differs, change `NO_INPUT` and `getInput` only.
4. Decide the **progress unit** (distance-like) and give `LEVELS` a meaning for your game (skill 06 section 5); keep the Adaptive blend.
5. Saved data: keep old localStorage keys readable (`getProf` back-fills missing fields); if key names differ, write a one-time migration.
6. Run `npm test`. **Every failing line of `shell.js` is a missing or broken shell feature.** Fix those before adding game tests.
7. `npm run shots` and look at the lobby (empty and joined), a split-screen round, Pause > Settings and the results.

## 3. Partial adoption: units to copy, in dependency order
1. `00-core.js`: THEME, COLORS, `CFG` (+ validation), `rand` / `setSeed`, `NO_INPUT`, storage helpers.
2. `10-levels-profiles.js`: `LEVELS`, `prm`, `adaptiveStep`, profiles.
3. `40-audio-devices.js`: schemes, `KEYMAP`, rebinding, pads, `devHint`, `padSwap`, `getInput`, nav queue, game-state variables (`slots`, `series`, `dbg`, ...).
4. `80-draw.js` helpers first (`txt`, `rrect`, `wrapLines`, `menuRow`, ...), then lobby / settings / pause / results screens, pad icons, debug overlay.
5. `50-lobby-settings.js`: `SETTINGS`, `ROW`, lobby, settings panel, pause, `handleNav`.
6. `60-play.js`, `70-layout-maps.js`, `20-world.js`, then your `30-modes.js`.
7. `index.html` touch controls (`#touch`, `#stick`) and `styles.css`.
Skipping a unit usually breaks a later one silently; the test names below say which.

## 4. Feature index (every row exists in the code and is checked by `tools/tests/shell.js` or `dotdash.js`)
| Feature | Functions / constants | Skill | Test line contains |
|---|---|---|---|
| Lobby: join, slots, Name/Level/Ready, wheel, auto-start | `joinDevice`, `lobbyNav`, `lobbyTick`, `drawLobby`, `drawPlayer`, `drawWheel`, `nameTaken` | 03 | `join, ready, auto-start` |
| Nothing but join help before the first press | `drawPreJoin`, `drawLobbyFooter` | 03 | `pre-join` |
| Pre-join help lines in player / link / dim / go colours | `devHint`, `COLORS`, `THEME` | 03 | `pre-join Keyboard` |
| Gamepad icons, per-tile control help | `drawPadIcon`, `drawPadIcons`, `devHint` | 03 | `devHint for a pad` |
| A = OK, B = Back, Nintendo swap | `padSwap`, `padA`, `padB` | 02 | `Nintendo index swap` |
| Round options as one list (Game, Length, Rounds, Screen, Map, CPU, mode options) | `lobbyRows`, `gameRows`, `modeOptions`, `optionsChanged` | 03 | `lobby shows the base rows` |
| Input seam, NO_INPUT, nav events | `getInput`, `norm`, `processNav`, `handleNav` | 02 | `joystick mode` |
| Rebinding keys | `startRebind`, `captureKey`, `rebuildKeymap`, `resetKeys`, `drawCapture` | 02 | `rebinding` |
| Touch buttons / joystick | `bindStick`, `applyTouchMode` | 02 | `joystick mode` |
| Split screen layouts and clamped cameras | `layoutPanes`, `splitDims`, `camTarget`, `updateCams`, `snapCams` | 04 | `cameras stay inside` |
| Maps: kinds, scope, settable positions | `mapJobs`, `anchorRect`, `paneMapRect`, `sharedMapRect`, `drawMap`, `drawMark` | 05 | `shared map position` |
| Player marks: shape + number badges everywhere (lobby, HUD, results, maps, above players) | `shapePath`, `drawBadge`, `identShape`, `identNum` | 01 | `player shapes draw` |
| Names above players (saved name replaces P#; setting) | `tagText`, `hudName`, `nameOptions`, `anyNamed` | 01 | `names above players` |
| Levels, prm(), Adaptive | `prm`, `lvLabel`, `adaptiveStep` | 07 | `Adaptive` |
| Game-mode hook contract | `curMode`, `lenOf`, `obstacles` | 08 | `every mode implements` |
| One SETTINGS list for Display and Pause > Settings | `liveSettings`, `liveRows`, `buildPanel`, `drawSettingsScreen` | 09 | `in-game settings` |
| Pause menu, in-game settings view | `openPause`, `pauseNav`, `drawPause`, `drawPauseSettings`, `resume` | 09 | `Pause > Settings` |
| Results, series of rounds, profiles | `finishRound`, `advanceRound`, `drawResults`, `getProf`, `addName` | 09 | `series of 3` |
| F3 debug overlay | `drawDebug` | 07 | `F3 toggles` |
| Seeded randomness | `rand`, `setSeed` | 10 | `setSeed` |
| Build stamp, harness, shell tests | `buildLabel` | 10 | `build label` |

## 5. Gaps a skills-only retrofit typically leaves
- Round options visible before the first button press (they must be hidden: skill 03 section 6)
- All pre-join help lines one colour (Keyboard N must use slot N's colour, controller `THEME.link`, note `THEME.dim`)
- Help text typed inline instead of coming from `devHint(id)`; OK / Back hard-coded to pad buttons 0 / 1
- No pad icons or per-tile control help; footer "Tab / Select = settings . N controllers" missing
- Settings and Pause > Settings defined twice (they must share the `SETTINGS` list and the `drawSettingsScreen` renderer, so the in-game menu looks like the lobby one)
- Shape outlines thick or stroked after the fill (draw a thin outline first, like the text and arrows); no `None` option for Player marks
- `Math.random` left in game code; game code reading mode data (`G.items`) instead of `marks()` / `obstacles()`
- Colour-only player identity: no shape badges (left of P1 / P2 in the lobby, HUD, results, maps) and no tag above the character
- Text details: `Keys (Arrows)` with a capital K, `+ New` (not `+ New name`), capitalised colour names (`P1  Red`), saved name above the player instead of P1
- No series totals, no F3 overlay, no key rebinding, no touch joystick

## Checklist
- [ ] Shell code transplanted (template), not re-implemented from prose
- [ ] Game rules live only in `30-modes.js`; every hook implemented
- [ ] `shell.js` passes unchanged; game-specific tests added
- [ ] Saved settings / profiles still load
- [ ] Screenshots reviewed (lobby empty + joined, split screen, pause settings, results)
