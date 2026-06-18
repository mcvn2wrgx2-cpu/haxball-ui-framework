const fs   = require('fs');
const path = require('path');

const FILES = [
  'constants/config.js',
  'utils/sanitize.js',
  'core/EventRegistry.js',
  'core/StyleManager.js',
  'core/EventGuard.js',
  'core/RootMount.js',
  'core/Window.js',
  'core/WindowManager.js',
  'core/HaxUI.js',
];

const OUTPUT = 'haxball-ui.bundle.js';

function build() {
  const missing = FILES.filter(f => !fs.existsSync(path.join(__dirname, f)));
  if (missing.length) {
    console.error('[build] Archivos faltantes:');
    missing.forEach(f => console.error('  -', f));
    process.exit(1);
  }

  const body = FILES
    .map(f => {
      const src = fs.readFileSync(path.join(__dirname, f), 'utf8').trim();
      return `// ── ${f} ──\n${src}`;
    })
    .join('\n\n');

  const bundle = [
    `/* haxball-ui-framework — bundle generado el ${new Date().toISOString()} */`,
    `(function (global) {`,
    `'use strict';`,
    ``,
    body,
    ``,
    `global.HaxUI = HaxUI;`,
    `})(typeof window !== 'undefined' ? window : this);`,
  ].join('\n');

  fs.writeFileSync(path.join(__dirname, OUTPUT), bundle, 'utf8');
  const kb = (fs.statSync(OUTPUT).size / 1024).toFixed(1);
  console.log(`[build] OK -> ${OUTPUT} (${kb} KB)`);
}

build();
