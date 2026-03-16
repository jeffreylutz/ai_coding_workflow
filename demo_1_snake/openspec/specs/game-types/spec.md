# Capability: Game Types

## Purpose

Type definitions, interfaces, and configuration constants for the Snake game.

**Module:** `src/game/types.ts`

## Requirements

### Requirement: Direction Type
The system SHALL define a `Direction` union type with values `'UP'`, `'DOWN'`, `'LEFT'`, `'RIGHT'`.

#### Scenario: Direction type usage
- **WHEN** a direction value is assigned
- **THEN** it MUST be one of `'UP'`, `'DOWN'`, `'LEFT'`, or `'RIGHT'`

### Requirement: Game State Type
The system SHALL define a `GameState` union type with values `'MENU'`, `'PLAYING'`, `'PAUSED'`, `'GAME_OVER'`.

#### Scenario: Valid game states
- **WHEN** the game state is read
- **THEN** it MUST be one of the four defined states

### Requirement: Wall Mode Type
The system SHALL define a `WallMode` union type with values `'death'` and `'wrap'`.

#### Scenario: Wall mode values
- **WHEN** wall mode is set
- **THEN** it MUST be either `'death'` or `'wrap'`

### Requirement: Position Interface
The system SHALL define a `Position` interface with `x` (grid column, 0 to GRID_COLS - 1) and `y` (grid row, 0 to GRID_ROWS - 1) as numbers.

#### Scenario: Position coordinates
- **WHEN** a position is created
- **THEN** it SHALL have numeric `x` and `y` fields representing grid coordinates

### Requirement: Game Event Type
The system SHALL define a `GameEvent` discriminated union with types: `START`, `PAUSE`, `RESUME`, `RESTART`, `COLLISION`, and `DIRECTION_CHANGE` (which includes a `direction: Direction` field).

#### Scenario: Direction change event
- **WHEN** a direction change event is created
- **THEN** it SHALL have `type: 'DIRECTION_CHANGE'` and a `direction` field

#### Scenario: Simple events
- **WHEN** a non-direction event is created
- **THEN** it SHALL have only a `type` field with one of `'START'`, `'PAUSE'`, `'RESUME'`, `'RESTART'`, or `'COLLISION'`

### Requirement: Game Snapshot Interface
The system SHALL define a `GameSnapshot` interface containing: `state` (GameState), `snake` (readonly Position[]), `food` (Position), `score` (number), `highScore` (number), `wallMode` (WallMode), and `tickInterval` (number).

#### Scenario: Snapshot immutability
- **WHEN** a snapshot is returned
- **THEN** the `snake` array SHALL be typed as `readonly Position[]` to prevent consumer mutation

### Requirement: Game Change Callback Type
The system SHALL define a `GameChangeCallback` type as a function accepting a `GameSnapshot` and returning void.

#### Scenario: Callback signature
- **WHEN** a game change callback is registered
- **THEN** it SHALL receive a `GameSnapshot` parameter

### Requirement: Game Configuration Constants
The system SHALL export a `GAME_CONFIG` constant object with these values: `GRID_COLS: 20`, `GRID_ROWS: 20`, `CELL_SIZE: 20`, `CANVAS_WIDTH: 400`, `CANVAS_HEIGHT: 400`, `INITIAL_TICK_MS: 150`, `MIN_TICK_MS: 60`, `TICK_DECREASE_PER_FOOD: 2`, `POINTS_PER_FOOD: 10`, `INITIAL_SNAKE_LENGTH: 3`, `INITIAL_DIRECTION: 'RIGHT'`, `INITIAL_HEAD_POSITION: { x: 10, y: 10 }`, `MAX_INPUT_QUEUE_SIZE: 2`, `SWIPE_THRESHOLD_PX: 30`.

#### Scenario: Configuration is immutable
- **WHEN** `GAME_CONFIG` is accessed
- **THEN** all values SHALL be readonly (`as const`)

### Requirement: No Runtime Code
The types module SHALL contain only type definitions and const declarations. It SHALL NOT contain runtime logic or import from other modules.

#### Scenario: Self-contained module
- **WHEN** the types module is loaded
- **THEN** it SHALL have zero imports and produce no side effects
