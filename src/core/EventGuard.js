// ─────────────────────────────────────────────────────────────────────────────
// core/EventGuard.js
//
// Event isolation layer between HaxUI windows and the HaxBall game.
//
// PROBLEM:
//   HaxBall listens to keyboard and mouse events on the document to control
//   the game (player movement, shooting, etc.). Without isolation, any event
//   that fires inside a HaxUI window will bubble up and reach the game —
//   clicking inside a window moves the player, typing in an input triggers
//   game actions, scrolling moves the camera.
//
// SOLUTION:
//   EventGuard applies a per-event-type policy to each window. The policy
//   is not a blanket stopPropagation on everything — that would break
//   legitimate game input when focus is outside a window. Instead, each
//   event type is handled with its own rule:
//
//   click / mousedown / mouseup / contextmenu
//     → stopPropagation always. These must never reach the game when
//       the user is interacting with a HaxUI window.
//     → mousedown also notifies WindowManager to bring the window to front.
//
//   keydown / keyup
//     → stopPropagation ONLY if an interactive element (input, textarea,
//       select) inside the window currently has focus. If focus is
//       outside all windows, the game receives keyboard events normally
//       and the player can move.
//
//   wheel
//     → preventDefault + stopPropagation on the content area only.
//       Allows internal scrolling without triggering game camera zoom
//       or page scroll.
//
//   mousemove
//     → NOT intercepted. The game needs mousemove for player aiming.
//       Blocking it would make the game unplayable while hovering
//       over a window.
//
// INTERNAL USE:
//   Called by Window.mount() after the DOM structure is built.
//   All listeners are registered through the window's EventRegistry
//   so they are cleaned up automatically on destroy().
//   Not part of the public HaxUI API.
// ─────────────────────────────────────────────────────────────────────────────

var EventGuard = (function () {

  // ─── Internal helpers ─────────────────────────────────────────────────────

  /**
   * Returns true if the currently focused element is an interactive input
   * inside the given container (or its shadow root).
   * Used to decide whether keyboard events should be blocked.
   *
   * @param {HTMLElement} container
   * @returns {boolean}
   */
  function _interactiveElementHasFocus(container) {
    var active = document.activeElement;
    if (!active) return false;

    var tag = active.tagName.toLowerCase();
    var isInteractive = HaxUIConfig.INTERACTIVE_TAGS.indexOf(tag) !== -1;
    if (!isInteractive) return false;

    // Check if the focused element lives inside this window's container
    // or inside its shadow root (SHADOW_MODE).
    if (container.contains(active)) return true;

    var shadow = container.shadowRoot;
    if (shadow && shadow.activeElement) {
      var shadowActive = shadow.activeElement;
      var shadowTag    = shadowActive.tagName.toLowerCase();
      return HaxUIConfig.INTERACTIVE_TAGS.indexOf(shadowTag) !== -1;
    }

    return false;
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /**
   * Attaches all isolation listeners to a window container.
   * All listeners are registered through the provided EventRegistry
   * so they are removed automatically when the window is destroyed.
   *
   * @param {HTMLElement}   container      - The window's root DOM element
   * @param {HTMLElement}   contentArea    - The [data-haxui-content] element
   * @param {string}        windowId       - Used to notify WindowManager on focus
   * @param {Object}        registry       - EventRegistry instance for this window
   * @param {Function}      onFocus        - Callback: onFocus(windowId) → bring to front
   */
  function bindTo(container, contentArea, windowId, registry, onFocus) {

    // ── click ──────────────────────────────────────────────────────────────
    // Always block. A click inside a window must never reach the game.
    registry.add(container, 'click', function (e) {
      e.stopPropagation();
    });

    // ── mousedown ──────────────────────────────────────────────────────────
    // Block propagation and notify WindowManager to bring this window
    // to the front of the z-index stack.
    registry.add(container, 'mousedown', function (e) {
      e.stopPropagation();
      if (typeof onFocus === 'function') {
        onFocus(windowId);
      }
    });

    // ── mouseup ────────────────────────────────────────────────────────────
    // Block. Prevents mouseup from triggering game shoot/actions.
    registry.add(container, 'mouseup', function (e) {
      e.stopPropagation();
    });

    // ── contextmenu ────────────────────────────────────────────────────────
    // Block. Prevents the browser context menu from being suppressed by
    // HaxBall's own contextmenu handler while right-clicking on a window.
    registry.add(container, 'contextmenu', function (e) {
      e.stopPropagation();
    });

    // ── keydown ────────────────────────────────────────────────────────────
    // Block ONLY when an interactive element inside this window has focus.
    // If the user is typing in an input, the game must not react.
    // If focus is outside any window, the game receives keydown normally.
    registry.add(container, 'keydown', function (e) {
      if (_interactiveElementHasFocus(container)) {
        e.stopPropagation();
      }
    });

    // ── keyup ──────────────────────────────────────────────────────────────
    // Same policy as keydown — symmetric to avoid stuck keys in the game.
    registry.add(container, 'keyup', function (e) {
      if (_interactiveElementHasFocus(container)) {
        e.stopPropagation();
      }
    });

    // ── wheel ──────────────────────────────────────────────────────────────
    // Attached to the content area only (not the whole container).
    // Allows internal scrolling without triggering camera zoom or page scroll.
    // preventDefault stops the game; stopPropagation stops the browser scroll.
    if (contentArea) {
      registry.add(contentArea, 'wheel', function (e) {
        e.preventDefault();
        e.stopPropagation();
      }, { passive: false });
      // passive: false is required for preventDefault() to work on wheel events
      // in modern browsers (Chrome 73+ defaults wheel listeners to passive).
    }

    // ── mousemove ──────────────────────────────────────────────────────────
    // NOT blocked. The game needs mousemove for player aiming.
    // Intercepting it would make the game unplayable while hovering
    // over a HaxUI window.
  }

  // ─────────────────────────────────────────────────────────────────────────

  return Object.freeze({
    bindTo: bindTo
  });

})();
