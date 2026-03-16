# Capability: Rendering

## Purpose

Canvas-based rendering of the Snake game including grid, snake, food, overlays, and score display.

**Modules:** `src/renderer/canvas-renderer.ts`, `src/renderer/colors.ts`

## Requirements

### Requirement: Color Constants
The system SHALL export a `COLORS` constant object with: `BACKGROUND: '#1a1a2e'`, `GRID_LINE: '#16213e'`, `SNAKE_BODY: '#00ff41'`, `SNAKE_HEAD: '#00cc33'`, `FOOD: '#ff0040'`, `TEXT: '#e0e0e0'`, `OVERLAY_BG: 'rgba(0, 0, 0, 0.7)'`.

#### Scenario: Color palette
- **WHEN** `COLORS` is imported
- **THEN** all seven color values SHALL match the specified hex/rgba strings

### Requirement: Renderer Factory
`createCanvasRenderer()` SHALL return an object implementing `Renderer` with methods: `render(snapshot)`, `getCanvas()`, `getContainer()`, `resize(viewportWidth)`.

#### Scenario: Factory creates renderer
- **WHEN** `createCanvasRenderer()` is called
- **THEN** it SHALL create a 400x400 canvas, a score bar div, a container div, and a clip wrapper div
- **THEN** `canvas.style.touchAction` SHALL be set to `'none'`

#### Scenario: Canvas context failure
- **WHEN** `canvas.getContext('2d')` returns null
- **THEN** the factory SHALL throw `Error('Canvas 2D context not supported')`

### Requirement: Game Board Rendering
On each `render()` call, the system SHALL clear the canvas with `COLORS.BACKGROUND`, then draw grid lines using `COLORS.GRID_LINE` with lineWidth 0.5.

#### Scenario: Clear and draw grid
- **WHEN** `render(snapshot)` is called
- **THEN** the canvas SHALL be filled with the background color
- **THEN** grid lines SHALL be drawn for all column and row boundaries

### Requirement: Snake and Food Rendering
When state is not `'MENU'`, the system SHALL draw food using `COLORS.FOOD`, snake body segments (index 1+) using `COLORS.SNAKE_BODY`, and snake head (index 0) using `COLORS.SNAKE_HEAD`. Each element fills one cell (`CELL_SIZE` x `CELL_SIZE`).

#### Scenario: Draw snake and food
- **WHEN** `render(snapshot)` is called with state `'PLAYING'`
- **THEN** food SHALL be drawn at `food.x * CELL_SIZE, food.y * CELL_SIZE`
- **THEN** snake body segments SHALL be drawn in green, head in darker green

#### Scenario: Menu state hides game elements
- **WHEN** `render(snapshot)` is called with state `'MENU'`
- **THEN** food and snake SHALL NOT be drawn

### Requirement: Menu Overlay
In MENU state, the system SHALL draw a semi-transparent overlay with centered text: "Snake Game" (bold 32px, y=160), "Tap or Press Space/Enter to Start" (16px, y=220), "High Score: {highScore}" (14px, y=260), "Wall Mode: {wallMode}" (14px, y=290), "Double-Tap or Press W to Toggle Wall Mode" (14px, y=310).

#### Scenario: Menu overlay content
- **WHEN** state is `'MENU'` with highScore 100 and wallMode `'death'`
- **THEN** overlay SHALL display "High Score: 100" and "Wall Mode: death"

### Requirement: Pause Overlay
In PAUSED state, the system SHALL draw a semi-transparent overlay with: "Paused" (bold 32px, y=200) and "Tap or Press Escape to Resume" (16px, y=240).

#### Scenario: Pause overlay
- **WHEN** state is `'PAUSED'`
- **THEN** overlay SHALL display "Paused" and resume instructions

### Requirement: Game Over Overlay
In GAME_OVER state, the system SHALL draw a semi-transparent overlay with: "Game Over" (bold 32px, y=160), "Score: {score}" (20px, y=210), "High Score: {highScore}" (16px, y=250), "Tap or Press Space/Enter to Play Again" (16px, y=290), "Wall Mode: {wallMode}" (14px, y=320), "Double-Tap or Press W to Toggle Wall Mode" (14px, y=340).

#### Scenario: Game over overlay content
- **WHEN** state is `'GAME_OVER'` with score 50 and highScore 100
- **THEN** overlay SHALL display "Score: 50" and "High Score: 100"

### Requirement: Score Bar
The system SHALL create an HTML div above the canvas with two spans: "Score: {score}" and "High: {highScore}". These spans SHALL be cached and updated via `textContent` on every `render()` call.

#### Scenario: Score bar updates
- **WHEN** `render(snapshot)` is called with score 30 and highScore 80
- **THEN** scoreSpan SHALL display "Score: 30" and highSpan SHALL display "High: 80"

### Requirement: Responsive Resize
`resize(viewportWidth)` SHALL scale the container when viewportWidth < 440px using CSS transform. Scale = (viewportWidth - 40) / 400. The clipWrapper SHALL clip overflow. When viewportWidth >= 440, all inline styles SHALL be cleared.

#### Scenario: Small viewport scaling
- **WHEN** `resize(360)` is called
- **THEN** scale SHALL be (360 - 40) / 400 = 0.8
- **THEN** container SHALL be CSS-transformed with `scale(0.8)`

#### Scenario: Large viewport no scaling
- **WHEN** `resize(800)` is called
- **THEN** all inline styles on container and clipWrapper SHALL be cleared

### Requirement: DOM Structure
`getContainer()` SHALL return the outermost clipWrapper div. `getCanvas()` SHALL return the canvas element. The DOM hierarchy SHALL be: clipWrapper → container → [scoreBar, canvas].

#### Scenario: DOM access
- **WHEN** `getContainer()` is called
- **THEN** the returned element SHALL be the clipWrapper
- **WHEN** `getCanvas()` is called
- **THEN** the returned element SHALL be the canvas

### Requirement: Renderer Isolation
The renderer SHALL NOT import game logic modules. It SHALL only import `GameSnapshot` type and `GAME_CONFIG` constants from the game types module. It SHALL NOT mutate any snapshot data.

#### Scenario: No game logic dependency
- **WHEN** the renderer module is loaded
- **THEN** it SHALL have no imports from `game-service.ts`
