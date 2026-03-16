# OpenSpec: Renderer Module

**Module:** `src/renderer/`
**Status:** Specification
**Version:** 1.1
**Date:** 2026-03-15
**Files:** `canvas-renderer.ts`, `colors.ts`, `index.ts`

## Color Constants (`src/renderer/colors.ts`)

```typescript
export const COLORS = {
  BACKGROUND: '#1a1a2e',
  GRID_LINE: '#16213e',
  SNAKE_BODY: '#00ff41',
  SNAKE_HEAD: '#00cc33',
  FOOD: '#ff0040',
  TEXT: '#e0e0e0',
  OVERLAY_BG: 'rgba(0, 0, 0, 0.7)',
} as const;
```

No other exports from this file.

## Renderer Interface

```typescript
export interface Renderer {
  render(snapshot: GameSnapshot): void;
  getCanvas(): HTMLCanvasElement;
  getContainer(): HTMLDivElement;
  resize(viewportWidth: number): void;
}
```

Type import:
```typescript
import type { GameSnapshot } from '../game/types';
```

## Canvas Renderer Factory (`src/renderer/canvas-renderer.ts`)

Factory function: `createCanvasRenderer(): Renderer`

Implementation:
1. Create `HTMLCanvasElement` via `document.createElement('canvas')`
2. Set `canvas.width = GAME_CONFIG.CANVAS_WIDTH` (400) and `canvas.height = GAME_CONFIG.CANVAS_HEIGHT` (400). Set `canvas.style.touchAction = 'none'` to prevent the browser compositor from initiating scroll, pan, or pinch-zoom gestures on the canvas before JavaScript touch handlers can call `preventDefault()` (see D10.3)
3. Create a score bar `HTMLDivElement` via `document.createElement('div')` with styles: width = `GAME_CONFIG.CANVAS_WIDTH + 'px'` (400px), padding `4px 10px`, boxSizing `border-box`, fontFamily `monospace`, fontSize `14px`, color `COLORS.TEXT`, backgroundColor `COLORS.BACKGROUND`, display `flex`, justifyContent `space-between`
4. Create two `<span>` elements (`scoreSpan` with text "Score: 0", `highSpan` with text "High: 0") and append both to `scoreBar`. These spans are cached — their `textContent` is updated in `render()` rather than recreating DOM nodes each frame
5. Create a `container` `HTMLDivElement` via `document.createElement('div')`. Append `scoreBar` then `canvas` to `container`
6. Create a `clipWrapper` `HTMLDivElement` via `document.createElement('div')`. Append `container` to `clipWrapper`. The `clipWrapper` is the outermost element returned by `getContainer()` for DOM insertion
7. Get 2D context: `const ctx = canvas.getContext('2d')`. If ctx is null, throw `new Error('Canvas 2D context not supported')`
8. Import `COLORS` from `'./colors'` and `GAME_CONFIG` from `'../game/types'`

Return object implementing `Renderer`:

### `render(snapshot: GameSnapshot): void`

Drawing order:
1. Clear canvas: `ctx.fillStyle = COLORS.BACKGROUND; ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT)`
2. Draw grid lines: for each column boundary (i = 0 to GRID_COLS) draw vertical line; for each row boundary (j = 0 to GRID_ROWS) draw horizontal line. Use `ctx.strokeStyle = COLORS.GRID_LINE; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(); ctx.lineTo(); ctx.stroke()`
3. **State guard**: If `snapshot.state !== 'MENU'`, draw food and snake (steps 4-6). If `snapshot.state === 'MENU'`, skip steps 4-6 entirely (food position defaults to `{x:0,y:0}` before first game and would appear through the semi-transparent overlay)
4. Draw food: `ctx.fillStyle = COLORS.FOOD; ctx.fillRect(snapshot.food.x * GAME_CONFIG.CELL_SIZE, snapshot.food.y * GAME_CONFIG.CELL_SIZE, GAME_CONFIG.CELL_SIZE, GAME_CONFIG.CELL_SIZE)`
5. Draw snake body (index 1 to end): `ctx.fillStyle = COLORS.SNAKE_BODY; ctx.fillRect(pos.x * GAME_CONFIG.CELL_SIZE, pos.y * GAME_CONFIG.CELL_SIZE, GAME_CONFIG.CELL_SIZE, GAME_CONFIG.CELL_SIZE)`
6. Draw snake head (index 0, if snake.length > 0): `ctx.fillStyle = COLORS.SNAKE_HEAD; ctx.fillRect(...)`
7. If `snapshot.state === 'MENU'`: draw overlay — fill full canvas with `COLORS.OVERLAY_BG`, then draw centered text using `COLORS.TEXT`, `ctx.textAlign = 'center'`, x=200:
   - "Snake Game" (font: bold 32px monospace, y=160)
   - "Tap or Press Space/Enter to Start" (font: 16px monospace, y=220)
   - "High Score: {snapshot.highScore}" (font: 14px monospace, y=260)
   - "Wall Mode: {snapshot.wallMode}" (font: 14px monospace, y=290)
   - "Double-Tap or Press W to Toggle Wall Mode" (font: 14px monospace, y=310)
8. If `snapshot.state === 'PAUSED'`: draw overlay — fill canvas with `COLORS.OVERLAY_BG`, draw:
   - "Paused" (font: bold 32px monospace, x=200, y=200)
   - "Tap or Press Escape to Resume" (font: 16px monospace, x=200, y=240)
9. If `snapshot.state === 'GAME_OVER'`: draw overlay — fill canvas with `COLORS.OVERLAY_BG`, draw:
   - "Game Over" (font: bold 32px monospace, x=200, y=160)
   - "Score: {snapshot.score}" (font: 20px monospace, x=200, y=210)
   - "High Score: {snapshot.highScore}" (font: 16px monospace, x=200, y=250)
   - "Tap or Press Space/Enter to Play Again" (font: 16px monospace, x=200, y=290)
   - "Wall Mode: {snapshot.wallMode}" (font: 14px monospace, x=200, y=320)
   - "Double-Tap or Press W to Toggle Wall Mode" (font: 14px monospace, x=200, y=340)
10. Update score bar spans (always, every frame): `scoreSpan.textContent = 'Score: ' + snapshot.score` and `highSpan.textContent = 'High: ' + snapshot.highScore`

**Note:** There is NO canvas-drawn score text at y=395. The score display is handled entirely by the HTML score bar div above the canvas.

### `getCanvas(): HTMLCanvasElement`

Return the canvas element created in the factory. Used for input event binding (touch listeners attach to canvas).

### `getContainer(): HTMLDivElement`

Return the `clipWrapper` element. This is the outermost DOM element and should be used by `main.ts` for DOM insertion (`appContainer.appendChild(renderer.getContainer())`).

### `resize(viewportWidth: number): void`

- If `viewportWidth < 440`: calculate `scale = (viewportWidth - 40) / 400`, apply `container.style.transform = 'scale(' + scale + ')'` and `container.style.transformOrigin = 'top left'`, set `clipWrapper.style.width = (viewportWidth - 40) + 'px'`, read `scoreBarHeight = scoreBar.offsetHeight || 22` (fallback to 22 in case the element is not yet visible — see D10.1), set `clipWrapper.style.height = (scoreBarHeight + canvas.height) * scale + 'px'`, set `clipWrapper.style.overflow = 'hidden'`
- Else: clear all inline styles on `container` (transform, transformOrigin) and `clipWrapper` (width, height, overflow)

## Barrel Export (`src/renderer/index.ts`)

```typescript
export { createCanvasRenderer } from './canvas-renderer';
export { COLORS } from './colors';
export type { Renderer } from './canvas-renderer';
```

## Constraints

1. Renderer does NOT import game logic — only `GameSnapshot` type and `GAME_CONFIG` constants
2. No mutation of snapshot data — treat all received data as readonly
3. Canvas context error is fatal — throw Error, do not fallback
4. Overlay text rendering uses `ctx.fillText` on the canvas. Score display uses a separate HTML `div` element above the canvas with cached `span` elements updated via `textContent`
