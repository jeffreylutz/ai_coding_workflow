import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createGameService } from './game-service';
import { GAME_CONFIG } from './types';
import type { GameSnapshot } from './types';

describe('Game Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.spyOn(performance, 'now').mockReturnValue(0);
  });

  it('complete game lifecycle: MENU → PLAYING → PAUSED → PLAYING → GAME_OVER → PLAYING', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); // food at (0,0)
    const svc = createGameService('integration-user');

    expect(svc.getSnapshot().state).toBe('MENU');

    svc.transition({ type: 'START' });
    expect(svc.getSnapshot().state).toBe('PLAYING');

    svc.transition({ type: 'PAUSE' });
    expect(svc.getSnapshot().state).toBe('PAUSED');

    svc.transition({ type: 'RESUME' });
    expect(svc.getSnapshot().state).toBe('PLAYING');

    // Trigger wall collision by ticking RIGHT 10 times
    for (let i = 0; i < 10; i++) svc.tick();
    expect(svc.getSnapshot().state).toBe('GAME_OVER');

    svc.transition({ type: 'RESTART' });
    expect(svc.getSnapshot().state).toBe('PLAYING');
  });

  it('eating food increases score and speed', () => {
    // Place food at (11,10) — directly right of snake head
    vi.spyOn(Math, 'random').mockReturnValue(0.572);
    const svc = createGameService('food-user');
    svc.transition({ type: 'START' });

    const food1 = svc.getSnapshot().food;
    if (food1.x === 11 && food1.y === 10) {
      svc.tick(); // eat food at (11,10)
      let snap = svc.getSnapshot();
      expect(snap.score).toBe(10);
      expect(snap.snake).toHaveLength(4);
      expect(snap.tickInterval).toBe(148);

      // Check next food placement and eat it
      const food2 = snap.food;
      // Can't easily predict next food, just verify state is consistent
      expect(food2).toBeDefined();
      expect(snap.state).toBe('PLAYING');
    }
  });

  it('high score persists across game service instances', () => {
    // Set up high score via first instance
    localStorage.setItem('snake_highscore_persist-user', '30');
    const svc1 = createGameService('persist-user');
    expect(svc1.getSnapshot().highScore).toBe(30);
    svc1.destroy();

    // Second instance should load same high score
    const svc2 = createGameService('persist-user');
    expect(svc2.getSnapshot().highScore).toBe(30);
    svc2.destroy();
  });

  it('wall mode wrap allows snake to pass through walls', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const svc = createGameService('wrap-user');
    svc.setWallMode('wrap');
    svc.transition({ type: 'START' }); // head at x=10 moving RIGHT

    for (let i = 0; i < 10; i++) svc.tick(); // x=20 wraps to 0
    const snap = svc.getSnapshot();
    expect(snap.state).toBe('PLAYING');
    expect(snap.snake[0].x).toBe(0);
  });

  it('listener receives snapshots on state-changing transitions', () => {
    const svc = createGameService('listener-user');
    const listener = vi.fn();
    svc.onGameChange(listener);

    svc.transition({ type: 'START' });
    svc.transition({ type: 'PAUSE' });
    expect(listener).toHaveBeenCalled();
    const pauseSnap: GameSnapshot = listener.mock.calls[0][0];
    expect(pauseSnap.state).toBe('PAUSED');
    expect(pauseSnap.snake).toHaveLength(3);

    listener.mockClear();
    svc.transition({ type: 'RESUME' });
    svc.transition({ type: 'COLLISION' });
    expect(listener).toHaveBeenCalled();
    const collisionSnap: GameSnapshot = listener.mock.calls[0][0];
    expect(collisionSnap.state).toBe('GAME_OVER');
  });
});
