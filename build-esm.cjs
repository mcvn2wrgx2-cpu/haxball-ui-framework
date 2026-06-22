// build-esm.js — custom bundler for haxball-ui-framework
//
// Generates 3 output formats from src/ ESM source:
//   dist/haxball-ui-framework.esm.js    — ES Module (for bundlers like Vite/Webpack)
//   dist/haxball-ui-framework.cjs.js    — CommonJS (for Node.js require())
//   dist/haxball-ui-framework.iife.js   — IIFE bundle (paste into HaxBall console)
//
// No external dependencies — runs with plain Node.js.
//
// How it works:
//   1. Reads src/index.js and resolves all import chains recursively
//   2. Strips import/export statements
//   3. Inlines all modules in dependency order (topological sort)
//   4. Wraps in the appropriate format for each output

const fs   = require('fs');
const path = require('path');

const SRC_DIR  = path.join(__dirname, 'src');
const DIST_DIR = path.join(__dirname, 'dist');

// ─── Module resolver ─────────────────────────────────────────────────────────

const _visited = new Set();
const _ordered = [];   // modules in topological order

/**
 * Resolves a module file path from an import specifier relative to the
 * importing file's directory.
 */
function _resolve(specifier, fromDir) {
  let abs = path.resolve(fromDir, specifier);
  if (!abs.endsWith('.js')) abs += '.js';
  return abs;
}

/**
 * Recursively walks imports, collecting modules in dependency order.
 * Each module is only collected once (visited set).
 */
function _walk(filePath) {
  if (_visited.has(filePath)) return;
  _visited.add(filePath);

  const src  = fs.readFileSync(filePath, 'utf8');
  const dir  = path.dirname(filePath);

  // Find all static imports AND re-exports
  const importRe = /^(?:import|export)\s+.*?from\s+['"](.+?)['"]/gm;
  let match;
  while ((match = importRe.exec(src)) !== null) {
    const specifier = match[1];
    if (specifier.startsWith('.')) {
      _walk(_resolve(specifier, dir));
    }
  }

  _ordered.push({ path: filePath, src });
}

// ─── Source transformers ──────────────────────────────────────────────────────

/**
 * Strips all import and re-export statements from a module's source.
 * Uses a block-level regex with the 's' (dotAll) flag to handle
 * multi-line imports like:
 *   import {
 *     a,
 *     b
 *   } from '../config.js';
 */
function _stripImports(src) {
  // Remove multi-line and single-line import/export...from statements
  src = src.replace(/^(?:import|export)\s+(?:type\s+)?\{[\s\S]*?\}\s+from\s+['"][^'"]+['"]\s*;?\n?/gm, '');
  // Remove: import Default from '...'
  src = src.replace(/^import\s+\w+\s+from\s+['"][^'"]+['"]\s*;?\n?/gm, '');
  // Remove: import * as X from '...'
  src = src.replace(/^import\s+\*\s+as\s+\w+\s+from\s+['"][^'"]+['"]\s*;?\n?/gm, '');
  // Remove: import '...'
  src = src.replace(/^import\s+['"][^'"]+['"]\s*;?\n?/gm, '');
  // Remove: export { default } from '...'
  src = src.replace(/^export\s+\{[^}]*\}\s+from\s+['"][^'"]+['"]\s*;?\n?/gm, '');
  // Remove: export * from '...' / export * as X from '...'
  src = src.replace(/^export\s+\*(?:\s+as\s+\w+)?\s+from\s+['"][^'"]+['"]\s*;?\n?/gm, '');
  return src;
}

/**
 * Converts ESM named exports to plain variable declarations.
 * Also removes `export default` markers (handled separately at the end).
 *
 * Before: export function createWindow(...) { ... }
 * After:  function createWindow(...) { ... }
 *
 * Before: export const HaxUIConfig = ...
 * After:  const HaxUIConfig = ...
 *
 * Before: export { default } from './HaxUI.js'   ← already stripped as import
 * After:  (removed)
 *
 * Before: export default HaxUI;
 * After:  (removed — handled at the end of the IIFE/CJS wrapper)
 */
function _stripExports(src) {
  return src
    .replace(/^export\s+default\s+\w+\s*;?\s*$/gm, '')
    .replace(/^export\s+(default\s+)?/gm, '')
    .replace(/^export\s*\{[^}]*\}\s*;?\s*$/gm, '');
}

function _transform(src) {
  return _stripExports(_stripImports(src)).trim();
}

// ─── Build ────────────────────────────────────────────────────────────────────

function build() {
  if (!fs.existsSync(DIST_DIR)) fs.mkdirSync(DIST_DIR);

  // Walk the dependency tree starting from src/index.js
  _walk(path.join(SRC_DIR, 'index.js'));

  // Transform each module — strip import/export, keep the logic
  const transformedModules = _ordered.map(m => {
    const relPath = path.relative(__dirname, m.path);
    return `// ── ${relPath} ──\n${_transform(m.src)}`;
  }).join('\n\n');

  const timestamp = new Date().toISOString();

  // ── ESM output ─────────────────────────────────────────────────────────────
  // Re-export the public API using the already-flattened code.
  // For ESM we emit the module code as-is (no wrapper) and add a final
  // named export block for the public surface.
  const esmBundle = [
    `/* haxball-ui-framework ESM — generated ${timestamp} */`,
    `/* import HaxUI from 'haxball-ui-framework'; */`,
    ``,
    transformedModules,
    ``,
    `export { createWindow, getWindow, destroyWindow, destroyAll, diagnostics };`,
    `export default HaxUI;`,
  ].join('\n');

  fs.writeFileSync(path.join(DIST_DIR, 'haxball-ui-framework.esm.js'), esmBundle, 'utf8');

  // ── CJS output ─────────────────────────────────────────────────────────────
  const cjsBundle = [
    `/* haxball-ui-framework CJS — generated ${timestamp} */`,
    `/* const HaxUI = require('haxball-ui-framework'); */`,
    `'use strict';`,
    ``,
    transformedModules,
    ``,
    `module.exports = HaxUI;`,
    `module.exports.default = HaxUI;`,
    `module.exports.createWindow  = HaxUI.createWindow;`,
    `module.exports.getWindow     = HaxUI.getWindow;`,
    `module.exports.destroyWindow = HaxUI.destroyWindow;`,
    `module.exports.destroyAll    = HaxUI.destroyAll;`,
    `module.exports.diagnostics   = HaxUI.diagnostics;`,
  ].join('\n');

  fs.writeFileSync(path.join(DIST_DIR, 'haxball-ui-framework.cjs.js'), cjsBundle, 'utf8');

  // ── IIFE output (backward-compatible with paste-into-console) ──────────────
  const iifeBundle = [
    `/* haxball-ui-framework IIFE — generated ${timestamp} */`,
    `/* Paste into the HaxBall console or @require from Tampermonkey */`,
    `(function (global) {`,
    `'use strict';`,
    ``,
    transformedModules,
    ``,
    `global.HaxUI = HaxUI;`,
    `})(typeof window !== 'undefined' ? window : this);`,
  ].join('\n');

  fs.writeFileSync(path.join(DIST_DIR, 'haxball-ui-framework.iife.js'), iifeBundle, 'utf8');

  // ── Report ─────────────────────────────────────────────────────────────────
  ['esm', 'cjs', 'iife'].forEach(fmt => {
    const file = path.join(DIST_DIR, `haxball-ui-framework.${fmt}.js`);
    const kb   = (fs.statSync(file).size / 1024).toFixed(1);
    console.log(`[build] dist/haxball-ui-framework.${fmt}.js  (${kb} KB)`);
  });

  console.log(`[build] OK — ${_ordered.length} modules processed`);
}

build();
