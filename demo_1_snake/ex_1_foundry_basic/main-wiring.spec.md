# OpenSpec: Main Entry Point Wiring

**Module:** `src/main.ts`
**Status:** Specification
**Version:** 1.2
**Date:** 2026-03-15
**Operation:** MODIFY (file exists with auth initialization)

## Current File Content

```typescript
import { initAuth } from './auth';

const appContainer = document.querySelector<HTMLDivElement>('#app')!;
initAuth(appContainer);
```

## Required Imports

```typescript
import { initAuth, authService } from './auth';
import { createGameService } from './game';
import { createCanvasRenderer } from './renderer';
import { setupKeyboardInput } from './input/keyboard';
import { setupTouchInput } from './input/touch';
```

## Module Wiring Logic

After imports:
1. Get `appContainer` via `document.querySelector<HTMLDivElement>('#app')!`
2. Declare mutable references (all typed, all initialized to `undefined`):
   - `let cleanupKeyboard: (() => void) | undefined`
   - `let cleanupTouch: (() => void) | undefined`
   - `let unsubscribeGame: (() => void) | undefined`
   - `let gameService: ReturnType<typeof createGameService> | undefined`
   - `let renderer: ReturnType<typeof createCanvasRenderer> | undefined`
   - `let resizeHandler: (() => void) | undefined`
3. Subscribe to auth changes: `authService.onAuthChange((authState) => { ... })`
4. Call `initAuth(appContainer)` — this must be LAST so the auth change listener is registered before initAuth triggers restoreSession()

Inside the auth change callback:

**When authenticated** (`authState.isAuthenticated && authState.currentUser`):
1. `renderer = createCanvasRenderer()`
2. `appContainer.appendChild(renderer.getContainer())`
3. `gameService = createGameService(authState.currentUser.id)`
4. `unsubscribeGame = gameService.onGameChange((snapshot) => renderer!.render(snapshot))`
5. `cleanupKeyboard = setupKeyboardInput(gameService)`
6. `cleanupTouch = setupTouchInput(gameService, renderer.getCanvas())`
7. `resizeHandler = () => renderer!.resize(window.innerWidth)`
8. `window.addEventListener('resize', resizeHandler)`
9. `requestAnimationFrame(() => renderer!.resize(window.innerWidth))` — deferred to next animation frame so the DOM is visible and `scoreBar.offsetHeight` returns a correct value (see D10.1)
10. `renderer.render(gameService.getSnapshot())`

**When not authenticated** (logout):
1. `cleanupKeyboard?.()`
2. `cleanupTouch?.()`
3. `unsubscribeGame?.()`
4. `gameService?.destroy()`
5. If `resizeHandler`: `window.removeEventListener('resize', resizeHandler)`
6. If `renderer`: `renderer.getContainer().remove()`
7. Set all six variables to `undefined`

## Data Flow Summary

1. Browser loads `index.html`, which loads `src/main.ts` as an ES module
2. `main.ts` calls `initAuth(appContainer)`, which renders the auth overlay and restores any existing session
3. User logs in or session is restored → `authService` calls `onAuthChange` listeners with `{ isAuthenticated: true, currentUser: { id, username, ... } }`
4. `main.ts` auth change handler creates the renderer (canvas), game service (with userId), keyboard input, and touch input
5. Game service loads high score from `localStorage.getItem('snake_highscore_{userId}')` and wall mode from `localStorage.getItem('snake_settings_{userId}')`
6. Game service starts in `MENU` state. Renderer draws the menu overlay on the canvas
7. User presses Space → keyboard module calls `gameService.transition({ type: 'START' })`
8. Game service transitions to `PLAYING`: resets snake, spawns food, starts the requestAnimationFrame loop
9. Each animation frame: game service checks if elapsed time >= tickInterval. If yes, calls `tick()`. Then notifies all listeners with current snapshot
10. Renderer receives snapshot via `onGameChange` callback and draws the current frame
11. User presses arrow keys → keyboard module calls `gameService.transition({ type: 'DIRECTION_CHANGE', direction })` → game service enqueues direction
12. On each tick: game service dequeues up to `GAME_CONFIG.MAX_INPUT_QUEUE_SIZE` directions, moves snake, checks collisions, checks food eaten
13. Collision detected → game service calls `transition({ type: 'COLLISION' })` → state becomes `GAME_OVER` → renderer draws game over overlay
14. User presses Space → `transition({ type: 'RESTART' })` → new game begins
15. User clicks logout → auth service calls `onAuthChange` with `{ isAuthenticated: false }` → main.ts destroys game service and renderer → auth overlay appears

## Constraints

1. `src/main.ts` is the only file that imports from multiple modules — it is the composition root
2. No game logic in this file — it only wires modules via callbacks
3. Cleanup must be complete on logout — no dangling event listeners or animation frames
4. The auth module (`src/auth/`) public API surface (`AuthService`, `AuthState`, `initAuth`) is stable — internal bug fixes and test files are permitted but no new runtime dependencies
