# Capability: App Wiring

## Purpose

Main entry point that composes all modules into a running application.

**Module:** `src/main.ts`

## Requirements

### Requirement: Composition Root
`src/main.ts` SHALL be the sole composition root — the only file that imports from multiple modules (game, renderer, input). It SHALL contain no game logic.

#### Scenario: Single composition point
- **WHEN** `main.ts` is loaded
- **THEN** it SHALL import from game, renderer, and input modules
- **THEN** no other file SHALL import from more than one module

### Requirement: Module Initialization
On load, `main.ts` SHALL: (1) get the `#app` container from the DOM, (2) create a canvas renderer, (3) append the renderer container to `#app`, (4) create a game service, (5) subscribe the renderer to game changes, (6) set up keyboard input, (7) set up touch input, (8) register a window resize handler, (9) trigger an initial resize via `requestAnimationFrame`, (10) render the initial game snapshot.

#### Scenario: App boots to menu
- **WHEN** the browser loads `index.html` and `main.ts` executes
- **THEN** the canvas SHALL appear in `#app` showing the MENU overlay
- **THEN** keyboard and touch input SHALL be active

### Requirement: Resize Handler
The system SHALL listen for window `resize` events and call `renderer.resize(window.innerWidth)`. The initial resize SHALL be deferred to the next animation frame so the DOM is visible and `scoreBar.offsetHeight` returns a correct value.

#### Scenario: Window resize
- **WHEN** the window is resized
- **THEN** `renderer.resize(window.innerWidth)` SHALL be called

### Requirement: Game Change Subscription
The renderer SHALL be subscribed to game service changes via `gameService.onGameChange((snapshot) => renderer.render(snapshot))`.

#### Scenario: State change renders frame
- **WHEN** the game service notifies a state change
- **THEN** the renderer SHALL receive the snapshot and render the current frame

### Requirement: Game Module Barrel
`src/game/index.ts` SHALL export `createGameService` from `game-service`, `GAME_CONFIG` from `types`, and all type definitions from `types`.

#### Scenario: Game barrel contents
- **WHEN** `src/game/index.ts` is imported
- **THEN** `createGameService`, `GAME_CONFIG`, and all game types SHALL be available

### Requirement: Renderer Module Barrel
`src/renderer/index.ts` SHALL export `createCanvasRenderer` from `canvas-renderer`, `COLORS` from `colors`, and the `Renderer` type.

#### Scenario: Renderer barrel contents
- **WHEN** `src/renderer/index.ts` is imported
- **THEN** `createCanvasRenderer`, `COLORS`, and `Renderer` type SHALL be available

### Requirement: Input Module Barrel
`src/input/index.ts` SHALL export `setupKeyboardInput` from `keyboard` and `setupTouchInput` from `touch`.

#### Scenario: Input barrel contents
- **WHEN** `src/input/index.ts` is imported
- **THEN** `setupKeyboardInput` and `setupTouchInput` SHALL be available
