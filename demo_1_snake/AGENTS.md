# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

> **Working directory:** All commands and relative paths below are relative to `ex_1_foundry_basic/`.

## Scope

Classic Snake game running in a web browser. Desktop keyboard controls only. **No authentication, no mobile/touch support.**

## Commands

- **Dev server:** `npm run dev` (Vite, serves at localhost)
- **Build:** `npm run build` (runs `tsc && vite build`, output in `dist/`)
- **Run all tests:** `npm test` (vitest run with `--passWithNoTests`)
- **Run a single test file:** `npx vitest run src/game/game-service.test.ts`
- **Run tests matching a name:** `npx vitest run -t "spawns food"`

## Architecture

Browser-based Snake game built with TypeScript, Vite, and Canvas 2D. No framework — pure DOM manipulation. Tests use Vitest with jsdom environment.

### Module structure

- **`src/game/`** — Core game logic. `createGameService()` is a factory returning a closure-based service (no classes). Contains a finite state machine (`MENU → PLAYING → PAUSED/GAME_OVER`), tick loop via `requestAnimationFrame`, input queue, collision detection, and localStorage persistence for high scores and wall mode settings.
- **`src/renderer/`** — `createCanvasRenderer()` returns a closure-based renderer. Manages a canvas and a score bar (HTML div above canvas). Overlays (menu, pause, game over) are drawn directly on canvas.
- **`src/input/`** — Keyboard handler (`setupKeyboardInput`). Arrow keys and WASD for direction, Space/Enter for start/restart, Escape for pause/resume, W for wall mode toggle. Returns a cleanup function.
- **`src/main.ts`** — Composition root. Creates game service, renderer, and input handler, then starts the game loop.

### Key patterns

- **Closure-based services** instead of classes — `createGameService`, `createCanvasRenderer` return plain objects with methods closing over private state.
- **Observer pattern** — `gameService.onGameChange` accepts a callback and returns an unsubscribe function.
- **Snapshot-based rendering** — `GameSnapshot` is an immutable copy of game state passed to the renderer each frame. Renderer is a pure function of the snapshot.
- **Input queue** — Direction changes are buffered (max 2) and consumed during `tick()` to prevent rapid key presses from causing 180-degree turns.

### Specifications

OpenSpec specs live in `openspec/specs/[capability]/spec.md`. Use `openspec list --specs` to enumerate capabilities and `openspec show [spec-id]` to view details. `TASKS.md` in `ex_1_foundry_basic/` tracks implementation tasks. When implementing or fixing features, check the relevant spec for expected behavior. See `openspec/AGENTS.md` for the full spec-driven workflow.

<!-- OPENSPEC:START -->
### OpenSpec Instructions

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->
