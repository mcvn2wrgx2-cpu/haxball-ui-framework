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
