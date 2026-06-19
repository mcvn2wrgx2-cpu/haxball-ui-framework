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
      '  border: ' + t.buttonBorder + ';',
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
