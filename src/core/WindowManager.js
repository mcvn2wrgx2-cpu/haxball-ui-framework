// ─────────────────────────────────────────────────────────────────────────────
// core/WindowManager.js
//
// Window registry, lifecycle orchestration, and z-index stack manager.
//
// RESPONSIBILITIES:
//   1. Maintain a Map<id, Window> as the single source of truth for all
//      active windows.
//   2. Validate and delegate window creation to Window.create().
//   3. Assign and manage z-index values across the window stack.
//   4. Expose a WindowHandle to callers — never the Window instance itself.
//   5. Re-mount all active windows after a RootMount re-anchor event.
//   6. Orchestrate full teardown via destroyAll().
//
// Z-INDEX STRATEGY:
//   Every window is assigned BASE_Z_INDEX + _zCounter on creation.
//   _zCounter increments on each create() and each bringToFront() call.
//   When _zCounter reaches Z_STACK_LIMIT it resets to 1 — all windows
//   retain their relative order but the absolute values compress back down.
//   This prevents z-index from growing unbounded in long sessions.
//
// WINDOWHANDLE CONTRACT:
//   WindowHandle is a frozen plain object returned to the caller.
//   It holds no direct DOM reference — only the window id and closures
//   that delegate to WindowManager. This means:
//     - Internal Window instances can be replaced (e.g. on remount)
//       without invalidating existing handles.
//     - A destroyed handle becomes inert via the _destroyed flag —
//       all method calls are silent no-ops that never throw.
//
// INTERNAL USE:
//   Instantiated and owned by HaxUI.
//   Receives RootMount via init() — does not import it directly.
//   Not part of the public HaxUI API.
// ─────────────────────────────────────────────────────────────────────────────

var WindowManager = (function () {

  // ─── Internal state ───────────────────────────────────────────────────────

  var _windows  = new Map();   // Map<id: string, window: Window instance>
  var _zCounter = 0;           // Incremented on create and bringToFront
  var _baseZ    = HaxUIConfig.BASE_Z_INDEX;
  var _rootMount = null;       // RootMount reference, set by init()

  // ─── Z-index helpers ──────────────────────────────────────────────────────

  /**
   * Returns the next z-index value and advances the counter.
   * Resets when Z_STACK_LIMIT is reached to prevent unbounded growth.
   *
   * @returns {number}
   */
  function _nextZ() {
    _zCounter++;
    if (_zCounter > HaxUIConfig.Z_STACK_LIMIT) {
      _zCounter = 1;
    }
    return _baseZ + _zCounter;
  }

  // ─── WindowHandle factory ─────────────────────────────────────────────────

  /**
   * Creates a WindowHandle — the object returned to API callers.
   *
   * WindowHandle is a thin proxy over WindowManager operations.
   * It never exposes the Window instance or any DOM reference directly.
   * All methods check _destroyed before delegating, making post-destroy
   * calls safe to call from game event handlers without try/catch.
   *
   * @param  {string} windowId
   * @returns {Object} frozen WindowHandle
   */
  function _createHandle(windowId) {
    var _destroyed = false;

    function _guard() {
      return _destroyed;
    }

    return Object.freeze({

      /**
       * The window's unique identifier. Readonly.
       * @type {string}
       */
      id: windowId,

      /**
       * Replaces the window's content.
       * No-op if the window has been destroyed.
       *
       * @param {string|Node} content
       */
      setContent: function (content) {
        if (_guard()) return;
        var win = _windows.get(windowId);
        if (win) win.setContent(content);
      },

      /**
       * Makes the window visible.
       * No-op if the window has been destroyed.
       */
      show: function () {
        if (_guard()) return;
        var win = _windows.get(windowId);
        if (win) win.show();
      },

      /**
       * Hides the window without destroying it.
       * No-op if the window has been destroyed.
       */
      hide: function () {
        if (_guard()) return;
        var win = _windows.get(windowId);
        if (win) win.hide();
      },

      /**
       * Hides the window's header bar. (v1)
       * No-op if destroyed.
       */
      hideTitle: function () {
        if (_guard()) return;
        var win = _windows.get(windowId);
        if (win) win.hideTitle();
      },

      /**
       * Shows the window's header bar. (v1)
       * No-op if destroyed.
       */
      showTitle: function () {
        if (_guard()) return;
        var win = _windows.get(windowId);
        if (win) win.showTitle();
      },

      /**
       * Destroys the window and invalidates this handle.
       * Idempotent — safe to call multiple times.
       */
      destroy: function () {
        if (_guard()) return;
        _destroyed = true;
        destroy(windowId);
      },

      /**
       * Internal marker used by the framework to flag this handle as
       * destroyed when destroyWindow() is called externally (via HaxUI.destroyWindow()).
       * Not part of the public contract — set directly by destroy().
       *
       * @internal
       */
      _invalidate: function () {
        _destroyed = true;
      }
    });
  }

  // ─── Core operations ──────────────────────────────────────────────────────

  /**
   * Initializes WindowManager with a RootMount reference.
   * Must be called before create().
   *
   * @param {Object} rootMount  - RootMount instance
   * @param {number} [baseZ]    - Override for BASE_Z_INDEX (from HaxUI.init config)
   */
  function init(rootMount, baseZ) {
    _rootMount = rootMount;
    if (typeof baseZ === 'number' && baseZ > 0) {
      _baseZ = baseZ;
    }
  }

  /**
   * Creates a new window, mounts it, and returns a WindowHandle.
   *
   * @param  {Object} config  - createWindow() config (id, title, w, h, x, y, content)
   * @returns {Object} WindowHandle
   * @throws {Error} if config.id is missing or already registered
   */
  function create(config) {
    if (!config || !config.id) {
      throw new Error('[HaxUI] WindowManager.create: config.id is required');
    }

    if (_windows.has(config.id)) {
      throw new Error('[HaxUI] WindowManager.create: window "' + config.id + '" already exists');
    }

    if (!_rootMount || !_rootMount.isReady()) {
      throw new Error('[HaxUI] WindowManager.create: RootMount is not ready — call HaxUI.init() first');
    }

    var root = _rootMount.getRoot();
    var mode = _rootMount.getMode();

    var win = Window.create(config, root, mode, bringToFront);
    win.mount();

    var z = _nextZ();
    win.setZ(z);

    _windows.set(config.id, win);

    return _createHandle(config.id);
  }

  /**
   * Returns the WindowHandle for an existing window, or null if not found.
   * Never throws — safe to use directly in game event callbacks.
   *
   * @param  {string} id
   * @returns {Object|null} WindowHandle or null
   */
  function get(id) {
    if (!id || !_windows.has(id)) return null;
    return _createHandle(id);
  }

  /**
   * Destroys a window by id.
   * Removes it from the registry and cleans up its DOM and listeners.
   * No-op if the id is not found.
   *
   * @param {string} id
   */
  function destroy(id) {
    var win = _windows.get(id);
    if (!win) return;

    win.destroy();
    _windows.delete(id);
  }

  /**
   * Destroys all registered windows.
   * Called by HaxUI.destroyAll() and on full framework teardown.
   */
  function destroyAll() {
    _windows.forEach(function (win) {
      win.destroy();
    });
    _windows.clear();
    _zCounter = 0;
  }

  /**
   * Brings a window to the front of the z-index stack.
   * Called by EventGuard via the onFocus callback when a window receives focus.
   *
   * @param {string} id
   */
  function bringToFront(id) {
    var win = _windows.get(id);
    if (!win) return;
    win.setZ(_nextZ());
  }

  /**
   * Re-mounts all active windows into a freshly created #haxui-root.
   * Called by RootMount._reanchor() after a DOM purge event.
   *
   * @param {HTMLElement} newRoot - The new #haxui-root element
   */
  function remountAll(newRoot) {
    if (!newRoot) return;
    _windows.forEach(function (win) {
      win.remount(newRoot);
    });
  }

  /**
   * Returns the number of currently registered windows.
   * Useful for debugging and playground assertions.
   *
   * @returns {number}
   */
  function count() {
    return _windows.size;
  }

  // ─── Module public API ────────────────────────────────────────────────────

  return Object.freeze({
    init:         init,
    create:       create,
    get:          get,
    destroy:      destroy,
    destroyAll:   destroyAll,
    bringToFront: bringToFront,
    remountAll:   remountAll,
    count:        count
  });

})();
