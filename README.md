# Tabletop Racers (on the game-template shell)

Top-down toy-car racing on a table, 1 to 8 players on one screen, CPU cars, per-player difficulty (Tiny, Easy, Normal, Pro, Adaptive), shared / vertical / horizontal / grid split screen, overview map or position bars, bumper walls, optional image-AI art, series of races, saved players. Built into one HTML file: `dist/tabletop-racers.html`.

Build and test: `node tools/build.js --test` (or `npm test`); one click: `run_build.bat` (Windows) / `run_build.sh` (macOS, Linux). Screenshots: `npm run shots` (needs Playwright). `src/` is the only place to edit; `dist/` is generated. Add `?seed=123` to the address to replay the same table.

## Design answers (start-new-game, skill 00, section 1)
| # | Question | Answer |
|---|---|---|
| 1 | Real-time or turn-based | Real-time, fixed 1/60 s steps |
| 2 | World | Fixed table, 3400 x 2400 px, scrolled and zoomed by a camera per pane (spatial: skills 04 + 05 as written) |
| 3 | Input per player | Steer, gas, brake: `{mx,my,gas,brake}`. Keys and touch: Left/Right steer, Up gas, Down brake. Pads: stick or D-pad steers, right trigger / A gas, left trigger / B brake |
| 4 | Progress | Px of route driven: `c.pi * track.step` (c.pi = raw track index, N per lap). One lap = `track.total` px |
| 5 | Help | Per level: steering assist `as`, catch-up speed `cu`, crash stun `stun`, speed floor `floor` (see `LEVELS`); Adaptive = lerp(Normal, Tiny) by the gap to the leader |
| 6 | Win | First across the line after N laps (1 to 9); others ranked by distance; rounds 1 / 3 / 5 give series points |
| 7 | Players | 1 to 8 humans, 0 to 7 CPU cars (`MAX_PLAYERS` 8) |
| 8 | World and characters | Wood or imported table texture, road, decorative props; toy cars (built-in or sprite sheets) |

## Where things live
- `src/js/30-modes.js`: the rules (mode `race`, every hook). `15-tracks.js`: tracks, spline, bumper geometry. `20-world.js`: table painting, `G`. `25-art.js`: sprite-sheet cutter, art import, Settings > Appearance. `35-engine.js`: engine sound.
- `src/js/60-play.js`: `stepWalker` (the car), `driveAI`, `locate`, `bumperHit`. `src/js/80-draw.js`: `drawWalker` (the car).
- Everything else (lobby, settings, pause, results, layouts, maps, player marks, devices, Adaptive) is the shell. Changes to the shell are listed below and in each skill under "Racer notes".
- Tests: `shell.js` (the shell, unchanged from the newest starter), `race.js` (this game's rules, saved-data migration), `seg.js` (art cutting).

## Shell changes made for this game (and why)
1. `00-core`: world size, `CAR`/`WALK`, `NO_INPUT` shape, `HIT_V` (closing speed of a hard car-to-car hit; the starter had CRASH_V x 1.4 hard-coded), `CAM` (camera feel constants; the starter hard-coded them), settings migration.
2. `40-audio-devices`: `getInput` returns `{mx,my,gas,brake}`; new `axes()` (independent axes: Left + Up must not weaken steering or gas, `norm()` would).
3. `50-lobby-settings`: `GAME_CATS` seam, so the game can add the Appearance category; saved-player line from the mode (`profLine`).
4. `60-play`: `collide` uses `HIT_V`; `finishRound` calls optional mode hooks `stats`, `bestKey` (best lap per track) and `needsFinish` (a win only counts for a finisher, as in v5).
5. `70-layout-maps`: `camTarget` reads `CAM` (and widens the view with speed).
6. `80-draw`: `banner()` may return `{t,col,sz,y}`; optional `stunWord` ('CRASH!') and `hud(p,c,hs)` (speed bar).
7. `90-main`: optional per-frame mode hook `frame(dt)` (engine sound, silent when paused).
8. Merged onto the newer starter (player marks: shape + number badges, saved names above players, one settings renderer for lobby and pause, capitalised help text). The old 'Map shapes' setting migrates to Player marks (off becomes Number only); my car code draws the number on the car body only when the marks include numbers.
9. Lobby row order is now the shell's: Game, Length (laps), Rounds, Screen, Map, CPU players, then the mode's Track and Bumpers.
