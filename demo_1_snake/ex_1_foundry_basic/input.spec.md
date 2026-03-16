# OpenSpec: Input Module

**Module:** `src/input/`
**Status:** Specification
**Version:** 1.1
**Date:** 2026-03-15
**Files:** `keyboard.ts`, `touch.ts`, `index.ts`

## Keyboard Input (`src/input/keyboard.ts`)

Export signature:
```typescript
export function setupKeyboardInput(
  gameService: { transition: (event: GameEvent) => void; getSnapshot: () => GameSnapshot; setWallMode: (mode: WallMode) => void }
): () => void
```

Type imports:
```typescript
import type { GameEvent, GameSnapshot, WallMode } from '../game/types';
```

Implementation:
1. Register `keydown` event listener on `document`
2. Key mapping (exact):
   - `w` or `W` → **context-dependent**: call `gameService.getSnapshot()`. If `snapshot.state` is `'MENU'` or `'GAME_OVER'`, toggle wall mode: compute `newMode = snapshot.wallMode === 'death' ? 'wrap' : 'death'` and call `gameService.setWallMode(newMode)`. Otherwise (in PLAYING or PAUSED state), dispatch `{ type: 'DIRECTION_CHANGE', direction: 'UP' }`
   - `ArrowUp` → `{ type: 'DIRECTION_CHANGE', direction: 'UP' }`
   - `ArrowDown` or `s` or `S` → `{ type: 'DIRECTION_CHANGE', direction: 'DOWN' }`
   - `ArrowLeft` or `a` or `A` → `{ type: 'DIRECTION_CHANGE', direction: 'LEFT' }`
   - `ArrowRight` or `d` or `D` → `{ type: 'DIRECTION_CHANGE', direction: 'RIGHT' }`
   - `' '` (Space) or `Enter` → call `gameService.getSnapshot()`: if state is `'MENU'`, dispatch `{ type: 'START' }`; if state is `'GAME_OVER'`, dispatch `{ type: 'RESTART' }`
   - `Escape` → call `gameService.getSnapshot()`: if state is `'PLAYING'`, dispatch `{ type: 'PAUSE' }`; if state is `'PAUSED'`, dispatch `{ type: 'RESUME' }`
3. Call `event.preventDefault()` placement rules:
   - For direction keys (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `s`/`S`, `a`/`A`, `d`/`D`) and `w`/`W`: call `event.preventDefault()` unconditionally (before any state check)
   - For `' '` (Space) and `Enter`: call `event.preventDefault()` only inside the state-conditional branches where the key is consumed (`'MENU'` → START, `'GAME_OVER'` → RESTART). Do NOT call `event.preventDefault()` in `'PLAYING'` or `'PAUSED'` states, so that browser default behavior (e.g., button activation) is preserved when these keys have no game function
   - For `Escape`: call `event.preventDefault()` only inside the state-conditional branches where the key is consumed (`'PLAYING'` → PAUSE, `'PAUSED'` → RESUME). Do NOT call `event.preventDefault()` in `'MENU'` or `'GAME_OVER'` states (D11.1 made this conditional)
4. Return a function that calls `document.removeEventListener('keydown', handler)`

## Touch Input (`src/input/touch.ts`)

Export signature:
```typescript
export function setupTouchInput(
  gameService: { transition: (event: GameEvent) => void; getSnapshot: () => GameSnapshot; setWallMode: (mode: WallMode) => void },
  canvas: HTMLCanvasElement
): () => void
```

Type imports:
```typescript
import type { GameEvent, GameSnapshot, Direction, WallMode } from '../game/types';
import { GAME_CONFIG } from '../game/types';
```

Implementation:
1. Declare closure variables: `startX: number = 0`, `startY: number = 0`, `lastTapTime: number = 0`, `const DOUBLE_TAP_MS = 300`, `pendingStartTimer: ReturnType<typeof setTimeout> | undefined`
2. Register `touchstart` listener on `canvas` with `{ passive: false }`:
   - Call `event.preventDefault()`
   - Set `startX = event.touches[0].clientX`
   - Set `startY = event.touches[0].clientY`
3. Register `touchend` listener on `canvas` with `{ passive: false }`:
   - Call `event.preventDefault()`
   - Calculate `deltaX = event.changedTouches[0].clientX - startX`
   - Calculate `deltaY = event.changedTouches[0].clientY - startY`
   - **Tap detection**: If `Math.abs(deltaX) < GAME_CONFIG.SWIPE_THRESHOLD_PX` AND `Math.abs(deltaY) < GAME_CONFIG.SWIPE_THRESHOLD_PX`:
     - Read `snapshot = gameService.getSnapshot()` and `now = Date.now()`
     - If `snapshot.state === 'MENU'` or `snapshot.state === 'GAME_OVER'`:
       - If `now - lastTapTime < DOUBLE_TAP_MS` (double-tap): clear `pendingStartTimer`, toggle wall mode via `gameService.setWallMode(snapshot.wallMode === 'death' ? 'wrap' : 'death')`, reset `lastTapTime = 0`
       - Else (single tap): set `lastTapTime = now`, capture `eventType = snapshot.state === 'MENU' ? 'START' : 'RESTART'` (capture BEFORE setTimeout), set `pendingStartTimer = setTimeout(() => gameService.transition({ type: eventType }), DOUBLE_TAP_MS)`
     - If `snapshot.state === 'PLAYING'`: reset `lastTapTime = 0`, dispatch `{ type: 'PAUSE' }`
     - If `snapshot.state === 'PAUSED'`: reset `lastTapTime = 0`, dispatch `{ type: 'RESUME' }`
     - Return (do not process as swipe)
   - **Swipe detection**: If `Math.abs(deltaX) >= Math.abs(deltaY)`: direction is `deltaX > 0 ? 'RIGHT' : 'LEFT'`. Else: direction is `deltaY > 0 ? 'DOWN' : 'UP'`. Dispatch `{ type: 'DIRECTION_CHANGE', direction }`
4. Return a cleanup function that calls `clearTimeout(pendingStartTimer)` and removes both `touchstart` and `touchend` listeners from canvas

## Barrel Export (`src/input/index.ts`)

```typescript
export { setupKeyboardInput } from './keyboard';
export { setupTouchInput } from './touch';
```

## Constraints

1. Keyboard and touch modules do NOT directly modify game state — they call `gameService.transition()` or `gameService.setWallMode()`
2. Touch threshold is exactly 30px (`GAME_CONFIG.SWIPE_THRESHOLD_PX`)
3. All event listeners must be removable via returned cleanup functions
