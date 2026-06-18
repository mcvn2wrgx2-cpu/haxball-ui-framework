// ─────────────────────────────────────────────────────────────────────────────
// core/StyleManager.js
//
// Base style injection for HaxUI windows.
//
// PROBLEM:
//   HaxBall's global CSS bleeds into any element added to the DOM.
//   Fonts, colors, box-sizing, margins, and z-index can all be inherited
//   or overridden by the host page's stylesheet in unexpected ways.
//
// SOLUTION:
//   StyleManager injects a <style> block into each window's Shadow Root
//   (SHADOW_MODE) or into document.head once (NAMESPACE_MODE fallback).
//
//   In SHADOW_MODE:
//     Styles are scoped to the shadow tree — zero bleed in or out.
//     Each window gets its own <style> injected into its shadow root.
//
//   In NAMESPACE_MODE:
//     Styles are scoped with the attribute selector
//     [data-haxui-window] to limit their reach within the real DOM.
//     A single <style> is injected into document.head on first call.
//
// PHILOSOPHY:
//   The base styles in v0 are intentionally minimal — just enough to make
//   windows functional and visually coherent without imposing a design.
//   Theming and custom styles are the caller's responsibility.
//
// INTERNAL USE:
//   Called once per window by Window.mount().
//   Not part of the public HaxUI API.
// ─────────────────────────────────────────────────────────────────────────────

var StyleManager = (function () {

  // Tracks whether the NAMESPACE_MODE global style has been injected.
  // In SHADOW_MODE this flag is unused — each shadow root is independent.
  var _namespaceStyleInjected = false;

  // ─── Style definitions ────────────────────────────────────────────────────

  /**
   * Base styles injected into every Shadow Root (SHADOW_MODE).
   * Uses :host to reset the window container itself, then scopes
   * internal elements with [data-haxui-*] attribute selectors.
   *
   * @returns {string} CSS string
   */
  function _shadowStyles() {
    return [
      /* Reset the shadow host (the window container element) */
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

      /* Window chrome wrapper */
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

      /* Header bar */
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

      /* Header title text */
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

      /* Content area */
      '[data-haxui-content] {',
      '  all: unset;',
      '  display: block;',
      '  flex: 1;',
      '  padding: 10px;',
      '  overflow-y: auto;',
      '  overflow-x: hidden;',
      '  box-sizing: border-box;',
      '  line-height: 1.5;',
      '}',

      /* Scrollbar styling — WebKit only, graceful degradation elsewhere */
      '[data-haxui-content]::-webkit-scrollbar {',
      '  width: 4px;',
      '}',
      '[data-haxui-content]::-webkit-scrollbar-track {',
      '  background: transparent;',
      '}',
      '[data-haxui-content]::-webkit-scrollbar-thumb {',
      '  background: rgba(255,255,255,0.15);',
      '  border-radius: 2px;',
      '}',

      /* Generic content elements — reset inherited HaxBall styles */
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

      /* Headings */
      '[data-haxui-content] h1,',
      '[data-haxui-content] h2,',
      '[data-haxui-content] h3,',
      '[data-haxui-content] h4,',
      '[data-haxui-content] h5,',
      '[data-haxui-content] h6 {',
      '  all: unset;',
      '  display: block;',
      '  font-weight: 700;',
      '  color: #e2e8f0;',
      '  margin-bottom: 4px;',
      '}',

      /* Tables */
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
      '  color: #cbd5e0;',
      '}',
      '[data-haxui-content] th {',
      '  color: #a0aec0;',
      '  font-weight: 600;',
      '  font-size: 11px;',
      '  letter-spacing: 0.04em;',
      '}',

      /* Inputs */
      '[data-haxui-content] input,',
      '[data-haxui-content] textarea,',
      '[data-haxui-content] select {',
      '  all: unset;',
      '  display: inline-block;',
      '  box-sizing: border-box;',
      '  background: rgba(255,255,255,0.06);',
      '  border: 1px solid rgba(255,255,255,0.12);',
      '  border-radius: 3px;',
      '  padding: 3px 6px;',
      '  color: #e2e8f0;',
      '  font-size: 12px;',
      '  width: 100%;',
      '}',
      '[data-haxui-content] input:focus,',
      '[data-haxui-content] textarea:focus,',
      '[data-haxui-content] select:focus {',
      '  outline: 1px solid rgba(99,179,237,0.5);',
      '}',

      /* Buttons */
      '[data-haxui-content] button {',
      '  all: unset;',
      '  display: inline-block;',
      '  box-sizing: border-box;',
      '  background: rgba(99,179,237,0.15);',
      '  border: 1px solid rgba(99,179,237,0.3);',
      '  border-radius: 3px;',
      '  padding: 4px 10px;',
      '  color: #90cdf4;',
      '  font-size: 12px;',
      '  cursor: pointer;',
      '}',
      '[data-haxui-content] button:hover {',
      '  background: rgba(99,179,237,0.25);',
      '}',

      /* Code blocks */
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
      '}'
    ].join('\n');
  }

  /**
   * Styles for NAMESPACE_MODE — scoped with [data-haxui-window].
   * Injected once into document.head. Less isolated than Shadow DOM
   * but functional when attachShadow is unavailable.
   *
   * @returns {string} CSS string
   */
  function _namespaceStyles() {
    // Same rules as _shadowStyles() but with explicit attribute scope
    // instead of :host and shadow-tree selectors.
    var scope = '[data-haxui-window]';
    return [
      scope + ' {',
      '  all: initial;',
      '  display: block !important;',
      '  position: fixed !important;',
      '  box-sizing: border-box !important;',
      '  font-family: "Segoe UI", Arial, sans-serif !important;',
      '  font-size: 13px !important;',
      '  color: #e8e8e8 !important;',
      '  border-radius: 6px !important;',
      '  overflow: hidden !important;',
      '  background: #1a1a2e !important;',
      '  border: 1px solid rgba(255,255,255,0.08) !important;',
      '  box-shadow: 0 4px 24px rgba(0,0,0,0.55), 0 1px 4px rgba(0,0,0,0.4) !important;',
      '}',

      scope + ' [data-haxui-header] {',
      '  display: flex !important;',
      '  align-items: center !important;',
      '  padding: 0 10px !important;',
      '  height: 32px !important;',
      '  background: #16213e !important;',
      '  border-bottom: 1px solid rgba(255,255,255,0.07) !important;',
      '  cursor: default !important;',
      '  user-select: none !important;',
      '  box-sizing: border-box !important;',
      '}',

      scope + ' [data-haxui-header] span {',
      '  font-size: 12px !important;',
      '  font-weight: 600 !important;',
      '  color: #a0aec0 !important;',
      '  overflow: hidden !important;',
      '  white-space: nowrap !important;',
      '  text-overflow: ellipsis !important;',
      '}',

      scope + ' [data-haxui-content] {',
      '  display: block !important;',
      '  padding: 10px !important;',
      '  overflow-y: auto !important;',
      '  overflow-x: hidden !important;',
      '  box-sizing: border-box !important;',
      '  line-height: 1.5 !important;',
      '  color: #e8e8e8 !important;',
      '}'
    ].join('\n');
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /**
   * Injects base styles into a Shadow Root (SHADOW_MODE).
   * Creates a <style> element and appends it to the given shadow root.
   * Safe to call once per window — each shadow root is independent.
   *
   * @param {ShadowRoot} shadowRoot
   */
  function injectIntoShadow(shadowRoot) {
    if (!shadowRoot) {
      console.warn('[HaxUI] StyleManager.injectIntoShadow: shadowRoot is null');
      return;
    }
    var style       = document.createElement('style');
    style.textContent = _shadowStyles();
    shadowRoot.appendChild(style);
  }

  /**
   * Injects base styles into document.head (NAMESPACE_MODE fallback).
   * Only injects once regardless of how many windows are created.
   */
  function injectIntoDocument() {
    if (_namespaceStyleInjected) return;

    var style       = document.createElement('style');
    style.id        = 'haxui-base-styles';
    style.textContent = _namespaceStyles();
    document.head.appendChild(style);
    _namespaceStyleInjected = true;
  }

  /**
   * Removes the NAMESPACE_MODE global style from document.head.
   * Called by RootMount during full framework teardown.
   * No-op in SHADOW_MODE — each shadow root is destroyed with its window.
   */
  function removeFromDocument() {
    var el = document.getElementById('haxui-base-styles');
    if (el) el.remove();
    _namespaceStyleInjected = false;
  }

  // ─────────────────────────────────────────────────────────────────────────

  return Object.freeze({
    injectIntoShadow:     injectIntoShadow,
    injectIntoDocument:   injectIntoDocument,
    removeFromDocument:   removeFromDocument
  });

})();
