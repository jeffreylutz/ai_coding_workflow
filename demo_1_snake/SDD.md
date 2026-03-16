# Snake Game — Software Design Document

**Version:** 1.7
**Status:** Draft
**Last Updated:** 2026-03-15
**Project:** snake-game
**Tech Stack:** TypeScript 5.7+, Vite 6, Vitest 4, HTML5 Canvas 2D, localStorage

## 1. Technology Stack

| Technology | Version | Role |
|---|---|---|
| TypeScript | ^5.7.0 | Application language; strict mode, ES2020 target, ESNext modules, bundler module resolution |
| Vite | ^6.0.0 | Build tool and dev server; zero-config for TypeScript, HMR during development |
| Vitest | ^4.1.0 | Test runner; compatible with Vite config, runs unit tests |
| HTML5 Canvas 2D API | N/A (browser built-in) | Game rendering; 400x400px canvas, 2D context for drawing grid, snake, food, overlays |
| localStorage API | N/A (browser built-in) | Client-side persistence; high scores (`snake_highscore_{userId}`), settings (`snake_settings_{userId}`), auth data |
| Touch Events API | N/A (browser built-in) | Mobile input; swipe gesture detection via touchstart/touchend |
| requestAnimationFrame | N/A (browser built-in) | Render loop; 60fps frame callback for smooth animation |
| crypto.subtle | N/A (browser built-in) | Password hashing; PBKDF2 with random salt in auth system (D1.4) |
| crypto.randomUUID | N/A (browser built-in) | User ID generation; in auth system (with fallback for Safari <15.4, D7.1) |

Zero runtime npm dependencies. All game code uses only browser-native APIs. Build-time dependencies (TypeScript, Vite, Vitest) are devDependencies only and do not ship to the browser.

## 2. Project Structure

```
snake-game/
├── index.html                  # HTML entry point, loads /src/main.ts as ES module
├── package.json                # Project metadata, scripts (dev, build, preview, test), devDependencies
├── tsconfig.json               # TypeScript config: ES2020 target, ESNext modules, strict mode
├── PRD.md                      # Product Requirements Document
├── SDD.md                      # This file — Software Design Document
├── TASKS.md                    # Build task tracking
├── docs/
│   └── research/
│       ├── snake-game-requirements.md   # Gameplay requirements research
│       └── design-patterns.md           # Design patterns research
└── src/
    ├── main.ts                 # Application entry point — wires auth, game, renderer, input
    ├── auth/                   # Authentication module (existing — no new runtime deps; internal bug fixes and test files are permitted)
    │   ├── auth-service.ts     # Closure-based auth service singleton
    │   ├── auth-service.test.ts # Unit tests for auth-service
    │   ├── auth-ui.ts          # Auth UI (login/register overlay, logout button)
    │   ├── auth-ui.test.ts     # Unit tests for auth-ui
    │   ├── types.ts            # Auth types (User, SafeUser, AuthState, AuthResult, AuthChangeCallback)
    │   └── index.ts            # Barrel exports for auth module
    ├── game/                   # Game logic module (new)
    │   ├── game-service.ts     # Closure-based game service singleton (FSM, tick, collision, scoring)
    │   ├── game-service.test.ts # Unit tests for game-service
    │   ├── types.ts            # Game types (GameState, Direction, Position, GameEvent, GameConfig, WallMode)
    │   ├── types.test.ts        # Unit tests for game types and config
    │   ├── integration.test.ts  # Integration tests for game module
    │   └── index.ts            # Barrel exports for game module
    ├── renderer/               # Canvas rendering module (new)
    │   ├── canvas-renderer.ts  # Draws game state to Canvas 2D context, manages overlays
    │   ├── canvas-renderer.test.ts # Unit tests for canvas-renderer
    │   ├── colors.ts           # Color constants (as const object)
    │   ├── colors.test.ts       # Unit tests for color constants
    │   └── index.ts            # Barrel exports for renderer module
    ├── input/                  # Input handling module (new)
    │   ├── keyboard.ts         # Keyboard event listener, maps keys to game events with state-dependent behavior
    │   ├── keyboard.test.ts     # Unit tests for keyboard input handler
    │   ├── touch.ts            # Touch event listener, swipe for direction, tap for state transitions, double-tap for wall toggle
    │   ├── touch.test.ts        # Unit tests for touch input handler
    │   └── index.ts            # Barrel exports for input module
    └── e2e/                    # End-to-end test directory
        └── game-lifecycle.test.ts # E2E tests for full game lifecycle
```

- Each directory corresponds to one concern: auth (existing), game logic, rendering, input handling
- Each directory has a `types.ts` for domain types and an `index.ts` for barrel exports, matching the pattern in `src/auth/`
- `src/main.ts` is the composition root: it imports from barrel exports and wires modules together via callbacks

## 3. Type Definitions

### 3.1 Game Types (`src/game/types.ts`)

```typescript
export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export type GameState = 'MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

export type WallMode = 'death' | 'wrap';

export interface Position {
  x: number;  // grid column (0 to GRID_COLS - 1)
  y: number;  // grid row (0 to GRID_ROWS - 1)
}

export type GameEvent =
  | { type: 'START' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'RESTART' }
  | { type: 'COLLISION' }
  | { type: 'DIRECTION_CHANGE'; direction: Direction };

export interface GameSnapshot {
  state: GameState;
  snake: readonly Position[];
  food: Position;
  score: number;
  highScore: number;
  wallMode: WallMode;
  tickInterval: number;
}

export type GameChangeCallback = (snapshot: GameSnapshot) => void;
```

### 3.2 Renderer Types (`src/renderer/canvas-renderer.ts`)

```typescript
import type { GameSnapshot } from '../game/types';

export interface Renderer {
  render(snapshot: GameSnapshot): void;
  getCanvas(): HTMLCanvasElement;
  getContainer(): HTMLDivElement;
  resize(viewportWidth: number): void;
}
```

### 3.3 Auth Types (existing, `src/auth/types.ts`)

```typescript
export interface User {
  id: string;
  username: string;
  passwordHash: string;
  salt: string;
  createdAt: number;
}

export interface SafeUser {
  id: string;
  username: string;
  createdAt: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  currentUser: SafeUser | null;
}

export interface AuthResult {
  success: boolean;
  error: string | null;
  user: SafeUser | null;
}

export type AuthChangeCallback = (state: AuthState) => void;
```

These types are already implemented. `SafeUser` was introduced in D24.1 to sanitize the public auth snapshot API — `AuthState.currentUser` and `AuthResult.user` now use `SafeUser` (omitting `passwordHash` and `salt`) instead of `User`.

## 4. Game Configuration Constants

```typescript
// src/game/types.ts (or a separate constants file exported from src/game/index.ts)

export const GAME_CONFIG = {
  GRID_COLS: 20,
  GRID_ROWS: 20,
  CELL_SIZE: 20,
  CANVAS_WIDTH: 400,   // GRID_COLS * CELL_SIZE
  CANVAS_HEIGHT: 400,  // GRID_ROWS * CELL_SIZE
  INITIAL_TICK_MS: 150,
  MIN_TICK_MS: 60,
  TICK_DECREASE_PER_FOOD: 2,
  POINTS_PER_FOOD: 10,
  INITIAL_SNAKE_LENGTH: 3,
  INITIAL_DIRECTION: 'RIGHT' as const,
  INITIAL_HEAD_POSITION: { x: 10, y: 10 } as const,
  MAX_INPUT_QUEUE_SIZE: 2,
  SWIPE_THRESHOLD_PX: 30,
} as const;
```

`as const` makes all values literal types and all properties readonly, preventing accidental mutation. All game code references `GAME_CONFIG` rather than hardcoded numbers.

## 5. Color Constants

```typescript
// src/renderer/colors.ts

export const COLORS = {
  BACKGROUND: '#1a1a2e',
  GRID_LINE: '#16213e',
  SNAKE_BODY: '#00ff41',
  SNAKE_HEAD: '#00cc33',
  FOOD: '#ff0040',
  TEXT: '#e0e0e0',
  OVERLAY_BG: 'rgba(0, 0, 0, 0.7)',
} as const;
```

## 6. Module Design

### 6.1 Game Service (`src/game/game-service.ts`)

Pattern: Closure-based singleton, matching `createAuthService()` in `src/auth/auth-service.ts`.

The module exports a factory function `createGameService(userId: string)` that returns an object with these methods:

| Method | Signature | Purpose |
|---|---|---|
| `transition` | `(event: GameEvent) => void` | Validates and applies a state transition per the FSM table. Ignores invalid transitions silently. On `DIRECTION_CHANGE`, enqueues direction to the input buffer. On `START` / `RESTART`, resets game state and starts the loop. On `PAUSE`, stops the loop. On `RESUME`, restarts the loop. On `COLLISION`, stops the loop and updates high score. |
| `tick` | `() => void` | Advances game state by one step: dequeues up to `GAME_CONFIG.MAX_INPUT_QUEUE_SIZE` input commands, moves the snake head in the current direction, checks for food collision (grow + score + speed increase + spawn new food), checks for wall collision (death or wrap based on wallMode), checks for self-collision. If collision detected, calls `transition({ type: 'COLLISION' })`. |
| `getSnapshot` | `() => GameSnapshot` | Returns a readonly snapshot of the current game state for the renderer. The `snake` array is a deep copy — each Position object is cloned via `snake.map(p => ({ x: p.x, y: p.y }))`, not just the array container (D14.2). |
| `onGameChange` | `(callback: GameChangeCallback) => () => void` | Registers a listener called whenever game state changes. Returns an unsubscribe function. Matches the `onAuthChange` pattern. |
| `setWallMode` | `(mode: WallMode) => void` | Sets wall collision mode and persists to localStorage with key `snake_settings_{userId}`. |
| `destroy` | `() => void` | Cancels the `requestAnimationFrame` loop and clears all listeners. Called on logout. |

Private state encapsulated in the closure:
- `state: GameState` (starts as `'MENU'`)
- `snake: Position[]` (array of positions, head at index 0)
- `food: Position`
- `score: number`
- `highScore: number` (loaded from localStorage on creation)
- `wallMode: WallMode` (loaded from localStorage on creation, defaults to `'death'`)
- `tickInterval: number` (starts at `GAME_CONFIG.INITIAL_TICK_MS`)
- `direction: Direction` (current direction)
- `inputQueue: Direction[]` (buffered inputs, max length `GAME_CONFIG.MAX_INPUT_QUEUE_SIZE`)
- `listeners: GameChangeCallback[]`
- `animationFrameId: number | null`
- `lastTickTime: number` (timestamp of last tick for accumulator)

The singleton instance is created in `src/main.ts` after authentication confirms a user, passing `user.id`. It is destroyed on logout and recreated on next login.

FSM transition table (invalid transitions are silently ignored):

| Current State | Event | Next State | Side Effects |
|---|---|---|---|
| MENU | START | PLAYING | Reset snake to initial position derived from `GAME_CONFIG.INITIAL_HEAD_POSITION` and `GAME_CONFIG.INITIAL_SNAKE_LENGTH` (default: 3 segments starting at (10,10) going left), reset score to 0, set tickInterval to 150ms, spawn food at random unoccupied cell, start requestAnimationFrame loop |
| PLAYING | PAUSE | PAUSED | Cancel requestAnimationFrame, record pause time |
| PLAYING | COLLISION | GAME_OVER | Cancel requestAnimationFrame, update highScore in localStorage if score > highScore |
| PAUSED | RESUME | PLAYING | Restart requestAnimationFrame loop, reset lastTickTime to current timestamp |
| GAME_OVER | RESTART | PLAYING | Same side effects as MENU → START |

Game loop (inside requestAnimationFrame callback):
1. Read current timestamp from the `requestAnimationFrame` callback parameter
2. Calculate elapsed time: `timestamp - lastTickTime`
3. If elapsed >= tickInterval: call `tick()`, set `lastTickTime = timestamp`
4. Call `notifyListeners()` (so renderer draws current state every frame)
5. If `animationFrameId` is not null (i.e., `stopLoop()` was not called during `tick()`), request next frame via `requestAnimationFrame`. This guard prevents rescheduling after a COLLISION transition fires mid-frame (D12.2).

### 6.2 Keyboard Input (`src/input/keyboard.ts`)

Exports: `setupKeyboardInput(gameService: { transition: (event: GameEvent) => void; getSnapshot: () => GameSnapshot; setWallMode: (mode: WallMode) => void }): () => void`

- Registers a `keydown` event listener on `document`
- Maps keys to game events with state-dependent behavior:
  - `w` / `W`:
    - If `snapshot.state` is `'MENU'` or `'GAME_OVER'`: toggles wall mode by calling `gameService.setWallMode()` with the opposite of the current `snapshot.wallMode` (D1.2, D8.2)
    - Otherwise (PLAYING/PAUSED): dispatches `{ type: 'DIRECTION_CHANGE', direction: 'UP' }`
    - Always calls `e.preventDefault()`
  - `ArrowUp` → `{ type: 'DIRECTION_CHANGE', direction: 'UP' }` (always calls `e.preventDefault()`)
  - `ArrowDown` / `s` / `S` → `{ type: 'DIRECTION_CHANGE', direction: 'DOWN' }` (always calls `e.preventDefault()`)
  - `ArrowLeft` / `a` / `A` → `{ type: 'DIRECTION_CHANGE', direction: 'LEFT' }` (always calls `e.preventDefault()`)
  - `ArrowRight` / `d` / `D` → `{ type: 'DIRECTION_CHANGE', direction: 'RIGHT' }` (always calls `e.preventDefault()`)
  - `Space` / `Enter`: state-conditional (D10.2)
    - If `snapshot.state === 'MENU'`: calls `e.preventDefault()`, dispatches `{ type: 'START' }`
    - If `snapshot.state === 'GAME_OVER'`: calls `e.preventDefault()`, dispatches `{ type: 'RESTART' }`
    - Otherwise: does NOT call `e.preventDefault()` and does NOT dispatch any event
  - `Escape`: state-conditional (D11.1)
    - If `snapshot.state === 'PLAYING'`: calls `e.preventDefault()`, dispatches `{ type: 'PAUSE' }`
    - If `snapshot.state === 'PAUSED'`: calls `e.preventDefault()`, dispatches `{ type: 'RESUME' }`
    - Otherwise: does NOT call `e.preventDefault()` and does NOT dispatch any event
- Returns an unsubscribe function that removes the `keydown` listener

### 6.3 Touch Input (`src/input/touch.ts`)

Exports: `setupTouchInput(gameService: { transition: (event: GameEvent) => void; getSnapshot: () => GameSnapshot; setWallMode: (mode: WallMode) => void }, canvas: HTMLCanvasElement): () => void`

- Registers `touchstart` and `touchend` listeners on the canvas element with `{ passive: false }`
- On `touchstart`: calls `e.preventDefault()`, records `touch.clientX` and `touch.clientY` of `touches[0]`
- On `touchend`: calls `e.preventDefault()`, calculates `deltaX` and `deltaY`
  - **Tap detection** (both deltas below `GAME_CONFIG.SWIPE_THRESHOLD_PX`):
    - Reads `snapshot = gameService.getSnapshot()` and `now = Date.now()`
    - If `snapshot.state` is `'MENU'` or `'GAME_OVER'` (D1.3, D8.2):
      - **Double-tap** (within 300ms of last tap): clears pending start timer, toggles wall mode via `gameService.setWallMode()`, resets `lastTapTime` to 0 (D4.2)
      - **Single tap**: records `lastTapTime`, captures `eventType` as `'START'` or `'RESTART'` based on current state, then sets a 300ms `setTimeout` to dispatch `gameService.transition({ type: eventType })` — event type is captured before the timeout to avoid stale state reads (D1.3)
    - If `snapshot.state === 'PLAYING'`: dispatches `{ type: 'PAUSE' }` (D1.3)
    - If `snapshot.state === 'PAUSED'`: dispatches `{ type: 'RESUME' }` (D1.3)
  - **Swipe detection** (at least one delta >= threshold):
    - If `|deltaX| >= |deltaY|`: direction is `deltaX > 0 ? 'RIGHT' : 'LEFT'`
    - Else: direction is `deltaY > 0 ? 'DOWN' : 'UP'`
    - Dispatches `gameService.transition({ type: 'DIRECTION_CHANGE', direction })`
- Returns an unsubscribe function that clears any pending start timer and removes both touch listeners

### 6.4 Canvas Renderer (`src/renderer/canvas-renderer.ts`)

Factory function: `createCanvasRenderer(): Renderer`

**DOM structure** (outermost to innermost):
- `clipWrapper` (div) — returned by `getContainer()`, used for mobile overflow clipping
  - `container` (div) — scaled via CSS transform on mobile
    - `scoreBar` (div, width=400px, flex layout) — contains two cached `<span>` elements for score and high score text
    - `canvas` (HTMLCanvasElement, 400x400) — has `style.touchAction = 'none'` (D10.3)

- Creates the above DOM hierarchy at construction time. Score bar spans (`scoreSpan`, `highSpan`) are cached — only `textContent` is updated per frame (D3.3).
- Implements `render(snapshot: GameSnapshot): void`:
  1. Clear entire canvas with `COLORS.BACKGROUND`
  2. Draw grid lines every `CELL_SIZE` pixels using `COLORS.GRID_LINE`
  3. If `snapshot.state !== 'MENU'`: draw food, snake body, and snake head (D7.2 — skip in MENU state to avoid drawing uninitialized food at {0,0})
  4. State overlays:
     - `MENU`: semi-transparent overlay with "Snake Game" title, "Tap or Press Space/Enter to Start", high score, wall mode, "Double-Tap or Press W to Toggle Wall Mode"
     - `PAUSED`: overlay with "Paused", "Tap or Press Escape to Resume"
     - `GAME_OVER`: overlay with "Game Over", score, high score, "Tap or Press Space/Enter to Play Again", wall mode, "Double-Tap or Press W to Toggle Wall Mode" (D8.2)
  5. Update cached score bar span `textContent` values (not DOM reconstruction)
- Implements `getCanvas(): HTMLCanvasElement`: returns the canvas element (for input event binding)
- Implements `getContainer(): HTMLDivElement`: returns the `clipWrapper` element (for DOM insertion) (D2.1)
- Implements `resize(viewportWidth: number): void`:
  - If `viewportWidth < 440`: calculates `scale = (viewportWidth - 40) / 400`, applies CSS `transform: scale(scale)` with `transform-origin: top left` to `container`; sets `clipWrapper` width to `(viewportWidth - 40)px`, height to `(scoreBarHeight + canvasHeight) * scale + 'px'`, and `overflow: hidden` (D3.2, D5.1, D6.1)
  - Otherwise: removes all transform and clip styles

### 6.5 Main Entry Point (`src/main.ts`)

Wires all modules together. Order: register auth listener BEFORE calling `initAuth()` (D3.1 — ensures the game-setup listener is in place before `restoreSession()` fires).

1. Import `initAuth` and `authService` from `'./auth'`
2. Import `createGameService` from `'./game'`
3. Import `createCanvasRenderer` from `'./renderer'`
4. Import `setupKeyboardInput` from `'./input/keyboard'`
5. Import `setupTouchInput` from `'./input/touch'`
6. Get `appContainer` from `document.querySelector<HTMLDivElement>('#app')!`
7. Declare `let` variables for cleanup functions: `cleanupKeyboard`, `cleanupTouch`, `unsubscribeGame`, `gameService`, `renderer`, `resizeHandler`
8. Subscribe to `authService.onAuthChange((authState) => { ... })`:
   - If `authState.isAuthenticated` and `authState.currentUser`:
     - Create renderer: `renderer = createCanvasRenderer()`
     - Append container to appContainer: `appContainer.appendChild(renderer.getContainer())` (uses `getContainer()`, not `getCanvas()`)
     - Create game service: `gameService = createGameService(authState.currentUser.id)`
     - Subscribe to game changes: `unsubscribeGame = gameService.onGameChange((snapshot) => renderer!.render(snapshot))`
     - Setup keyboard: `cleanupKeyboard = setupKeyboardInput(gameService)`
     - Setup touch: `cleanupTouch = setupTouchInput(gameService, renderer.getCanvas())`
     - Setup resize handler: listen to `window.resize` and call `renderer.resize(window.innerWidth)`
     - Call `requestAnimationFrame(() => renderer!.resize(window.innerWidth))` once (D10.1 — deferred to ensure layout is computed after display:none is removed)
     - Render initial state: `renderer.render(gameService.getSnapshot())`
   - If not authenticated (logout):
     - Call cleanup functions if they exist: `cleanupKeyboard?.()`, `cleanupTouch?.()`, `unsubscribeGame?.()`, `gameService?.destroy()`
     - Remove resize listener if it exists
     - Remove container from DOM via `renderer.getContainer().remove()`
     - Set all references to undefined
9. Call `initAuth(appContainer)` — AFTER the `onAuthChange` subscription (D3.1)

## 7. Data Flow

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

## 8. Game Algorithms

### 8.1 Snake Movement

On each tick:
1. Dequeue up to `GAME_CONFIG.MAX_INPUT_QUEUE_SIZE` directions from the input queue. For each, validate it is not the opposite of the current direction (UP↔DOWN, LEFT↔RIGHT). If valid, update `direction`.
2. Calculate new head position based on current direction:
   - UP: `{ x: head.x, y: head.y - 1 }`
   - DOWN: `{ x: head.x, y: head.y + 1 }`
   - LEFT: `{ x: head.x - 1, y: head.y }`
   - RIGHT: `{ x: head.x + 1, y: head.y }`
3. Apply wall collision logic (see 8.2)
4. Check self-collision: if the new head position matches any position in the snake body array excluding the tail segment (index 0 to snake.length - 2) → game over (D12.1)
5. Add new head to index 0 of the snake array
6. Check food collision: if head position equals food position → score += 10, tickInterval = max(tickInterval - 2, 60), spawn new food, do NOT remove tail
7. If no food collision: remove last element of snake array (tail moves forward)

### 8.2 Wall Collision

If `wallMode === 'death'`:
- If newHead.x < 0 or newHead.x >= GRID_COLS or newHead.y < 0 or newHead.y >= GRID_ROWS → game over

If `wallMode === 'wrap'`:
- If newHead.x < 0 → newHead.x = GRID_COLS - 1
- If newHead.x >= GRID_COLS → newHead.x = 0
- If newHead.y < 0 → newHead.y = GRID_ROWS - 1
- If newHead.y >= GRID_ROWS → newHead.y = 0

### 8.3 Food Spawning

1. Collect all positions occupied by the snake into a Set (using key `"x,y"` for lookup)
2. Build a list of all grid cells not in the Set
3. If the list is empty: the snake fills the entire grid (win condition) — transition to GAME_OVER
4. Pick a random index from the list using `Math.floor(Math.random() * list.length)`
5. Return the Position at that index

### 8.4 Self-Collision Detection

After calculating the new head position (and applying wall wrapping if applicable):
- Iterate through `snake` array from index 0 to snake.length - 2 (excluding the tail segment; the full body before the new head is added)
- If any position matches the new head position (`pos.x === newHead.x && pos.y === newHead.y`) → collision detected

Note: check self-collision BEFORE adding the new head to the array. The iteration runs from index 0 to `snake.length - 2` (exclusive of the last segment). The tail segment (index `snake.length - 1`) is excluded because it will be removed later in the same tick (unless food is eaten, but food can never occupy the tail position since `spawnFood()` only picks unoccupied cells). This allows tail-chasing, a core Snake survival strategy (D12.1).

## 9. localStorage Schema

| Key Pattern | Value Type | Example | Read When | Written When |
|---|---|---|---|---|
| `snake_auth_users` | `JSON string (User[])` | `[{"id":"abc","username":"alice",...}]` | Auth service init, login, register | Register, (not modified by game) |
| `snake_auth_session` | `string (userId)` | `"abc-123-def"` | Auth service `restoreSession()` | Login, register, logout (removed) |
| `snake_highscore_{userId}` | `string (integer)` | `"350"` | Game service creation | Game over, if score > current high score |
| `snake_settings_{userId}` | `JSON string ({ wallMode })` | `{"wallMode":"wrap"}` | Game service creation | `setWallMode()` called |

## 10. Error Handling

- localStorage read failures (corrupt JSON): catch with try/catch, return default values (highScore: 0, wallMode: 'death')
- localStorage write failures (quota exceeded): catch with try/catch, log to console.warn, continue gameplay without persistence
- Canvas `getContext('2d')` returns null: throw an Error with message "Canvas 2D context not supported" — this is a fatal error, game cannot run
- Invalid game state transitions: silently ignored (no error thrown, no console log) — the FSM simply does not transition
- Touch events on non-touch devices: no error — the listeners register but never fire

## 11. Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---|---|---|---|---|
| HTML5 Canvas 2D | 90+ | 90+ | 15+ | 90+ |
| localStorage | 90+ | 90+ | 15+ | 90+ |
| requestAnimationFrame | 90+ | 90+ | 15+ | 90+ |
| Touch Events | 90+ | 90+ | 15+ | 90+ |
| crypto.subtle | 90+ | 90+ | 15+ | 90+ |
| crypto.randomUUID | 92+ | 95+ | 15.4+ | 92+ |
| ES2020 (optional chaining, nullish coalescing) | 90+ | 90+ | 15+ | 90+ |

Target: ES2020 (matches tsconfig.json `"target": "ES2020"`).

## 12. Constraints and Rules

1. Do NOT add runtime npm dependencies to the auth module (`src/auth/`) — its public API surface (`AuthService`, `AuthState`, `initAuth`) is stable; internal bug fixes (e.g. snapshot isolation D17.1) and test files are permitted
2. Do NOT add any runtime npm dependencies — zero runtime dependencies is a hard requirement
3. Do NOT use `innerHTML` to render any user-controlled values — use `document.createElement`, `textContent`, and `setAttribute` for all DOM construction
4. Do NOT use `setInterval` for the game loop — use an accumulator pattern inside `requestAnimationFrame`
5. Do NOT use ES6 classes for game state management — use closure-based factory functions matching the `createAuthService` pattern
6. Do NOT use global mutable `let` variables at module scope for game state — encapsulate all mutable state inside closures
7. All mutable game state must be private to the closure — expose only via methods that return copies or readonly views
8. All TypeScript code must compile with `strict: true` and `noEmit: true` (matching tsconfig.json)
9. All files must use ES module syntax (`import`/`export`) — no CommonJS
10. Game logic files (`src/game/`) must NOT import Canvas, DOM, or browser rendering APIs — they operate on abstract grid positions only
11. Renderer files (`src/renderer/`) must NOT import game logic — they receive game state via the `GameSnapshot` interface only

## 13. Testing Strategy

| Test Type | Scope | Runner | Location |
|---|---|---|---|
| Unit tests | Game logic: tick, collision detection, food spawning, FSM transitions, input queue | Vitest | `src/game/game-service.test.ts` |
| Unit tests | Game types and configuration constants | Vitest | `src/game/types.test.ts` |
| Unit tests | Keyboard input handling, key mapping, preventDefault logic | Vitest | `src/input/keyboard.test.ts` |
| Unit tests | Touch input handling, swipe/tap gesture detection | Vitest | `src/input/touch.test.ts` |
| Unit tests | Canvas renderer: overlay text, food/snake drawing, score bar, MENU state guard | Vitest with DOM mocking | `src/renderer/canvas-renderer.test.ts` |
| Unit tests | Color palette constants | Vitest | `src/renderer/colors.test.ts` |
| Unit tests | Auth service: registration, login, session, password hashing, snapshot isolation | Vitest | `src/auth/auth-service.test.ts` |
| Unit tests | Auth UI: form rendering, mode toggle, submit handling, credential clearing | Vitest with DOM mocking | `src/auth/auth-ui.test.ts` |
| Integration tests | Full game flow: start → play → eat food → game over → restart | Vitest with DOM mocking | `src/game/integration.test.ts` |
| E2E tests | Game lifecycle: init → play → pause → resume → game over → restart | Vitest with DOM mocking | `src/e2e/game-lifecycle.test.ts` |

Test command: `npm run test` (runs `vitest run --passWithNoTests`)

Game logic tests do NOT require DOM or Canvas — they test pure state transitions. Renderer and auth UI tests use Vitest DOM mocking (jsdom/happy-dom) for Canvas and DOM APIs.

## 14. Revision History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | 2026-03-14 | Builder | Initial SDD |
| 1.1 | 2026-03-15 | Builder | Updated to reflect D1–D12 implementation changes: removed input-queue.ts references (D1.5), added salt to User type (D1.4), added getContainer() to Renderer (D2.1), rewrote keyboard/touch/renderer/main sections for wall toggle (D1.2/D8.2), tap gestures (D1.3/D4.2), scoreBar/container/clipWrapper DOM hierarchy (D2.1/D3.2/D5.1/D6.1), MENU state guard (D7.2), auth-before-init order (D3.1), conditional preventDefault (D10.2/D11.1), touch-action CSS (D10.3), requestAnimationFrame resize (D10.1), tail-excluded self-collision (D12.1), PBKDF2 hashing (D1.4) |
| 1.2 | 2026-03-15 | Builder | Updated overlay text to Space/Enter (D14.3), getSnapshot deep-copy description (D14.2), resetGame to reference GAME_CONFIG constants (D15.2) |
| 1.3 | 2026-03-15 | Builder | Fixed game loop step 5 to include animationFrameId guard (D12.2), tick description to reference GAME_CONFIG.MAX_INPUT_QUEUE_SIZE instead of hardcoded 2 (D16.2) |
| 1.4 | 2026-03-15 | Builder | Updated section 13 Testing Strategy: corrected test file locations from __tests__/ subdirectories to colocated .test.ts files, added renderer unit tests (canvas-renderer.test.ts, colors.test.ts), added auth tests (auth-service.test.ts, auth-ui.test.ts), replaced deferred-renderer statement (D19.2) |
| 1.5 | 2026-03-15 | Builder | Revised section 12 constraint 1 to permit auth bug fixes and test files (D19.3) |
| 1.6 | 2026-03-15 | Builder | Updated section 2 project structure to add colocated test files and e2e directory (D21.1) |
| 1.7 | 2026-03-15 | Builder | Added SafeUser interface to section 3.3, updated AuthState.currentUser and AuthResult.user from User to SafeUser, revised "do not modify" note, updated section 2 auth types listing to include SafeUser (D24.1, D25.2) |
