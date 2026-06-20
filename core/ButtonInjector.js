// ─────────────────────────────────────────────────────────────────────────────
// core/ButtonInjector.js
//
// Injects buttons into HaxBall's native .header-btns container. (v1.1)
//
// ROOT CAUSE OF THE "appears in a random place" BUG:
//   The original implementation tried .header-btns ONCE at call time and
//   relied on a single MutationObserver to catch it later if missing. In
//   practice the timing window between "script runs" and "HaxBall mounts
//   .header-btns" is unpredictable — sometimes the observer's callback
//   fires on an unrelated mutation before .header-btns exists, sometimes
//   it never fires cleanly. The button silently stayed in fallback mode
//   even when .header-btns existed moments later.
//
// FIX:
//   Same retry-polling pattern used by RootMount for canvas detection.
//   create() polls for .header-btns every BUTTON_RETRY_INTERVAL ms, up to
//   BUTTON_RETRY_LIMIT times. The button is rendered immediately in
//   fallback position so it's never invisible, and is MOVED into
//   .header-btns the moment polling finds it — typically within one tick.
//
// onOpenWindow (NEW):
//   config.onOpenWindow lets a button open a HaxUI window directly without
//   the caller wiring its own onClick + createWindow boilerplate:
//
//     HaxUI.createButton({
//       id: 'stats-btn',
//       label: '📊 Stats',
//       onOpenWindow: { id: 'stats', title: 'Stats', content: '...' }
//     });
//
//   Clicking the button creates the window if it doesn't exist yet, or
//   toggles show()/hide() if it does — so repeated clicks don't throw on
//   duplicate id.
// ─────────────────────────────────────────────────────────────────────────────

var ButtonInjector = (function () {

  // Map<id, { element, pollTimer }>
  var _buttons = new Map();

  var HEADER_BTN_SELECTOR = '.header-btns';

  /**
   * Returns the native HaxBall button container, or null if not found.
   * @returns {HTMLElement|null}
   */
  function _getHeaderBtns() {
    return document.querySelector(HEADER_BTN_SELECTOR);
  }

  /**
   * Builds the button DOM element.
   * @param {Object} config
   * @returns {HTMLElement}
   */
  function _buildButton(config) {
    var t = HaxUIConfig.HAXBALL_THEME;

    var btn = document.createElement('button');
    btn.setAttribute(HaxUIConfig.BUTTON_ATTR, config.id);
    btn.textContent = config.label || 'Button';

    btn.style.cssText = [
      'background: '    + t.buttonBackground,
      'color: '          + t.buttonColor,
      'border: 0',
      'border-radius: '  + t.buttonRadius,
      'font-family: '    + t.fontFamily,
      'font-size: 13px',
      'font-weight: 600',
      'padding: 4px 12px',
      'cursor: pointer',
      'margin-left: 4px',
    ].join('; ');

    btn.addEventListener('mouseover', function () {
      btn.style.background = 'rgb(46, 93, 133)';
    });
    btn.addEventListener('mouseout', function () {
      btn.style.background = t.buttonBackground;
    });
    btn.addEventListener('mousedown', function (e) {
      e.stopPropagation();
    });

    // onOpenWindow: clicking opens (or toggles) a HaxUI window
    if (config.onOpenWindow) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var winConfig = config.onOpenWindow;
        var existing  = window.HaxUI ? window.HaxUI.getWindow(winConfig.id) : null;

        if (existing) {
          existing.show();
        } else if (window.HaxUI) {
          window.HaxUI.createWindow(winConfig);
        }

        if (typeof config.onClick === 'function') config.onClick(e);
      });
    } else if (typeof config.onClick === 'function') {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        config.onClick(e);
      });
    }

    return btn;
  }

  /**
   * Places the button in fallback position (fixed overlay) so it is
   * always visible immediately, even before .header-btns is found.
   *
   * @param {HTMLElement} btn
   * @param {Object}      config
   * @param {HTMLElement} root
   */
  function _placeFallback(btn, config, root) {
    btn.style.position = 'fixed';
    btn.style.left     = (config.x !== undefined ? config.x : 20) + 'px';
    btn.style.top      = (config.y !== undefined ? config.y : 20) + 'px';
    btn.style.zIndex   = String(HaxUIConfig.BASE_Z_INDEX + 200);
    root.appendChild(btn);
  }

  /**
   * Moves the button from its current parent into .header-btns,
   * clearing the fallback fixed-position styles.
   *
   * @param {HTMLElement} btn
   * @param {HTMLElement} target
   */
  function _moveIntoHeader(btn, target) {
    if (btn.parentNode) btn.parentNode.removeChild(btn);
    btn.style.position = '';
    btn.style.left     = '';
    btn.style.top      = '';
    btn.style.zIndex   = '';
    target.appendChild(btn);
  }

  /**
   * Polls for .header-btns and moves the button there once found.
   * Stops polling after BUTTON_RETRY_LIMIT attempts.
   *
   * @param {string}      id
   * @param {HTMLElement} btn
   */
  function _pollForHeader(id, btn) {
    var attempts = 0;

    var timer = setInterval(function () {
      attempts++;
      var target = _getHeaderBtns();

      if (target) {
        _moveIntoHeader(btn, target);
        clearInterval(timer);
        var entry = _buttons.get(id);
        if (entry) entry.pollTimer = null;
        return;
      }

      if (attempts >= HaxUIConfig.BUTTON_RETRY_LIMIT) {
        clearInterval(timer);
        console.warn(
          '[HaxUI] ButtonInjector: .header-btns not found after ' +
          HaxUIConfig.BUTTON_RETRY_LIMIT + ' attempts. Button "' + id +
          '" stays in fallback position.'
        );
        var entry2 = _buttons.get(id);
        if (entry2) entry2.pollTimer = null;
      }
    }, HaxUIConfig.BUTTON_RETRY_INTERVAL);

    return timer;
  }

  /**
   * Injects the button: tries .header-btns immediately, and if not found,
   * shows it in fallback position while polling for the real container.
   *
   * @param {HTMLElement} btn
   * @param {Object}      config
   * @param {HTMLElement} root
   */
  function _inject(btn, config, root) {
    var headerBtns = _getHeaderBtns();

    if (headerBtns) {
      headerBtns.appendChild(btn);
      _buttons.set(config.id, { element: btn, pollTimer: null });
      return;
    }

    // Not found yet — show in fallback position immediately, then poll
    _placeFallback(btn, config, root);
    var timer = _pollForHeader(config.id, btn);
    _buttons.set(config.id, { element: btn, pollTimer: timer });
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /**
   * Creates and injects a button into the HaxBall UI.
   *
   * @param {Object}      config
   * @param {string}      config.id           - Unique identifier (required)
   * @param {string}      config.label        - Button text
   * @param {number}      [config.x]          - Fallback left position in px
   * @param {number}      [config.y]          - Fallback top position in px
   * @param {Function}    [config.onClick]    - Click handler
   * @param {Object}      [config.onOpenWindow] - createWindow() config — opens/shows this window on click
   * @param {HTMLElement} root                - #haxui-root (fallback mount point)
   * @returns {Object} handle { id, destroy }
   */
  function create(config, root) {
    if (!config || !config.id) {
      throw new Error('[HaxUI] ButtonInjector.create: config.id is required');
    }
    if (_buttons.has(config.id)) {
      throw new Error('[HaxUI] ButtonInjector.create: button "' + config.id + '" already exists');
    }

    var btn = _buildButton(config);
    _inject(btn, config, root);

    return Object.freeze({
      id: config.id,
      destroy: function () { destroy(config.id); }
    });
  }

  /**
   * Removes a button from the DOM, stops any pending poll, and clears the registry.
   * @param {string} id
   */
  function destroy(id) {
    var entry = _buttons.get(id);
    if (!entry) return;

    if (entry.pollTimer) clearInterval(entry.pollTimer);
    if (entry.element && entry.element.parentNode) {
      entry.element.parentNode.removeChild(entry.element);
    }

    _buttons.delete(id);
  }

  /**
   * Destroys all injected buttons.
   */
  function destroyAll() {
    _buttons.forEach(function (entry) {
      if (entry.pollTimer) clearInterval(entry.pollTimer);
      if (entry.element && entry.element.parentNode) {
        entry.element.parentNode.removeChild(entry.element);
      }
    });
    _buttons.clear();
  }

  /**
   * Re-mounts fallback-positioned buttons after DOM re-anchor.
   * Buttons already living inside .header-btns are untouched —
   * HaxBall owns that container's lifecycle.
   *
   * @param {HTMLElement} newRoot
   */
  function remountAll(newRoot) {
    _buttons.forEach(function (entry) {
      var insideHeader = entry.element.closest && entry.element.closest(HEADER_BTN_SELECTOR);
      if (!insideHeader && entry.element && !entry.element.parentNode) {
        newRoot.appendChild(entry.element);
      }
    });
  }

  return Object.freeze({
    create:     create,
    destroy:    destroy,
    destroyAll: destroyAll,
    remountAll: remountAll
  });

})();
