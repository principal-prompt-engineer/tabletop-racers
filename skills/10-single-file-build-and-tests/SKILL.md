---
name: single-file-build-and-tests
description: Use when a browser game or tool must be delivered as ONE self-contained .html file but is too big to maintain as one file, or when starting from the Dot Dash template. Covers the src/ split, Node and PowerShell build scripts, one-click run_build.bat / run_build.sh, npm scripts, build-time stamping, embedded art, the headless test harness (shared harness + generic shell tests + game tests), seeded randomness for replayable rounds, and the optional Playwright screenshot check. Universal. Do not use for projects that need a bundler, modules or a server.
---

# Single-file HTML from source files

The deliverable is one HTML file with everything inline, so it opens by double-click, from a USB stick or from an email. The source is many small files so that humans and AI can work on one part at a time. A build script joins them. Never maintain the built file by hand.

## 1. Layout

```
run_build.bat        one click: build, then open dist\<name>.html
src/index.html       template with {{STYLE}}, {{ART}}, {{SCRIPT}} (each exactly once)
src/styles.css
src/js/NN-name.js    plain scripts, no import/export; joined in file-name order
art/                 optional pictures baked in as data: URIs
tools/build.js       Node build
tools/build.ps1      same output without Node (PowerShell is on every Windows PC)
tools/tests/*.js     headless checks; each takes the built file path as argv[2]
dist/                output only
README.md
```

- Number files in tens (`00-`, `10-`, `20-`) so a new one slots in between. Order matters: later files may use earlier ones; top-level `const` and `function` share one scope after joining.
- Split by responsibility (core, data, rendering, input, UI, main loop), not by size. Keep every file small enough to read in one go.
- Plain scripts joined into one scope means no module syntax and no per-file `'use strict'` surprises. Put start-up calls (first render, first listener) in the last file.

## 2. The build contract (both scripts must behave the same)

1. Read `src/js/*.js` sorted by name and concatenate.
2. Write the build time into the output only (section 3).
3. Syntax-check the combined script before writing anything (`new vm.Script(js)`); on error print the message and exit non-zero without touching `dist/`.
4. Fill the template placeholders; fail if any is missing or duplicated.
5. Embed `art/*` as `data:` URIs in a `const EMBEDDED_ART={key:'data:...'}` block. Map file name to key in one table in the script. `--no-art` skips it.
6. Print what it did (size, stamp, embedded files). Optional `--test` runs `tools/tests`. Optional `--out`.
7. Keep the PowerShell script a straight port: same placeholders, same file order, same stamp handling. It has no syntax check or tests; say so in the README.

Embedded images are `data:` URLs: browsers allow reading their pixels on a canvas even from `file://`, whereas an `assets/` folder next to the HTML does not.

## 3. Build stamp (works with the build-timestamp skill)

- In `src` the two lines stay as placeholders and carry their marker comments:
  `const BUILD_STAMP='unknown'; // BUILD_STAMP` and `const BUILD_VERSION=1; // BUILD_VERSION`.
- The build replaces them in the output with the local time `YYYY-MM-DD HH:MM:SS` and `BUILD_VERSION=null`. The page only displays the constants; it never reads the clock.
- Match the lines with a pattern that allows `\r` before the line end, e.g. `(?=\r?$)`, so Windows CRLF checkouts work.
- Fail the build if there is not exactly one line of each.
- `--stamp "YYYY-MM-DD HH:MM:SS"` overrides the clock for builds on a machine that is not in the user's timezone (an AI sandbox in UTC). Use it with the user's local time; never present UTC as local.

## 4. run_build.bat

- Save with CRLF line endings.
- `cd /d "%~dp0"`, use Node if `where node` succeeds, otherwise `powershell -NoProfile -ExecutionPolicy Bypass -File tools\build.ps1`.
- On failure: show the message, `pause`, `exit /b 1`. On success: `start "" "dist\<name>.html"`.
- Avoid `)` inside `echo` lines within parenthesised blocks.
- Downloaded zips carry a "blocked" mark on Windows: tell users to right-click the zip > Properties > Unblock before extracting.

## 5. Tests

- Test the built file, not the sources: extract every `<script>` block (`matchAll`, non-greedy), run them in a `vm` context with mocked DOM, canvas, `localStorage`, gamepads and `requestAnimationFrame`, drive the app, assert.
- Print `ok  : message` and `FAIL: message`; the build's `--test` counts those lines.
- Add a check for each new feature, and for each bug a real input exposed. Pure functions (image cutting, parsing) should be testable with synthetic data.
- Say plainly what the headless tests cannot cover (real devices, file pickers, visual feel, real user images).

## 6. Working procedure for an AI

1. Read `README.md` and the file(s) you will change; do not load the whole project.
2. Edit `src/` only. Never edit `dist/`.
3. Run `node tools/build.js --test`. A failure means the change is not done.
4. Deliver `dist/<name>.html` and, when the source changed, the project zip. Report the stamp the build printed ("Build stamp set to ...").
5. Note in the handover which files changed and anything untested.

## 7. Tests: harness + shell + game
```
tools/tests/_harness.js   loads the BUILT file in a vm (mock DOM, canvas, localStorage, gamepads, rAF); exports ev, step, sim(seconds), tap, key, assert, startPlay, store
tools/tests/shell.js      generic shell checks (lobby, pause + in-game settings, layouts, maps and positions, Adaptive, series, rebinding, touch, seeds, profiles, every hook implemented). Runs unchanged on the empty template.
tools/tests/<game>.js     the rules of THIS game (scoring, finish, options, teams)
```
Files starting with `_` are not run. Each prints `ok  :` / `FAIL:`; `node tools/build.js --test` (or `npm test`) counts them. Add a check for every new rule and for every bug a real input exposed. Say plainly what headless tests cannot cover (real pads, touch devices, sound, feel).

## 8. Seeded randomness (replayable rounds)
All gameplay randomness goes through `rand()` (seeded; `setSeed(n)`; `?seed=123` in the URL). World, dots, spawns, CPU skill and respawns then repeat exactly, tests do not flake, and a bug report can include a seed. Never use `Math.random` in game code. In tests: `ev('setSeed(5);buildWorld(true)')` twice must give the same world.

## 9. Starting a new game from the template
Copy `template/`; it is already renamed (`tabletop-racers`, `APP_ID='myGame'`), builds, and passes `shell.js`. Set `APP_ID` (namespaces localStorage), `APP_TITLE`, `APP_TAGLINE`, rename the output in `tools/build.js`, `build.ps1`, `run_build.bat`, `run_build.sh`, `package.json`, `<title>`. Art: files in `art/` registered in `ART_KEYS` (both build scripts); procedural drawing needs none.

## 10. Visual check and one-click
`node tools/shots.js [built.html] [outDir]` (needs Playwright + Chromium; skips politely without) opens the game at 1280x720 and 390x844, joins players, cycles every layout / map / map-position combination, the debug overlay, pause, pause settings, results, settings and the rebind prompt, writes PNGs and reports page errors. Look for black borders, overlapping HUD and maps, clipped text. One click: `run_build.bat` (Windows), `run_build.sh` (macOS/Linux, needs Node), or `npm run build` / `npm test`.

## Pitfalls seen in practice

- A greedy `<script>([\s\S]*)</script>` regex swallows everything between two script tags; use non-greedy `matchAll` and join.
- The stamp placeholders drifting out of sync with what the PowerShell script expects: match with a regex, not literal text.
- Forgetting the `{{ART}}` script block exists when writing tests or parsers.
- Embedded art makes the file several MB; mention it, and offer `--no-art`.

## Checklist

- [ ] `src/` split by responsibility, numbered, small files
- [ ] Build joins in order, syntax-checks first, fails loudly
- [ ] Stamp written to the output only, CRLF-safe, `--stamp` override
- [ ] `run_build.bat` (CRLF) builds and opens; Node or PowerShell
- [ ] `tools/build.ps1` mirrors `tools/build.js`
- [ ] Tests run on the built file via `--test`
- [ ] README explains one-click use, layout, art and untested areas
- [ ] Reply reports the build stamp and what was not tested
