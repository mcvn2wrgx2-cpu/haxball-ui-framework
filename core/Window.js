// ─────────────────────────────────────────────────────────────────────────────
// core/Window.js
//
// Individual window instance — the central unit of HaxUI.
//
// v1 CHANGES:
//   - config.theme     — 'default' | 'haxball' (default: 'default')
//   - config.draggable — enable drag & drop via DragManager (default: true)
//   - config.resizable — enable corner resize via ResizeManager (default: true)
//   - config.titleVisible — show/hide header on creation (default: true)
//   - hideTitle() / showTitle() added to instance API
//   - StyleManager calls now forward the theme
//   - DragManager and ResizeManager bound in mount() / remount()
//
// INTERNAL USE:
//   Instantiated exclusively by WindowManager.create().
//   Not part of the public HaxUI API.
// ─────────────────────────────────────────────────────────────────────────────

var Window = (function () {

  /**
   * Creates a new Window instance.
   *
   * @param {Object}      config
   * @param {string}      config.id
   * @param {string}      config.title
   * @param {number}      config.width
   * @param {number}      config.height
   * @param {number}      config.x
   * @param {number}      config.y
   * @param {string|Node} [config.content]
   * @param {string}      [config.theme]        - 'default' | 'haxball'
   * @param {boolean}     [config.draggable]    - default true
   * @param {boolean}     [config.resizable]    - default true
   * @param {boolean}     [config.titleVisible] - default true
   * @param {HTMLElement} root
   * @param {string}      mode
   * @param {Function}    onFocus
   */
  function create(config, root, mode, onFocus) {

    // ─── Resolve config ───────────────────────────────────────────────────

    var id           = config.id;
    var title        = config.title        || HaxUIConfig.WINDOW_DEFAULTS.title;
    var width        = config.width        || HaxUIConfig.WINDOW_DEFAULTS.width;
    var height       = config.height       || HaxUIConfig.WINDOW_DEFAULTS.height;
    var x            = (config.x !== undefined) ? config.x : HaxUIConfig.WINDOW_DEFAULTS.x;
    var y            = (config.y !== undefined) ? config.y : HaxUIConfig.WINDOW_DEFAULTS.y;
    var theme        = config.theme        || HaxUIConfig.THEMES.DEFAULT;
    var draggable    = config.draggable    !== false;   // default true
    var resizable    = config.resizable    !== false;   // default true
    var titleVisible = config.titleVisible !== false;   // default true

    // ─── Internal state ───────────────────────────────────────────────────

    var _container   = null;
    var _shadowRoot  = null;
    var _chrome      = null;
    var _header      = null;
    var _contentArea = null;
    var _registry    = EventRegistry.create();
    var _destroyed   = false;
    var _visible     = true;
    var _lastContent = null;

    // ─── DOM builders ─────────────────────────────────────────────────────

    function _buildContainer() {
      _container = document.createElement('div');
      _container.setAttribute(HaxUIConfig.WINDOW_ATTR, id);
      _container.style.cssText = [
        'position: fixed',
        'left: '   + x + 'px',
        'top: '    + y + 'px',
        'width: '  + width  + 'px',
        'height: ' + height + 'px',
        'pointer-events: auto',
        'display: block',
      ].join('; ');
    }

    function _buildChrome() {
      var chrome = document.createElement('div');
      chrome.setAttribute(HaxUIConfig.WINDOW_ATTR, '');
      chrome.style.cssText = 'display: flex; flex-direction: column; width: 100%; height: 100%;';

      // Header
      var header = document.createElement('div');
      header.setAttribute(HaxUIConfig.HEADER_ATTR, '');
      header.style.cssText = 'display: flex; align-items: center; justify-content: space-between;';

      var titleSpan = document.createElement('span');
      titleSpan.textContent = title;
      header.appendChild(titleSpan);

      // Drag indicator (v1.1) — small icon showing whether the window
      // can be moved or is fixed in place. Purely informational, no
      // click behavior of its own.
      var dragIndicator = document.createElement('span');
      dragIndicator.setAttribute('data-haxui-drag-indicator', '');
      dragIndicator.textContent = draggable ? '✛' : '📌';
      dragIndicator.title       = draggable ? 'Draggable' : 'Static';
      dragIndicator.style.cssText = [
        'all: unset',
        'font-size: 11px',
        'opacity: 0.5',
        'margin-left: 8px',
        'cursor: ' + (draggable ? 'grab' : 'default'),
        'user-select: none',
      ].join('; ');
      header.appendChild(dragIndicator);

      // Hide header if titleVisible is false
      if (!titleVisible) {
        header.style.display = 'none';
      }

      // Content area
      var content = document.createElement('div');
      content.setAttribute(HaxUIConfig.CONTENT_ATTR, '');
      content.style.cssText = 'flex: 1; overflow-y: auto; overflow-x: hidden;';

      chrome.appendChild(header);
      chrome.appendChild(content);

      _chrome      = chrome;
      _header      = header;
      _contentArea = content;

      return chrome;
    }

    function _mountShadow() {
      _shadowRoot = _container.attachShadow({ mode: 'open' });
      StyleManager.injectIntoShadow(_shadowRoot, theme);
      _shadowRoot.appendChild(_buildChrome());
    }

    function _mountNamespace() {
      StyleManager.injectIntoDocument(theme);
      _container.appendChild(_buildChrome());
    }

    function _bindInteractions() {
      EventGuard.bindTo(_container, _contentArea, id, _registry, onFocus);
      if (draggable)  DragManager.enable(_container, _header, _registry);
      if (resizable)  ResizeManager.enable(_container, _registry);
    }

    // ─── Content rendering ────────────────────────────────────────────────

    function _renderContent(content) {
      if (!_contentArea) return;

      while (_contentArea.firstChild) {
        _contentArea.removeChild(_contentArea.firstChild);
      }

      if (!content) return;

      if (typeof content === 'string') {
        var fragment = Sanitize.fromString(content);
        _contentArea.appendChild(fragment);
      } else if (content && typeof content === 'object' && content.nodeType) {
        _contentArea.appendChild(content);
      } else {
        console.warn('[HaxUI] Window.setContent: unsupported content type for window "' + id + '"');
      }
    }

    // ─── Public instance methods ──────────────────────────────────────────

    function mount() {
      if (!root) {
        console.error('[HaxUI] Window.mount: #haxui-root not available for window "' + id + '"');
        return;
      }

      _buildContainer();

      if (mode === HaxUIConfig.OPERATION_MODES.SHADOW) {
        _mountShadow();
      } else {
        _mountNamespace();
      }

      _bindInteractions();

      if (config.content) {
        _renderContent(config.content);
        _lastContent = config.content;
      }

      root.appendChild(_container);
    }

    function remount(newRoot) {
      if (_destroyed) return;

      _registry.removeAll();
      _registry = EventRegistry.create();

      root = newRoot;

      _buildContainer();

      if (mode === HaxUIConfig.OPERATION_MODES.SHADOW) {
        _mountShadow();
      } else {
        _mountNamespace();
      }

      _bindInteractions();

      if (_lastContent) _renderContent(_lastContent);
      if (!_visible)    _container.style.display = 'none';

      root.appendChild(_container);
    }

    function setContent(content) {
      if (_destroyed) return;
      _renderContent(content);
      _lastContent = content;
    }

    function show() {
      if (_destroyed) return;
      _container.style.display = 'block';
      _visible = true;
    }

    function hide() {
      if (_destroyed) return;
      _container.style.display = 'none';
      _visible = false;
    }

    /**
     * Hides the header bar. Content area expands to fill the full height.
     * No-op if already hidden or window is destroyed.
     */
    function hideTitle() {
      if (_destroyed || !_header) return;
      _header.style.display = 'none';
    }

    /**
     * Shows the header bar.
     * No-op if already visible or window is destroyed.
     */
    function showTitle() {
      if (_destroyed || !_header) return;
      _header.style.display = '';
    }

    function setZ(z) {
      if (_destroyed || !_container) return;
      _container.style.zIndex = z;
    }

    function destroy() {
      if (_destroyed) return;

      _registry.removeAll();

      if (_container && _container.parentNode) {
        _container.parentNode.removeChild(_container);
      }

      _container   = null;
      _shadowRoot  = null;
      _chrome      = null;
      _header      = null;
      _contentArea = null;
      _lastContent = null;
      _destroyed   = true;
    }

    function isDestroyed() { return _destroyed; }
    function getId()       { return id; }

    // ─────────────────────────────────────────────────────────────────────

    return Object.freeze({
      mount:       mount,
      remount:     remount,
      setContent:  setContent,
      show:        show,
      hide:        hide,
      hideTitle:   hideTitle,
      showTitle:   showTitle,
      setZ:        setZ,
      destroy:     destroy,
      isDestroyed: isDestroyed,
      getId:       getId
    });
  }

  return Object.freeze({ create: create });

})();
