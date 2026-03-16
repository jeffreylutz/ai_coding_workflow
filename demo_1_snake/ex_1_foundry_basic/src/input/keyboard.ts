import type { GameEvent, GameSnapshot, WallMode } from '../game/types';

export function setupKeyboardInput(
  gameService: { transition: (event: GameEvent) => void; getSnapshot: () => GameSnapshot; setWallMode: (mode: WallMode) => void }
): () => void {
  function handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'w' || e.key === 'W') {
      e.preventDefault();
      const snapshot = gameService.getSnapshot();
      if (snapshot.state === 'MENU' || snapshot.state === 'GAME_OVER') {
        const newMode: WallMode = snapshot.wallMode === 'death' ? 'wrap' : 'death';
        gameService.setWallMode(newMode);
      } else {
        gameService.transition({ type: 'DIRECTION_CHANGE', direction: 'UP' });
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      gameService.transition({ type: 'DIRECTION_CHANGE', direction: 'UP' });
    } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
      e.preventDefault();
      gameService.transition({ type: 'DIRECTION_CHANGE', direction: 'DOWN' });
    } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      e.preventDefault();
      gameService.transition({ type: 'DIRECTION_CHANGE', direction: 'LEFT' });
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      e.preventDefault();
      gameService.transition({ type: 'DIRECTION_CHANGE', direction: 'RIGHT' });
    } else if (e.key === ' ' || e.key === 'Enter') {
      const snapshot = gameService.getSnapshot();
      if (snapshot.state === 'MENU') {
        e.preventDefault();
        gameService.transition({ type: 'START' });
      } else if (snapshot.state === 'GAME_OVER') {
        e.preventDefault();
        gameService.transition({ type: 'RESTART' });
      }
    } else if (e.key === 'Escape') {
      const snapshot = gameService.getSnapshot();
      if (snapshot.state === 'PLAYING') {
        e.preventDefault();
        gameService.transition({ type: 'PAUSE' });
      } else if (snapshot.state === 'PAUSED') {
        e.preventDefault();
        gameService.transition({ type: 'RESUME' });
      }
    }
  }

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}
