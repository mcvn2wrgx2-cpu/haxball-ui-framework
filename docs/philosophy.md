## Design Decisions

Every decision responds to a specific HaxBall environment risk.

| Decision | Risk mitigated |
| :--- | :--- |
| Shadow DOM per window (with CSS namespace fallback) | HaxBall's global CSS bleeding into overlay elements |
| Single `window.HaxUI` namespace | Collisions with HaxBall's own globals or other scripts |
| `EventGuard` with per-event-type policy | Keyboard/mouse events leaking into the game |
| `BASE_Z = 9000`, configurable | Overlay windows rendering behind HaxBall's own menus |
| `MutationObserver` in `RootMount` | HaxBall clearing the DOM on room transitions |
| `DOMParser` in `setContent()` | XSS when rendering external strings (player names, chat) |
| `WindowHandle._destroyed` flag | Safe post-destroy calls — no errors inside game callbacks |
| Context detection in `RootMount.init()` | Script injected into the wrong frame (iframe environments) |
| Drag listeners attached/removed per-cycle, outside `EventRegistry` | Registry listeners persist for the window's lifetime — using them for drag caused the cursor to never release |
| `ButtonInjector` targets `.header-btns` with a `MutationObserver` fallback | Native button bar not mounted yet when the script runs |
| `buttonBorder: '0'` in the HaxBall theme | HaxBall's native buttons have no border — verified via `getComputedStyle()` on the live DOM, not assumed |

---

## Design Decisions

Every decision responds to a specific HaxBall environment risk.

| Decision | Risk mitigated |
| :--- | :--- |
| Shadow DOM per window (with CSS namespace fallback) | HaxBall's global CSS bleeding into overlay elements |
| Single `window.HaxUI` namespace | Collisions with HaxBall's own globals or other scripts |
| `EventGuard` with per-event-type policy | Keyboard/mouse events leaking into the game |
| `BASE_Z = 9000`, configurable | Overlay windows rendering behind HaxBall's own menus |
| `MutationObserver` in `RootMount` | HaxBall clearing the DOM on room transitions |
| `DOMParser` in `setContent()` | XSS when rendering external strings (player names, chat) |
| `WindowHandle._destroyed` flag | Safe post-destroy calls — no errors inside game callbacks |
| Context detection in `RootMount.init()` | Script injected into the wrong frame (iframe environments) |
| Drag listeners attached/removed per-cycle, outside `EventRegistry` | Registry listeners persist for the window's lifetime — using them for drag caused the cursor to never release |
| `ButtonInjector` targets `.header-btns` with a `MutationObserver` fallback | Native button bar not mounted yet when the script runs |
| `buttonBorder: '0'` in the HaxBall theme | HaxBall's native buttons have no border — verified via `getComputedStyle()` on the live DOM, not assumed |
