// ─────────────────────────────────────────────────────────────────────────────
// core/DragManager.js
//
// Drag & drop for HaxUI windows. (v1)
//
// FIX: mousemove and mouseup listeners are registered and removed manually
// inside each drag cycle — NOT through EventRegistry. This is intentional:
// EventRegistry listeners persist for the window's full lifetime and are
// only removed on destroy(). Drag listeners must be temporary — attached
// on mousedown and removed on mouseup. Putting them in the registry caused
// the window to never release the drag.
//
// Only the header mousedown goes through EventRegistry (it lives forever).
// ─────────────────────────────────────────────────────────────────────────────

var DragManager = (function () {

  /**
   * Enables drag on a window.
   *
   * @param {HTMLElement} container - The window's outer container (position:fixed)
   * @param {HTMLElement} handle    - The element that initiates drag (header)
   * @param {Object}      registry  - EventRegistry instance for this window
   */
  function enable(container, handle, registry) {
    if (!container || !handle) return;

    var _dragging = false;
    var _offsetX  = 0;
    var _offsetY  = 0;

    function _onMouseMove(e) {
      if (!_dragging) return;

      var newX = e.clientX - _offsetX;
      var newY = e.clientY - _offsetY;

      // Clamp inside viewport
      var maxX = window.innerWidth  - container.offsetWidth;
      var maxY = window.innerHeight - container.offsetHeight;
      newX = Math.max(0, Math.min(newX, maxX));
      newY = Math.max(0, Math.min(newY, maxY));

      container.style.left = newX + 'px';
      container.style.top  = newY + 'px';

      e.stopPropagation();
    }

    function _onMouseUp(e) {
      if (!_dragging) return;
      _dragging = false;

      // Restore cursor and selection
      handle.style.cursor          = 'grab';
      document.body.style.userSelect = '';

      // Remove temporary listeners manually — not through registry
      document.removeEventListener('mousemove', _onMouseMove);
      document.removeEventListener('mouseup',   _onMouseUp);

      e.stopPropagation();
    }

    function _onMouseDown(e) {
      if (e.button !== 0) return;

      _dragging = true;

      var rect = container.getBoundingClientRect();
      _offsetX  = e.clientX - rect.left;
      _offsetY  = e.clientY - rect.top;

      handle.style.cursor            = 'grabbing';
      document.body.style.userSelect = HaxUIConfig.NO_SELECT_STYLE;

      // Attach temporary listeners directly on document
      // These are removed in _onMouseUp — never go through registry
      document.addEventListener('mousemove', _onMouseMove);
      document.addEventListener('mouseup',   _onMouseUp);

      e.stopPropagation();
      e.preventDefault();
    }

    // Only mousedown on the header is permanent — goes through registry
    registry.add(handle, 'mousedown', _onMouseDown);

    handle.style.cursor = 'grab';
  }

  return Object.freeze({ enable: enable });

})();
