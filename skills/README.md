# Game-template skills

Twelve small skills extracted from Tabletop Racers and demonstrated by **Dot Dash** (`../dist/dot-dash.html`). Start with **00**; read only the others a task needs. Code shown in the skills is extracted from the real source (`../src/js`), and `../template/` is the same shell with a placeholder game, ready to copy.

| # | Skill | Kind | Gives a new game |
|---|---|---|---|
| 00 | start-new-game | universal | the questions to answer first, which skills to follow, keep / rewrite / delete list |
| 01 | look-and-feel | universal | THEME tokens, text/menu helpers, overlays, colour-independent player marks |
| 02 | input-devices | universal | 4 rebindable keyboard schemes, gamepads, touch buttons or joystick, one `getInput` seam |
| 03 | lobby-join-ready | universal | press-to-join slots, Name/Level/Ready, round options incl. Rounds and mode options |
| 04 | split-screen-layouts | **spatial** | shared / vertical / horizontal / grid panes, clamped cameras (+ non-spatial variant) |
| 05 | maps | spatial (bars: any) | overview map, position bars, pane or shared scope, settable position, shapes |
| 06 | per-player-difficulty | universal | Tiny/Easy/Normal/Pro table, soft bump, class results, help per genre |
| 07 | adaptive-difficulty | needs `progress()` | live rubber-band help with the real `adaptiveStep`, debug overlay, tuning caveat |
| 08 | game-mode-plugins | universal | full hook contract, options, teams, elimination, series, turn-based variant |
| 09 | settings-pause-results | universal | one SETTINGS list for Display and Pause > Settings, rebinding, results, series, profiles |
| 10 | single-file-build-and-tests | universal | `src/` split, build, npm and shell scripts, test harness, seeds, screenshot check |
| 11 | retrofit-existing-project | universal | how to bring an existing game onto the shell, feature index, the usual gaps |

**Skills describe, the code implements.** Always give an assistant the `template/` (or `src/`) together with the skills. For a new game copy the whole template; for an existing game follow skill 11 (transplant the code, then run `tools/tests/shell.js` as the acceptance test). Skills alone lose details.

## Dependencies
```
11 retrofit ──transplants──> template ──passes──> shell.js
00 start ──chooses──> 04/05 (spatial) or their non-spatial variants
08 modes ──progress()/marks()/barEnd()──> 07 adaptive ──blends──> 06 levels
   └──────────────────────────────────> 05 maps <── 04 layouts (panes)
01 look-and-feel used by 03, 05, 09;  02 input feeds 03, 09 and the game loop;  10 builds and tests all
```

## Using them
Give an assistant `skills/` plus `template/` (or the whole project). Prompt example: "Start a new game from the template: players steer boats and collect fish. Follow skill 00, then 08, 06, 07, 04, 05; keep the look from 01." Every skill ends in a checklist.
