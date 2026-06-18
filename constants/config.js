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
    DESTROYED_FLAG
  });

})();
