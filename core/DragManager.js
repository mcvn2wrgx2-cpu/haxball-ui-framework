// ─────────────────────────────────────────────────────────────────────────────
// core/DragManager.js
//
// Drag & drop for HaxUI windows. (v1)
//
// Attaches mousedown to the window header. On drag start, installs
// mousemove and mouseup on document so the drag doesn't break when
// the cursor moves faster than the window follows.
//
// All listeners are registered through the window's EventRegistry
// so they are removed automatically on destroy().
// ─────────────────────────────────────────────────────────────────────────────

var DragManager = (function () {

  /**
   * Enables drag on a window.
   *
   * @param {HTMLElement} container  - The window's outer container (position:fixed)
   * @param {HTMLElement} handle     - The element that initiates drag (header)
   * @param {Object}      registry   - EventRegistry instance for this window
   */
  function enable(container, handle, registry) {
    if (!container || !handle) return;

    var _dragging  = false;
    var _offsetX   = 0;
    var _offsetY   = 0;

    // Clamps a value between min and max
    function _clamp(val, min, max) {
      return Math.min(Math.max(val, min), val > max ? max : val);
    }

    function _onMouseDown(e) {
      // Only drag on left button
      if (e.button !== 0) return;

      _dragging = true;

      var rect = container.getBoundingClientRect();
      _offsetX  = e.clientX - rect.left;
      _offsetY  = e.clientY - rect.top;

      // Disable text selection during drag
      document.body.style.userSelect = HaxUIConfig.NO_SELECT_STYLE;

      e.stopPropagation();
      e.preventDefault();
    }

    function _onMouseMove(e) {
      if (!_dragging) return;

      var newX = e.clientX - _offsetX;
      var newY = e.clientY - _offsetY;

      // Clamp so the window stays within the viewport
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
      document.body.style.userSelect = '';
      e.stopPropagation();
    }

    // header mousedown starts the drag
    registry.add(handle, 'mousedown', _onMouseDown);

    // mousemove and mouseup go on document — not the container —
    // so fast mouse movement doesn't lose the drag target
    registry.add(document, 'mousemove', _onMouseMove);
    registry.add(document, 'mouseup',   _onMouseUp);

    // Make the header visually indicate it's draggable
    handle.style.cursor = 'grab';
  }

  return Object.freeze({ enable: enable });

})();
