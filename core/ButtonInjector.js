// ─────────────────────────────────────────────────────────────────────────────
// core/ButtonInjector.js
//
// Injects buttons into HaxBall's native .header-btns container. (v1)
//
// The .header-btns element holds the native Rec, Link, and Leave buttons.
// We inject our buttons there so they appear inline with the native ones.
//
// FALLBACK:
//   If .header-btns is not found (game not in a room yet), the button is
//   injected into #haxui-root as a fixed overlay instead, and a
//   MutationObserver watches for .header-btns to appear so it can
//   re-inject correctly.
//
// STYLE:
//   Matches HaxBall's native button style exactly:
//   - No border (border: 0)
//   - background: rgb(36, 73, 103)
//   - color: rgb(255, 255, 255)
//   - font: "Open Sans"
// ─────────────────────────────────────────────────────────────────────────────

var ButtonInjector = (function () {

  // Map<id, { element, observer }>
  var _buttons = new Map();

  // Selector for HaxBall's native button bar
  var HEADER_BTN_SELECTOR = '.header-btns';

  /**
   * Returns the native HaxBall button container, or null if not found.
   *
   * @returns {HTMLElement|null}
   */
  function _getHeaderBtns() {
    return document.querySelector(HEADER_BTN_SELECTOR);
  }

  /**
   * Builds the button DOM element.
   *
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
      'color: '         + t.buttonColor,
      'border: 0',
      'border-radius: ' + t.buttonRadius,
      'font-family: '   + t.fontFamily,
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

    if (typeof config.onClick === 'function') {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        config.onClick(e);
      });
    }

    return btn;
  }

  /**
   * Injects the button into .header-btns or falls back to #haxui-root.
   * If falling back, installs a MutationObserver to re-inject when
   * .header-btns becomes available.
   *
   * @param {HTMLElement} btn    - The button element
   * @param {string}      id     - Button id (for registry)
   * @param {HTMLElement} root   - #haxui-root fallback
   */
  function _inject(btn, id, root) {
    var headerBtns = _getHeaderBtns();

    if (headerBtns) {
      // Inject inline with native HaxBall buttons
      headerBtns.appendChild(btn);
      _buttons.set(id, { element: btn, observer: null });
      return;
    }

    // Fallback: fixed position over the UI
    btn.style.cssText += '; position: fixed; left: 20px; top: 20px; z-index: ' + (HaxUIConfig.BASE_Z_INDEX + 200);
    root.appendChild(btn);

    // Watch for .header-btns to appear and re-inject
    var observer = new MutationObserver(function () {
      var target = _getHeaderBtns();
      if (!target) return;

      // Move from fallback root to the real container
      if (btn.parentNode) btn.parentNode.removeChild(btn);
      btn.style.position = '';
      btn.style.left     = '';
      btn.style.top      = '';
      btn.style.zIndex   = '';
      target.appendChild(btn);

      observer.disconnect();
      var entry = _buttons.get(id);
      if (entry) entry.observer = null;
    });

    observer.observe(document.body, { childList: true, subtree: true });
    _buttons.set(id, { element: btn, observer: observer });
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /**
   * Creates and injects a button into the HaxBall UI.
   *
   * @param {Object}      config
   * @param {string}      config.id       - Unique identifier (required)
   * @param {string}      config.label    - Button text
   * @param {Function}    config.onClick  - Click handler
   * @param {HTMLElement} root            - #haxui-root (fallback mount point)
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
    _inject(btn, config.id, root);

    return Object.freeze({
      id: config.id,
      destroy: function () { destroy(config.id); }
    });
  }

  /**
   * Removes a button from the DOM and the registry.
   *
   * @param {string} id
   */
  function destroy(id) {
    var entry = _buttons.get(id);
    if (!entry) return;

    if (entry.observer) entry.observer.disconnect();
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
      if (entry.observer) entry.observer.disconnect();
      if (entry.element && entry.element.parentNode) {
        entry.element.parentNode.removeChild(entry.element);
      }
    });
    _buttons.clear();
  }

  /**
   * Re-mounts all buttons after DOM re-anchor.
   * Only re-mounts buttons that were in fallback mode.
   *
   * @param {HTMLElement} newRoot
   */
  function remountAll(newRoot) {
    _buttons.forEach(function (entry) {
      if (entry.element && !entry.element.parentNode) {
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
