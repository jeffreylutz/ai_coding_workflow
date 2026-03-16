# Kanban Board

## Backlog

### STORY-01: Implement Game Types and Configuration Constants
**Spec:** `openspec/specs/game-types/spec.md`
**Files:** `src/game/types.ts`
**Description:** Define all type definitions and the `GAME_CONFIG` constant object for the Snake game. This includes `Direction`, `GameState`, `WallMode`, `Position`, `GameEvent` (discriminated union), `GameSnapshot`, `GameChangeCallback`, and the `GAME_CONFIG` frozen constant with grid dimensions, tick timing, scoring, and initial positions. Module must have zero imports and no runtime logic beyond const declarations. All values must use `as const` for immutability.
**Acceptance Criteria:**
- All 8 type/interface definitions exported
- `GAME_CONFIG` exported with all 15 properties matching spec values
- Zero imports, no side effects
- Compiles under `strict: true`

### STORY-02: Implement Game Service (Core Game Logic)
**Spec:** `openspec/specs/game-logic/spec.md`
**Files:** `src/game/game-service.ts`
**Depends on:** STORY-01
**Description:** Implement `createGameService()` as a closure-based factory returning an object with methods: `transition`, `tick`, `getSnapshot`, `onGameChange`, `setWallMode`, `destroy`. Includes FSM (MENU→PLAYING→PAUSED/GAME_OVER), requestAnimationFrame-based game loop with accumulator pattern, snake movement algorithm, self-collision detection (excluding tail), wall collision (death and wrap modes), food spawning on unoccupied cells, input queue (max 2), scoring (+10 per food), speed increase (-2ms per food, min 60ms), localStorage persistence for high score (`snake_highscore`) and settings (`snake_settings`), and observer pattern for state change notifications. Snapshot deep-copies snake positions.
**Acceptance Criteria:**
- All 6 public methods implemented
- FSM transitions match spec table (invalid transitions silently ignored)
- Game loop uses rAF with accumulator, not setInterval
- Self-collision excludes tail segment (allows tail-chasing)
- Food spawns only on unoccupied cells
- localStorage errors caught gracefully (defaults: highScore=0, wallMode='death')
- `destroy()` cancels animation loop and clears listeners

### STORY-03: Implement Keyboard Input Handler
**Spec:** `openspec/specs/input-handling/spec.md` (Keyboard sections)
**Files:** `src/input/keyboard.ts`
**Depends on:** STORY-01
**Description:** Implement `setupKeyboardInput(gameService)` that registers a `keydown` listener on `document` and returns a cleanup function. Key mappings: Arrow keys and WASD for direction changes, W key is context-dependent (toggles wall mode in MENU/GAME_OVER, dispatches UP in PLAYING/PAUSED), Space/Enter for start/restart (MENU/GAME_OVER only), Escape for pause/resume (PLAYING/PAUSED only). `preventDefault()` is called conditionally — always for direction keys, only when consumed for Space/Enter/Escape.
**Acceptance Criteria:**
- All direction keys mapped correctly (ArrowUp, ArrowDown, ArrowLeft, ArrowRight, w, a, s, d)
- W key toggles wall mode in MENU/GAME_OVER, moves UP in PLAYING/PAUSED
- Space/Enter only consumed in MENU and GAME_OVER states
- Escape only consumed in PLAYING and PAUSED states
- Returns cleanup function that removes listener
- Does not directly mutate game state

### STORY-04: Implement Touch Input Handler
**Spec:** `openspec/specs/input-handling/spec.md` (Touch sections)
**Files:** `src/input/touch.ts`
**Depends on:** STORY-01
**Description:** Implement `setupTouchInput(gameService, canvas)` that registers `touchstart` and `touchend` listeners on the canvas with `{ passive: false }`. Swipe detection: if movement exceeds 30px threshold, determine direction from dominant axis. Tap detection: if below threshold, behavior is state-dependent (PLAYING→PAUSE, PAUSED→RESUME). In MENU/GAME_OVER: single tap starts/restarts after 300ms delay, double-tap within 300ms toggles wall mode and cancels pending start. Both handlers call `preventDefault()`.
**Acceptance Criteria:**
- Swipe direction detection works for all 4 directions with 30px threshold
- Tap dispatches correct events per game state
- Double-tap toggles wall mode and cancels pending single-tap timer
- Single-tap start/restart delayed 300ms for double-tap detection
- Returns cleanup function that removes listeners and clears timers
- `preventDefault()` called on both touchstart and touchend

### STORY-05: Implement Color Constants
**Spec:** `openspec/specs/rendering/spec.md` (Color Constants section)
**Files:** `src/renderer/colors.ts`
**Description:** Export a `COLORS` constant object with all 7 color values: BACKGROUND (`#1a1a2e`), GRID_LINE (`#16213e`), SNAKE_BODY (`#00ff41`), SNAKE_HEAD (`#00cc33`), FOOD (`#ff0040`), TEXT (`#e0e0e0`), OVERLAY_BG (`rgba(0, 0, 0, 0.7)`). Use `as const` for immutability.
**Acceptance Criteria:**
- All 7 color values match spec exactly
- Object is frozen via `as const`

### STORY-06: Implement Canvas Renderer
**Spec:** `openspec/specs/rendering/spec.md`
**Files:** `src/renderer/canvas-renderer.ts`
**Depends on:** STORY-01, STORY-05
**Description:** Implement `createCanvasRenderer()` returning a `Renderer` object with methods: `render(snapshot)`, `getCanvas()`, `getContainer()`, `resize(viewportWidth)`. DOM hierarchy: clipWrapper → container → [scoreBar, canvas]. Canvas is 400x400 with `touchAction: 'none'`. Render pipeline: clear with background, draw grid lines, draw food/snake (skip in MENU state), draw state-dependent overlays (MENU, PAUSED, GAME_OVER with specified text and positioning), update cached score bar spans via textContent. Resize scales container via CSS transform when viewport < 440px with overflow clipping.
**Acceptance Criteria:**
- DOM hierarchy: clipWrapper → container → [scoreBar, canvas]
- Canvas 400x400 with `touchAction: 'none'`
- Throws Error if getContext('2d') returns null
- Food/snake not drawn in MENU state
- All 3 overlay states render correct text at spec positions
- Score bar uses cached spans updated via textContent
- Resize scales correctly below 440px, clears styles above
- No imports from game-service.ts (only types)

### STORY-07: Implement App Wiring and Module Barrels
**Spec:** `openspec/specs/app-wiring/spec.md`
**Files:** `src/main.ts`, `src/game/index.ts`, `src/renderer/index.ts`, `src/input/index.ts`
**Depends on:** STORY-02, STORY-03, STORY-04, STORY-06
**Description:** Implement `src/main.ts` as the sole composition root: get `#app` container, create renderer, append container, create game service, subscribe renderer to game changes, setup keyboard and touch input, register window resize handler with deferred initial resize via rAF, render initial snapshot. Implement barrel exports: `src/game/index.ts` (createGameService, GAME_CONFIG, all types), `src/renderer/index.ts` (createCanvasRenderer, COLORS, Renderer type), `src/input/index.ts` (setupKeyboardInput, setupTouchInput). main.ts is the only file that imports from multiple modules.
**Acceptance Criteria:**
- main.ts is sole composition root
- All modules wired: renderer, game service, keyboard, touch, resize
- Initial resize deferred via requestAnimationFrame
- Initial snapshot rendered
- All 3 barrel files export correct symbols
- No game logic in main.ts

### STORY-08: Write Unit Tests for Game Types
**Spec:** SDD Section 13
**Files:** `src/game/types.test.ts`
**Depends on:** STORY-01
**Description:** Unit tests verifying all type exports, GAME_CONFIG values, and const immutability. Test that GAME_CONFIG contains all 15 expected properties with correct values.
**Acceptance Criteria:**
- All GAME_CONFIG properties tested
- Tests pass with `npm test`

### STORY-09: Write Unit Tests for Game Service
**Spec:** SDD Section 13
**Files:** `src/game/game-service.test.ts`
**Depends on:** STORY-02
**Description:** Unit tests for game service: FSM transitions (valid and invalid), tick algorithm (movement, food eating, tail removal), collision detection (self, wall-death, wall-wrap), food spawning, input queue behavior, scoring, speed increase, snapshot immutability, observer pattern (subscribe/unsubscribe), wall mode persistence, destroy cleanup, localStorage error handling.
**Acceptance Criteria:**
- All FSM transitions tested (valid + invalid)
- Tick algorithm tested (movement, food, collision)
- Snapshot independence verified
- localStorage error handling tested
- Tests pass with `npm test`

### STORY-10: Write Unit Tests for Input Handlers
**Spec:** SDD Section 13
**Files:** `src/input/keyboard.test.ts`, `src/input/touch.test.ts`
**Depends on:** STORY-03, STORY-04
**Description:** Unit tests for keyboard handler: all key mappings, W context-dependent behavior, Space/Enter conditional preventDefault, Escape conditional preventDefault, cleanup function. Unit tests for touch handler: swipe detection (all directions, threshold boundary), tap state-dependent behavior, double-tap wall toggle, timer cancellation, cleanup function, preventDefault calls.
**Acceptance Criteria:**
- All keyboard key mappings tested
- W key dual behavior tested
- Conditional preventDefault tested for Space/Enter/Escape
- Swipe direction detection tested
- Tap and double-tap logic tested
- Cleanup functions tested
- Tests pass with `npm test`

### STORY-11: Write Unit Tests for Renderer
**Spec:** SDD Section 13
**Files:** `src/renderer/canvas-renderer.test.ts`, `src/renderer/colors.test.ts`
**Depends on:** STORY-05, STORY-06
**Description:** Unit tests for colors (all 7 values match spec). Unit tests for canvas renderer: DOM structure creation, canvas context failure, game board rendering, snake/food drawing (skip in MENU), overlay content for all 3 states, score bar updates, responsive resize behavior (scale calculation, style clearing). Uses Vitest DOM mocking.
**Acceptance Criteria:**
- Color constant values verified
- DOM hierarchy tested
- All overlay states tested for correct text
- MENU state guard tested (no food/snake drawn)
- Resize scaling tested
- Tests pass with `npm test`

### STORY-12: Write Integration and E2E Tests
**Spec:** SDD Section 13
**Files:** `src/game/integration.test.ts`, `src/e2e/game-lifecycle.test.ts`
**Depends on:** STORY-07
**Description:** Integration tests: full game flow from start → play → eat food → score increase → speed increase → game over → high score update → restart. E2E tests: game lifecycle init → play → pause → resume → game over → restart, verifying the full module composition works together. Uses Vitest DOM mocking.
**Acceptance Criteria:**
- Full game flow tested end-to-end
- Pause/resume cycle tested
- Score and high score persistence tested
- Tests pass with `npm test`

## Research

## Planning

## Running

## Review

## Done
