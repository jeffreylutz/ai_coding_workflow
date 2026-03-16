# OpenSpec: Game Service

**Module:** `src/game/game-service.ts`
**Status:** Specification
**Version:** 1.1
**Date:** 2026-03-15
**Pattern:** Closure-based singleton (matches `createAuthService()` in `src/auth/auth-service.ts`)

## Factory Function

Signature: `createGameService(userId: string): GameService`

Where `GameService` is the return type — a plain object with these methods:

| Method | Signature | Purpose |
|---|---|---|
| `transition` | `(event: GameEvent) => void` | Validates and applies state transitions per FSM table; ignores invalid transitions silently; calls notifyListeners() only inside branches where a valid state change occurs and no animation loop will handle notification (PAUSE and COLLISION branches); branches that call startLoop() delegate notification to the animation loop; invalid/unhandled events do not trigger notification |
| `tick` | `() => void` | Advances game by one step: dequeue inputs, move snake, check collisions, check food |
| `getSnapshot` | `() => GameSnapshot` | Returns readonly copy of current state for renderer |
| `onGameChange` | `(callback: GameChangeCallback) => () => void` | Registers listener, returns unsubscribe function |
| `setWallMode` | `(mode: WallMode) => void` | Sets wall mode, persists to localStorage key `snake_settings_{userId}`, and calls notifyListeners() to push updated snapshot |
| `destroy` | `() => void` | Cancels requestAnimationFrame loop, clears all listeners |

## Private Closure State

| Variable | Type | Initial Value |
|---|---|---|
| `state` | `GameState` | `'MENU'` |
| `snake` | `Position[]` | empty array (populated on START) |
| `food` | `Position` | `{ x: 0, y: 0 }` (populated on START) |
| `score` | `number` | `0` |
| `highScore` | `number` | loaded from `localStorage.getItem('snake_highscore_' + userId)`, parsed as integer, default `0` on null or NaN |
| `wallMode` | `WallMode` | loaded from `localStorage.getItem('snake_settings_' + userId)`, parsed as JSON, extract `.wallMode`, default `'death'` on null or parse error |
| `tickInterval` | `number` | `GAME_CONFIG.INITIAL_TICK_MS` (150) |
| `direction` | `Direction` | `GAME_CONFIG.INITIAL_DIRECTION` ('RIGHT') |
| `inputQueue` | `Direction[]` | empty array |
| `listeners` | `GameChangeCallback[]` | empty array |
| `animationFrameId` | `number \| null` | `null` |
| `lastTickTime` | `number` | `0` |

## FSM Transition Table

All other state+event combinations are silently ignored.

| Current State | Event | Next State | Side Effects |
|---|---|---|---|
| MENU | START | PLAYING | Reset snake to `GAME_CONFIG.INITIAL_SNAKE_LENGTH` segments starting at `GAME_CONFIG.INITIAL_HEAD_POSITION`, extending left (one cell per segment); reset score to 0; set tickInterval to `GAME_CONFIG.INITIAL_TICK_MS`; set direction to `GAME_CONFIG.INITIAL_DIRECTION`; clear inputQueue; spawn food at random unoccupied cell; set lastTickTime to current timestamp via `performance.now()`; start requestAnimationFrame loop |
| PLAYING | PAUSE | PAUSED | Cancel requestAnimationFrame; set animationFrameId to null |
| PLAYING | COLLISION | GAME_OVER | Cancel requestAnimationFrame; set animationFrameId to null; if score > highScore then set highScore = score and write to localStorage key `snake_highscore_{userId}` |
| PAUSED | RESUME | PLAYING | Set lastTickTime to current timestamp via `performance.now()`; start requestAnimationFrame loop |
| GAME_OVER | RESTART | PLAYING | Same side effects as MENU → START |

## Game Loop

Inside `requestAnimationFrame` callback (parameter: `timestamp: number`):
1. Calculate elapsed: `timestamp - lastTickTime`
2. If elapsed >= tickInterval: call `tick()`, set `lastTickTime = timestamp`
3. If `animationFrameId` is not null (i.e., `stopLoop()` was not called during `tick()`): call `notifyListeners()` to push current snapshot to all registered callbacks, then set `animationFrameId = requestAnimationFrame(loop)` to request next frame. This guard prevents both redundant notification and rescheduling after a COLLISION transition fires mid-frame — the COLLISION branch already called `notifyListeners()` before `stopLoop()` set `animationFrameId` to null.

## Tick Algorithm

On each `tick()` call:
1. Dequeue up to `GAME_CONFIG.MAX_INPUT_QUEUE_SIZE` (2) directions from inputQueue. For each, validate it is not opposite of current direction (UP↔DOWN, LEFT↔RIGHT). If valid, update `direction`.
2. Calculate new head: `{ x: snake[0].x + dx, y: snake[0].y + dy }` where dx/dy are determined by direction: UP=(0,-1), DOWN=(0,1), LEFT=(-1,0), RIGHT=(1,0)
3. Apply wall collision: if wallMode is `'death'`, check bounds (x<0 or x>=`GAME_CONFIG.GRID_COLS` or y<0 or y>=`GAME_CONFIG.GRID_ROWS`) → if out of bounds, call `transition({ type: 'COLLISION' })` and return. If wallMode is `'wrap'`, wrap coordinates: x<0→`GAME_CONFIG.GRID_COLS-1`, x>=`GAME_CONFIG.GRID_COLS`→0, y<0→`GAME_CONFIG.GRID_ROWS-1`, y>=`GAME_CONFIG.GRID_ROWS`→0.
4. Check self-collision: iterate snake array from index 0 to snake.length-2 (excluding the tail segment), if any position matches newHead (pos.x === newHead.x && pos.y === newHead.y) → call `transition({ type: 'COLLISION' })` and return. The tail is excluded because tick() will pop it in step 7, so the cell it occupies is logically free for the new head to enter (tail-chasing is valid).
5. Insert newHead at index 0 of snake array via `snake.unshift(newHead)`
6. Check food collision: if newHead.x === food.x && newHead.y === food.y → increment score by `GAME_CONFIG.POINTS_PER_FOOD` (10), decrease tickInterval by `GAME_CONFIG.TICK_DECREASE_PER_FOOD` (2), clamp tickInterval to minimum `GAME_CONFIG.MIN_TICK_MS` (60), spawn new food via `spawnFood()`
7. If no food collision: remove last element via `snake.pop()`

## Food Spawning Algorithm

Function `spawnFood(): Position` (private to closure):
1. Create a Set of occupied positions using string keys `"x,y"` for each position in the snake array
2. Build array of all grid positions (x from 0 to `GAME_CONFIG.GRID_COLS` - 1, y from 0 to `GAME_CONFIG.GRID_ROWS` - 1) not in the Set
3. If array is empty (snake fills entire grid): call `transition({ type: 'COLLISION' })` and return current food position
4. Pick random index: `Math.floor(Math.random() * array.length)`
5. Return the Position at that index

The caller assigns the return value to the `food` variable (e.g., `food = spawnFood()`).

## Direction Change Handling

When `transition` receives `{ type: 'DIRECTION_CHANGE', direction }`:
- Only valid in PLAYING state
- Push direction to inputQueue if inputQueue.length < `GAME_CONFIG.MAX_INPUT_QUEUE_SIZE` (2)
- Do NOT directly change `direction` variable — it is changed during `tick()` after validation

## localStorage Integration

| Key | Read When | Write When | Format |
|---|---|---|---|
| `snake_highscore_{userId}` | `createGameService()` init | COLLISION transition when score > highScore | String integer, e.g. `"350"` |
| `snake_settings_{userId}` | `createGameService()` init | `setWallMode()` called | JSON string, e.g. `{"wallMode":"wrap"}` |

Read errors (null, corrupt JSON, NaN): catch with try/catch, use defaults (highScore: 0, wallMode: 'death').
Write errors (quota exceeded): catch with try/catch, `console.warn`, continue without persistence.

## Singleton Export

Do NOT create the singleton at module scope (unlike auth-service.ts). The game service requires a userId, so it is created in `src/main.ts` after authentication. Export only the factory function:

```typescript
export { createGameService };
```

## Constraints

1. No Canvas, DOM, or browser rendering API imports
2. Only browser APIs allowed: `requestAnimationFrame`, `cancelAnimationFrame`, `performance.now()`, `localStorage`, `Math.random()`, `Math.floor()`
3. All mutable state private to closure — exposed only via methods returning copies
4. `getSnapshot()` must return a new object with `snake` as a deep copy of Position objects (`snake.map(p => ({ x: p.x, y: p.y }))`), `food` as a shallow copy (`{ ...food }`), and all scalar fields (`state`, `score`, `highScore`, `wallMode`, `tickInterval`) copied by value — no returned object or array element may share a reference with internal state
