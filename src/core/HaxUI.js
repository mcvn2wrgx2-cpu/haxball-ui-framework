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
