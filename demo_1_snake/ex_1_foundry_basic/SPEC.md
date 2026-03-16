# Snake Game — OpenSpec Index

**Version:** 2.0
**Date:** 2026-03-15

## Scope

A classic Snake game that runs in a web browser. Desktop keyboard controls only. No authentication, no mobile/touch support.

## Specification Files

| File | Module | Description |
|---|---|---|
| [game-types.spec.md](game-types.spec.md) | `src/game/types.ts` | Type definitions, interfaces, and game configuration constants |
| [game-service.spec.md](game-service.spec.md) | `src/game/game-service.ts` | Game service — FSM, tick logic, collision detection, scoring |
| [input.spec.md](input.spec.md) | `src/input/` | Keyboard input handling |
| [renderer.spec.md](renderer.spec.md) | `src/renderer/` | Canvas rendering — drawing, overlays, colors |
| [main-wiring.spec.md](main-wiring.spec.md) | `src/main.ts` | Main entry point — module wiring and composition root |
| [game-barrel.spec.md](game-barrel.spec.md) | `*/index.ts` | Barrel export files for all modules |

## Out of Scope

- Authentication / login / user accounts
- Mobile / touch / swipe controls
- Responsive scaling for small viewports
- Per-user high scores (single local high score is fine)

## Implementation Order

1. `src/game/types.ts` — types and constants (no dependencies)
2. `src/game/game-service.ts` — game logic (depends on types)
3. `src/renderer/colors.ts` — color constants (no dependencies)
4. `src/renderer/canvas-renderer.ts` — renderer (depends on game types and colors)
5. `src/input/keyboard.ts` — keyboard handler (depends on game types)
6. `src/game/index.ts`, `src/renderer/index.ts`, `src/input/index.ts` — barrel exports
7. `src/main.ts` — wiring (depends on all modules)
