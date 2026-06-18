// ─────────────────────────────────────────────────────────────────────────────
// core/Window.js
//
// Individual window instance — the central unit of HaxUI.
//
// RESPONSIBILITIES:
//   1. Build the DOM structure for one window inside #haxui-root.
//   2. Attach a Shadow Root for CSS isolation (or apply namespace attrs
//      in NAMESPACE_MODE fallback).
//   3. Inject base styles via StyleManager.
//   4. Bind event isolation via EventGuard.
//   5. Expose mount(), setContent(), show(), hide(), destroy(), remount().
//
// DOM STRUCTURE (SHADOW_MODE):
//
//   <div data-haxui-window="id"                ← container (in #haxui-root)
//        style="position:fixed; ...">
//     #shadow-root
//       <style>...</style>                      ← base styles
//       <div data-haxui-window>                 ← chrome wrapper
//         <div data-haxui-header>               ← header bar
//           <span>Title</span>
//         </div>
//         <div data-haxui-content>              ← content area
//           ...user content...
//         </div>
//       </div>
//   </div>
//
// DOM STRUCTURE (NAMESPACE_MODE):
//
//   <div data-haxui-window="id"
//        style="position:fixed; ...">
//     <div data-haxui-header>
//       <span>Title</span>
//     </div>
//     <div data-haxui-content>
//       ...user content...
//     </div>
//   </div>
//
// LIFECYCLE:
//   new Window(config, root, mode, onFocus)
//     → mount()       — builds DOM, injects styles, binds events
//     → setContent()  — replaces content area contents
//     → show()/hide() — toggles visibility without destroying
//     → destroy()     — removes DOM, cleans all listeners, marks destroyed
//     → remount()     — re-builds DOM after RootMount re-anchor
//
// OWNERSHIP:
//   WindowManager owns all Window instances.
//   Window owns its EventRegistry and its DOM subtree.
//   WindowHandle is a thin proxy — it never holds a direct DOM reference.
//
// INTERNAL USE:
//   Instantiated exclusively by WindowManager.create().
//   Not part of the public HaxUI API.
// ─────────────────────────────────────────────────────────────────────────────

var Window = (function () {

  /**
   * Creates a new Window instance.
   *
   * @param {Object}      config           - createWindow() config object
   * @param {string}      config.id        - Unique window identifier
   * @param {string}      config.title     - Header title text
   * @param {number}      config.width     - Width in px
   * @param {number}      config.height    - Height in px
   * @param {number}      config.x         - Left offset in px
   * @param {number}      config.y         - Top offset in px
   * @param {string|Node} [config.content] - Initial content (optional)
   * @param {HTMLElement} root             - The #haxui-root element
   * @param {string}      mode             - HaxUIConfig.OPERATION_MODES value
   * @param {Function}    onFocus          - Called with (id) when window gains focus
   */
  function create(config, root, mode, onFocus) {

    // ─── Resolve config with defaults ─────────────────────────────────────

    var id     = config.id;
    var title  = config.title  || HaxUIConfig.WINDOW_DEFAULTS.title;
    var width  = config.width  || HaxUIConfig.WINDOW_DEFAULTS.width;
    var height = config.height || HaxUIConfig.WINDOW_DEFAULTS.height;
    var x      = (config.x !== undefined) ? config.x : HaxUIConfig.WINDOW_DEFAULTS.x;
    var y      = (config.y !== undefined) ? config.y : HaxUIConfig.WINDOW_DEFAULTS.y;

    // ─── Internal state ───────────────────────────────────────────────────

    var _container   = null;   // Outer <div> in #haxui-root
    var _shadowRoot  = null;   // ShadowRoot (SHADOW_MODE only)
    var _chrome      = null;   // Inner chrome wrapper <div>
    var _header      = null;   // Header bar element
    var _contentArea = null;   // Content area element
    var _registry    = EventRegistry.create();
    var _destroyed   = false;
    var _visible     = true;
    var _lastContent = null;   // Stored for remount after re-anchor

    // ─── DOM builders ─────────────────────────────────────────────────────

    /**
     * Creates the outer container element positioned in the viewport.
     * This is the element appended to #haxui-root.
     */
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

    /**
     * Creates the chrome wrapper, header, and content area elements.
     * Returns the chrome wrapper — caller decides where to attach it.
     *
     * @returns {HTMLElement} chrome wrapper
     */
    function _buildChrome() {
      // Chrome wrapper
      var chrome = document.createElement('div');
      chrome.setAttribute(HaxUIConfig.WINDOW_ATTR, '');
      chrome.style.cssText = 'display: flex; flex-direction: column; width: 100%; height: 100%;';

      // Header
      var header = document.createElement('div');
      header.setAttribute(HaxUIConfig.HEADER_ATTR, '');
      var titleSpan = document.createElement('span');
      titleSpan.textContent = title;
      header.appendChild(titleSpan);

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

    /**
     * Attaches a Shadow Root to the container and builds the DOM tree
     * inside it. Injects base styles into the shadow root.
     */
    function _mountShadow() {
      _shadowRoot = _container.attachShadow({ mode: 'open' });
      StyleManager.injectIntoShadow(_shadowRoot);
      _shadowRoot.appendChild(_buildChrome());
    }

    /**
     * Builds the DOM tree directly inside the container (no Shadow DOM).
     * StyleManager injects a single global <style> on first call.
     */
    function _mountNamespace() {
      StyleManager.injectIntoDocument();
      _container.appendChild(_buildChrome());
    }

    // ─── Content rendering ────────────────────────────────────────────────

    /**
     * Renders content into the content area.
     * Accepts a string (sanitized via DOMParser) or a Node (inserted directly).
     *
     * @param {string|Node} content
     */
    function _renderContent(content) {
      if (!_contentArea) return;

      // Clear current content
      while (_contentArea.firstChild) {
        _contentArea.removeChild(_contentArea.firstChild);
      }

      if (!content) return;

      if (typeof content === 'string') {
        // Sanitize strings through DOMParser — never assign raw HTML directly
        var fragment = Sanitize.fromString(content);
        _contentArea.appendChild(fragment);
      } else if (content && typeof content === 'object' && content.nodeType) {
        // DOM Node — caller is responsible for safety
        _contentArea.appendChild(content);
      } else {
        console.warn('[HaxUI] Window.setContent: unsupported content type for window "' + id + '"');
      }
    }

    // ─── Public instance methods ──────────────────────────────────────────

    /**
     * Builds and mounts the window DOM into #haxui-root.
     * Called once by WindowManager.create() after instantiation.
     */
    function mount() {
      if (!root) {
        console.error('[HaxUI] Window.mount: #haxui-root is not available for window "' + id + '"');
        return;
      }

      _buildContainer();

      if (mode === HaxUIConfig.OPERATION_MODES.SHADOW) {
        _mountShadow();
      } else {
        _mountNamespace();
      }

      // Bind event isolation
      EventGuard.bindTo(_container, _contentArea, id, _registry, onFocus);

      // Render initial content if provided
      if (config.content) {
        _renderContent(config.content);
        _lastContent = config.content;
      }

      root.appendChild(_container);
    }

    /**
     * Re-builds and re-mounts the window after RootMount re-anchors.
     * Preserves the last known content and visibility state.
     *
     * @param {HTMLElement} newRoot - The freshly created #haxui-root
     */
    function remount(newRoot) {
      if (_destroyed) return;

      // Clean up old registry entries — EventGuard will re-register
      _registry.removeAll();
      _registry = EventRegistry.create();

      root = newRoot;

      _buildContainer();

      if (mode === HaxUIConfig.OPERATION_MODES.SHADOW) {
        _mountShadow();
      } else {
        _mountNamespace();
      }

      EventGuard.bindTo(_container, _contentArea, id, _registry, onFocus);

      // Restore last content
      if (_lastContent) {
        _renderContent(_lastContent);
      }

      // Restore visibility
      if (!_visible) {
        _container.style.display = 'none';
      }

      root.appendChild(_container);
    }

    /**
     * Replaces the content area's contents.
     * No-op if the window has been destroyed.
     *
     * @param {string|Node} content
     */
    function setContent(content) {
      if (_destroyed) return;
      _renderContent(content);
      _lastContent = content;
    }

    /**
     * Makes the window visible.
     * No-op if the window has been destroyed.
     */
    function show() {
      if (_destroyed) return;
      _container.style.display = 'block';
      _visible = true;
    }

    /**
     * Hides the window without destroying it.
     * Content and registry are preserved.
     * No-op if the window has been destroyed.
     */
    function hide() {
      if (_destroyed) return;
      _container.style.display = 'none';
      _visible = false;
    }

    /**
     * Sets the window's z-index.
     * Called by WindowManager.bringToFront().
     *
     * @param {number} z
     */
    function setZ(z) {
      if (_destroyed || !_container) return;
      _container.style.zIndex = z;
    }

    /**
     * Destroys the window:
     *   1. Removes all event listeners via EventRegistry.
     *   2. Removes the container from the DOM.
     *   3. Nulls all internal references.
     *   4. Marks the instance as destroyed.
     *
     * Idempotent — safe to call multiple times.
     */
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

    /**
     * Returns true if this window has been destroyed.
     *
     * @returns {boolean}
     */
    function isDestroyed() {
      return _destroyed;
    }

    /**
     * Returns the window's unique identifier.
     *
     * @returns {string}
     */
    function getId() {
      return id;
    }

    // ─────────────────────────────────────────────────────────────────────

    return Object.freeze({
      mount:       mount,
      remount:     remount,
      setContent:  setContent,
      show:        show,
      hide:        hide,
      setZ:        setZ,
      destroy:     destroy,
      isDestroyed: isDestroyed,
      getId:       getId
    });
  }

  // ─── Module public API ────────────────────────────────────────────────────

  return Object.freeze({ create: create });

})();
