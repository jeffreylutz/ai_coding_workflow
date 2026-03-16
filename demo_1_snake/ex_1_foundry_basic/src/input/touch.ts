import type { GameEvent, GameSnapshot, Direction, WallMode } from '../game/types';
import { GAME_CONFIG } from '../game/types';

export function setupTouchInput(
  gameService: { transition: (event: GameEvent) => void; getSnapshot: () => GameSnapshot; setWallMode: (mode: WallMode) => void },
  canvas: HTMLCanvasElement
): () => void {
  let startX = 0;
  let startY = 0;
  let lastTapTime = 0;
  const DOUBLE_TAP_MS = 300;
  let pendingStartTimer: ReturnType<typeof setTimeout> | undefined;

  function handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }

  function handleTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const deltaX = endX - startX;
    const deltaY = endY - startY;

    if (Math.abs(deltaX) < GAME_CONFIG.SWIPE_THRESHOLD_PX && Math.abs(deltaY) < GAME_CONFIG.SWIPE_THRESHOLD_PX) {
      const snapshot = gameService.getSnapshot();
      const now = Date.now();
      if (snapshot.state === 'MENU' || snapshot.state === 'GAME_OVER') {
        if (now - lastTapTime < DOUBLE_TAP_MS) {
          clearTimeout(pendingStartTimer);
          pendingStartTimer = undefined;
          const newMode: WallMode = snapshot.wallMode === 'death' ? 'wrap' : 'death';
          gameService.setWallMode(newMode);
          lastTapTime = 0;
        } else {
          lastTapTime = now;
          const eventType = snapshot.state === 'MENU' ? 'START' : 'RESTART';
          pendingStartTimer = setTimeout(() => {
            pendingStartTimer = undefined;
            gameService.transition({ type: eventType });
          }, DOUBLE_TAP_MS);
        }
      } else if (snapshot.state === 'PLAYING') {
        lastTapTime = 0;
        gameService.transition({ type: 'PAUSE' });
      } else if (snapshot.state === 'PAUSED') {
        lastTapTime = 0;
        gameService.transition({ type: 'RESUME' });
      }
      return;
    }

    let direction: Direction;
    if (Math.abs(deltaX) >= Math.abs(deltaY)) {
      direction = deltaX > 0 ? 'RIGHT' : 'LEFT';
    } else {
      direction = deltaY > 0 ? 'DOWN' : 'UP';
    }

    gameService.transition({ type: 'DIRECTION_CHANGE', direction });
  }

  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

  return () => {
    clearTimeout(pendingStartTimer);
    canvas.removeEventListener('touchstart', handleTouchStart);
    canvas.removeEventListener('touchend', handleTouchEnd);
  };
}
