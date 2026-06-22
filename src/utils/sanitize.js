// ─────────────────────────────────────────────────────────────────────────────
// utils/sanitize.js
//
// Content sanitization for setContent().
//
// PROBLEM:
//   Assigning innerHTML = externalString is a direct XSS vector.
//   In HaxBall, external content comes from: player names, chat messages,
//   server stats — strings we do not control.
//
// SOLUTION:
//   DOMParser parses the string into an isolated document (scripts don't run).
//   Only nodes from the resulting <body> are transferred to the real document.
//   The raw string is never assigned directly to innerHTML.
//
// ALLOWED TAGS:
//   The ALLOWED_TAGS set defines which elements survive sanitization.
//   Event attributes (onclick, onmouseover, etc.) are always stripped.
//   The "style" attribute is allowed so callers can style their content,
//   but all on* attributes are removed without exception.
//
// INTERNAL USE:
//   This module is consumed exclusively by Window.setContent().
//   It is not part of the public HaxUI API.
// ─────────────────────────────────────────────────────────────────────────────

var Sanitize = (function () {

  // HTML tags allowed inside window content areas.
  // Deliberately conservative in v0 — expandable in future versions.
  var ALLOWED_TAGS = new Set([
    'div', 'span', 'p', 'br', 'hr',
    'strong', 'em', 'b', 'i', 'u', 's',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'pre', 'code',
    'small', 'sub', 'sup',
    'label', 'input', 'button', 'select', 'option', 'textarea'
  ]);

  // Attributes allowed globally across all tags.
  // on* attributes are implicitly forbidden — always stripped.
  var ALLOWED_ATTRS = new Set([
    'class', 'id', 'style', 'title',
    'type', 'value', 'placeholder', 'disabled', 'checked',
    'selected', 'readonly', 'maxlength', 'min', 'max', 'step',
    'rows', 'cols', 'wrap',
    'colspan', 'rowspan',
    'data-haxui'   // reserved attribute for internal framework use
  ]);

  // ─── Internal functions ───────────────────────────────────────────────────

  /**
   * Removes all non-allowed attributes from an element,
   * including any attribute starting with "on" (event handlers).
   *
   * @param {Element} el
   */
  function _cleanAttributes(el) {
    // Snapshot to array — we mutate the collection while iterating
    var attrs = Array.prototype.slice.call(el.attributes);
    for (var i = 0; i < attrs.length; i++) {
      var name = attrs[i].name.toLowerCase();
      var isEventHandler = name.indexOf('on') === 0;
      var isAllowed      = ALLOWED_ATTRS.has(name);

      if (isEventHandler || !isAllowed) {
        el.removeAttribute(attrs[i].name);
      }
    }
  }

  /**
   * Walks the DOM tree recursively.
   * Removes disallowed nodes and cleans attributes on allowed ones.
   * Returns the node if valid, null if it should be removed.
   *
   * @param {Node} node
   * @returns {Node|null}
   */
  function _walkNode(node) {
    // Text nodes are always safe — pass through as-is
    if (node.nodeType === Node.TEXT_NODE) {
      return node;
    }

    // Only process Element nodes (nodeType === 1)
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }

    var tag = node.tagName.toLowerCase();

    // Disallowed tag: drop the entire element and its subtree
    if (!ALLOWED_TAGS.has(tag)) {
      return null;
    }

    // Clean attributes on the current element
    _cleanAttributes(node);

    // Walk children recursively
    // Snapshot first so removals don't shift the live NodeList
    var children = Array.prototype.slice.call(node.childNodes);
    for (var i = 0; i < children.length; i++) {
      var child  = children[i];
      var result = _walkNode(child);
      if (result === null) {
        node.removeChild(child);
      }
    }

    return node;
  }

  // ─── Module public API ────────────────────────────────────────────────────

  /**
   * Parses an HTML string and returns a DocumentFragment containing
   * sanitized nodes. Safe to insert into the DOM via appendChild.
   *
   * @param  {string} htmlString
   * @returns {DocumentFragment}
   */
  function fromString(htmlString) {
    if (typeof htmlString !== 'string') {
      return document.createDocumentFragment();
    }

    // DOMParser creates an isolated document — scripts do not execute
    var parser   = new DOMParser();
    var parsed   = parser.parseFromString(htmlString, 'text/html');
    var body     = parsed.body;
    var fragment = document.createDocumentFragment();

    // Walk direct children of the parsed body
    var children = Array.prototype.slice.call(body.childNodes);
    for (var i = 0; i < children.length; i++) {
      var result = _walkNode(children[i]);
      if (result !== null) {
        // importNode adopts the node into the real document
        fragment.appendChild(document.importNode(result, true));
      }
    }

    return fragment;
  }

  /**
   * Sanitizes an HTML string and returns it as a clean HTML string.
   * Useful when markup is needed as text rather than nodes.
   *
   * @param  {string} htmlString
   * @returns {string}
   */
  function toString(htmlString) {
    var fragment = fromString(htmlString);
    var temp     = document.createElement('div');
    temp.appendChild(fragment);
    return temp.innerHTML;
  }

  return {
    fromString: fromString,
    toString:   toString
  };

})();
