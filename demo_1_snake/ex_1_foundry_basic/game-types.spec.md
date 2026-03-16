# OpenSpec: Game Types

**Module:** `src/game/types.ts`
**Status:** Specification
**Version:** 1.0
**Date:** 2026-03-14

## Type Definitions

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

## Constants

```typescript
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

## Constraints

1. All types are exported with `export` keyword
2. No runtime code — types and const declarations only
3. No imports from other modules (self-contained)
4. `GameSnapshot.snake` uses `readonly Position[]` to prevent mutation by consumers
