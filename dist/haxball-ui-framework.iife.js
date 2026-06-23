/* haxball-ui-framework IIFE — generated 2026-06-22T23:59:19.035Z */
/* Paste into the HaxBall console or @require from Tampermonkey */
(function (global) {
'use strict';

// ── src\core\HaxUI.js ──
// ─────────────────────────────────────────────────────────────────────────────
// core/HaxUI.js
//
// Public API entry point — the only name written to window by the framework.
//
// RESPONSIBILITIES:
//   1. Expose a single frozen object at window.HaxUI.
//   2. Orchestrate initialization: RootMount → WindowManager in the
//      correct order with the correct dependencies.
//   3. Delegate all window operations to WindowManager.
//   4. Accept user configuration via init() and forward it downstream.
//   5. Provide a clean teardown path via destroyAll().
//
// INITIALIZATION FLOW:
//
//   HaxUI.init(config?)           ← called by user (or auto on first createWindow)
//     │
//     ├─ already initialized? → return (idempotent)
//     │
//     ├─ RootMount.init(onRemount)
//     │     onRemount = () → WindowManager.remountAll(RootMount.getRoot())
//     │
//     └─ WindowManager.init(RootMount, config.baseZ)
//
//   HaxUI.createWindow(config)
//     │
//     ├─ not initialized? → auto-init with defaults
//     │
//     └─ WindowManager.create(config) → WindowHandle
//
// DESIGN CONTRACT:
//   - window.HaxUI is the ONLY global name this framework writes.
//   - No internal class or module is ever exposed on window directly.
//   - All user-facing errors are thrown with a [HaxUI] prefix for easy
//     identification in the browser console.
//   - Methods that return data (getWindow) return null on miss — never throw.
//   - Methods that perform actions (destroyWindow, destroyAll) are always
//     safe to call regardless of state — no-ops when nothing to do.
//
// BUNDLE NOTE:
//   This file is the last module concatenated by build.js.
//   It runs after all other modules are defined in the IIFE scope.
//   The final line of build.js writes: global.HaxUI = HaxUI;
// ─────────────────────────────────────────────────────────────────────────────

var HaxUI = (function () {

  // ─── Internal state ───────────────────────────────────────────────────────

  var _initialized = false;

  // ─── Initialization ───────────────────────────────────────────────────────

  /**
   * Initializes the framework. Idempotent — safe to call multiple times.
   * If not called explicitly, createWindow() triggers it automatically
   * with default configuration.
   *
   * @param {Object}  [config]        - Optional configuration
   * @param {number}  [config.baseZ]  - Base z-index for all windows (default: 9000)
   */
  function init(config) {
    if (_initialized) return;

    var options = config || {};

    // 1. Boot RootMount first — it must exist before WindowManager can create windows.
    //    Pass the remount callback so WindowManager is notified after DOM re-anchors.
    RootMount.init(function () {
      WindowManager.remountAll(RootMount.getRoot());
    });

    // 2. Initialize WindowManager with RootMount and the optional baseZ override.
    WindowManager.init(RootMount, options.baseZ);

    _initialized = true;
  }

  /**
   * Ensures the framework is initialized before any operation.
   * Called internally by createWindow() as a safety net.
   */
  function _ensureInit() {
    if (!_initialized) {
      init();
    }
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /**
   * Creates a new window and returns a WindowHandle.
   * Automatically initializes the framework if init() was not called.
   *
   * @param  {Object}      config          - Window configuration
   * @param  {string}      config.id       - Unique window identifier (required)
   * @param  {string}      config.title    - Header title text (required)
   * @param  {number}      config.width    - Width in px
   * @param  {number}      config.height   - Height in px
   * @param  {number}      config.x        - Left position in px
   * @param  {number}      config.y        - Top position in px
   * @param  {string|Node} [config.content]- Initial content (optional)
   * @returns {Object} WindowHandle
   * @throws  {Error} if id is missing or already in use
   */
  function createWindow(config) {
    _ensureInit();
    return WindowManager.create(config);
  }

  /**
   * Returns the WindowHandle for an existing window, or null if not found.
   * Never throws — safe to use in game event callbacks.
   *
   * @param  {string} id
   * @returns {Object|null} WindowHandle or null
   */
  function getWindow(id) {
    if (!_initialized) return null;
    return WindowManager.get(id);
  }

  /**
   * Destroys a window by id.
   * No-op if the id is not found or the framework is not initialized.
   *
   * @param {string} id
   */
  function destroyWindow(id) {
    if (!_initialized) return;
    WindowManager.destroy(id);
  }

  /**
   * Destroys all active windows and performs a full framework teardown.
   * Resets internal state — init() must be called again to reuse the framework.
   *
   * Intended for script unload handlers:
   *
   *   window.addEventListener('beforeunload', function () {
   *     HaxUI.destroyAll();
   *   });
   */
  function destroyAll() {
    if (!_initialized) return;

    WindowManager.destroyAll();
    ButtonInjector.destroyAll();
    StyleManager.removeFromDocument();
    RootMount.teardown();

    _initialized = false;
  }

  /**
   * Creates a styled button injected into the HaxBall UI. (v1)
   *
   * @param  {Object}   config
   * @param  {string}   config.id      - Unique button identifier (required)
   * @param  {string}   config.label   - Button text
   * @param  {number}   config.x       - Left position in px
   * @param  {number}   config.y       - Top position in px
   * @param  {Function} config.onClick - Click handler
   * @returns {Object} button handle { id, destroy }
   */
  function createButton(config) {
    _ensureInit();
    return ButtonInjector.create(config, RootMount.getRoot());
  }

  /**
   * Destroys an injected button by id. (v1)
   * No-op if not found.
   *
   * @param {string} id
   */
  function destroyButton(id) {
    ButtonInjector.destroy(id);
  }

  // ─── Diagnostics ──────────────────────────────────────────────────────────

  /**
   * Returns a read-only snapshot of the current framework state.
   * Intended for debugging from the DevTools console.
   *
   * @returns {Object}
   */
  function diagnostics() {
    return Object.freeze({
      initialized:    _initialized,
      mode:           _initialized ? RootMount.getMode()  : null,
      rootPresent:    _initialized ? RootMount.isReady()  : false,
      windowCount:    _initialized ? WindowManager.count() : 0,
      baseZ:          HaxUIConfig.BASE_Z_INDEX,
      version:        'v0'
    });
  }

  // ─────────────────────────────────────────────────────────────────────────

  return Object.freeze({
    init:          init,
    createWindow:  createWindow,
    getWindow:     getWindow,
    destroyWindow: destroyWindow,
    destroyAll:    destroyAll,
    createButton:  createButton,
    destroyButton: destroyButton,
    diagnostics:   diagnostics
  });

})();

// ── src\constants\config.js ──
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
    fontSize:         '15px',
    color:            'rgb(255, 255, 255)',
    headerBorder:     '3px solid rgb(193, 53, 53)',
    headerBackground: 'transparent',
    buttonBackground: 'rgb(36, 73, 103)',
    buttonColor:      'rgb(255, 255, 255)',
    buttonBorder:     '0',
    buttonRadius:     '5px',
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

// ── src\utils\sanitize.js ──
// ─────────────────────────────────────────────────────────────────────────────
// utils/sanitize.js
//
// Content sanitization for setContent().
//
// PROBLEM:
//   Assigning innerHTML = externalString is a direct XSS vector.
//   In HaxBall, external content comes from: player names, chat messages,
//   server stats — strings we do not control.
//
// SOLUTION:
//   DOMParser parses the string into an isolated document (scripts don't run).
//   Only nodes from the resulting <body> are transferred to the real document.
//   The raw string is never assigned directly to innerHTML.
//
// ALLOWED TAGS:
//   The ALLOWED_TAGS set defines which elements survive sanitization.
//   Event attributes (onclick, onmouseover, etc.) are always stripped.
//   The "style" attribute is allowed so callers can style their content,
//   but all on* attributes are removed without exception.
//
// INTERNAL USE:
//   This module is consumed exclusively by Window.setContent().
//   It is not part of the public HaxUI API.
// ─────────────────────────────────────────────────────────────────────────────

var Sanitize = (function () {

  // HTML tags allowed inside window content areas.
  // Deliberately conservative in v0 — expandable in future versions.
  var ALLOWED_TAGS = new Set([
    'div', 'span', 'p', 'br', 'hr',
    'strong', 'em', 'b', 'i', 'u', 's',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'pre', 'code',
    'small', 'sub', 'sup',
    'label', 'input', 'button', 'select', 'option', 'textarea'
  ]);

  // Attributes allowed globally across all tags.
  // on* attributes are implicitly forbidden — always stripped.
  var ALLOWED_ATTRS = new Set([
    'class', 'id', 'style', 'title',
    'type', 'value', 'placeholder', 'disabled', 'checked',
    'selected', 'readonly', 'maxlength', 'min', 'max', 'step',
    'rows', 'cols', 'wrap',
    'colspan', 'rowspan',
    'data-haxui'   // reserved attribute for internal framework use
  ]);

  // ─── Internal functions ───────────────────────────────────────────────────

  /**
   * Removes all non-allowed attributes from an element,
   * including any attribute starting with "on" (event handlers).
   *
   * @param {Element} el
   */
  function _cleanAttributes(el) {
    // Snapshot to array — we mutate the collection while iterating
    var attrs = Array.prototype.slice.call(el.attributes);
    for (var i = 0; i < attrs.length; i++) {
      var name = attrs[i].name.toLowerCase();
      var isEventHandler = name.indexOf('on') === 0;
      var isAllowed      = ALLOWED_ATTRS.has(name);

      if (isEventHandler || !isAllowed) {
        el.removeAttribute(attrs[i].name);
      }
    }
  }

  /**
   * Walks the DOM tree recursively.
   * Removes disallowed nodes and cleans attributes on allowed ones.
   * Returns the node if valid, null if it should be removed.
   *
   * @param {Node} node
   * @returns {Node|null}
   */
  function _walkNode(node) {
    // Text nodes are always safe — pass through as-is
    if (node.nodeType === Node.TEXT_NODE) {
      return node;
    }

    // Only process Element nodes (nodeType === 1)
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }

    var tag = node.tagName.toLowerCase();

    // Disallowed tag: drop the entire element and its subtree
    if (!ALLOWED_TAGS.has(tag)) {
      return null;
    }

    // Clean attributes on the current element
    _cleanAttributes(node);

    // Walk children recursively
    // Snapshot first so removals don't shift the live NodeList
    var children = Array.prototype.slice.call(node.childNodes);
    for (var i = 0; i < children.length; i++) {
      var child  = children[i];
      var result = _walkNode(child);
      if (result === null) {
        node.removeChild(child);
      }
    }

    return node;
  }

  // ─── Module public API ────────────────────────────────────────────────────

  /**
   * Parses an HTML string and returns a DocumentFragment containing
   * sanitized nodes. Safe to insert into the DOM via appendChild.
   *
   * @param  {string} htmlString
   * @returns {DocumentFragment}
   */
  function fromString(htmlString) {
    if (typeof htmlString !== 'string') {
      return document.createDocumentFragment();
    }

    // DOMParser creates an isolated document — scripts do not execute
    var parser   = new DOMParser();
    var parsed   = parser.parseFromString(htmlString, 'text/html');
    var body     = parsed.body;
    var fragment = document.createDocumentFragment();

    // Walk direct children of the parsed body
    var children = Array.prototype.slice.call(body.childNodes);
    for (var i = 0; i < children.length; i++) {
      var result = _walkNode(children[i]);
      if (result !== null) {
        // importNode adopts the node into the real document
        fragment.appendChild(document.importNode(result, true));
      }
    }

    return fragment;
  }

  /**
   * Sanitizes an HTML string and returns it as a clean HTML string.
   * Useful when markup is needed as text rather than nodes.
   *
   * @param  {string} htmlString
   * @returns {string}
   */
  function toString(htmlString) {
    var fragment = fromString(htmlString);
    var temp     = document.createElement('div');
    temp.appendChild(fragment);
    return temp.innerHTML;
  }

  return {
    fromString: fromString,
    toString:   toString
  };

})();

// ── src\core\StyleManager.js ──
// ─────────────────────────────────────────────────────────────────────────────
// core/StyleManager.js
//
// Base style injection for HaxUI windows.
//
// v1 CHANGES:
//   - _shadowStyles(theme) and _namespaceStyles(theme) now accept a theme name.
//   - THEMES.HAXBALL replicates HaxBall's native .dialog style exactly,
//     using values extracted directly from the live DOM.
//   - injectIntoShadow(shadowRoot, theme) and injectIntoDocument(theme)
//     forward the theme to the style generators.
//   - All v0 callers that omit theme receive THEMES.DEFAULT — no breaking change.
//
// INTERNAL USE:
//   Called once per window by Window.mount().
//   Not part of the public HaxUI API.
// ─────────────────────────────────────────────────────────────────────────────

var StyleManager = (function () {

  // Tracks whether the NAMESPACE_MODE global style has been injected per theme.
  // Map<theme, true> so multiple themes can coexist in NAMESPACE_MODE.
  var _injectedThemes = {};

  // ─── Theme helpers ────────────────────────────────────────────────────────

  /**
   * Returns the resolved theme name, defaulting to THEMES.DEFAULT.
   *
   * @param {string} [theme]
   * @returns {string}
   */
  function _resolveTheme(theme) {
    if (theme === HaxUIConfig.THEMES.HAXBALL) return HaxUIConfig.THEMES.HAXBALL;
    return HaxUIConfig.THEMES.DEFAULT;
  }

  // ─── DEFAULT theme ────────────────────────────────────────────────────────

  function _defaultShadowStyles() {
    return [
      ':host {',
      '  all: initial;',
      '  display: block;',
      '  position: fixed;',
      '  box-sizing: border-box;',
      '  font-family: "Segoe UI", Arial, sans-serif;',
      '  font-size: 13px;',
      '  color: #e8e8e8;',
      '  z-index: inherit;',
      '  border-radius: 6px;',
      '  overflow: hidden;',
      '  box-shadow: 0 4px 24px rgba(0,0,0,0.55), 0 1px 4px rgba(0,0,0,0.4);',
      '}',

      '[data-haxui-window] {',
      '  all: unset;',
      '  display: flex;',
      '  flex-direction: column;',
      '  width: 100%;',
      '  height: 100%;',
      '  background: #1a1a2e;',
      '  border: 1px solid rgba(255,255,255,0.08);',
      '  border-radius: 6px;',
      '  overflow: hidden;',
      '  box-sizing: border-box;',
      '}',

      '[data-haxui-header] {',
      '  all: unset;',
      '  display: flex;',
      '  align-items: center;',
      '  padding: 0 10px;',
      '  height: 32px;',
      '  min-height: 32px;',
      '  background: #16213e;',
      '  border-bottom: 1px solid rgba(255,255,255,0.07);',
      '  cursor: default;',
      '  user-select: none;',
      '  box-sizing: border-box;',
      '}',

      '[data-haxui-header] span {',
      '  all: unset;',
      '  font-size: 12px;',
      '  font-weight: 600;',
      '  color: #a0aec0;',
      '  letter-spacing: 0.03em;',
      '  overflow: hidden;',
      '  white-space: nowrap;',
      '  text-overflow: ellipsis;',
      '}',

      _sharedContentStyles(),
    ].join('\n');
  }

  // ─── HAXBALL theme ────────────────────────────────────────────────────────

  function _haxballShadowStyles() {
    var t = HaxUIConfig.HAXBALL_THEME;
    return [
      ':host {',
      '  all: initial;',
      '  display: block;',
      '  position: fixed;',
      '  box-sizing: border-box;',
      '  font-family: ' + t.fontFamily + ';',
      '  font-size: ' + t.fontSize + ';',
      '  color: ' + t.color + ';',
      '  z-index: inherit;',
      '  border-radius: ' + t.borderRadius + ';',
      '  overflow: hidden;',
      '  box-shadow: ' + t.shadow + ';',
      '}',

      '[data-haxui-window] {',
      '  all: unset;',
      '  display: flex;',
      '  flex-direction: column;',
      '  width: 100%;',
      '  height: 100%;',
      '  background: ' + t.background + ';',
      '  border-radius: ' + t.borderRadius + ';',
      '  overflow: hidden;',
      '  box-sizing: border-box;',
      '}',

      '[data-haxui-header] {',
      '  all: unset;',
      '  display: flex;',
      '  align-items: center;',
      '  padding: 0 12px;',
      '  height: 36px;',
      '  min-height: 36px;',
      '  background: ' + t.headerBackground + ';',
      '  border-bottom: ' + t.headerBorder + ';',
      '  cursor: default;',
      '  user-select: none;',
      '  box-sizing: border-box;',
      '}',

      '[data-haxui-header] span {',
      '  all: unset;',
      '  font-family: ' + t.fontFamily + ';',
      '  font-size: 15px;',
      '  font-weight: 700;',
      '  color: ' + t.color + ';',
      '  overflow: hidden;',
      '  white-space: nowrap;',
      '  text-overflow: ellipsis;',
      '}',

      _sharedContentStyles(t),
      _haxballButtonStyles(t),
    ].join('\n');
  }

  /**
   * Button styles specific to the HaxBall theme.
   * Replicates the exact look of HaxBall's Cancel/Leave buttons.
   *
   * @param {Object} t - HAXBALL_THEME values
   * @returns {string}
   */
  function _haxballButtonStyles(t) {
    return [
      '[data-haxui-content] button {',
      '  all: unset;',
      '  display: inline-block;',
      '  box-sizing: border-box;',
      '  background: ' + t.buttonBackground + ';',
      '  border: 0;',
      '  border-radius: ' + t.buttonRadius + ';',
      '  padding: 6px 18px;',
      '  color: ' + t.buttonColor + ';',
      '  font-family: ' + t.fontFamily + ';',
      '  font-size: 13px;',
      '  font-weight: 600;',
      '  cursor: pointer;',
      '  text-align: center;',
      '  min-width: 80px;',
      '}',
      '[data-haxui-content] button:hover {',
      '  background: rgb(46, 93, 133);',
      '  border-color: rgb(255, 255, 255);',
      '}',
      '[data-haxui-content] button:active {',
      '  background: rgb(26, 53, 83);',
      '}',
    ].join('\n');
  }

  // ─── Shared content styles (both themes) ─────────────────────────────────

  /**
   * Content area styles shared across themes.
   * Accepts optional theme values for color overrides.
   *
   * @param {Object} [t] - theme values (optional)
   * @returns {string}
   */
  function _sharedContentStyles(t) {
    var color    = t ? t.color    : '#e8e8e8';
    var fontFam  = t ? t.fontFamily : '"Segoe UI", Arial, sans-serif';

    return [
      '[data-haxui-content] {',
      '  all: unset;',
      '  display: block;',
      '  flex: 1;',
      '  padding: 10px 12px;',
      '  overflow-y: auto;',
      '  overflow-x: hidden;',
      '  box-sizing: border-box;',
      '  line-height: 1.5;',
      '  color: ' + color + ';',
      '  font-family: ' + fontFam + ';',
      '}',

      '[data-haxui-content]::-webkit-scrollbar { width: 4px; }',
      '[data-haxui-content]::-webkit-scrollbar-track { background: transparent; }',
      '[data-haxui-content]::-webkit-scrollbar-thumb {',
      '  background: rgba(255,255,255,0.15);',
      '  border-radius: 2px;',
      '}',

      '[data-haxui-content] p,',
      '[data-haxui-content] div,',
      '[data-haxui-content] span {',
      '  all: unset;',
      '  display: revert;',
      '  box-sizing: border-box;',
      '  color: inherit;',
      '  font-size: inherit;',
      '  line-height: inherit;',
      '}',

      '[data-haxui-content] h1,',
      '[data-haxui-content] h2,',
      '[data-haxui-content] h3,',
      '[data-haxui-content] h4,',
      '[data-haxui-content] h5,',
      '[data-haxui-content] h6 {',
      '  all: unset;',
      '  display: block;',
      '  font-weight: 700;',
      '  color: ' + color + ';',
      '  margin-bottom: 4px;',
      '}',

      '[data-haxui-content] table {',
      '  all: unset;',
      '  display: table;',
      '  width: 100%;',
      '  border-collapse: collapse;',
      '  font-size: 12px;',
      '}',
      '[data-haxui-content] th,',
      '[data-haxui-content] td {',
      '  all: unset;',
      '  display: table-cell;',
      '  padding: 3px 6px;',
      '  border-bottom: 1px solid rgba(255,255,255,0.06);',
      '  color: ' + color + ';',
      '}',
      '[data-haxui-content] th {',
      '  font-weight: 700;',
      '  font-size: 11px;',
      '  letter-spacing: 0.04em;',
      '}',

      '[data-haxui-content] input,',
      '[data-haxui-content] textarea,',
      '[data-haxui-content] select {',
      '  all: unset;',
      '  display: inline-block;',
      '  box-sizing: border-box;',
      '  background: rgba(255,255,255,0.06);',
      '  border: 1px solid rgba(255,255,255,0.2);',
      '  border-radius: 3px;',
      '  padding: 4px 8px;',
      '  color: ' + color + ';',
      '  font-size: 13px;',
      '  width: 100%;',
      '}',
      '[data-haxui-content] input:focus,',
      '[data-haxui-content] textarea:focus,',
      '[data-haxui-content] select:focus {',
      '  outline: 1px solid rgba(255,255,255,0.4);',
      '}',

      '[data-haxui-content] code,',
      '[data-haxui-content] pre {',
      '  all: unset;',
      '  display: inline;',
      '  font-family: "Consolas", "Courier New", monospace;',
      '  font-size: 11px;',
      '  color: #68d391;',
      '  background: rgba(255,255,255,0.05);',
      '  border-radius: 2px;',
      '  padding: 1px 4px;',
      '}',
      '[data-haxui-content] pre {',
      '  display: block;',
      '  padding: 6px 8px;',
      '  overflow-x: auto;',
      '  white-space: pre;',
      '}',
    ].join('\n');
  }

  // ─── NAMESPACE_MODE equivalents ───────────────────────────────────────────

  function _namespaceStyles(theme) {
    var scope = '[data-haxui-window]';
    var t     = HaxUIConfig.HAXBALL_THEME;
    var isHax = theme === HaxUIConfig.THEMES.HAXBALL;

    return [
      scope + ' {',
      '  all: initial;',
      '  display: block !important;',
      '  position: fixed !important;',
      '  box-sizing: border-box !important;',
      '  font-family: ' + (isHax ? t.fontFamily : '"Segoe UI", Arial, sans-serif') + ' !important;',
      '  font-size: ' + (isHax ? t.fontSize : '13px') + ' !important;',
      '  color: ' + (isHax ? t.color : '#e8e8e8') + ' !important;',
      '  border-radius: ' + (isHax ? t.borderRadius : '6px') + ' !important;',
      '  overflow: hidden !important;',
      '  background: ' + (isHax ? t.background : '#1a1a2e') + ' !important;',
      '  box-shadow: ' + (isHax ? t.shadow : '0 4px 24px rgba(0,0,0,0.55)') + ' !important;',
      '}',

      scope + ' [data-haxui-header] {',
      '  display: flex !important;',
      '  align-items: center !important;',
      '  padding: 0 12px !important;',
      '  height: ' + (isHax ? '36px' : '32px') + ' !important;',
      '  background: ' + (isHax ? t.headerBackground : '#16213e') + ' !important;',
      '  border-bottom: ' + (isHax ? t.headerBorder : '1px solid rgba(255,255,255,0.07)') + ' !important;',
      '  cursor: default !important;',
      '  user-select: none !important;',
      '  box-sizing: border-box !important;',
      '}',

      scope + ' [data-haxui-header] span {',
      '  font-size: ' + (isHax ? '15px' : '12px') + ' !important;',
      '  font-weight: ' + (isHax ? '700' : '600') + ' !important;',
      '  color: ' + (isHax ? t.color : '#a0aec0') + ' !important;',
      '  overflow: hidden !important;',
      '  white-space: nowrap !important;',
      '  text-overflow: ellipsis !important;',
      '}',

      scope + ' [data-haxui-content] {',
      '  display: block !important;',
      '  padding: 10px 12px !important;',
      '  overflow-y: auto !important;',
      '  overflow-x: hidden !important;',
      '  box-sizing: border-box !important;',
      '  line-height: 1.5 !important;',
      '  color: ' + (isHax ? t.color : '#e8e8e8') + ' !important;',
      '}',

      isHax ? [
        scope + ' [data-haxui-content] button {',
        '  background: ' + t.buttonBackground + ' !important;',
        '  border: ' + t.buttonBorder + ' !important;',
        '  border-radius: ' + t.buttonRadius + ' !important;',
        '  color: ' + t.buttonColor + ' !important;',
        '  padding: 6px 18px !important;',
        '  font-weight: 600 !important;',
        '  cursor: pointer !important;',
        '  min-width: 80px !important;',
        '}',
      ].join('\n') : '',
    ].join('\n');
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /**
   * Injects styles into a Shadow Root.
   * Theme selects the visual style — defaults to THEMES.DEFAULT.
   *
   * @param {ShadowRoot} shadowRoot
   * @param {string}     [theme]
   */
  function injectIntoShadow(shadowRoot, theme) {
    if (!shadowRoot) {
      console.warn('[HaxUI] StyleManager.injectIntoShadow: shadowRoot is null');
      return;
    }
    var resolved = _resolveTheme(theme);
    var css = resolved === HaxUIConfig.THEMES.HAXBALL
      ? _haxballShadowStyles()
      : _defaultShadowStyles();

    var style = document.createElement('style');
    style.textContent = css;
    shadowRoot.appendChild(style);
  }

  /**
   * Injects styles into document.head (NAMESPACE_MODE fallback).
   * Each theme is injected at most once.
   *
   * @param {string} [theme]
   */
  function injectIntoDocument(theme) {
    var resolved = _resolveTheme(theme);
    if (_injectedThemes[resolved]) return;

    var style = document.createElement('style');
    style.id  = 'haxui-base-styles-' + resolved;
    style.textContent = _namespaceStyles(resolved);
    document.head.appendChild(style);
    _injectedThemes[resolved] = true;
  }

  /**
   * Removes all injected NAMESPACE_MODE styles from document.head.
   * Called during full framework teardown.
   */
  function removeFromDocument() {
    Object.keys(_injectedThemes).forEach(function (theme) {
      var el = document.getElementById('haxui-base-styles-' + theme);
      if (el) el.remove();
    });
    _injectedThemes = {};
  }

  // ─────────────────────────────────────────────────────────────────────────

  return Object.freeze({
    injectIntoShadow:   injectIntoShadow,
    injectIntoDocument: injectIntoDocument,
    removeFromDocument: removeFromDocument
  });

})();

// ── src\core\EventGuard.js ──
// ─────────────────────────────────────────────────────────────────────────────
// core/EventGuard.js
//
// Event isolation layer between HaxUI windows and the HaxBall game.
//
// PROBLEM:
//   HaxBall listens to keyboard and mouse events on the document to control
//   the game (player movement, shooting, etc.). Without isolation, any event
//   that fires inside a HaxUI window will bubble up and reach the game —
//   clicking inside a window moves the player, typing in an input triggers
//   game actions, scrolling moves the camera.
//
// SOLUTION:
//   EventGuard applies a per-event-type policy to each window. The policy
//   is not a blanket stopPropagation on everything — that would break
//   legitimate game input when focus is outside a window. Instead, each
//   event type is handled with its own rule:
//
//   click / mousedown / mouseup / contextmenu
//     → stopPropagation always. These must never reach the game when
//       the user is interacting with a HaxUI window.
//     → mousedown also notifies WindowManager to bring the window to front.
//
//   keydown / keyup
//     → stopPropagation ONLY if an interactive element (input, textarea,
//       select) inside the window currently has focus. If focus is
//       outside all windows, the game receives keyboard events normally
//       and the player can move.
//
//   wheel
//     → preventDefault + stopPropagation on the content area only.
//       Allows internal scrolling without triggering game camera zoom
//       or page scroll.
//
//   mousemove
//     → NOT intercepted. The game needs mousemove for player aiming.
//       Blocking it would make the game unplayable while hovering
//       over a window.
//
// INTERNAL USE:
//   Called by Window.mount() after the DOM structure is built.
//   All listeners are registered through the window's EventRegistry
//   so they are cleaned up automatically on destroy().
//   Not part of the public HaxUI API.
// ─────────────────────────────────────────────────────────────────────────────

var EventGuard = (function () {

  // ─── Internal helpers ─────────────────────────────────────────────────────

  /**
   * Returns true if the currently focused element is an interactive input
   * inside the given container (or its shadow root).
   * Used to decide whether keyboard events should be blocked.
   *
   * @param {HTMLElement} container
   * @returns {boolean}
   */
  function _interactiveElementHasFocus(container) {
    var active = document.activeElement;
    if (!active) return false;

    var tag = active.tagName.toLowerCase();
    var isInteractive = HaxUIConfig.INTERACTIVE_TAGS.indexOf(tag) !== -1;
    if (!isInteractive) return false;

    // Check if the focused element lives inside this window's container
    // or inside its shadow root (SHADOW_MODE).
    if (container.contains(active)) return true;

    var shadow = container.shadowRoot;
    if (shadow && shadow.activeElement) {
      var shadowActive = shadow.activeElement;
      var shadowTag    = shadowActive.tagName.toLowerCase();
      return HaxUIConfig.INTERACTIVE_TAGS.indexOf(shadowTag) !== -1;
    }

    return false;
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /**
   * Attaches all isolation listeners to a window container.
   * All listeners are registered through the provided EventRegistry
   * so they are removed automatically when the window is destroyed.
   *
   * @param {HTMLElement}   container      - The window's root DOM element
   * @param {HTMLElement}   contentArea    - The [data-haxui-content] element
   * @param {string}        windowId       - Used to notify WindowManager on focus
   * @param {Object}        registry       - EventRegistry instance for this window
   * @param {Function}      onFocus        - Callback: onFocus(windowId) → bring to front
   */
  function bindTo(container, contentArea, windowId, registry, onFocus) {

    // ── click ──────────────────────────────────────────────────────────────
    // Always block. A click inside a window must never reach the game.
    registry.add(container, 'click', function (e) {
      e.stopPropagation();
    });

    // ── mousedown ──────────────────────────────────────────────────────────
    // Block propagation and notify WindowManager to bring this window
    // to the front of the z-index stack.
    registry.add(container, 'mousedown', function (e) {
      e.stopPropagation();
      if (typeof onFocus === 'function') {
        onFocus(windowId);
      }
    });

    // ── mouseup ────────────────────────────────────────────────────────────
    // Block. Prevents mouseup from triggering game shoot/actions.
    registry.add(container, 'mouseup', function (e) {
      e.stopPropagation();
    });

    // ── contextmenu ────────────────────────────────────────────────────────
    // Block. Prevents the browser context menu from being suppressed by
    // HaxBall's own contextmenu handler while right-clicking on a window.
    registry.add(container, 'contextmenu', function (e) {
      e.stopPropagation();
    });

    // ── keydown ────────────────────────────────────────────────────────────
    // Block ONLY when an interactive element inside this window has focus.
    // If the user is typing in an input, the game must not react.
    // If focus is outside any window, the game receives keydown normally.
    registry.add(container, 'keydown', function (e) {
      if (_interactiveElementHasFocus(container)) {
        e.stopPropagation();
      }
    });

    // ── keyup ──────────────────────────────────────────────────────────────
    // Same policy as keydown — symmetric to avoid stuck keys in the game.
    registry.add(container, 'keyup', function (e) {
      if (_interactiveElementHasFocus(container)) {
        e.stopPropagation();
      }
    });

    // ── wheel ──────────────────────────────────────────────────────────────
    // Attached to the content area only (not the whole container).
    // Allows internal scrolling without triggering camera zoom or page scroll.
    // preventDefault stops the game; stopPropagation stops the browser scroll.
    if (contentArea) {
      registry.add(contentArea, 'wheel', function (e) {
        e.preventDefault();
        e.stopPropagation();
      }, { passive: false });
      // passive: false is required for preventDefault() to work on wheel events
      // in modern browsers (Chrome 73+ defaults wheel listeners to passive).
    }

    // ── mousemove ──────────────────────────────────────────────────────────
    // NOT blocked. The game needs mousemove for player aiming.
    // Intercepting it would make the game unplayable while hovering
    // over a HaxUI window.
  }

  // ─────────────────────────────────────────────────────────────────────────

  return Object.freeze({
    bindTo: bindTo
  });

})();

// ── src\core\DragManager.js ──
// ─────────────────────────────────────────────────────────────────────────────
// core/DragManager.js
//
// Drag & drop for HaxUI windows. (v1.1)
//
// ROOT CAUSE OF THE "drag never releases" BUG:
//   EventGuard registers a 'mouseup' listener directly on the window
//   container that calls e.stopPropagation() (to stop clicks from
//   reaching the game). When the user releases the mouse while the
//   cursor is over the container — which is almost always the case
//   while dragging — that listener fires during the BUBBLING phase
//   and stops the event before it can bubble up to the 'mouseup'
//   listener DragManager attached on `document`. The drag's internal
//   _dragging flag never gets reset, so the window appears "stuck".
//
// FIX:
//   DragManager's mousemove/mouseup listeners on `document` are attached
//   with the CAPTURE phase (the 3rd argument `true`). Capture-phase
//   listeners run BEFORE bubble-phase listeners and before any
//   stopPropagation() called during bubbling, so the drag always
//   releases regardless of what EventGuard does on the container.
//
//   mousemove/mouseup are still attached/removed manually per drag cycle,
//   NOT through EventRegistry — those listeners must be temporary.
//
// NEW (v1.1):
//   config.draggable can now be:
//     true   — window can be dragged (default)
//     false  — window is static, header shows a "static" indicator
//   Window.js passes this through; DragManager just needs to not be
//   called when draggable is false (handled in Window.js).
// ─────────────────────────────────────────────────────────────────────────────

var DragManager = (function () {

  // useCapture = true for all temporary document-level drag listeners
  var CAPTURE = true;

  /**
   * Enables drag on a window.
   *
   * @param {HTMLElement} container - The window's outer container (position:fixed)
   * @param {HTMLElement} handle    - The element that initiates drag (header)
   * @param {Object}      registry  - EventRegistry instance for this window
   */
  function enable(container, handle, registry) {
    if (!container || !handle) return;

    var _dragging = false;
    var _offsetX  = 0;
    var _offsetY  = 0;

    function _release() {
      if (!_dragging) return;
      _dragging = false;

      handle.style.cursor            = 'grab';
      document.body.style.userSelect = '';

      document.removeEventListener('mousemove', _onMouseMove, CAPTURE);
      document.removeEventListener('mouseup',   _onMouseUp,   CAPTURE);
      document.removeEventListener('mouseleave', _onMouseUp,  CAPTURE);
    }

    function _onMouseMove(e) {
      if (!_dragging) return;

      var newX = e.clientX - _offsetX;
      var newY = e.clientY - _offsetY;

      var maxX = window.innerWidth  - container.offsetWidth;
      var maxY = window.innerHeight - container.offsetHeight;
      newX = Math.max(0, Math.min(newX, maxX));
      newY = Math.max(0, Math.min(newY, maxY));

      container.style.left = newX + 'px';
      container.style.top  = newY + 'px';
    }

    function _onMouseUp() {
      _release();
    }

    function _onMouseDown(e) {
      if (e.button !== 0) return;

      // Ignore mousedown on elements explicitly marked as non-draggable
      // (close button, drag indicator, or any future header control).
      // Without this, clicking the close button drags the window instead
      // of triggering its own click handler.
      if (e.target.closest && e.target.closest('[data-haxui-no-drag]')) {
        return;
      }

      _dragging = true;

      var rect = container.getBoundingClientRect();
      _offsetX  = e.clientX - rect.left;
      _offsetY  = e.clientY - rect.top;

      handle.style.cursor            = 'grabbing';
      document.body.style.userSelect = HaxUIConfig.NO_SELECT_STYLE;

      // CAPTURE phase: runs before EventGuard's bubble-phase stopPropagation
      // on the container, so the drag always releases on mouseup.
      document.addEventListener('mousemove',  _onMouseMove, CAPTURE);
      document.addEventListener('mouseup',    _onMouseUp,   CAPTURE);
      // Safety net: if the mouse leaves the browser window entirely
      // (e.g. dragged outside the viewport) mouseup may never fire.
      document.addEventListener('mouseleave', _onMouseUp,   CAPTURE);

      e.stopPropagation();
      e.preventDefault();
    }

    registry.add(handle, 'mousedown', _onMouseDown);

    handle.style.cursor = 'grab';
  }

  return Object.freeze({ enable: enable });

})();

// ── src\core\ResizeManager.js ──
// ─────────────────────────────────────────────────────────────────────────────
// core/ResizeManager.js
//
// Corner resize handles for HaxUI windows. (v1.1)
//
// Same root cause and fix as DragManager: EventGuard's stopPropagation()
// on the container's bubble-phase 'mouseup' listener can prevent a
// bubble-phase document listener from firing. mousemove/mouseup here are
// attached in the CAPTURE phase so resize always releases on mouseup,
// regardless of where the cursor ends up relative to the container.
//
// mousemove/mouseup are attached/removed manually per resize cycle,
// NOT through EventRegistry — they must be temporary, not lifetime-bound.
// ─────────────────────────────────────────────────────────────────────────────

var ResizeManager = (function () {

  var CAPTURE = true;

  var CORNERS = [
    { id: 'se', bottom: 0, right: 0,  cursor: 'se-resize', dx: 1,  dy: 1,  dl: 0,  dt: 0  },
    { id: 'sw', bottom: 0, left: 0,   cursor: 'sw-resize', dx: -1, dy: 1,  dl: 1,  dt: 0  },
    { id: 'ne', top: 0,    right: 0,  cursor: 'ne-resize', dx: 1,  dy: -1, dl: 0,  dt: 1  },
    { id: 'nw', top: 0,    left: 0,   cursor: 'nw-resize', dx: -1, dy: -1, dl: 1,  dt: 1  },
  ];

  /**
   * Enables resize on a window container.
   *
   * @param {HTMLElement} container - The window's outer container
   * @param {Object}      registry  - EventRegistry instance for this window
   */
  function enable(container, registry) {
    if (!container) return;

    var s = HaxUIConfig.RESIZE_HANDLE_SIZE;

    CORNERS.forEach(function (corner) {

      var handle = document.createElement('div');
      handle.setAttribute(HaxUIConfig.RESIZE_ATTR, corner.id);
      handle.style.cssText = [
        'position: absolute',
        'width: '  + s + 'px',
        'height: ' + s + 'px',
        'cursor: ' + corner.cursor,
        'z-index: 10',
        corner.bottom !== undefined ? 'bottom: 0'    : 'top: 0',
        corner.right  !== undefined ? 'right: 0'     : 'left: 0',
      ].join('; ');

      container.appendChild(handle);

      var _resizing = false;
      var _startX, _startY, _startW, _startH, _startL, _startT;

      function _release() {
        if (!_resizing) return;
        _resizing = false;
        document.body.style.userSelect = '';

        document.removeEventListener('mousemove',  _onMouseMove, CAPTURE);
        document.removeEventListener('mouseup',    _onMouseUp,   CAPTURE);
        document.removeEventListener('mouseleave', _onMouseUp,   CAPTURE);
      }

      function _onMouseMove(e) {
        if (!_resizing) return;

        var dx = e.clientX - _startX;
        var dy = e.clientY - _startY;

        var newW = _startW + dx * corner.dx;
        var newH = _startH + dy * corner.dy;

        newW = Math.max(newW, HaxUIConfig.MIN_WIDTH);
        newH = Math.max(newH, HaxUIConfig.MIN_HEIGHT);

        container.style.width  = newW + 'px';
        container.style.height = newH + 'px';

        if (corner.dl) {
          var clampedDx = _startW - newW;
          container.style.left = (_startL - clampedDx) + 'px';
        }
        if (corner.dt) {
          var clampedDy = _startH - newH;
          container.style.top  = (_startT - clampedDy) + 'px';
        }
      }

      function _onMouseUp() {
        _release();
      }

      function _onMouseDown(e) {
        if (e.button !== 0) return;
        _resizing = true;

        _startX = e.clientX;
        _startY = e.clientY;
        _startW = container.offsetWidth;
        _startH = container.offsetHeight;
        _startL = parseInt(container.style.left, 10) || 0;
        _startT = parseInt(container.style.top,  10) || 0;

        document.body.style.userSelect = HaxUIConfig.NO_SELECT_STYLE;

        // CAPTURE phase — same fix as DragManager
        document.addEventListener('mousemove',  _onMouseMove, CAPTURE);
        document.addEventListener('mouseup',    _onMouseUp,   CAPTURE);
        document.addEventListener('mouseleave', _onMouseUp,   CAPTURE);

        e.stopPropagation();
        e.preventDefault();
      }

      registry.add(handle, 'mousedown', _onMouseDown);
    });
  }

  return Object.freeze({ enable: enable });

})();

// ── src\core\RootMount.js ──
// ─────────────────────────────────────────────────────────────────────────────
// core/RootMount.js
//
// Root node management and execution context detection.
//
// RESPONSIBILITIES:
//   1. Detect whether the script is running in the correct frame
//      (HaxBall may load inside an <iframe> in some loaders).
//   2. Detect whether Shadow DOM is available and set the operation mode.
//   3. Create and anchor #haxui-root as a direct child of document.body.
//   4. Watch for #haxui-root removal via MutationObserver and re-anchor
//      automatically when HaxBall clears the DOM on room transitions.
//   5. Notify WindowManager to re-mount all active windows after re-anchor.
//
// CONTEXT DETECTION FLOW:
//
//   init()
//     │
//     ├─ Is document.body accessible?
//     │    No  → wait with MutationObserver on document.documentElement
//     │
//     ├─ Is the HaxBall canvas present?
//     │    No  → retry up to CONTEXT_RETRY_LIMIT times (500ms interval)
//     │          If limit reached → warn and mount anyway (non-HaxBall page)
//     │
//     ├─ Is window !== window.top?
//     │    Yes → we may be in the wrong frame, log a warning
//     │
//     ├─ Is attachShadow available?
//     │    Yes → SHADOW_MODE
//     │    No  → NAMESPACE_MODE (CSS fallback)
//     │
//     └─ _mountRoot() → create #haxui-root, install body MutationObserver
//
// SINGLETON:
//   RootMount is a singleton. init() is idempotent — calling it multiple
//   times is safe and does nothing after the first successful mount.
//
// INTERNAL USE:
//   Called once by HaxUI.init() before any window is created.
//   WindowManager calls RootMount.getRoot() to obtain the mount point.
//   Not part of the public HaxUI API.
// ─────────────────────────────────────────────────────────────────────────────

var RootMount = (function () {

  // ─── Internal state ───────────────────────────────────────────────────────

  var _root            = null;      // The #haxui-root element
  var _initialized     = false;     // True after a successful mount
  var _operationMode   = null;      // HaxUIConfig.OPERATION_MODES value
  var _bodyObserver    = null;      // MutationObserver watching document.body
  var _onRemount       = null;      // Callback: () → WindowManager.remountAll()
  var _retryCount      = 0;         // Canvas detection retry counter
  var _retryTimer      = null;      // setInterval handle for canvas retries

  // ─── Context detection ────────────────────────────────────────────────────

  /**
   * Checks whether Shadow DOM is available in this environment.
   * Some script loaders or browser configurations may patch or restrict
   * HTMLElement.prototype.attachShadow.
   *
   * Sets _operationMode as a side effect.
   */
  function _detectShadowSupport() {
    try {
      var probe = document.createElement('div');
      probe.attachShadow({ mode: 'open' });
      _operationMode = HaxUIConfig.OPERATION_MODES.SHADOW;
    } catch (e) {
      _operationMode = HaxUIConfig.OPERATION_MODES.NAMESPACE;
      console.warn('[HaxUI] Shadow DOM unavailable — falling back to NAMESPACE_MODE');
    }
  }

  /**
   * Checks whether the HaxBall canvas element is present in this document.
   * Returns true if found, false otherwise.
   *
   * @returns {boolean}
   */
  function _canvasPresent() {
    return document.querySelector(HaxUIConfig.HAXBALL_CANVAS_SELECTOR) !== null;
  }

  /**
   * Checks whether we are running inside a nested iframe.
   * Logs a warning if so — the script may be in the wrong frame.
   */
  function _checkFrameContext() {
    try {
      if (window !== window.top) {
        console.warn(
          '[HaxUI] Running inside an <iframe>. ' +
          'If HaxBall is in a different frame, windows may not appear correctly.'
        );
      }
    } catch (e) {
      // window.top access throws in cross-origin frames — that itself is
      // a signal that we are nested inside a cross-origin iframe.
      console.warn('[HaxUI] Cross-origin frame detected. Context may be incorrect.');
    }
  }

  // ─── Root node management ─────────────────────────────────────────────────

  /**
   * Creates the #haxui-root element and appends it to document.body.
   * Installs a MutationObserver on body to detect if the root is removed.
   */
  function _mountRoot() {
    // Remove any stale root left over from a previous mount attempt
    var stale = document.getElementById(HaxUIConfig.ROOT_ID);
    if (stale) stale.remove();

    _root = document.createElement('div');
    _root.id = HaxUIConfig.ROOT_ID;

    // Inline styles on the root itself — these must survive any CSS reset
    _root.style.cssText = [
      'position: fixed',
      'top: 0',
      'left: 0',
      'width: 0',
      'height: 0',
      'overflow: visible',
      'pointer-events: none',
      'z-index: ' + HaxUIConfig.BASE_Z_INDEX,
    ].join('; ');

    document.body.appendChild(_root);
    _installBodyObserver();
  }

  /**
   * Installs a MutationObserver on document.body that watches for
   * removal of #haxui-root. When detected, re-anchors immediately.
   *
   * This guards against HaxBall clearing DOM sections during room
   * transitions (lobby → room → lobby).
   */
  function _installBodyObserver() {
    if (_bodyObserver) {
      _bodyObserver.disconnect();
    }

    _bodyObserver = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var removed = mutations[i].removedNodes;
        for (var j = 0; j < removed.length; j++) {
          if (removed[j] === _root) {
            _reanchor();
            return;
          }
        }
      }
    });

    _bodyObserver.observe(document.body, { childList: true });
  }

  /**
   * Re-creates #haxui-root after it was removed from the DOM.
   * Notifies WindowManager via the _onRemount callback so all
   * active windows can re-mount themselves.
   */
  function _reanchor() {
    console.info('[HaxUI] #haxui-root was removed — re-anchoring.');
    _mountRoot();

    if (typeof _onRemount === 'function') {
      _onRemount();
    }
  }

  // ─── Init flow ────────────────────────────────────────────────────────────

  /**
   * Attempts to mount after verifying the body and canvas are ready.
   * Called by _startWithRetry() once per retry tick.
   *
   * @returns {boolean} true if mount succeeded, false if not yet ready
   */
  function _tryMount() {
    if (!document.body) return false;

    if (!_canvasPresent()) {
      _retryCount++;
      if (_retryCount >= HaxUIConfig.CONTEXT_RETRY_LIMIT) {
        console.warn(
          '[HaxUI] HaxBall canvas not found after ' +
          HaxUIConfig.CONTEXT_RETRY_LIMIT + ' retries. ' +
          'Mounting anyway — ensure the script runs on the correct page.'
        );
        _proceed();
        return true;
      }
      return false;
    }

    _proceed();
    return true;
  }

  /**
   * Clears the retry timer and runs the full initialization sequence.
   */
  function _proceed() {
    if (_retryTimer) {
      clearInterval(_retryTimer);
      _retryTimer = null;
    }

    _checkFrameContext();
    _detectShadowSupport();
    _mountRoot();
    _initialized = true;

    console.info(
      '[HaxUI] Initialized. Mode: ' + _operationMode +
      ' | Root: #' + HaxUIConfig.ROOT_ID
    );
  }

  /**
   * Starts the canvas detection retry loop.
   * Attempts _tryMount() immediately, then on a fixed interval.
   */
  function _startWithRetry() {
    _retryCount = 0;

    // Immediate attempt — no delay if HaxBall is already loaded
    if (_tryMount()) return;

    _retryTimer = setInterval(function () {
      if (_tryMount()) {
        clearInterval(_retryTimer);
        _retryTimer = null;
      }
    }, HaxUIConfig.CONTEXT_RETRY_INTERVAL);
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /**
   * Initializes RootMount. Idempotent — safe to call multiple times.
   * Registers the onRemount callback used by WindowManager to re-mount
   * all active windows after a DOM re-anchor.
   *
   * @param {Function} [onRemount] - Called after every re-anchor event
   */
  function init(onRemount) {
    if (_initialized) return;

    if (typeof onRemount === 'function') {
      _onRemount = onRemount;
    }

    // If body is not yet available, wait for it
    if (!document.body) {
      var docObserver = new MutationObserver(function () {
        if (document.body) {
          docObserver.disconnect();
          _startWithRetry();
        }
      });
      docObserver.observe(document.documentElement, { childList: true });
      return;
    }

    _startWithRetry();
  }

  /**
   * Returns the #haxui-root element.
   * All window containers are appended here by WindowManager.
   *
   * @returns {HTMLElement|null}
   */
  function getRoot() {
    return _root;
  }

  /**
   * Returns the current operation mode.
   *
   * @returns {string|null} 'shadow' | 'namespace' | null (before init)
   */
  function getMode() {
    return _operationMode;
  }

  /**
   * Returns true if RootMount has completed initialization.
   *
   * @returns {boolean}
   */
  function isReady() {
    return _initialized;
  }

  /**
   * Tears down RootMount completely:
   * disconnects the body MutationObserver, removes #haxui-root,
   * clears all retry timers, and resets internal state.
   *
   * Called by HaxUI.destroyAll() during full framework teardown.
   */
  function teardown() {
    if (_bodyObserver) {
      _bodyObserver.disconnect();
      _bodyObserver = null;
    }

    if (_retryTimer) {
      clearInterval(_retryTimer);
      _retryTimer = null;
    }

    if (_root && _root.parentNode) {
      _root.remove();
    }

    _root          = null;
    _initialized   = false;
    _operationMode = null;
    _onRemount     = null;
    _retryCount    = 0;
  }

  // ─────────────────────────────────────────────────────────────────────────

  return Object.freeze({
    init:     init,
    getRoot:  getRoot,
    getMode:  getMode,
    isReady:  isReady,
    teardown: teardown
  });

})();

// ── src\index.js ──
// src/index.js — public entry point for haxball-ui-framework npm package




// Sub-modules for advanced users

global.HaxUI = HaxUI;
})(typeof window !== 'undefined' ? window : this);