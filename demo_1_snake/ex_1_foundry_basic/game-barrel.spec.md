# OpenSpec: Module Barrel Exports

**Status:** Specification
**Version:** 1.1
**Date:** 2026-03-15

## Game Module Barrel (`src/game/index.ts`)

```typescript
export { createGameService } from './game-service';
export { GAME_CONFIG } from './types';
export type { Direction, GameState, WallMode, Position, GameEvent, GameSnapshot, GameChangeCallback } from './types';
```

## Renderer Module Barrel (`src/renderer/index.ts`)

```typescript
export { createCanvasRenderer } from './canvas-renderer';
export { COLORS } from './colors';
export type { Renderer } from './canvas-renderer';
```

## Input Module Barrel (`src/input/index.ts`)

```typescript
export { setupKeyboardInput } from './keyboard';
export { setupTouchInput } from './touch';
```

## Auth Module Barrel (`src/auth/index.ts`) — existing

```typescript
export { authService } from './auth-service';
export { initAuth } from './auth-ui';
export type { User, SafeUser, AuthState, AuthResult, AuthChangeCallback } from './types';
```
