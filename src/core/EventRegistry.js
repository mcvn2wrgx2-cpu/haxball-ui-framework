// ─────────────────────────────────────────────────────────────────────────────
// core/EventRegistry.js
//
// Listener registry for clean Window destruction.
//
// PROBLEM:
//   Event listeners attached during Window.mount() must be removed when the
//   window is destroyed. Forgetting even one listener causes a memory leak
//   that compounds over long HaxBall sessions (tournaments, practice rooms).
//
// SOLUTION:
//   Every addEventListener call inside the framework goes through
//   EventRegistry.add() instead of being called directly. The registry keeps
//   a flat list of { target, type, handler, options } entries. When
//   Window.destroy() fires, a single EventRegistry.removeAll() call cleans
//   up every listener that was registered for that window.
//
// OWNERSHIP:
//   Each Window instance owns exactly one EventRegistry.
//   EventGuard receives the registry and routes its calls through it.
//   No other module holds a reference to a window's registry.
//
// INTERNAL USE:
//   Not part of the public HaxUI API.
// ─────────────────────────────────────────────────────────────────────────────

var EventRegistry = (function () {

  /**
   * Creates a new EventRegistry instance.
   * Each Window gets its own registry at construction time.
   *
   * @returns {Object} EventRegistry instance
   */
  function create() {

    // Flat list of registered listener entries.
    // Each entry: { target, type, handler, options }
    var _entries = [];

    // Tracks whether removeAll() has already been called.
    // Guards against double-cleanup in edge cases.
    var _cleared = false;

    // ─── Public methods ───────────────────────────────────────────────────

    /**
     * Registers an event listener and records it for later removal.
     * Equivalent to target.addEventListener(type, handler, options)
     * but tracked by this registry.
     *
     * @param {EventTarget} target   - The DOM node to attach the listener to
     * @param {string}      type     - Event type ('click', 'keydown', etc.)
     * @param {Function}    handler  - The listener function
     * @param {Object|boolean} [options] - addEventListener options (optional)
     */
    function add(target, type, handler, options) {
      if (_cleared) return;

      if (!target || typeof target.addEventListener !== 'function') {
        console.warn('[HaxUI] EventRegistry.add: invalid target for event "' + type + '"');
        return;
      }

      if (typeof handler !== 'function') {
        console.warn('[HaxUI] EventRegistry.add: handler for "' + type + '" is not a function');
        return;
      }

      target.addEventListener(type, handler, options || false);

      _entries.push({
        target:  target,
        type:    type,
        handler: handler,
        options: options || false
      });
    }

    /**
     * Removes all registered listeners and clears the entry list.
     * Safe to call multiple times — subsequent calls are no-ops.
     */
    function removeAll() {
      if (_cleared) return;

      for (var i = 0; i < _entries.length; i++) {
        var e = _entries[i];
        try {
          e.target.removeEventListener(e.type, e.handler, e.options);
        } catch (err) {
          // Target may have been removed from the DOM already.
          // Log and continue — never block the cleanup loop.
          console.warn('[HaxUI] EventRegistry.removeAll: could not remove listener "' + e.type + '"', err);
        }
      }

      _entries = [];
      _cleared = true;
    }

    /**
     * Returns the number of currently registered listeners.
     * Useful for debugging and playground assertions.
     *
     * @returns {number}
     */
    function size() {
      return _entries.length;
    }

    /**
     * Returns a read-only snapshot of current entries.
     * Intended for debugging only — do not mutate the returned array.
     *
     * @returns {Array}
     */
    function snapshot() {
      return _entries.map(function (e) {
        return { target: e.target, type: e.type, options: e.options };
        // handler is intentionally omitted from the snapshot
      });
    }

    // ─────────────────────────────────────────────────────────────────────

    return Object.freeze({
      add:        add,
      removeAll:  removeAll,
      size:       size,
      snapshot:   snapshot
    });
  }

  // ─── Module public API ────────────────────────────────────────────────────

  return Object.freeze({ create: create });

})();
