#!/usr/bin/env node
/* Builds dist/tabletop-racers.html from src/ (+ optional art/).
   Usage:  node tools/build.js [--no-art] [--test] [--out <file>] [--stamp "YYYY-MM-DD HH:MM:SS"]
   (--stamp is for builds on a machine whose clock is not the user's local time, e.g. an AI sandbox in UTC)
   - src/index.html     page template with {{STYLE}}, {{ART}}, {{SCRIPT}} placeholders
   - src/styles.css     styles
   - src/js/*.js        concatenated in file-name order (00-, 10-, 20- ...)
   - art/*              optional pictures, embedded as data: URIs so the single file is self-contained
   - build stamp        the local time of the machine running the build is written into the output only
                        (build-timestamp skill); the source files keep BUILD_STAMP='unknown' */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process');
const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const flag = n => args.includes(n);
const opt = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const out = path.resolve(root, opt('--out') || 'dist/tabletop-racers.html');
const rd = p => fs.readFileSync(path.join(root, p), 'utf8');
const die = m => { console.error('\nBUILD FAILED: ' + m); process.exit(1); };

const pad = n => String(n).padStart(2, '0');
const d = new Date();
const stamp = opt('--stamp') || `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(stamp)) die("--stamp must look like 'YYYY-MM-DD HH:MM:SS'");

// ---- art: file name -> key used by the game
const ART_KEYS = {
  // file name (without extension) in art/ -> key in EMBEDDED_ART. Example: road: 'road'  (then art/road.png is available as EMBEDDED_ART.road)
  cars_sheet: 'cars1', cars_sheet_2: 'cars2', props_sheet: 'props',
  table_kitchen: 'table_kitchen', table_desk: 'table_desk', table_bench: 'table_bench', road: 'road',
};
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
let artJs = '/* no art embedded */';
const embedded = [];
if (!flag('--no-art') && fs.existsSync(path.join(root, 'art'))) {
  const obj = {};
  for (const f of fs.readdirSync(path.join(root, 'art')).sort()) {
    const ext = path.extname(f).toLowerCase(), base = path.basename(f, path.extname(f));
    if (!MIME[ext] || !ART_KEYS[base]) continue;
    obj[ART_KEYS[base]] = `data:${MIME[ext]};base64,` + fs.readFileSync(path.join(root, 'art', f)).toString('base64');
    embedded.push(f);
  }
  if (embedded.length) artJs = 'const EMBEDDED_ART=' + JSON.stringify(obj) + ';';
}

// ---- gather sources
const jsDir = path.join(root, 'src', 'js');
const jsFiles = fs.readdirSync(jsDir).filter(f => f.endsWith('.js') && !f.startsWith('_')).sort();
if (!jsFiles.length) die('no .js files in src/js');
let js = jsFiles.map(f => fs.readFileSync(path.join(jsDir, f), 'utf8')).join('');

// ---- build stamp (output only)
const sRe = /^const BUILD_STAMP='[^']*'; \/\/ BUILD_STAMP(?=\r?$)/m, vRe = /^const BUILD_VERSION=[^;]*; \/\/ BUILD_VERSION(?=\r?$)/m;   // (?=\r?$) so Windows CRLF checkouts work too
if ((js.match(new RegExp(sRe.source, 'gm')) || []).length !== 1) die('expected exactly one BUILD_STAMP line in src/js');
if ((js.match(new RegExp(vRe.source, 'gm')) || []).length !== 1) die('expected exactly one BUILD_VERSION line in src/js');
js = js.replace(sRe, `const BUILD_STAMP='${stamp}'; // BUILD_STAMP`).replace(vRe, 'const BUILD_VERSION=null; // BUILD_VERSION');

// ---- syntax check before writing anything
try { new vm.Script(js, { filename: 'tabletop-racers (combined src/js)' }); }
catch (e) { die('JavaScript syntax error in the combined source:\n' + e.stack.split('\n').slice(0, 4).join('\n')); }

// ---- assemble
let html = rd('src/index.html');
for (const p of ['{{STYLE}}', '{{ART}}', '{{SCRIPT}}']) if (html.split(p).length !== 2) die(`src/index.html must contain ${p} exactly once`);
html = html.split('{{STYLE}}').join(rd('src/styles.css').replace(/\n$/, ''))
  .split('{{ART}}').join(artJs)
  .split('{{SCRIPT}}').join(js.replace(/\n$/, ''));
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html, 'utf8');

console.log(`Built ${path.relative(root, out)}  (${(Buffer.byteLength(html) / 1024).toFixed(0)} KB)`);
console.log(`  ${jsFiles.length} script files, build stamp ${stamp}`);
console.log(`  art embedded: ${embedded.length ? embedded.join(', ') : 'none'}`);

if (flag('--test')) {
  let bad = 0;
  for (const t of fs.readdirSync(path.join(root, 'tools', 'tests')).filter(f => f.endsWith('.js') && !f.startsWith('_')).sort()) {
    const r = cp.spawnSync(process.execPath, [path.join(root, 'tools', 'tests', t), out], { encoding: 'utf8' });
    const txt = (r.stdout || '') + (r.stderr || '');
    const oks = (txt.match(/^ok  :/gm) || []).length, fails = (txt.match(/^FAIL:/gm) || []).length;
    console.log(`  test ${t}: ${oks} ok, ${fails} failed${r.status ? ' (exit ' + r.status + ')' : ''}`);
    if (fails || r.status) { bad++; console.log(txt.split('\n').filter(l => /FAIL|Error/.test(l)).join('\n')); }
  }
  if (bad) die('tests failed');
}
