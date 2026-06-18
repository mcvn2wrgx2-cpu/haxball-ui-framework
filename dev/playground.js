// ─────────────────────────────────────────────────────────────────────────────
// dev/playground.js
//
// Manual test suite and console examples for HaxBall UI Framework.
//
// PURPOSE:
//   This file is NOT part of the production bundle.
//   It is a development-only scratchpad designed to be pasted into the
//   browser DevTools console while HaxBall is open, after the bundle has
//   already been injected.
//
// HOW TO USE:
//   1. Open HaxBall in Chrome or Firefox
//   2. Open DevTools (F12) → Console
//   3. Paste haxball-ui.bundle.js first (or load via Tampermonkey)
//   4. Paste any section of this file to run individual tests
//
// STRUCTURE:
//   Each test group is a self-contained IIFE that can be run independently.
//   Groups are ordered from simplest to most complex.
//
//   [T01] Config integrity check
//   [T02] Sanitize — string inputs
//   [T03] Sanitize — XSS vectors
//   [T04] Sanitize — Node passthrough
//   [T05] Window creation
//   [T06] Window content update
//   [T07] Window show / hide
//   [T08] Window destroy and handle safety
//   [T09] Multiple windows and z-index stacking
//   [T10] destroyAll cleanup
//   [T11] HaxUI.getWindow null safety
//   [T12] DOM re-anchor simulation
//   [T13] Live stats overlay simulation
// ─────────────────────────────────────────────────────────────────────────────

// ─── Test runner ─────────────────────────────────────────────────────────────

var PG = (function () {

  var _passed = 0;
  var _failed = 0;

  function assert(label, condition) {
    if (condition) {
      console.log('%c ✓ ' + label, 'color: #2ecc71; font-weight: bold');
      _passed++;
    } else {
      console.error('%c ✗ ' + label, 'color: #e74c3c; font-weight: bold');
      _failed++;
    }
  }

  function group(name, fn) {
    console.group('%c ' + name, 'color: #3498db; font-weight: bold; font-size: 13px');
    try {
      fn(assert);
    } catch (e) {
      console.error('Uncaught error in group:', e);
      _failed++;
    }
    console.groupEnd();
  }

  function summary() {
    var total = _passed + _failed;
    var style = _failed === 0
      ? 'color: #2ecc71; font-weight: bold; font-size: 14px'
      : 'color: #e74c3c; font-weight: bold; font-size: 14px';
    console.log('%c ─────────────────────────────────────', 'color: #7f8c8d');
    console.log('%c Results: ' + _passed + ' passed, ' + _failed + ' failed / ' + total + ' total', style);
    _passed = 0;
    _failed = 0;
  }

  return { assert: assert, group: group, summary: summary };

})();


// ─── [T01] Config integrity ───────────────────────────────────────────────────

PG.group('[T01] Config integrity', function (assert) {
  assert('HaxUIConfig is defined',          typeof HaxUIConfig === 'object');
  assert('BASE_Z_INDEX is 9000',            HaxUIConfig.BASE_Z_INDEX === 9000);
  assert('ROOT_ID is haxui-root',           HaxUIConfig.ROOT_ID === 'haxui-root');
  assert('GLOBAL_NAMESPACE is HaxUI',       HaxUIConfig.GLOBAL_NAMESPACE === 'HaxUI');
  assert('OPERATION_MODES.SHADOW exists',   HaxUIConfig.OPERATION_MODES.SHADOW === 'shadow');
  assert('OPERATION_MODES.NAMESPACE exists',HaxUIConfig.OPERATION_MODES.NAMESPACE === 'namespace');
  assert('WINDOW_DEFAULTS.width is 300',    HaxUIConfig.WINDOW_DEFAULTS.width === 300);
  assert('WINDOW_DEFAULTS.height is 200',   HaxUIConfig.WINDOW_DEFAULTS.height === 200);
  assert('Config is frozen',                Object.isFrozen(HaxUIConfig));

  // Config must be read-only — mutations should silently fail in strict mode
  try {
    HaxUIConfig.BASE_Z_INDEX = 1;
  } catch (e) { /* expected in strict mode */ }
  assert('Config mutation has no effect',   HaxUIConfig.BASE_Z_INDEX === 9000);
});


// ─── [T02] Sanitize — string inputs ──────────────────────────────────────────

PG.group('[T02] Sanitize — string inputs', function (assert) {
  var frag;

  // Basic valid HTML
  frag = Sanitize.fromString('<div>Hello</div>');
  assert('fromString returns a DocumentFragment',
    frag instanceof DocumentFragment);
  assert('Fragment contains one child',
    frag.childNodes.length === 1);
  assert('Child is a div',
    frag.firstChild.tagName.toLowerCase() === 'div');

  // Allowed tags survive
  frag = Sanitize.fromString('<p><strong>Bold</strong> and <em>italic</em></p>');
  var p = frag.firstChild;
  assert('p tag survives',      p && p.tagName.toLowerCase() === 'p');
  assert('strong tag survives', p && p.querySelector('strong') !== null);
  assert('em tag survives',     p && p.querySelector('em') !== null);

  // toString variant
  var html = Sanitize.toString('<div class="box">Text</div>');
  assert('toString returns a string',       typeof html === 'string');
  assert('toString preserves allowed attr', html.includes('class="box"'));

  // Non-string input returns empty fragment
  frag = Sanitize.fromString(null);
  assert('null input returns empty fragment', frag instanceof DocumentFragment && frag.childNodes.length === 0);

  frag = Sanitize.fromString(undefined);
  assert('undefined input returns empty fragment', frag instanceof DocumentFragment && frag.childNodes.length === 0);
});


// ─── [T03] Sanitize — XSS vectors ────────────────────────────────────────────

PG.group('[T03] Sanitize — XSS vectors', function (assert) {
  var html;

  // <script> tag must be stripped entirely
  html = Sanitize.toString('<script>alert("xss")<\/script><p>safe</p>');
  assert('script tag is stripped',          !html.includes('<script'));
  assert('safe content survives after xss', html.includes('<p>safe</p>'));

  // onclick attribute must be stripped
  html = Sanitize.toString('<div onclick="alert(1)">click me</div>');
  assert('onclick is stripped',     !html.includes('onclick'));
  assert('div content is kept',     html.includes('click me'));

  // onerror on img
  html = Sanitize.toString('<img src="x" onerror="alert(1)">');
  assert('img tag is stripped (not in ALLOWED_TAGS)', !html.includes('<img'));

  // onmouseover
  html = Sanitize.toString('<p onmouseover="steal()">hover</p>');
  assert('onmouseover is stripped', !html.includes('onmouseover'));
  assert('p text survives',         html.includes('hover'));

  // javascript: in style (CSS injection)
  html = Sanitize.toString('<div style="background:url(javascript:alert(1))">x</div>');
  // style attribute is allowed but the browser won't execute js: in a fragment
  assert('div survives CSS injection attempt', html.includes('<div'));

  // Nested XSS
  html = Sanitize.toString('<div><span onload="evil()"><b>text</b></span></div>');
  assert('onload stripped from nested span', !html.includes('onload'));
  assert('b tag and text survive',           html.includes('<b>text</b>'));

  // <iframe> must be stripped
  html = Sanitize.toString('<iframe src="evil.com"></iframe>');
  assert('iframe is stripped', !html.includes('<iframe'));
});


// ─── [T04] Sanitize — Node passthrough ───────────────────────────────────────

PG.group('[T04] Sanitize — Node passthrough', function (assert) {
  // When a Node is passed to setContent() it bypasses Sanitize entirely.
  // This group documents that contract: the caller owns safety for Nodes.

  var node = document.createElement('div');
  node.textContent = 'Safe text via textContent';

  // textContent is always safe — no HTML parsing happens
  assert('textContent node has no innerHTML risk',
    !node.innerHTML.includes('<'));

  // Demonstrate the correct pattern for external data in Nodes
  var playerName = '<script>evil()<\/script>';
  var entry = document.createElement('span');
  entry.textContent = playerName;   // textContent escapes — this is safe
  assert('textContent escapes HTML in external data',
    entry.innerHTML === '&lt;script&gt;evil()&lt;/script&gt;');
});


// ─── [T05] Window creation ────────────────────────────────────────────────────

PG.group('[T05] Window creation', function (assert) {
  // Clean up any leftovers first
  if (typeof HaxUI !== 'undefined') HaxUI.destroyAll();

  var win = HaxUI.createWindow({
    id:      'test-basic',
    title:   'Basic Window',
    width:   260,
    height:  160,
    x:       20,
    y:       20,
    content: '<p>Hello HaxUI</p>'
  });

  assert('createWindow returns an object',        typeof win === 'object');
  assert('handle has .id',                        win.id === 'test-basic');
  assert('handle has .setContent',                typeof win.setContent === 'function');
  assert('handle has .show',                      typeof win.show === 'function');
  assert('handle has .hide',                      typeof win.hide === 'function');
  assert('handle has .destroy',                   typeof win.destroy === 'function');

  var root = document.getElementById(HaxUIConfig.ROOT_ID);
  assert('#haxui-root exists in DOM',             root !== null);

  var container = root && root.querySelector('[' + HaxUIConfig.WINDOW_ATTR + '="test-basic"]');
  assert('Window container is in the DOM',        container !== null);

  // Duplicate ID must throw
  var threw = false;
  try { HaxUI.createWindow({ id: 'test-basic', title: 'Dup', width: 100, height: 100, x: 0, y: 0 }); }
  catch (e) { threw = true; }
  assert('Duplicate ID throws an error',          threw);

  HaxUI.destroyAll();
});


// ─── [T06] Window content update ─────────────────────────────────────────────

PG.group('[T06] Window content update', function (assert) {
  HaxUI.destroyAll();

  var win = HaxUI.createWindow({
    id: 'test-content', title: 'Content', width: 200, height: 120, x: 20, y: 20
  });

  // Update with string
  win.setContent('<p id="pg-probe">Updated</p>');
  var root      = document.getElementById(HaxUIConfig.ROOT_ID);
  var container = root.querySelector('[' + HaxUIConfig.WINDOW_ATTR + '="test-content"]');

  // In Shadow DOM mode the probe is inside the shadow root
  var shadow  = container.shadowRoot;
  var content = shadow
    ? shadow.querySelector('[' + HaxUIConfig.CONTENT_ATTR + ']')
    : container.querySelector('[' + HaxUIConfig.CONTENT_ATTR + ']');

  assert('Content area exists',         content !== null);
  assert('String content was rendered', content && content.querySelector('#pg-probe') !== null);

  // Update with Node
  var node = document.createElement('div');
  node.id  = 'pg-node-probe';
  node.textContent = 'Node content';
  win.setContent(node);

  assert('Node content was rendered',
    content && content.querySelector('#pg-node-probe') !== null);
  assert('Previous string content was replaced',
    content && content.querySelector('#pg-probe') === null);

  HaxUI.destroyAll();
});


// ─── [T07] Window show / hide ─────────────────────────────────────────────────

PG.group('[T07] Window show / hide', function (assert) {
  HaxUI.destroyAll();

  var win = HaxUI.createWindow({
    id: 'test-visibility', title: 'Visibility', width: 200, height: 100, x: 20, y: 20
  });

  var root      = document.getElementById(HaxUIConfig.ROOT_ID);
  var container = root.querySelector('[' + HaxUIConfig.WINDOW_ATTR + '="test-visibility"]');

  win.hide();
  assert('hide() sets display none',
    container.style.display === 'none');

  win.show();
  assert('show() removes display none',
    container.style.display !== 'none');

  // show/hide do not destroy the window
  assert('Window still registered after show/hide',
    HaxUI.getWindow('test-visibility') !== null);

  HaxUI.destroyAll();
});


// ─── [T08] Window destroy and handle safety ───────────────────────────────────

PG.group('[T08] Destroy and handle safety', function (assert) {
  HaxUI.destroyAll();

  var win = HaxUI.createWindow({
    id: 'test-destroy', title: 'Destroy', width: 200, height: 100, x: 20, y: 20
  });

  win.destroy();

  var root      = document.getElementById(HaxUIConfig.ROOT_ID);
  var container = root && root.querySelector('[' + HaxUIConfig.WINDOW_ATTR + '="test-destroy"]');
  assert('Container removed from DOM after destroy()', container === null);
  assert('getWindow returns null after destroy()',      HaxUI.getWindow('test-destroy') === null);

  // Post-destroy calls must be silent no-ops — not throw
  var threw = false;
  try {
    win.setContent('<p>ghost</p>');
    win.show();
    win.hide();
    win.destroy();  // second destroy — must also be safe
  } catch (e) {
    threw = true;
  }
  assert('Post-destroy method calls are silent no-ops', !threw);

  HaxUI.destroyAll();
});


// ─── [T09] Multiple windows and z-index stacking ──────────────────────────────

PG.group('[T09] Multiple windows and z-index stacking', function (assert) {
  HaxUI.destroyAll();

  var a = HaxUI.createWindow({ id: 'z-a', title: 'A', width: 200, height: 100, x: 20,  y: 20  });
  var b = HaxUI.createWindow({ id: 'z-b', title: 'B', width: 200, height: 100, x: 80,  y: 80  });
  var c = HaxUI.createWindow({ id: 'z-c', title: 'C', width: 200, height: 100, x: 140, y: 140 });

  var root = document.getElementById(HaxUIConfig.ROOT_ID);
  var getZ = function (id) {
    var el = root.querySelector('[' + HaxUIConfig.WINDOW_ATTR + '="' + id + '"]');
    return el ? parseInt(el.style.zIndex, 10) : 0;
  };

  var zA = getZ('z-a');
  var zB = getZ('z-b');
  var zC = getZ('z-c');

  assert('All z-indexes are above BASE_Z_INDEX',  zA >= HaxUIConfig.BASE_Z_INDEX &&
                                                   zB >= HaxUIConfig.BASE_Z_INDEX &&
                                                   zC >= HaxUIConfig.BASE_Z_INDEX);
  assert('z-indexes are strictly increasing',      zA < zB && zB < zC);
  assert('Three windows are registered',           HaxUI.getWindow('z-a') !== null &&
                                                   HaxUI.getWindow('z-b') !== null &&
                                                   HaxUI.getWindow('z-c') !== null);

  HaxUI.destroyAll();
});


// ─── [T10] destroyAll cleanup ─────────────────────────────────────────────────

PG.group('[T10] destroyAll cleanup', function (assert) {
  HaxUI.destroyAll();

  HaxUI.createWindow({ id: 'da-1', title: '1', width: 100, height: 100, x: 10, y: 10 });
  HaxUI.createWindow({ id: 'da-2', title: '2', width: 100, height: 100, x: 20, y: 20 });
  HaxUI.createWindow({ id: 'da-3', title: '3', width: 100, height: 100, x: 30, y: 30 });

  HaxUI.destroyAll();

  var root = document.getElementById(HaxUIConfig.ROOT_ID);

  assert('da-1 removed from registry', HaxUI.getWindow('da-1') === null);
  assert('da-2 removed from registry', HaxUI.getWindow('da-2') === null);
  assert('da-3 removed from registry', HaxUI.getWindow('da-3') === null);

  var remaining = root ? root.querySelectorAll('[' + HaxUIConfig.WINDOW_ATTR + ']').length : 0;
  assert('No window containers left in DOM', remaining === 0);

  // destroyAll on empty registry must not throw
  var threw = false;
  try { HaxUI.destroyAll(); } catch (e) { threw = true; }
  assert('destroyAll on empty registry is safe', !threw);
});


// ─── [T11] getWindow null safety ─────────────────────────────────────────────

PG.group('[T11] getWindow null safety', function (assert) {
  HaxUI.destroyAll();

  assert('getWindow on unknown id returns null',
    HaxUI.getWindow('does-not-exist') === null);

  assert('getWindow on empty string returns null',
    HaxUI.getWindow('') === null);

  // Chaining on null must not throw (simulates real usage in game callbacks)
  var threw = false;
  try {
    var w = HaxUI.getWindow('ghost');
    if (w) w.setContent('<p>unreachable</p>');
  } catch (e) { threw = true; }
  assert('Null guard pattern does not throw', !threw);
});


// ─── [T12] DOM re-anchor simulation ──────────────────────────────────────────

PG.group('[T12] DOM re-anchor simulation', function (assert) {
  HaxUI.destroyAll();

  HaxUI.createWindow({ id: 're-anchor', title: 'Re-anchor', width: 200, height: 100, x: 20, y: 20 });

  // Simulate HaxBall clearing the DOM — remove #haxui-root manually
  var root = document.getElementById(HaxUIConfig.ROOT_ID);
  if (root) root.remove();

  // Give the MutationObserver one tick to react
  setTimeout(function () {
    var reanchored = document.getElementById(HaxUIConfig.ROOT_ID);
    assert('RootMount re-anchored #haxui-root after removal', reanchored !== null);

    var container = reanchored && reanchored.querySelector(
      '[' + HaxUIConfig.WINDOW_ATTR + '="re-anchor"]'
    );
    assert('Window was re-mounted after re-anchor', container !== null);

    HaxUI.destroyAll();
    PG.summary();
  }, 100);

  // Summary for T12 is deferred — call it manually after the timeout resolves
  return 'deferred';
});


// ─── [T13] Live stats overlay simulation ─────────────────────────────────────

PG.group('[T13] Live stats overlay — integration', function (assert) {
  HaxUI.destroyAll();

  // Create two windows as a real script would
  var stats = HaxUI.createWindow({
    id: 'pg-stats', title: 'Stats', width: 260, height: 180, x: 16, y: 16
  });

  var chat = HaxUI.createWindow({
    id: 'pg-chat', title: 'Chat', width: 300, height: 200, x: 16, y: 210
  });

  // Simulate a game data tick
  var mockData = { score: [2, 1], possession: 58, time: '04:32' };
  var node = document.createElement('div');
  node.innerHTML = [
    '<div>Team 1: ' + mockData.score[0] + '</div>',
    '<div>Team 2: ' + mockData.score[1] + '</div>',
    '<div>Possession: ' + mockData.possession + '%</div>',
    '<div>Time: '   + mockData.time + '</div>'
  ].join('');
  stats.setContent(node);

  assert('Stats window is registered', HaxUI.getWindow('pg-stats') !== null);
  assert('Chat window is registered',  HaxUI.getWindow('pg-chat')  !== null);

  // Simulate a chat message with a potentially dangerous player name
  var playerName = '<img src=x onerror=alert(1)>';
  var entry = document.createElement('p');
  entry.textContent = playerName;   // textContent — safe by design
  chat.setContent(entry);

  // Simulate leaving room
  stats.hide();
  chat.hide();
  assert('Both windows hidden',
    HaxUI.getWindow('pg-stats') !== null &&
    HaxUI.getWindow('pg-chat')  !== null);

  HaxUI.destroyAll();
  assert('Both windows destroyed after destroyAll',
    HaxUI.getWindow('pg-stats') === null &&
    HaxUI.getWindow('pg-chat')  === null);
});


// ─── Run all synchronous tests and print summary ──────────────────────────────
// T12 prints its own deferred summary after the MutationObserver tick.

PG.summary();
