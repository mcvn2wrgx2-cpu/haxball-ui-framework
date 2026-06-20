// ─────────────────────────────────────────────────────────────────────────────
// dev/examples.js
//
// Worked examples for HaxBall UI Framework v1.
// Paste each example individually into the browser console while HaxBall
// is open and the bundle has already been injected.
//
// REQUIRED FIRST STEP — every time:
//   1. Paste the FULL contents of haxball-ui.bundle.js into the console.
//   2. Run: HaxUI.diagnostics()
//      It must return an object, NOT throw "HaxUI is not defined".
//      If it throws, the bundle did not load — re-paste it.
//   3. Only then paste an example block below.
//
// NOTE: reloading the page (F5, navigating, leaving/rejoining a room via
// full page reload) wipes ALL console state, including window.HaxUI.
// The bundle must be re-pasted after any page reload — this is normal
// browser behavior, not a bug in the framework.
//
// EXAMPLES:
//   [E01] Live scoreboard
//   [E02] Player roster
//   [E03] Chat log
//   [E04] Admin panel
//   [E05] Multi-window dashboard
// ─────────────────────────────────────────────────────────────────────────────

if (typeof HaxUI === 'undefined') {
  console.error(
    '[HaxUI Examples] HaxUI is not defined. ' +
    'Paste the full contents of haxball-ui.bundle.js into this console FIRST, ' +
    'then run HaxUI.diagnostics() to confirm it loaded, then paste an example.'
  );
  throw new Error('[HaxUI Examples] Aborting — HaxUI not loaded. See message above.');
}



// ─── [E01] Live scoreboard ────────────────────────────────────────────────────
// A scoreboard that updates every second simulating a live match.
// Run it, watch the timer tick, then call clearInterval(scoreboardTimer) to stop.

HaxUI.destroyAll();

var scoreboard = HaxUI.createWindow({
  id:     'scoreboard',
  title:  '⚽ Live Match',
  width:  260,
  height: 130,
  x:      20,
  y:      20
});

var score   = [0, 0];
var seconds = 0;

function renderScoreboard() {
  var mins = String(Math.floor(seconds / 60)).padStart(2, '0');
  var secs = String(seconds % 60).padStart(2, '0');

  var node = document.createElement('div');
  node.style.cssText = 'text-align:center; padding: 8px 0;';
  node.innerHTML = [
    '<div style="font-size:11px; color:#718096; margin-bottom:6px;">',
      mins + ':' + secs,
    '</div>',
    '<div style="display:flex; justify-content:center; align-items:center; gap:16px;">',
      '<div style="text-align:center;">',
        '<div style="font-size:11px; color:#a0aec0;">Red</div>',
        '<div style="font-size:28px; font-weight:700; color:#fc8181;">' + score[0] + '</div>',
      '</div>',
      '<div style="font-size:18px; color:#4a5568;">—</div>',
      '<div style="text-align:center;">',
        '<div style="font-size:11px; color:#a0aec0;">Blue</div>',
        '<div style="font-size:28px; font-weight:700; color:#63b3ed;">' + score[1] + '</div>',
      '</div>',
    '</div>'
  ].join('');

  scoreboard.setContent(node);
}

renderScoreboard();

var scoreboardTimer = setInterval(function () {
  seconds++;

  // Random goal every ~15 seconds for demo purposes
  if (seconds % 15 === 0) {
    var team = Math.random() > 0.5 ? 0 : 1;
    score[team]++;
  }

  renderScoreboard();
}, 1000);

// Stop with: clearInterval(scoreboardTimer)
// Destroy with: HaxUI.destroyWindow('scoreboard')


// ─── [E02] Player roster ──────────────────────────────────────────────────────
// A table showing mock player data. Demonstrates table rendering and
// color-coded team badges inside a window.

HaxUI.destroyAll();

var players = [
  { name: 'mcvn',    team: 'Red',  ping: 18,  goals: 3 },
  { name: 'striker', team: 'Red',  ping: 44,  goals: 1 },
  { name: 'goalie',  team: 'Blue', ping: 92,  goals: 0 },
  { name: 'xavi99',  team: 'Blue', ping: 27,  goals: 2 },
  { name: 'anon',    team: 'Spec', ping: 130, goals: 0 },
];

var roster = HaxUI.createWindow({
  id:     'roster',
  title:  '👥 Players',
  width:  300,
  height: 200,
  x:      20,
  y:      20
});

var teamColor = { Red: '#fc8181', Blue: '#63b3ed', Spec: '#718096' };

var rows = players.map(function (p) {
  var color = teamColor[p.team] || '#a0aec0';
  return [
    '<tr>',
      '<td style="padding:4px 6px;">',
        '<span style="color:' + color + '; font-weight:600;">' + p.name + '</span>',
      '</td>',
      '<td style="padding:4px 6px; text-align:center;">',
        '<span style="color:' + color + '; font-size:11px;">' + p.team + '</span>',
      '</td>',
      '<td style="padding:4px 6px; text-align:center; color:#68d391;">' + p.goals + '</td>',
      '<td style="padding:4px 6px; text-align:right; color:' + (p.ping > 100 ? '#fc8181' : '#a0aec0') + ';">' + p.ping + 'ms</td>',
    '</tr>'
  ].join('');
}).join('');

var node = document.createElement('div');
node.innerHTML = [
  '<table style="width:100%; border-collapse:collapse;">',
    '<thead>',
      '<tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">',
        '<th style="padding:4px 6px; text-align:left; font-size:10px; color:#718096;">NAME</th>',
        '<th style="padding:4px 6px; text-align:center; font-size:10px; color:#718096;">TEAM</th>',
        '<th style="padding:4px 6px; text-align:center; font-size:10px; color:#718096;">⚽</th>',
        '<th style="padding:4px 6px; text-align:right; font-size:10px; color:#718096;">PING</th>',
      '</tr>',
    '</thead>',
    '<tbody>' + rows + '</tbody>',
  '</table>'
].join('');

roster.setContent(node);


// ─── [E03] Chat log ───────────────────────────────────────────────────────────
// A scrollable chat log that appends messages over time.
// Demonstrates safe rendering of external strings via textContent.

HaxUI.destroyAll();

var chatWindow = HaxUI.createWindow({
  id:     'chat',
  title:  '💬 Chat',
  width:  280,
  height: 220,
  x:      20,
  y:      20
});

var chatLog     = document.createElement('div');
chatLog.style.cssText = 'display:flex; flex-direction:column; gap:4px;';

var chatMessages = [
  { player: 'mcvn',    color: '#fc8181', text: 'gl hf everyone' },
  { player: 'xavi99',  color: '#63b3ed', text: 'lets gooo' },
  { player: 'striker', color: '#fc8181', text: 'no stress just vibes' },
  { player: 'goalie',  color: '#63b3ed', text: 'ill carry dont worry' },
];

function appendMessage(player, color, text) {
  var line = document.createElement('div');
  line.style.cssText = 'font-size:12px; line-height:1.4;';

  var nameSpan = document.createElement('span');
  nameSpan.style.cssText = 'font-weight:700; color:' + color + '; margin-right:4px;';
  nameSpan.textContent = player + ':';   // textContent — XSS safe

  var textSpan = document.createElement('span');
  textSpan.style.cssText = 'color:#cbd5e0;';
  textSpan.textContent = text;           // textContent — XSS safe

  line.appendChild(nameSpan);
  line.appendChild(textSpan);
  chatLog.appendChild(line);

  chatWindow.setContent(chatLog);
}

// Append messages with delays to simulate live chat
chatMessages.forEach(function (msg, i) {
  setTimeout(function () {
    appendMessage(msg.player, msg.color, msg.text);
  }, i * 1200);
});

// Add your own: appendMessage('you', '#68d391', 'hello world')


// ─── [E04] Admin panel ────────────────────────────────────────────────────────
// A control panel with buttons that trigger actions.
// Demonstrates interactive content with button handlers.

HaxUI.destroyAll();

var admin = HaxUI.createWindow({
  id:     'admin',
  title:  '⚙️ Admin Panel',
  width:  220,
  height: 240,
  x:      20,
  y:      20
});

var node = document.createElement('div');
node.style.cssText = 'display:flex; flex-direction:column; gap:8px;';

var actions = [
  { label: '🔴 Kick player',    color: '#fc8181', fn: 'kickPlayer'   },
  { label: '🔇 Mute player',    color: '#f6ad55', fn: 'mutePlayer'   },
  { label: '🔄 Reset scores',   color: '#63b3ed', fn: 'resetScores'  },
  { label: '⏸️  Pause match',   color: '#68d391', fn: 'pauseMatch'   },
  { label: '🗑️  Clear chat',    color: '#718096', fn: 'clearChat'    },
];

actions.forEach(function (action) {
  var btn = document.createElement('button');
  btn.style.cssText = [
    'display:block',
    'width:100%',
    'padding:6px 10px',
    'background:rgba(255,255,255,0.05)',
    'border:1px solid rgba(255,255,255,0.1)',
    'border-left: 3px solid ' + action.color,
    'border-radius:3px',
    'color:' + action.color,
    'font-size:12px',
    'text-align:left',
    'cursor:pointer',
  ].join(';');

  btn.textContent = action.label;

  btn.addEventListener('mouseover', function () {
    btn.style.background = 'rgba(255,255,255,0.09)';
  });
  btn.addEventListener('mouseout', function () {
    btn.style.background = 'rgba(255,255,255,0.05)';
  });
  btn.addEventListener('click', function () {
    console.log('[HaxUI Admin] Action triggered:', action.fn);
    // Replace with real HaxBall room API calls:
    // e.g. room.kickPlayer(playerId, 'reason', false)
  });

  node.appendChild(btn);
});

admin.setContent(node);


// ─── [E05] Multi-window dashboard ─────────────────────────────────────────────
// All windows open at once forming a dashboard layout.
// Demonstrates multiple windows coexisting with correct z-index stacking.

HaxUI.destroyAll();

// Scoreboard — top left
var dash_score = HaxUI.createWindow({
  id: 'dash-score', title: '⚽ Score', width: 180, height: 90, x: 16, y: 16,
  content: '<div style="text-align:center;"><span style="font-size:28px;font-weight:700;color:#fc8181;">2</span><span style="font-size:18px;color:#4a5568;margin:0 8px;">—</span><span style="font-size:28px;font-weight:700;color:#63b3ed;">1</span></div>'
});

// Timer — top center
var dash_timer = HaxUI.createWindow({
  id: 'dash-timer', title: '⏱ Time', width: 130, height: 70, x: 212, y: 16,
  content: '<div style="text-align:center;font-size:24px;font-weight:700;color:#68d391;">04:32</div>'
});

// Players — left
var dash_players = HaxUI.createWindow({
  id: 'dash-players', title: '👥 Players', width: 180, height: 160, x: 16, y: 122
});

var playerNode = document.createElement('div');
playerNode.style.cssText = 'display:flex;flex-direction:column;gap:4px;';
['mcvn ⚽⚽', 'striker ⚽', 'goalie'].forEach(function(p) {
  var row = document.createElement('div');
  row.style.cssText = 'font-size:12px;color:#cbd5e0;padding:2px 0;border-bottom:1px solid rgba(255,255,255,0.05);';
  row.textContent = p;
  playerNode.appendChild(row);
});
dash_players.setContent(playerNode);

// Chat — right
var dash_chat = HaxUI.createWindow({
  id: 'dash-chat', title: '💬 Chat', width: 200, height: 200, x: 212, y: 102,
  content: '<div style="font-size:12px;color:#718096;">Waiting for messages...</div>'
});

// Diagnostics — bottom
var dash_diag = HaxUI.createWindow({
  id: 'dash-diag', title: '🔧 Framework', width: 395, height: 70, x: 16, y: 298
});

var diag = HaxUI.diagnostics();
var diagNode = document.createElement('div');
diagNode.style.cssText = 'display:flex;gap:16px;font-size:11px;color:#718096;';
['mode: ' + diag.mode, 'windows: ' + diag.windowCount, 'baseZ: ' + diag.baseZ, 'v' + diag.version].forEach(function(item) {
  var span = document.createElement('span');
  span.textContent = item;
  diagNode.appendChild(span);
});
dash_diag.setContent(diagNode);

console.log('[HaxUI] Dashboard ready —', HaxUI.diagnostics());

// Destroy all with: HaxUI.destroyAll()


// ─── [E06] Button that opens a window + static window ────────────────────────
// Demonstrates onOpenWindow (no manual onClick + createWindow wiring needed)
// and draggable: false (window shows a 📌 pin instead of ✛ in the header).

HaxUI.destroyAll();

// A static (non-draggable) window with the haxball theme
HaxUI.createWindow({
  id:        'pinned-info',
  title:     'Server Info',
  theme:     'haxball',
  draggable: false,
  width:     220,
  height:    100,
  x:         20,
  y:         20,
  content:   '<p>This window is pinned — try dragging it, it won\'t move.</p>'
});

// A button that opens/shows a window on click — no onClick needed
HaxUI.createButton({
  id:    'open-stats-btn',
  label: '📊 Open Stats',
  onOpenWindow: {
    id:      'quick-stats',
    title:   'Quick Stats',
    theme:   'haxball',
    width:   240,
    height:  140,
    x:       260,
    y:       20,
    content: '<p>Goals: 3<br>Possession: 58%</p>'
  }
});

// Click the button multiple times — it creates the window once,
// then just shows it again on every subsequent click.
