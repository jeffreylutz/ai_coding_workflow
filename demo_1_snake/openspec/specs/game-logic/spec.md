# Capability: Game Logic

## Purpose

Core game service providing state machine, tick loop, collision detection, scoring, and persistence.

**Module:** `src/game/game-service.ts`
**Pattern:** Closure-based factory (`createGameService()`)

## Requirements

### Requirement: Factory Function
The system SHALL export a `createGameService()` factory function (no parameters) that returns a plain object with methods: `transition`, `tick`, `getSnapshot`, `onGameChange`, `setWallMode`, `destroy`.

#### Scenario: Creating a game service
- **WHEN** `createGameService()` is called
- **THEN** it SHALL return an object with all six public methods
- **THEN** the initial game state SHALL be `'MENU'`

### Requirement: Finite State Machine
The game service SHALL implement a state machine with transitions: MENU→PLAYING (on START), PLAYING→PAUSED (on PAUSE), PLAYING→GAME_OVER (on COLLISION), PAUSED→PLAYING (on RESUME), GAME_OVER→PLAYING (on RESTART). All other state+event combinations SHALL be silently ignored.

#### Scenario: Start game from menu
- **WHEN** state is `'MENU'` and `transition({ type: 'START' })` is called
- **THEN** state SHALL become `'PLAYING'`
- **THEN** snake SHALL be reset to `INITIAL_SNAKE_LENGTH` segments at `INITIAL_HEAD_POSITION` extending left
- **THEN** score SHALL be reset to 0, direction to `'RIGHT'`, inputQueue cleared
- **THEN** food SHALL be spawned at a random unoccupied cell
- **THEN** the requestAnimationFrame loop SHALL start

#### Scenario: Pause during play
- **WHEN** state is `'PLAYING'` and `transition({ type: 'PAUSE' })` is called
- **THEN** state SHALL become `'PAUSED'`
- **THEN** the animation loop SHALL be cancelled
- **THEN** listeners SHALL be notified

#### Scenario: Collision during play
- **WHEN** state is `'PLAYING'` and `transition({ type: 'COLLISION' })` is called
- **THEN** state SHALL become `'GAME_OVER'`
- **THEN** the animation loop SHALL be cancelled
- **THEN** if score > highScore, highScore SHALL be updated and persisted to localStorage key `snake_highscore`
- **THEN** listeners SHALL be notified

#### Scenario: Resume from pause
- **WHEN** state is `'PAUSED'` and `transition({ type: 'RESUME' })` is called
- **THEN** state SHALL become `'PLAYING'`
- **THEN** the animation loop SHALL restart

#### Scenario: Restart after game over
- **WHEN** state is `'GAME_OVER'` and `transition({ type: 'RESTART' })` is called
- **THEN** the same reset logic as MENU→START SHALL execute

#### Scenario: Invalid transition ignored
- **WHEN** state is `'MENU'` and `transition({ type: 'PAUSE' })` is called
- **THEN** state SHALL remain `'MENU'` with no side effects

### Requirement: Game Loop
The animation loop SHALL use `requestAnimationFrame`. On each frame, it SHALL calculate elapsed time since last tick. If elapsed >= tickInterval, it SHALL call `tick()` and update lastTickTime. If the loop was not stopped during tick (animationFrameId is not null), it SHALL notify listeners and schedule the next frame.

#### Scenario: Tick timing
- **WHEN** an animation frame fires and elapsed time >= tickInterval
- **THEN** `tick()` SHALL be called and lastTickTime SHALL be updated

#### Scenario: Collision stops loop
- **WHEN** `tick()` triggers a COLLISION transition
- **THEN** the loop SHALL NOT notify listeners again or schedule another frame (COLLISION branch already notified)

### Requirement: Tick Algorithm
On each tick, the system SHALL: (1) dequeue up to `MAX_INPUT_QUEUE_SIZE` (2) directions from inputQueue, validate each is not opposite of current direction, update direction if valid; (2) calculate new head position from current direction; (3) check wall collision or wrap; (4) check self-collision (excluding tail segment); (5) insert new head; (6) check food collision (increment score, decrease tickInterval, spawn new food) or remove tail.

#### Scenario: Snake moves right
- **WHEN** direction is `'RIGHT'` and tick is called
- **THEN** new head SHALL be at `{ x: head.x + 1, y: head.y }`
- **THEN** tail segment SHALL be removed (if no food eaten)

#### Scenario: Eating food
- **WHEN** new head position matches food position
- **THEN** score SHALL increase by `POINTS_PER_FOOD` (10)
- **THEN** tickInterval SHALL decrease by `TICK_DECREASE_PER_FOOD` (2), clamped to `MIN_TICK_MS` (60)
- **THEN** new food SHALL be spawned
- **THEN** tail SHALL NOT be removed (snake grows)

#### Scenario: Opposite direction rejected
- **WHEN** direction is `'RIGHT'` and `'LEFT'` is dequeued from inputQueue
- **THEN** direction SHALL remain `'RIGHT'`

#### Scenario: Tail-chasing is valid
- **WHEN** new head occupies the position of the current tail segment
- **THEN** self-collision SHALL NOT be triggered (tail is excluded from collision check because it will be popped)

### Requirement: Wall Collision (Death Mode)
When wallMode is `'death'`, the system SHALL trigger a COLLISION if the new head is out of bounds (x < 0, x >= GRID_COLS, y < 0, or y >= GRID_ROWS).

#### Scenario: Hit top wall in death mode
- **WHEN** wallMode is `'death'` and snake moves UP from y=0
- **THEN** `transition({ type: 'COLLISION' })` SHALL be called

### Requirement: Wall Wrapping (Wrap Mode)
When wallMode is `'wrap'`, out-of-bounds coordinates SHALL wrap: x < 0 → GRID_COLS-1, x >= GRID_COLS → 0, y < 0 → GRID_ROWS-1, y >= GRID_ROWS → 0.

#### Scenario: Wrap through right wall
- **WHEN** wallMode is `'wrap'` and snake moves RIGHT from x=19
- **THEN** new head x SHALL be 0

### Requirement: Self-Collision Detection
The system SHALL check if the new head matches any snake segment from index 0 to snake.length-2. If a match is found, it SHALL trigger COLLISION.

#### Scenario: Snake hits itself
- **WHEN** new head position matches a body segment (not the tail)
- **THEN** `transition({ type: 'COLLISION' })` SHALL be called

### Requirement: Food Spawning
Food SHALL be spawned at a random position not occupied by the snake. If the snake fills the entire grid, COLLISION SHALL be triggered and current food position returned.

#### Scenario: Normal food spawn
- **WHEN** food needs to be spawned and free cells exist
- **THEN** food SHALL appear at a random unoccupied cell

#### Scenario: Grid full
- **WHEN** food needs to be spawned and the snake occupies all cells
- **THEN** `transition({ type: 'COLLISION' })` SHALL be called

### Requirement: Direction Change Handling
Direction change events SHALL only be processed in PLAYING state. The direction SHALL be pushed to inputQueue if queue length < `MAX_INPUT_QUEUE_SIZE` (2). Direction SHALL NOT be changed directly — it is applied during `tick()`.

#### Scenario: Queue direction change
- **WHEN** state is `'PLAYING'` and a DIRECTION_CHANGE event is received
- **THEN** the direction SHALL be added to inputQueue (if not full)

#### Scenario: Queue full
- **WHEN** inputQueue already has 2 entries and another DIRECTION_CHANGE arrives
- **THEN** the new direction SHALL be dropped

### Requirement: Snapshot Immutability
`getSnapshot()` SHALL return a new object each call. The `snake` array SHALL be a deep copy of Position objects. The `food` field SHALL be a shallow copy. No returned object or array element SHALL share a reference with internal state.

#### Scenario: Snapshot independence
- **WHEN** `getSnapshot()` is called twice
- **THEN** the two returned objects SHALL be independent — mutating one SHALL NOT affect the other or internal state

### Requirement: Observer Pattern
`onGameChange` SHALL accept a callback and return an unsubscribe function. When the unsubscribe function is called, the callback SHALL no longer receive notifications.

#### Scenario: Subscribe and unsubscribe
- **WHEN** a callback is registered via `onGameChange`
- **THEN** it SHALL receive snapshots on state changes
- **WHEN** the returned unsubscribe function is called
- **THEN** the callback SHALL stop receiving notifications

### Requirement: Wall Mode Setting
`setWallMode(mode)` SHALL update the wall mode, persist it to localStorage key `snake_settings` as JSON (`{"wallMode":"..."}`) , and notify listeners.

#### Scenario: Toggle wall mode
- **WHEN** `setWallMode('wrap')` is called
- **THEN** wallMode SHALL be `'wrap'`
- **THEN** localStorage key `snake_settings` SHALL contain `{"wallMode":"wrap"}`
- **THEN** listeners SHALL be notified with updated snapshot

### Requirement: LocalStorage Persistence
The system SHALL read high score from `snake_highscore` and wall mode from `snake_settings` on initialization. Read errors (null, corrupt JSON, NaN) SHALL use defaults (highScore: 0, wallMode: 'death'). Write errors SHALL be caught, logged with `console.warn`, and ignored.

#### Scenario: Corrupted localStorage
- **WHEN** `snake_settings` contains invalid JSON
- **THEN** wallMode SHALL default to `'death'`

#### Scenario: Write failure
- **WHEN** localStorage write throws (quota exceeded)
- **THEN** the error SHALL be caught and logged via `console.warn`
- **THEN** the game SHALL continue without persistence

### Requirement: Destroy
`destroy()` SHALL cancel the animation loop and clear all listeners.

#### Scenario: Cleanup on destroy
- **WHEN** `destroy()` is called
- **THEN** `cancelAnimationFrame` SHALL be called if a loop is running
- **THEN** the listeners array SHALL be emptied
