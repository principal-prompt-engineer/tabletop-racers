#!/bin/sh
# One click for macOS / Linux: build dist/tabletop-racers.html and open it. (Windows: run_build.bat)
cd "$(dirname "$0")" || exit 1
node tools/build.js || { echo; echo "*** Build failed. Read the message above. ***"; exit 1; }
f="dist/tabletop-racers.html"
if command -v open >/dev/null 2>&1; then open "$f"; elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$f"; else echo "Built $f"; fi
