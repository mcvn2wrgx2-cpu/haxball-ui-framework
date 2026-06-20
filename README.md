<p align="center">
  <img src="assets/banner.png" alt="HaxBall UI Framework Banner" width="100%" />
</p>

# haxball-ui-framework

<p align="center">
  🇺🇸 English | <a href="README.es.md">🇪🇸 Español</a>
</p>

<p align="center">
<a href="LICENSE">
  <img src="https://img.shields.io/badge/license-MIT-000000.svg?style=flat-square" alt="License">
</a>
<a href="#architecture">
  <img src="https://img.shields.io/badge/Architecture-DOM--based-7b2cbf.svg?style=flat-square" alt="Architecture">
</a>
<a href="#project-structure">
  <img src="https://img.shields.io/badge/vanilla-JavaScript-f7df1e.svg?style=flat-square&logo=javascript&logoColor=black" alt="Vanilla JS">
</a>
<a href="#roadmap">
  <img src="https://img.shields.io/badge/version-v1-2ecc71.svg?style=flat-square" alt="Version v1">
</a>
<a href="#project-structure">
  <img src="https://img.shields.io/badge/contributions-welcome-000000.svg?style=flat-square&logo=git&logoColor=white" alt="Contributions Welcome">
</a>
</p>

**HaxBall UI Framework is a minimal, stable UI layer for building overlay windows on top of the HaxBall client.**

It is not a full framework like React. It is not a game engine.
It is a **small, well-designed UI core** that gives you full DOM control without fighting HaxBall.

---

## 🧠 Core Idea

HaxBall UI Framework introduces a **thin overlay layer** over the HaxBall DOM that enables:

- window creation and management
- dynamic content updates
- clean lifecycle and destruction
- full CSS isolation via Shadow DOM
- safe event handling that doesn't leak into the game
- drag & resize, native-styled buttons, and a theme that matches HaxBall's own UI

Everything is built around a single principle:

> One API. One namespace. Full control.

---

## ⚙️ Architecture

The framework is divided into layers, each with a single responsibility:

| Layer | Module | Responsibility |
| :--- | :--- | :--- |
| **Bootstrap** | `RootMount` | Detects execution context, anchors `#haxui-root` to `document.body`, re-anchors if HaxBall clears the DOM |
| **Registry** | `WindowManager` | Window registry, lifecycle, and z-index stack |
| **Instance** | `Window` | Builds the DOM tree for one window, owns its Shadow Root |
| **Safety** | `EventGuard` | Per-event-type policy so window events never leak into the game |
| **Safety** | `EventRegistry` | Tracks every listener so `destroy()` cleans up with zero leaks |
| **Style** | `StyleManager` | Injects base styles per theme into each Shadow Root |
| **Content** | `Sanitize` | DOMParser-based sanitization — strings never hit `innerHTML` raw |
| **Interaction** | `DragManager` | Drag windows by their header, clamped to the viewport |
| **Interaction** | `ResizeManager` | Resize from any of the 4 corners, with minimum dimensions |
| **Integration** | `ButtonInjector` | Injects native-styled buttons into HaxBall's own button bar |
| **Public API** | `HaxUI` | `window.HaxUI` — the only global name exposed |
| **Handle** | `WindowHandle` | Lightweight object returned per window — no internals exposed |

---

## 📦 Project Structure

```txt
haxball-ui-framework/
│
├── core/
│   ├── HaxUI.js            # Public API entry point
│   ├── WindowManager.js    # Window registry, lifecycle, z-index stack
│   ├── Window.js           # Individual window with Shadow DOM
│   ├── RootMount.js        # Root node, context detection, re-anchor
│   ├── EventGuard.js       # Per-event-type policy for game isolation
│   ├── EventRegistry.js    # Listener registry for clean destroy()
│   ├── StyleManager.js     # Theme-aware styles injected per Shadow Root
│   ├── DragManager.js      # Header drag, viewport-clamped (v1)
│   ├── ResizeManager.js    # Corner resize handles (v1)
│   └── ButtonInjector.js   # Native HaxBall-styled button injection (v1)
│
├── constants/
│   └── config.js           # BASE_Z_INDEX, themes, namespace, operation modes
│
├── utils/
│   └── sanitize.js         # DOMParser wrapper for safe setContent()
│
├── dev/
│   ├── playground.js       # 13 test groups, 70+ assertions
│   └── examples.js         # 5 worked examples (scoreboard, roster, chat, admin panel, dashboard)
│
├── build.js                # Concatenates modules into a single IIFE bundle
├── package.json
└── haxball-ui.bundle.js    # Generated output — inject this into HaxBall
```

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/mcvn2wrgx2-cpu/haxball-ui-framework
cd haxball-ui-framework
```

### 2. Build the bundle

No dependencies required. Just Node.js.

```bash
node build.js
# → haxball-ui.bundle.js
```

### 3. Inject into HaxBall

**Option A — DevTools console** (development):
Paste the contents of `haxball-ui.bundle.js` directly into the browser console while HaxBall is open.

**Option B — Tampermonkey** (recommended):
Create a userscript with `@require file:///absolute/path/to/haxball-ui.bundle.js` and enable local file access in Tampermonkey settings.

### 4. Verify it loaded

```js
HaxUI.diagnostics();
// { initialized: false, mode: null, rootPresent: false, windowCount: 0, baseZ: 9000, version: 'v0' }
```

---

## 🧩 Public API

### Initialize

```js
// Optional — called automatically on first createWindow() if omitted
HaxUI.init({ baseZ: 9000 });
```

### Create a window

```js
const win = HaxUI.createWindow({
  id: 'stats',
  title: 'Statistics',
  width: 260,
  height: 180,
  x: 16,
  y: 16,
  content: '<p>Loading...</p>',

  // v1
  theme: 'default',     // 'default' | 'haxball'
  draggable: true,      // drag from the header
  resizable: true,      // resize from any corner
  titleVisible: true    // show/hide the header on creation
});
```

### Update content

```js
// Safe: pass a Node, not a raw string with external data
const node = document.createElement('div');
node.textContent = 'Goals: ' + data.goals;
win.setContent(node);

// Also valid for static markup
win.setContent('<p>Match ended</p>');
```

### Show / hide / title (v1)

```js
win.show();
win.hide();

win.hideTitle();   // collapse the header, content fills the window
win.showTitle();
```

### Destroy

```js
win.destroy();

// Or by ID
HaxUI.destroyWindow('stats');

// Or everything at once (use on script unload)
HaxUI.destroyAll();
```

### Get an existing window

```js
const existing = HaxUI.getWindow('stats');
if (existing) {
  existing.setContent('<p>Restarting...</p>');
}
// getWindow() returns null if not found — never throws
```

### Native-styled buttons (v1)

```js
const btn = HaxUI.createButton({
  id: 'stats-btn',
  label: '📊 Stats',
  onClick: () => win.show()
});

btn.destroy();
// or
HaxUI.destroyButton('stats-btn');
```

`createButton()` injects directly into HaxBall's own `.header-btns` container,
appearing inline with the native Rec / Link / Leave buttons. If that container
isn't mounted yet, the button falls back to a fixed overlay and a
`MutationObserver` re-injects it the moment HaxBall's UI becomes available.

---

## 🎨 The `haxball` Theme

`theme: 'haxball'` replicates HaxBall's native `.dialog` style using values
extracted directly from the live DOM (background, border-radius, header
accent line, font, button colors) — so a HaxUI window can look
indistinguishable from one of HaxBall's own dialogs:

```js
HaxUI.createWindow({
  id: 'confirm',
  title: 'Leave room?',
  theme: 'haxball',
  width: 300,
  height: 150,
  x: 100,
  y: 100,
  content: '<p>Are you sure you want to leave the room?</p><button>Leave</button>'
});
```

---

## 🔒 Design Decisions

Every decision responds to a specific HaxBall environment risk.

| Decision | Risk mitigated |
| :--- | :--- |
| Shadow DOM per window (with CSS namespace fallback) | HaxBall's global CSS bleeding into overlay elements |
| Single `window.HaxUI` namespace | Collisions with HaxBall's own globals or other scripts |
| `EventGuard` with per-event-type policy | Keyboard/mouse events leaking into the game |
| `BASE_Z = 9000`, configurable | Overlay windows rendering behind HaxBall's own menus |
| `MutationObserver` in `RootMount` | HaxBall clearing the DOM on room transitions |
| `DOMParser` in `setContent()` | XSS when rendering external strings (player names, chat) |
| `WindowHandle._destroyed` flag | Safe post-destroy calls — no errors inside game callbacks |
| Context detection in `RootMount.init()` | Script injected into the wrong frame (iframe environments) |
| Drag listeners attached/removed per-cycle, outside `EventRegistry` | Registry listeners persist for the window's lifetime — using them for drag caused the cursor to never release |
| `ButtonInjector` targets `.header-btns` with a `MutationObserver` fallback | Native button bar not mounted yet when the script runs |
| `buttonBorder: '0'` in the HaxBall theme | HaxBall's native buttons have no border — verified via `getComputedStyle()` on the live DOM, not assumed |

---

## 🎯 Example: Live Stats Overlay

```js
HaxUI.init();

const stats = HaxUI.createWindow({
  id: 'haxui-stats',
  title: 'Stats',
  width: 260,
  height: 180,
  x: 16,
  y: 16
});

function onGameData(data) {
  const node = document.createElement('div');
  node.innerHTML = [
    '<div>Team 1: ' + data.score[0] + '</div>',
    '<div>Team 2: ' + data.score[1] + '</div>',
    '<div>Possession: ' + data.possession + '%</div>',
    '<div>Time: ' + data.time + '</div>'
  ].join('');
  stats.setContent(node);
}

function onLeaveRoom() {
  HaxUI.destroyAll();
}
```

More worked examples — live scoreboard, player roster, chat log, admin panel,
and a full multi-window dashboard — are in [`dev/examples.js`](dev/examples.js).

---

## 🗺️ Roadmap

- [x] **v0 — Core**
  - [x] Window creation and destruction
  - [x] Dynamic content updates
  - [x] Shadow DOM isolation with CSS fallback
  - [x] Event isolation from the game
  - [x] DOM re-anchor on HaxBall transitions
- [x] **v1 — Interaction**
  - [x] Drag & drop windows
  - [x] Resize from all four corners
  - [x] Native HaxBall-styled buttons (`createButton`)
  - [x] `haxball` theme matching the native `.dialog` style
  - [x] `hideTitle()` / `showTitle()`
- [ ] **v2 — Components**
  - [ ] Component system for `setContent()`
  - [ ] Base components: text, table, list, button
- [ ] **v3 — Plugins**
  - [ ] `HaxUI.use(plugin)` plugin registration
  - [ ] Window lifecycle hooks for plugins
  - [ ] Cook a Cake

---

## ⚠️ Status

> **Project Status:** v1 — drag, resize, native buttons, and the HaxBall theme are stable. Public API may still grow toward v2, but the v0 contract is frozen and won't break.

---

## 🧠 Design Philosophy

- minimal surface area, maximum control
- one global name, zero internals exposed
- every decision traceable to a real HaxBall environment risk, verified against the live DOM
- extensible to v2–v3 without breaking the v0/v1 API contract

---

## 📄 License

MIT

---

<p align="center">
  ❤️ <a href=".gitignore">DEVLOG</a>
</p>

<p align="center">
  <img src="https://c.tenor.com/lfDATg4Bhc0AAAAC/tenor.gif" alt="HappyCat" width="30"><br>
  <sub>made with love :)</sub>
</p>
