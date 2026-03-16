# Project Context

## Purpose
Classic Snake game running in a web browser. Desktop keyboard controls and touch/swipe input. No authentication, no user accounts.

## Tech Stack
- TypeScript
- Vite (dev server and build)
- Vitest with jsdom (testing)
- Canvas 2D API (rendering)
- No framework — pure DOM manipulation

## Project Conventions

### Code Style
- Closure-based factories (`createGameService`, `createCanvasRenderer`) instead of classes
- Plain objects with methods closing over private state
- No default exports — named exports only

### Architecture Patterns
- Observer pattern for state change notifications (`onGameChange` returns unsubscribe function)
- Snapshot-based rendering — immutable `GameSnapshot` passed to renderer each frame
- Input queue — direction changes buffered and consumed during tick
- Composition root in `src/main.ts` — only file that imports from multiple modules

### Testing Strategy
- Unit tests co-located with source files (`*.test.ts`)
- Vitest with jsdom environment
- Run all: `npm test`

### Git Workflow
- Single `main` branch

## Domain Context
- 20x20 grid, 20px cells, 400x400 canvas
- Snake starts at center (10,10), 3 segments, moving RIGHT
- Two wall modes: death (collision ends game) and wrap (snake wraps around)
- Speed increases by 2ms per food eaten (150ms initial, 60ms minimum)
- 10 points per food

## Important Constraints
- No authentication or user accounts
- No mobile-responsive layout (touch input is supported on the canvas itself)
- Single local high score (not per-user)

## External Dependencies
- None — fully client-side with localStorage for persistence
