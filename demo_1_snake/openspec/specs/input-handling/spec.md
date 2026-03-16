# Capability: Input Handling

## Purpose

Keyboard and touch input for controlling the Snake game.

**Modules:** `src/input/keyboard.ts`, `src/input/touch.ts`

## Requirements

### Requirement: Keyboard Setup
`setupKeyboardInput(gameService)` SHALL register a `keydown` listener on `document` and return a cleanup function that removes the listener.

#### Scenario: Setup and teardown
- **WHEN** `setupKeyboardInput(gameService)` is called
- **THEN** a `keydown` listener SHALL be registered on `document`
- **WHEN** the returned cleanup function is called
- **THEN** the listener SHALL be removed

### Requirement: Direction Keys
Arrow keys and WASD keys SHALL dispatch direction change events. `ArrowUp` → UP, `ArrowDown`/`s`/`S` → DOWN, `ArrowLeft`/`a`/`A` → LEFT, `ArrowRight`/`d`/`D` → RIGHT. `event.preventDefault()` SHALL be called unconditionally for all direction keys.

#### Scenario: Arrow key dispatches direction
- **WHEN** the ArrowRight key is pressed
- **THEN** `gameService.transition({ type: 'DIRECTION_CHANGE', direction: 'RIGHT' })` SHALL be called
- **THEN** `event.preventDefault()` SHALL be called

#### Scenario: WASD key dispatches direction
- **WHEN** the `s` key is pressed
- **THEN** `gameService.transition({ type: 'DIRECTION_CHANGE', direction: 'DOWN' })` SHALL be called

### Requirement: W Key Context-Dependent Behavior
The `w`/`W` key SHALL be context-dependent. In MENU or GAME_OVER state, it SHALL toggle wall mode (death↔wrap via `gameService.setWallMode`). In PLAYING or PAUSED state, it SHALL dispatch `DIRECTION_CHANGE` with direction UP. `event.preventDefault()` SHALL be called unconditionally.

#### Scenario: W toggles wall mode in menu
- **WHEN** `w` is pressed and state is `'MENU'` with wallMode `'death'`
- **THEN** `gameService.setWallMode('wrap')` SHALL be called

#### Scenario: W moves up during play
- **WHEN** `w` is pressed and state is `'PLAYING'`
- **THEN** `gameService.transition({ type: 'DIRECTION_CHANGE', direction: 'UP' })` SHALL be called

### Requirement: Start and Restart Keys
Space and Enter SHALL start or restart the game. In MENU state, dispatch `{ type: 'START' }`. In GAME_OVER state, dispatch `{ type: 'RESTART' }`. `event.preventDefault()` SHALL be called only in the branches where the key is consumed (MENU or GAME_OVER), NOT in PLAYING or PAUSED states.

#### Scenario: Space starts game from menu
- **WHEN** Space is pressed and state is `'MENU'`
- **THEN** `gameService.transition({ type: 'START' })` SHALL be called
- **THEN** `event.preventDefault()` SHALL be called

#### Scenario: Space in playing state
- **WHEN** Space is pressed and state is `'PLAYING'`
- **THEN** no transition SHALL occur
- **THEN** `event.preventDefault()` SHALL NOT be called

### Requirement: Escape Key Pause/Resume
Escape SHALL pause in PLAYING state and resume in PAUSED state. `event.preventDefault()` SHALL be called only in branches where the key is consumed, NOT in MENU or GAME_OVER states.

#### Scenario: Escape pauses game
- **WHEN** Escape is pressed and state is `'PLAYING'`
- **THEN** `gameService.transition({ type: 'PAUSE' })` SHALL be called
- **THEN** `event.preventDefault()` SHALL be called

#### Scenario: Escape resumes game
- **WHEN** Escape is pressed and state is `'PAUSED'`
- **THEN** `gameService.transition({ type: 'RESUME' })` SHALL be called

### Requirement: Touch Setup
`setupTouchInput(gameService, canvas)` SHALL register `touchstart` and `touchend` listeners on the canvas element with `{ passive: false }` and return a cleanup function that removes both listeners and clears any pending timer.

#### Scenario: Setup and teardown
- **WHEN** `setupTouchInput(gameService, canvas)` is called
- **THEN** `touchstart` and `touchend` listeners SHALL be registered on the canvas
- **WHEN** the returned cleanup function is called
- **THEN** both listeners SHALL be removed and pending timers cleared

### Requirement: Swipe Direction Detection
Swipe gestures SHALL dispatch direction changes. If the swipe distance exceeds `SWIPE_THRESHOLD_PX` (30px) in either axis, the dominant axis determines direction: horizontal → RIGHT (deltaX > 0) or LEFT, vertical → DOWN (deltaY > 0) or UP.

#### Scenario: Swipe right
- **WHEN** user swipes right with deltaX=50, deltaY=10
- **THEN** `gameService.transition({ type: 'DIRECTION_CHANGE', direction: 'RIGHT' })` SHALL be called

#### Scenario: Swipe up
- **WHEN** user swipes up with deltaX=5, deltaY=-60
- **THEN** `gameService.transition({ type: 'DIRECTION_CHANGE', direction: 'UP' })` SHALL be called

### Requirement: Tap Detection
A touch with movement below `SWIPE_THRESHOLD_PX` in both axes SHALL be treated as a tap. Tap behavior is state-dependent: PLAYING → PAUSE, PAUSED → RESUME. In MENU/GAME_OVER, a single tap starts/restarts the game (delayed by `DOUBLE_TAP_MS` to allow double-tap detection).

#### Scenario: Tap to pause
- **WHEN** user taps (movement < 30px) and state is `'PLAYING'`
- **THEN** `gameService.transition({ type: 'PAUSE' })` SHALL be called

#### Scenario: Tap to resume
- **WHEN** user taps and state is `'PAUSED'`
- **THEN** `gameService.transition({ type: 'RESUME' })` SHALL be called

#### Scenario: Single tap to start
- **WHEN** user taps once and state is `'MENU'` and no second tap follows within 300ms
- **THEN** `gameService.transition({ type: 'START' })` SHALL be called after the 300ms delay

### Requirement: Double-Tap Wall Mode Toggle
In MENU or GAME_OVER state, a double-tap (two taps within 300ms) SHALL toggle wall mode via `gameService.setWallMode`. The pending single-tap start/restart timer SHALL be cancelled.

#### Scenario: Double-tap toggles wall mode
- **WHEN** user double-taps within 300ms and state is `'MENU'` with wallMode `'death'`
- **THEN** the pending start timer SHALL be cancelled
- **THEN** `gameService.setWallMode('wrap')` SHALL be called

### Requirement: Touch Event Prevention
Both `touchstart` and `touchend` handlers SHALL call `event.preventDefault()` to prevent browser default gestures (scrolling, zooming).

#### Scenario: Default prevented
- **WHEN** a touch event fires on the canvas
- **THEN** `event.preventDefault()` SHALL be called

### Requirement: Input Module Boundaries
Input modules SHALL NOT directly modify game state. They SHALL only call `gameService.transition()` or `gameService.setWallMode()`.

#### Scenario: No direct state mutation
- **WHEN** any input handler processes a key or touch event
- **THEN** it SHALL interact with the game service exclusively through its public API
