// ─────────────────────────────────────────────────────────────────────────────
// core/ResizeManager.js
//
// Corner resize handles for HaxUI windows. (v1.1)
//
// Same root cause and fix as DragManager: EventGuard's stopPropagation()
// on the container's bubble-phase 'mouseup' listener can prevent a
// bubble-phase document listener from firing. mousemove/mouseup here are
// attached in the CAPTURE phase so resize always releases on mouseup,
// regardless of where the cursor ends up relative to the container.
//
// mousemove/mouseup are attached/removed manually per resize cycle,
// NOT through EventRegistry — they must be temporary, not lifetime-bound.
// ─────────────────────────────────────────────────────────────────────────────

var ResizeManager = (function () {

  var CAPTURE = true;

  var CORNERS = [
    { id: 'se', bottom: 0, right: 0,  cursor: 'se-resize', dx: 1,  dy: 1,  dl: 0,  dt: 0  },
    { id: 'sw', bottom: 0, left: 0,   cursor: 'sw-resize', dx: -1, dy: 1,  dl: 1,  dt: 0  },
    { id: 'ne', top: 0,    right: 0,  cursor: 'ne-resize', dx: 1,  dy: -1, dl: 0,  dt: 1  },
    { id: 'nw', top: 0,    left: 0,   cursor: 'nw-resize', dx: -1, dy: -1, dl: 1,  dt: 1  },
  ];

  /**
   * Enables resize on a window container.
   *
   * @param {HTMLElement} container - The window's outer container
   * @param {Object}      registry  - EventRegistry instance for this window
   */
  function enable(container, registry) {
    if (!container) return;

    var s = HaxUIConfig.RESIZE_HANDLE_SIZE;

    CORNERS.forEach(function (corner) {

      var handle = document.createElement('div');
      handle.setAttribute(HaxUIConfig.RESIZE_ATTR, corner.id);
      handle.style.cssText = [
        'position: absolute',
        'width: '  + s + 'px',
        'height: ' + s + 'px',
        'cursor: ' + corner.cursor,
        'z-index: 10',
        corner.bottom !== undefined ? 'bottom: 0'    : 'top: 0',
        corner.right  !== undefined ? 'right: 0'     : 'left: 0',
      ].join('; ');

      container.appendChild(handle);

      var _resizing = false;
      var _startX, _startY, _startW, _startH, _startL, _startT;

      function _release() {
        if (!_resizing) return;
        _resizing = false;
        document.body.style.userSelect = '';

        document.removeEventListener('mousemove',  _onMouseMove, CAPTURE);
        document.removeEventListener('mouseup',    _onMouseUp,   CAPTURE);
        document.removeEventListener('mouseleave', _onMouseUp,   CAPTURE);
      }

      function _onMouseMove(e) {
        if (!_resizing) return;

        var dx = e.clientX - _startX;
        var dy = e.clientY - _startY;

        var newW = _startW + dx * corner.dx;
        var newH = _startH + dy * corner.dy;

        newW = Math.max(newW, HaxUIConfig.MIN_WIDTH);
        newH = Math.max(newH, HaxUIConfig.MIN_HEIGHT);

        container.style.width  = newW + 'px';
        container.style.height = newH + 'px';

        if (corner.dl) {
          var clampedDx = _startW - newW;
          container.style.left = (_startL - clampedDx) + 'px';
        }
        if (corner.dt) {
          var clampedDy = _startH - newH;
          container.style.top  = (_startT - clampedDy) + 'px';
        }
      }

      function _onMouseUp() {
        _release();
      }

      function _onMouseDown(e) {
        if (e.button !== 0) return;
        _resizing = true;

        _startX = e.clientX;
        _startY = e.clientY;
        _startW = container.offsetWidth;
        _startH = container.offsetHeight;
        _startL = parseInt(container.style.left, 10) || 0;
        _startT = parseInt(container.style.top,  10) || 0;

        document.body.style.userSelect = HaxUIConfig.NO_SELECT_STYLE;

        // CAPTURE phase — same fix as DragManager
        document.addEventListener('mousemove',  _onMouseMove, CAPTURE);
        document.addEventListener('mouseup',    _onMouseUp,   CAPTURE);
        document.addEventListener('mouseleave', _onMouseUp,   CAPTURE);

        e.stopPropagation();
        e.preventDefault();
      }

      registry.add(handle, 'mousedown', _onMouseDown);
    });
  }

  return Object.freeze({ enable: enable });

})();
