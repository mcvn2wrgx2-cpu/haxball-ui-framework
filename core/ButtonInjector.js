// ─────────────────────────────────────────────────────────────────────────────
// core/ButtonInjector.js
//
// Injects styled buttons into the HaxBall UI. (v1)
//
// Buttons are positioned fixed over the HaxBall interface using the
// HaxBall theme values. They are anchored to #haxui-root so they survive
// DOM transitions alongside the rest of the framework.
//
// INTERNAL USE:
//   Managed by HaxUI.createButton() and HaxUI.destroyButton().
// ─────────────────────────────────────────────────────────────────────────────

var ButtonInjector = (function () {

  // Map<id, { element, registry }>
  var _buttons = new Map();

  /**
   * Creates and injects a button into the HaxBall UI.
   *
   * @param {Object}   config
   * @param {string}   config.id       - Unique button identifier
   * @param {string}   config.label    - Button text
   * @param {number}   config.x        - Left position in px
   * @param {number}   config.y        - Top position in px
   * @param {Function} config.onClick  - Click handler
   * @param {HTMLElement} root         - #haxui-root element
   * @returns {Object} button handle { id, destroy }
   */
  function create(config, root) {
    if (!config || !config.id) {
      throw new Error('[HaxUI] ButtonInjector.create: config.id is required');
    }
    if (_buttons.has(config.id)) {
      throw new Error('[HaxUI] ButtonInjector.create: button "' + config.id + '" already exists');
    }

    var t = HaxUIConfig.HAXBALL_THEME;

    var btn = document.createElement('button');
    btn.setAttribute(HaxUIConfig.BUTTON_ATTR, config.id);
    btn.id = HaxUIConfig.BUTTON_ID_PREFIX + config.id;
    btn.textContent = config.label || 'Button';

    btn.style.cssText = [
      'position: fixed',
      'left: '           + (config.x || 20) + 'px',
      'top: '            + (config.y || 20) + 'px',
      'background: '     + t.buttonBackground,
      'color: '          + t.buttonColor,
      'border: '         + t.buttonBorder,
      'border-radius: '  + t.buttonRadius,
      'font-family: '    + t.fontFamily,
      'font-size: 13px',
      'font-weight: 600',
      'padding: 6px 18px',
      'cursor: pointer',
      'pointer-events: auto',
      'z-index: '        + (HaxUIConfig.BASE_Z_INDEX + 200),
      'user-select: none',
      'min-width: 80px',
      'text-align: center',
    ].join('; ');

    // Hover effect
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

    root.appendChild(btn);
    _buttons.set(config.id, { element: btn });

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
      if (entry.element && entry.element.parentNode) {
        entry.element.parentNode.removeChild(entry.element);
      }
    });
    _buttons.clear();
  }

  /**
   * Re-mounts all buttons into a new root after DOM re-anchor.
   *
   * @param {HTMLElement} newRoot
   */
  function remountAll(newRoot) {
    _buttons.forEach(function (entry) {
      newRoot.appendChild(entry.element);
    });
  }

  return Object.freeze({
    create:     create,
    destroy:    destroy,
    destroyAll: destroyAll,
    remountAll: remountAll
  });

})();
