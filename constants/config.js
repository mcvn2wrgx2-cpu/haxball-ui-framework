// ─────────────────────────────────────────────────────────────────────────────
// constants/config.js
//
// Central configuration and constants for HaxBall UI Framework.
//
// All tuneable values live here. No magic numbers anywhere else in the
// codebase — every module imports from this file.
//
// OPERATION MODES:
//   SHADOW_MODE    — Shadow DOM available. Full CSS isolation per window.
//   NAMESPACE_MODE — Shadow DOM unavailable. CSS scoped via attribute selector
//                    [data-haxui-window] * as a fallback.
//
// THEMES (v1):
//   default  — neutral dark palette from v0
//   haxball  — exact replica of HaxBall's native .dialog style
//
// INTERNAL USE:
//   Consumed by RootMount, WindowManager, StyleManager, and EventGuard.
//   Not part of the public HaxUI API — users configure via HaxUI.init().
// ─────────────────────────────────────────────────────────────────────────────

var HaxUIConfig = (function () {

  // ─── Operation modes ─────────────────────────────────────────────────────

  // Resolved at runtime by RootMount._detectShadowSupport().
  // Read-only after initialization.
  var OPERATION_MODES = Object.freeze({
    SHADOW:    'shadow',     // Shadow DOM available — preferred
    NAMESPACE: 'namespace'   // CSS namespace fallback
  });

  // ─── DOM ─────────────────────────────────────────────────────────────────

  // ID of the root node anchored to document.body.
  // All window containers are children of this node.
  var ROOT_ID = 'haxui-root';

  // Attribute added to every window container element.
  // Used as CSS scope anchor in NAMESPACE_MODE.
  var WINDOW_ATTR = 'data-haxui-window';

  // Attribute added to the content area of each window.
  var CONTENT_ATTR = 'data-haxui-content';

  // Attribute added to the header of each window.
  var HEADER_ATTR = 'data-haxui-header';

  // ─── Z-index ─────────────────────────────────────────────────────────────

  // Base z-index for all HaxUI windows.
  // Set high enough to clear HaxBall's own overlays and menus.
  // Overridable via HaxUI.init({ baseZ: number }).
  var BASE_Z_INDEX = 9000;

  // Maximum number of stacked windows before the z-index counter resets.
  // Prevents z-index from growing unbounded in long sessions.
  var Z_STACK_LIMIT = 100;

  // ─── Window defaults ─────────────────────────────────────────────────────

  // Applied when a property is omitted from createWindow(config).
  var WINDOW_DEFAULTS = Object.freeze({
    width:  300,    // px
    height: 200,    // px
    x:      20,     // px from left edge of viewport
    y:      20,     // px from top edge of viewport
    title:  'Window'
  });

  // ─── Namespace ───────────────────────────────────────────────────────────

  // The only name written to window by the framework.
  // All internal modules reference this constant instead of the string.
  var GLOBAL_NAMESPACE = 'HaxUI';

  // ─── Context detection ───────────────────────────────────────────────────

  // Selector used by RootMount to verify the HaxBall canvas is present
  // in the current document before mounting.
  var HAXBALL_CANVAS_SELECTOR = 'canvas';

  // How long (ms) RootMount waits between context detection retries
  // when the canvas is not yet present in the DOM.
  var CONTEXT_RETRY_INTERVAL = 500;   // ms

  // Maximum number of detection retries before giving up and logging a warning.
  var CONTEXT_RETRY_LIMIT = 20;       // 20 × 500ms = 10 seconds total

  // ─── Event handling ──────────────────────────────────────────────────────

  // Tags considered "interactive" by EventGuard.
  // keydown/keyup events are blocked only when one of these has focus
  // inside an active HaxUI window.
  var INTERACTIVE_TAGS = Object.freeze([
    'input', 'textarea', 'select'
  ]);

  // ─── Internal state keys ─────────────────────────────────────────────────

  // Key stored on WindowHandle instances to track destruction state.
  var DESTROYED_FLAG = '_destroyed';

  // ─── Themes (v1) ─────────────────────────────────────────────────────────

  // Available theme names for createWindow({ theme }).
  var THEMES = Object.freeze({
    DEFAULT: 'default',   // neutral dark palette (v0 style)
    HAXBALL: 'haxball'    // exact replica of HaxBall's native .dialog
  });

  // HaxBall theme values extracted directly from the live DOM.
  // Update these if HaxBall changes its styles.
  var HAXBALL_THEME = Object.freeze({
    background:       'rgb(26, 33, 37)',
    borderRadius:     '5px',
    fontFamily:       '"Open Sans", sans-serif',
    fontSize:         '14px',
    color:            'rgb(255, 255, 255)',
    headerBorder:     '3px solid rgb(193, 53, 53)',
    headerBackground: 'transparent',
    buttonBackground: 'rgb(36, 73, 103)',
    buttonColor:      'rgb(255, 255, 255)',
    buttonBorder:     '0',
    buttonRadius:     '3px',
    shadow:           '0 8px 32px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.5)'
  });

  // ─── Drag & resize (v1) ──────────────────────────────────────────────────

  // Minimum window dimensions enforced by ResizeManager.
  var MIN_WIDTH  = 150;   // px
  var MIN_HEIGHT = 80;    // px

  // Size in px of the resize handle corners.
  var RESIZE_HANDLE_SIZE = 10;   // px

  // Attribute added to resize handle elements.
  var RESIZE_ATTR = 'data-haxui-resize';

  // During drag/resize, user-select is disabled on body to prevent
  // accidental text selection. This is the value it's set to.
  var NO_SELECT_STYLE = 'none';

  // ─── Button injector (v1) ────────────────────────────────────────────────

  // Attribute added to injected button elements.
  var BUTTON_ATTR = 'data-haxui-button';

  // ID prefix for injected buttons — avoids collisions with HaxBall IDs.
  var BUTTON_ID_PREFIX = 'haxui-btn-';

  // Retry interval/limit for finding .header-btns when it's not yet mounted.
  // Same pattern as RootMount's canvas detection — polling is more reliable
  // than a single MutationObserver firing at the exact right moment.
  var BUTTON_RETRY_INTERVAL = 300;   // ms
  var BUTTON_RETRY_LIMIT    = 30;    // 30 × 300ms = 9 seconds total

  // ─── Public surface ──────────────────────────────────────────────────────

  return Object.freeze({
    OPERATION_MODES,
    ROOT_ID,
    WINDOW_ATTR,
    CONTENT_ATTR,
    HEADER_ATTR,
    BASE_Z_INDEX,
    Z_STACK_LIMIT,
    WINDOW_DEFAULTS,
    GLOBAL_NAMESPACE,
    HAXBALL_CANVAS_SELECTOR,
    CONTEXT_RETRY_INTERVAL,
    CONTEXT_RETRY_LIMIT,
    INTERACTIVE_TAGS,
    DESTROYED_FLAG,
    // v1
    THEMES,
    HAXBALL_THEME,
    MIN_WIDTH,
    MIN_HEIGHT,
    RESIZE_HANDLE_SIZE,
    RESIZE_ATTR,
    NO_SELECT_STYLE,
    BUTTON_ATTR,
    BUTTON_ID_PREFIX,
    BUTTON_RETRY_INTERVAL,
    BUTTON_RETRY_LIMIT
  });

})();
