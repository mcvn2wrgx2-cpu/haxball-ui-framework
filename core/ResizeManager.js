// ─────────────────────────────────────────────────────────────────────────────
// core/ResizeManager.js
//
// Corner resize handles for HaxUI windows. (v1)
//
// Injects 4 corner handles into the window container.
// Each handle tracks mousedown → mousemove → mouseup on document
// and adjusts width/height (and left/top for NW/NE/SW corners).
//
// Minimum dimensions are enforced via HaxUIConfig.MIN_WIDTH / MIN_HEIGHT.
// All listeners go through EventRegistry for clean teardown.
// ─────────────────────────────────────────────────────────────────────────────

var ResizeManager = (function () {

  // Corner definitions: which edges each handle controls
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

      // Build the handle element
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

      // Per-drag state
      var _resizing = false;
      var _startX, _startY, _startW, _startH, _startL, _startT;

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

        e.stopPropagation();
        e.preventDefault();
      }

      function _onMouseMove(e) {
        if (!_resizing) return;

        var dx = e.clientX - _startX;
        var dy = e.clientY - _startY;

        var newW = _startW + dx * corner.dx;
        var newH = _startH + dy * corner.dy;

        // Enforce minimum dimensions
        newW = Math.max(newW, HaxUIConfig.MIN_WIDTH);
        newH = Math.max(newH, HaxUIConfig.MIN_HEIGHT);

        container.style.width  = newW + 'px';
        container.style.height = newH + 'px';

        // Corners that pull left/top need position adjustment
        if (corner.dl) {
          var clampedDx = _startW - newW;   // negative if growing left
          container.style.left = (_startL - clampedDx) + 'px';
        }
        if (corner.dt) {
          var clampedDy = _startH - newH;
          container.style.top  = (_startT - clampedDy) + 'px';
        }

        e.stopPropagation();
      }

      function _onMouseUp(e) {
        if (!_resizing) return;
        _resizing = false;
        document.body.style.userSelect = '';
        e.stopPropagation();
      }

      registry.add(handle,    'mousedown', _onMouseDown);
      registry.add(document,  'mousemove', _onMouseMove);
      registry.add(document,  'mouseup',   _onMouseUp);
    });
  }

  return Object.freeze({ enable: enable });

})();
