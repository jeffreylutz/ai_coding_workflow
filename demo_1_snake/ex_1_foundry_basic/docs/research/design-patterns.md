# Software Design Patterns Research — Static Web Applications with TypeScript

**Purpose:** Inform the Software Design Document (SDD) for the Snake game project
**Project Context:** Browser-based Snake game, static web app, TypeScript + Vite, HTML5 Canvas, localStorage, zero runtime dependencies
**Date:** 2026-03-14

## 1. Existing Patterns in the Codebase

### 1.1 Closure-Based Singleton (Module Pattern)

The `createAuthService()` function in `src/auth/auth-service.ts` uses a closure to encapsulate private state. Two variables — `state` (of type `AuthState`) and `listeners` (an array of `AuthChangeCallback`) — are declared as `let` bindings inside the function body. They are inaccessible from outside the closure. The function returns a plain object exposing only the public API: `{ register, login, logout, getState, onAuthChange, restoreSession }`.

This pattern is used instead of ES6 classes for three reasons:

1. **No `this` binding issues.** All returned methods close over the same lexical scope. Callers can destructure (`const { login } = authService`) without losing context, which is not safe with class methods unless explicitly bound.
2. **True encapsulation.** The `state` and `listeners` variables are genuinely private — there is no way to access them from outside the closure. Class private fields (`#field`) achieve similar encapsulation but require the `this` receiver, reintroducing binding concerns.
3. **Simpler testing surface.** The returned object is a plain record of functions. Tests can call functions directly without instantiating a class or managing prototype chains.

The singleton instance is created at module scope on line 136: `export const authService = createAuthService()`. Because ES modules are evaluated once and cached, every file that imports `authService` receives the same instance.

This pattern should be reused for game state management. A `createGameService()` function would encapsulate snake position, food position, score, game state (FSM), and tick interval as private closure variables, returning a public API for advancing ticks, changing direction, and querying state.

### 1.2 Observer Pattern (Callback-Based)

The `onAuthChange(callback)` method in `src/auth/auth-service.ts` (line 114) implements the observer pattern. Callers register a callback of type `AuthChangeCallback` (defined in `src/auth/types.ts` as `(state: AuthState) => void`). The callback is pushed into the private `listeners` array. Whenever `setState()` is called (line 51), the `notifyListeners()` function iterates over all registered callbacks and invokes each one with the current `state`.

The `onAuthChange` method returns an unsubscribe function: a closure that removes the callback from the `listeners` array using `Array.filter`. This prevents memory leaks when a listener is no longer needed.

Benefits of this pattern:

1. **Decouples state changes from UI updates.** The auth service does not import or reference any UI code. The UI in `src/auth/auth-ui.ts` registers a listener (line 132) and reacts to state changes independently.
2. **Supports multiple listeners.** Any number of modules can subscribe to auth state changes without the service needing to know about them.
3. **Prevents polling.** Consumers are notified immediately on state change rather than repeatedly checking `getState()`.

This pattern should be reused for game state changes. An `onGameStateChange(callback)` method would notify the renderer when game state transitions occur (e.g., from `MENU` to `PLAYING`), and notify the score display when the score updates.

### 1.3 DOM API Construction (No innerHTML)

The `src/auth/auth-ui.ts` file builds all UI elements using DOM API methods exclusively. The `createAuthUI()` function (line 4) creates elements with `document.createElement`, sets text content with `textContent`, configures attributes with property assignment (e.g., `usernameInput.type = 'text'`), and attaches event handlers with `addEventListener`. The `buildToggleContent()` function (line 70) clears content with `toggleP.textContent = ''` and builds new content by appending text nodes and anchor elements.

At no point does the file use `innerHTML`.

The security benefit is XSS prevention. The auth UI displays user-controlled values — specifically, the username entered by the user. If `innerHTML` were used to render this value, a malicious username containing `<script>` tags or event handler attributes would execute arbitrary JavaScript. Using `textContent` ensures that user input is always treated as plain text, never as HTML.

All game UI elements — the menu screen, game over overlay, score display, pause overlay, and settings controls — must follow this same pattern. Every UI element must be constructed with `document.createElement`, `textContent`, `setAttribute`, and `addEventListener`.

### 1.4 Barrel Exports

The `src/auth/index.ts` file re-exports selected items from the module's internal files:

- `authService` from `./auth-service`
- `initAuth` from `./auth-ui`
- Type exports (`User`, `AuthState`, `AuthResult`, `AuthChangeCallback`) from `./types`

Consumers import from `'./auth'` (e.g., `import { initAuth } from './auth'` in `src/main.ts` line 1) without knowing the internal file structure. If the auth module is refactored (files renamed, split, or merged), only `index.ts` needs to change — all consumer imports remain stable.

Each new module (game, renderer, input) should have its own `index.ts` barrel file that re-exports the module's public API and types.

## 2. Patterns Needed for the Snake Game

### 2.1 Finite State Machine (FSM)

The game requirements document (`docs/research/snake-game-requirements.md`, section 3) defines four game states: `MENU`, `PLAYING`, `PAUSED`, and `GAME_OVER`.

The FSM pattern works as follows:

1. **Define states** as a TypeScript string literal union type or enum.
2. **Define valid transitions** as a mapping from (current state, event) to next state.
3. **Enforce transitions** through a single `transition(event)` function that looks up the (current state, event) pair in the mapping. If the pair exists, the state is updated. If it does not exist, the transition is rejected (silently ignored or logged as a warning).

**State Transition Table:**

| Current State | Event | Next State |
|---------------|-------|------------|
| `MENU` | `START` | `PLAYING` |
| `PLAYING` | `PAUSE` | `PAUSED` |
| `PLAYING` | `COLLISION` | `GAME_OVER` |
| `PAUSED` | `RESUME` | `PLAYING` |
| `GAME_OVER` | `RESTART` | `PLAYING` |

An explicit FSM prevents invalid state transitions. Without it, nothing stops code from pausing the game while in the `MENU` state, or restarting the game while `PLAYING`. The transition function acts as a gatekeeper: only valid (state, event) pairs produce a state change.

Recommended implementation: use a TypeScript string literal union type (`type GameState = 'MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER'`) rather than a `const enum` or regular `enum`. String literal unions serialize naturally to JSON (for debugging or persistence), narrow correctly in `switch` statements, and do not generate extra JavaScript code at compile time.

### 2.2 Game Loop Pattern (Fixed Timestep with Variable Rendering)

The requirements specify two separate rates: rendering at 60fps via `requestAnimationFrame`, and game ticks at a separate interval that decreases from 150ms to 60ms as the player scores points (requirements section 6).

The pattern uses `requestAnimationFrame` as the single loop driver:

1. Each frame, `requestAnimationFrame` provides a high-resolution timestamp.
2. The loop calculates the elapsed time since the last frame and adds it to an **accumulator**.
3. When the accumulator exceeds the current tick interval, the loop advances game state (moves the snake, checks collisions, updates score) and subtracts the tick interval from the accumulator. This may happen zero or more times per frame.
4. After processing ticks, the loop renders the current game state to the Canvas.

The separation is critical: the **tick function** is a pure write operation — it advances game state. The **render function** is a pure read operation — it reads current game state and draws it to the Canvas. This decoupling means rendering is smooth at 60fps even when the game tick rate is 150ms (approximately every 9th frame) or 60ms (approximately every 4th frame).

Do NOT use `setInterval` for the game tick. `setInterval` has two problems: (1) timing drift — intervals are not guaranteed to fire at exact intervals, and errors accumulate over time; (2) `setInterval` continues to fire when the browser tab is hidden, wasting resources. The accumulator pattern inside `requestAnimationFrame` avoids both issues because `requestAnimationFrame` is automatically paused by the browser when the tab is not visible.

### 2.3 Command Pattern (Input Buffering)

The requirements specify that direction inputs are buffered, with up to 2 inputs queued per tick (requirements section 2).

The pattern works as follows:

1. **Keyboard and touch event handlers** push direction commands into a queue (a simple array). When the player presses an arrow key or swipes on a touch screen, the handler creates a direction command (`'UP'`, `'DOWN'`, `'LEFT'`, `'RIGHT'`) and appends it to the queue.
2. **On each game tick**, the tick function dequeues up to 2 commands from the front of the queue and applies them sequentially. Each command is validated against the current direction to prevent reversal (e.g., if the snake is moving `RIGHT`, a `LEFT` command is discarded). After validation, the snake's direction is updated.
3. After processing, the queue retains any remaining commands for the next tick. The queue is cleared when the game transitions to `MENU` or `GAME_OVER`.

Input buffering matters because at high speeds (60ms ticks), a player may press two keys within a single tick. For example, to make a quick U-turn around a corner, a player moving right might press `UP` then `LEFT` within 60ms. Without buffering, only the last key pressed before the tick would be registered, and the intermediate `UP` input would be lost — causing the snake to turn left (which would be rejected as a reversal) instead of performing the intended up-then-left maneuver.

### 2.4 Strategy Pattern (Wall Collision Modes)

The requirements specify two wall collision behaviors: death (default) and wrap (requirements section 1, "Wall collision").

The strategy pattern defines a common interface for wall collision handling:

```typescript
interface WallCollisionStrategy {
  handleCollision(
    headX: number,
    headY: number,
    gridCols: number,
    gridRows: number
  ): { collided: true } | { collided: false; newX: number; newY: number };
}
```

Two implementations conform to this interface:

- **Death strategy**: If headX < 0, headX >= gridCols, headY < 0, or headY >= gridRows, return `{ collided: true }`. Otherwise, return `{ collided: false, newX: headX, newY: headY }`.
- **Wrap strategy**: If headX < 0, set newX to gridCols - 1. If headX >= gridCols, set newX to 0. Apply the same logic to headY. Always return `{ collided: false, newX, newY }`.

The game tick function calls the active strategy's `handleCollision` method after calculating the snake's next head position. The active strategy is selected based on the user's wall mode setting (stored in localStorage).

The benefit: adding a new wall mode (for example, bounce — the snake reverses direction on wall contact) requires only a new strategy implementation conforming to the same interface. No changes to the game loop, collision detection flow, or state management are needed.

### 2.5 Separation of Concerns (Model-View Split)

The model-view split separates game state (model) from rendering (view). The game state module manages snake position, food position, score, current direction, FSM state, and collision detection. It has no knowledge of the Canvas API, DOM, or any rendering concern. The renderer module reads game state through a public API and draws it to the Canvas 2D context. It has no knowledge of game rules, collision logic, or tick advancement.

This separation enables unit testing of game logic without a DOM or Canvas. Tests can create a game service, advance ticks by calling the tick function directly, and assert on the resulting state (snake position, score, game state). No rendering setup, Canvas mocking, or DOM environment is needed.

The split maps to the following project structure:

- `src/game/` — game state, tick logic, FSM, collision detection. No imports from Canvas, document, or window (except localStorage for high score persistence).
- `src/renderer/` — Canvas drawing, colors, scaling. Imports game state types but not game logic functions.
- `src/input/` — keyboard and touch event handlers, input queue. Pushes commands into the queue; does not directly modify game state.
- `src/auth/` — existing authentication module (unchanged).

## 3. TypeScript-Specific Patterns

### 3.1 Discriminated Unions for Events

Game events can be represented as a discriminated union type where the `type` property serves as the discriminant:

```typescript
type GameEvent =
  | { type: 'START' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'COLLISION' }
  | { type: 'RESTART' }
  | { type: 'DIRECTION_CHANGE'; direction: Direction }
  | { type: 'FOOD_EATEN' };
```

The `type` discriminant enables exhaustive `switch` statements. When switching on `event.type`, TypeScript narrows the type in each `case` branch — for example, in the `'DIRECTION_CHANGE'` case, `event.direction` is available. If a new event variant is added to the union but not handled in a `switch`, the `default` branch can use a `never` assertion (`const _exhaustive: never = event`) to produce a compile-time error. This guarantees that all event types are handled explicitly.

### 3.2 Readonly Types for Immutable State Snapshots

When exposing game state to the renderer, the returned types should use `Readonly<T>` or `readonly` array modifiers to prevent accidental mutation:

```typescript
function getSnakeBody(): readonly Position[] {
  return snakeSegments;
}

function getGameSnapshot(): Readonly<GameSnapshot> {
  return { state, score, snakeBody: getSnakeBody(), foodPosition };
}
```

This prevents the renderer from accidentally mutating game state. If the renderer receives a `readonly Position[]`, calling `.push()`, `.pop()`, or `.splice()` on the array produces a compile-time error. The game state module remains the single source of truth for all mutations.

Note that `readonly` in TypeScript is a compile-time-only constraint — it does not create a deep copy at runtime. The renderer still receives a reference to the same array. The protection is that TypeScript's type checker will flag any mutation attempt during development.

### 3.3 Branded Types for Grid Coordinates

Branded (opaque) types use intersection with a phantom property to create nominally distinct types from the same underlying primitive:

```typescript
type GridX = number & { readonly __brand: 'GridX' };
type GridY = number & { readonly __brand: 'GridY' };
type PixelX = number & { readonly __brand: 'PixelX' };
type PixelY = number & { readonly __brand: 'PixelY' };
```

This prevents accidentally passing pixel values where grid values are expected (and vice versa) at compile time. A function that takes `GridX` will not accept a `PixelX` without an explicit cast, even though both are `number` at runtime. For example, the renderer's `drawCell(gridX: GridX, gridY: GridY)` function cannot accidentally receive pixel coordinates from a mouse event handler.

**Recommendation:** This pattern adds complexity in the form of casting at creation sites (e.g., `const x = 5 as GridX`). Use branded types only if coordinate confusion becomes a recurring bug during implementation. Otherwise, use plain `number` with clear naming conventions (`gridX` vs `pixelX`, `col` vs `px`) to distinguish coordinate spaces.

### 3.4 Const Assertions for Configuration

The `as const` assertion makes all values in an object literal into literal types and all properties readonly:

```typescript
const GAME_CONFIG = {
  GRID_COLS: 20,
  GRID_ROWS: 20,
  CELL_SIZE: 20,
  INITIAL_TICK_MS: 150,
  MIN_TICK_MS: 60,
  TICK_DECREASE_PER_FOOD: 2,
  POINTS_PER_FOOD: 10,
  INITIAL_SNAKE_LENGTH: 3,
} as const;
```

Without `as const`, TypeScript infers `GRID_COLS` as `number`. With `as const`, TypeScript infers `GRID_COLS` as the literal type `20`. This has two benefits:

1. **Prevents accidental mutation.** Writing `GAME_CONFIG.GRID_COLS = 30` produces a compile-time error because all properties are `readonly`.
2. **Enables precise type inference.** Code that depends on exact values (e.g., array sizing, loop bounds) can leverage the literal types for more precise type checking.

The game configuration values (grid dimensions, cell size, tick intervals, scoring) from the requirements document map directly to this pattern. A single `GAME_CONFIG` const object serves as the authoritative source for all magic numbers in the codebase.

## 4. Project Structure Recommendation

```
src/
  auth/              (existing — unchanged)
    auth-service.ts
    auth-ui.ts
    types.ts
    index.ts
  game/              (new — game state and logic)
    game-service.ts  (closure-based singleton, FSM, tick logic, collision detection)
    types.ts         (GameState, Direction, Position, GameEvent, GameConfig types)
    index.ts         (barrel exports)
  renderer/          (new — Canvas rendering)
    canvas-renderer.ts  (draws game state to Canvas 2D context)
    colors.ts           (color constants as const object)
    index.ts            (barrel exports)
  input/             (new — input handling)
    keyboard.ts      (keyboard event listener, pushes to input queue)
    touch.ts         (touch/swipe event listener, pushes to input queue)
    input-queue.ts   (input buffer: enqueue, dequeue, clear)
    index.ts         (barrel exports)
  main.ts            (entry point — wires auth, game, renderer, input together)
```

**Reasoning:**

- **Each directory corresponds to one concern.** Game logic (`src/game/`) knows nothing about Canvas rendering. Rendering (`src/renderer/`) knows nothing about game rules. Input handling (`src/input/`) knows nothing about either — it pushes commands into a queue that the game module consumes.
- **Each directory has a `types.ts` for domain types and an `index.ts` for barrel exports.** This matches the pattern established by `src/auth/`, which has `types.ts` defining `User`, `AuthState`, `AuthResult`, and `AuthChangeCallback`, and `index.ts` re-exporting the module's public surface.
- **The `main.ts` file is the composition root.** It imports from barrel exports (`'./auth'`, `'./game'`, `'./renderer'`, `'./input'`) and wires modules together by connecting callbacks: auth state changes trigger game initialization (showing the menu), game state changes trigger rendering (redrawing the canvas), and input events feed into the game's command queue.

## 5. Anti-Patterns to Avoid

- **Global mutable state**: Do not use module-level `let` variables for game state. Encapsulate all mutable state inside closure-based service functions, matching the `createAuthService()` pattern in `src/auth/auth-service.ts`. Module-level `let` variables are accessible and modifiable by any code that imports the module, making state changes unpredictable and untestable.

- **innerHTML for dynamic content**: Do not use `innerHTML` to render user-controlled values such as usernames or scores. Use `textContent` and `createElement`, matching the `createAuthUI()` pattern in `src/auth/auth-ui.ts`. Using `innerHTML` with user-controlled strings creates XSS (cross-site scripting) vulnerabilities where injected HTML can execute arbitrary JavaScript.

- **setInterval for game loop**: Do not use `setInterval` for the game tick. Use an accumulator inside `requestAnimationFrame` to avoid timing drift and to automatically pause when the browser tab is hidden. `setInterval` callbacks are not synchronized with the display refresh rate, cause accumulated timing errors over long play sessions, and continue firing in background tabs (wasting CPU and battery).

- **Tight coupling between game logic and rendering**: Do not import Canvas or DOM APIs in game logic files. Game logic should operate on abstract grid coordinates and state objects only. If game logic references `CanvasRenderingContext2D` or `document`, it becomes impossible to unit test game rules without mocking the entire browser rendering stack.

- **Class hierarchies**: Do not use deep class inheritance. Prefer composition (closure-based factories returning interface-conforming objects) over class hierarchies. Deep inheritance creates fragile base class problems, where changes to a parent class break child classes in unexpected ways. The existing codebase uses zero classes — maintain this pattern.

- **External runtime dependencies**: Do not add any npm packages that ship to the browser. All game code uses only browser APIs: Canvas 2D (`getContext('2d')`), localStorage (`getItem`, `setItem`), Touch Events (`touchstart`, `touchend`), `requestAnimationFrame`, and `crypto.subtle`. The project's `package.json` lists only `devDependencies` (TypeScript, Vite, Vitest) with zero `dependencies`. This ensures instant load times and no supply chain risk in the runtime bundle.

## 6. Key Design Decisions for SDD

1. Use closure-based singletons (module pattern) for game state management, matching `createAuthService()` in `src/auth/auth-service.ts`
2. Use the observer pattern (callback + unsubscribe) for state change notifications, matching `onAuthChange()` in `src/auth/auth-service.ts`
3. Implement game states as a finite state machine with a `type GameState = 'MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER'` union type
4. Use a fixed-timestep game loop inside `requestAnimationFrame` with an accumulator — do not use `setInterval`
5. Buffer input commands in a queue, dequeuing up to 2 per tick
6. Separate game logic (`src/game/`) from rendering (`src/renderer/`) from input handling (`src/input/`)
7. Use `as const` configuration objects for game constants (grid size, speeds, colors)
8. Build all dynamic UI with DOM API methods — no `innerHTML`
9. Use discriminated union types for game events to enable exhaustive type checking
10. Keep zero runtime dependencies — browser APIs only
