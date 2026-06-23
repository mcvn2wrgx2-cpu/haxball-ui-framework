# Changelog

All notable changes to this project will be documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [1.0.1] — 2026-06-23

### Added
- **npm package** — `npm install haxball-ui-framework` now available at [npmjs.com/package/haxball-ui-framework](https://www.npmjs.com/package/haxball-ui-framework)
- **`src/`** — full ES Module rewrite of all 12 core modules with real `import`/`export`
- **3 build outputs** via `npm run build`:
  - `dist/haxball-ui-framework.esm.js` — ES Module for Vite/Webpack/Rollup
  - `dist/haxball-ui-framework.cjs.js` — CommonJS for Node.js `require()`
  - `dist/haxball-ui-framework.iife.js` — IIFE for direct browser injection
- **`build-esm.cjs`** — custom zero-dependency bundler that walks the import graph and generates all 3 formats from `src/`
- **Named exports** for tree-shaking: `import { createWindow, DragManager } from 'haxball-ui-framework'`
- **`SECURITY.md`** — vulnerability scope, reporting instructions, and security design documentation
- **`CODE_OF_CONDUCT.md`** — adapted from Contributor Covenant v2.1

### Changed
- `package.json` updated with `main`, `module`, `browser`, `exports` map, `files`, and `engines` fields for npm compatibility
- `build.js` renamed to `build.cjs` (required by `"type": "module"` in package.json)
- README updated with npm install badge, installation section, and 3 build options

### Notes
- The IIFE output is functionally identical to `haxball-ui.bundle.js` from v1.0.0 — existing Tampermonkey scripts and console workflows continue working without modification
- Zero runtime dependencies, zero build dependencies

---

## [1.0.0] — 2026-06-20

### Added
- **`core/DragManager.js`** — drag windows by their header, clamped to the viewport
- **`core/ResizeManager.js`** — resize from any of the 4 corners with minimum dimensions (`150×80px`)
- **`core/ButtonInjector.js`** — injects native-styled buttons into HaxBall's `.header-btns` bar with polling fallback
- **`theme: 'haxball'`** — replicates HaxBall's `.dialog` style using values measured via `getComputedStyle()` on the live DOM
- **`draggable`** config option — `false` shows a 📌 pin indicator in the header
- **`resizable`** config option — enables/disables corner resize handles
- **`titleVisible`** config option — show/hide the header on window creation
- **`closable`** config option — show/hide the ✕ close button
- **`hideTitle()` / `showTitle()`** on `WindowHandle` — collapse/expand the header at runtime
- **`HaxUI.createButton(config)`** — native-styled button injection with `onOpenWindow` shortcut
- **`HaxUI.destroyButton(id)`**
- **`[data-haxui-no-drag]`** attribute — marks header elements (close button, drag indicator) that should not initiate a drag
- **Admin Panel extension** (`extensions/admin-panel/`) — Ban/Mute/Kick panel with duration, reason, action log, and chat command bridge

### Fixed
- **Drag/resize never released** — `EventGuard`'s bubble-phase `mouseup` listener on the container was blocking `DragManager`/`ResizeManager`'s listeners on `document`. Fixed by attaching drag/resize listeners in the **capture phase**
- **Native buttons appearing in random position** — single `MutationObserver` was unreliable for catching `.header-btns` mounting. Replaced with a polling loop (300ms × 30 attempts)
- **Drag indicator (`✛`) was mistaken for a close button and initiated drag on click** — replaced with `⠿`, marked `[data-haxui-no-drag]`, and added a real `✕` close button
- **Native button style mismatch** — padding, font-size, height, border-radius, font-weight now match HaxBall's real buttons (measured via `getComputedStyle()`, not assumed)
- **`buttonBorder` was wrong** — HaxBall's native buttons have no border (`border: 0`), confirmed via `getComputedStyle()`

---

## [0.1.0] — 2026-06-18

### Added
- **`core/HaxUI.js`** — public API entry point, single `window.HaxUI` global
- **`core/WindowManager.js`** — window registry, lifecycle orchestration, z-index stack
- **`core/Window.js`** — individual window with Shadow DOM (NAMESPACE_MODE fallback), full lifecycle (`mount`, `setContent`, `show`, `hide`, `destroy`, `remount`)
- **`core/RootMount.js`** — execution context detection (iframe guard, canvas detection with retry), DOM re-anchor via `MutationObserver`
- **`core/EventGuard.js`** — per-event-type isolation policy (click/mousedown/mouseup always blocked, keydown/keyup only when interactive element has focus, wheel with `passive: false`)
- **`core/EventRegistry.js`** — listener tracking factory for leak-free `destroy()`
- **`core/StyleManager.js`** — theme-aware style injection into Shadow Root or `document.head`
- **`constants/config.js`** — all tunables: `BASE_Z_INDEX`, `THEMES`, `HAXBALL_THEME`, `MIN_WIDTH/HEIGHT`, retry limits, selectors
- **`utils/sanitize.js`** — `DOMParser`-based XSS protection for `setContent()` strings
- **`dev/playground.js`** — 13 test groups, 70+ assertions
- **`dev/examples.js`** — 7 worked examples: live scoreboard, player roster, chat log, admin panel, multi-window dashboard, `onOpenWindow` button, static window
- **`build.js`** — single-file IIFE bundle generator (`node build.js` → `haxball-ui.bundle.js`)
- **`.vscode/tasks.json`** — `Ctrl+Shift+B` runs the build
- Shadow DOM with CSS namespace fallback when `attachShadow` is unavailable
- `HaxUI.diagnostics()` for debugging framework state
- `WindowHandle._destroyed` flag — all post-destroy calls are silent no-ops

---

[1.0.1]: https://github.com/mcvn2wrgx2-cpu/haxball-ui-framework/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/mcvn2wrgx2-cpu/haxball-ui-framework/compare/v0.1.0...v1.0.0
[0.1.0]: https://github.com/mcvn2wrgx2-cpu/haxball-ui-framework/releases/tag/v0.1.0
