# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| 1.0.x (current) | ✅ |
| 0.x | ❌ |

---

## Scope

HaxBall UI Framework runs entirely in the browser as a client-side JavaScript
library. The attack surface is narrow but real — the framework handles external
strings (player names, chat messages, server data) and injects them into the
DOM on behalf of callers.

### In scope

- **XSS via `setContent()`** — any bypass of the `DOMParser`-based sanitization
  in `utils/sanitize.js` that allows arbitrary script execution when passing an
  untrusted string
- **Event isolation bypass** — any technique that allows events from inside a
  HaxUI window to reach the HaxBall game engine when they shouldn't
  (keyboard input leaking to game controls, etc.)
- **Shadow DOM escape** — CSS or JS leaking out of a HaxUI window's Shadow Root
  into the host page in a way that could be exploited
- **Prototype pollution** — any input that modifies `Object.prototype` or other
  built-ins through the framework's public API

### Out of scope

- Vulnerabilities in HaxBall itself (report those to the HaxBall team)
- Vulnerabilities in the browser or browser extensions
- Issues that require the attacker to already have code execution in the page
- Social engineering attacks
- The fact that the framework runs in the browser and can be inspected —
  this is by design, not a vulnerability

---

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Report security issues privately by emailing the maintainer directly or by
using [GitHub's private vulnerability reporting](https://github.com/mcvn2wrgx2-cpu/haxball-ui-framework/security/advisories/new).

Please include:

- A clear description of the vulnerability
- Steps to reproduce — a minimal code snippet that demonstrates the issue
- The version of the framework affected
- The potential impact (what an attacker could do)

---

## Response Timeline

| Stage | Target time |
|---|---|
| Acknowledgement | 48 hours |
| Initial assessment | 5 business days |
| Fix or mitigation | Depends on severity |
| Public disclosure | After fix is released |

---

## Security Design

The framework was built with the HaxBall injection context in mind. These are
the security decisions already in place and why they matter:

### `setContent()` — DOMParser sanitization

External strings (player names, chat messages, server data) **never** touch
`innerHTML` directly. Every string passed to `setContent()` goes through
`utils/sanitize.js`, which uses `DOMParser` to parse the string in an isolated
document (scripts don't execute there), walks the node tree recursively,
strips any tag not in `ALLOWED_TAGS`, and removes any attribute starting with
`on` or not in `ALLOWED_ATTRS`.

Callers who pass a `Node` instead of a string are responsible for their own
safety — the framework inserts it via `appendChild` without further processing.
The recommended pattern for external data is always `node.textContent = value`
(which escapes HTML), never `node.innerHTML = value`.

### Event isolation — `EventGuard`

The framework uses a per-event-type policy, not a blanket `stopPropagation`
on everything. Mouse events (click, mousedown, mouseup) are always blocked from
reaching the game. Keyboard events are only blocked when an interactive element
(`input`, `textarea`, `select`) inside a HaxUI window has focus — preventing
the game from receiving keystrokes the user intended for a text field.

### One global name

`window.HaxUI` is the only name the framework writes to the global scope.
All internal modules are enclosed in IIFEs (in the bundle) or ES module scope
(in `src/`) and are never accessible from outside the framework.

### `WindowHandle._destroyed` — safe post-destroy calls

Every method on a `WindowHandle` checks an internal `_destroyed` flag before
doing anything. Post-destroy calls are silent no-ops — they never throw. This
prevents error cascades in HaxBall game callbacks where a try/catch is often
absent.

---

## Known Limitations

- The `style` attribute is allowed in `setContent()` strings. CSS-based attacks
  (e.g. `expression()` in old IE, or `url(javascript:...)`) are not a concern
  in modern browsers, but callers should be aware that allowing `style` means
  callers' content can affect the visual layout of the window.
- The framework does not sanitize `Node` inputs to `setContent()` — that is
  intentional and documented. Callers must sanitize their own nodes if they
  contain external data.
