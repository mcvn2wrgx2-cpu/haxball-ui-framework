// ─────────────────────────────────────────────────────────────────────────────
// core/DragManager.js
//
// Drag & drop for HaxUI windows. (v1.1)
//
// ROOT CAUSE OF THE "drag never releases" BUG:
//   EventGuard registers a 'mouseup' listener directly on the window
//   container that calls e.stopPropagation() (to stop clicks from
//   reaching the game). When the user releases the mouse while the
//   cursor is over the container — which is almost always the case
//   while dragging — that listener fires during the BUBBLING phase
//   and stops the event before it can bubble up to the 'mouseup'
//   listener DragManager attached on `document`. The drag's internal
//   _dragging flag never gets reset, so the window appears "stuck".
//
// FIX:
//   DragManager's mousemove/mouseup listeners on `document` are attached
//   with the CAPTURE phase (the 3rd argument `true`). Capture-phase
//   listeners run BEFORE bubble-phase listeners and before any
//   stopPropagation() called during bubbling, so the drag always
//   releases regardless of what EventGuard does on the container.
//
//   mousemove/mouseup are still attached/removed manually per drag cycle,
//   NOT through EventRegistry — those listeners must be temporary.
//
// NEW (v1.1):
//   config.draggable can now be:
//     true   — window can be dragged (default)
//     false  — window is static, header shows a "static" indicator
//   Window.js passes this through; DragManager just needs to not be
//   called when draggable is false (handled in Window.js).
// ─────────────────────────────────────────────────────────────────────────────

var DragManager = (function () {

  // useCapture = true for all temporary document-level drag listeners
  var CAPTURE = true;

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

    function _release() {
      if (!_dragging) return;
      _dragging = false;

      handle.style.cursor            = 'grab';
      document.body.style.userSelect = '';

      document.removeEventListener('mousemove', _onMouseMove, CAPTURE);
      document.removeEventListener('mouseup',   _onMouseUp,   CAPTURE);
      document.removeEventListener('mouseleave', _onMouseUp,  CAPTURE);
    }

    function _onMouseMove(e) {
      if (!_dragging) return;

      var newX = e.clientX - _offsetX;
      var newY = e.clientY - _offsetY;

      var maxX = window.innerWidth  - container.offsetWidth;
      var maxY = window.innerHeight - container.offsetHeight;
      newX = Math.max(0, Math.min(newX, maxX));
      newY = Math.max(0, Math.min(newY, maxY));

      container.style.left = newX + 'px';
      container.style.top  = newY + 'px';
    }

    function _onMouseUp() {
      _release();
    }

    function _onMouseDown(e) {
      if (e.button !== 0) return;

      // Ignore mousedown on elements explicitly marked as non-draggable
      // (close button, drag indicator, or any future header control).
      // Without this, clicking the close button drags the window instead
      // of triggering its own click handler.
      if (e.target.closest && e.target.closest('[data-haxui-no-drag]')) {
        return;
      }

      _dragging = true;

      var rect = container.getBoundingClientRect();
      _offsetX  = e.clientX - rect.left;
      _offsetY  = e.clientY - rect.top;

      handle.style.cursor            = 'grabbing';
      document.body.style.userSelect = HaxUIConfig.NO_SELECT_STYLE;

      // CAPTURE phase: runs before EventGuard's bubble-phase stopPropagation
      // on the container, so the drag always releases on mouseup.
      document.addEventListener('mousemove',  _onMouseMove, CAPTURE);
      document.addEventListener('mouseup',    _onMouseUp,   CAPTURE);
      // Safety net: if the mouse leaves the browser window entirely
      // (e.g. dragged outside the viewport) mouseup may never fire.
      document.addEventListener('mouseleave', _onMouseUp,   CAPTURE);

      e.stopPropagation();
      e.preventDefault();
    }

    registry.add(handle, 'mousedown', _onMouseDown);

    handle.style.cursor = 'grab';
  }

  return Object.freeze({ enable: enable });

})();
