import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createGameService } from '../game/game-service';
import { createCanvasRenderer } from '../renderer/canvas-renderer';
import { setupKeyboardInput } from '../input/keyboard';
import { setupTouchInput } from '../input/touch';
import { GAME_CONFIG } from '../game/types';

describe('E2E: Game Lifecycle', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.stubGlobal('requestAnimationFrame', vi.fn((_cb: FrameRequestCallback) => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.spyOn(performance, 'now').mockReturnValue(0);
    vi.spyOn(Math, 'random').mockReturnValue(0);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      textAlign: 'start',
      font: '',
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn(() => ({ width: 0 })),
      save: vi.fn(),
      restore: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
  });

  it('full wiring: renderer receives snapshots from game service via listener', () => {
    const renderer = createCanvasRenderer();
    const gameService = createGameService('e2e-user');
    const renderSpy = vi.spyOn(renderer, 'render');
    gameService.onGameChange((snapshot) => renderer.render(snapshot));
    gameService.transition({ type: 'START' });
    gameService.transition({ type: 'PAUSE' });
    expect(renderSpy).toHaveBeenCalled();
    expect(renderSpy.mock.calls[0][0].state).toBe('PAUSED');
    gameService.destroy();
  });

  it('keyboard input triggers game state transitions', () => {
    const gameService = createGameService('e2e-user');
    const cleanup = setupKeyboardInput(gameService);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    expect(gameService.getSnapshot().state).toBe('PLAYING');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(gameService.getSnapshot().state).toBe('PAUSED');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(gameService.getSnapshot().state).toBe('PLAYING');

    cleanup();
    gameService.destroy();
  });

  it('keyboard direction changes affect snake movement', () => {
    const gameService = createGameService('e2e-user');
    const cleanup = setupKeyboardInput(gameService);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    gameService.tick();
    expect(gameService.getSnapshot().snake[0]).toEqual({ x: 10, y: 9 });

    cleanup();
    gameService.destroy();
  });

  it('touch input triggers direction changes on canvas', () => {
    const renderer = createCanvasRenderer();
    const gameService = createGameService('e2e-user');
    const canvas = renderer.getCanvas();
    const cleanup = setupTouchInput(gameService, canvas);

    gameService.transition({ type: 'START' });

    const touchStartEvent = new Event('touchstart', { cancelable: true });
    Object.assign(touchStartEvent, {
      touches: [{ clientX: 100, clientY: 100 }],
      preventDefault: vi.fn(),
    });
    canvas.dispatchEvent(touchStartEvent);

    const touchEndEvent = new Event('touchend', { cancelable: true });
    Object.assign(touchEndEvent, {
      changedTouches: [{ clientX: 200, clientY: 100 }],
      preventDefault: vi.fn(),
    });
    canvas.dispatchEvent(touchEndEvent);

    gameService.tick();
    expect(gameService.getSnapshot().snake[0]).toEqual({ x: 11, y: 10 });

    cleanup();
    gameService.destroy();
  });

  it('cleanup removes all event listeners', () => {
    const renderer = createCanvasRenderer();
    const gameService = createGameService('e2e-user');
    const cleanupKeyboard = setupKeyboardInput(gameService);
    const cleanupTouch = setupTouchInput(gameService, renderer.getCanvas());

    gameService.transition({ type: 'START' });

    cleanupKeyboard();
    cleanupTouch();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));

    const touchStartEvent = new Event('touchstart', { cancelable: true });
    Object.assign(touchStartEvent, {
      touches: [{ clientX: 100, clientY: 100 }],
      preventDefault: vi.fn(),
    });
    renderer.getCanvas().dispatchEvent(touchStartEvent);

    const touchEndEvent = new Event('touchend', { cancelable: true });
    Object.assign(touchEndEvent, {
      changedTouches: [{ clientX: 100, clientY: 0 }],
      preventDefault: vi.fn(),
    });
    renderer.getCanvas().dispatchEvent(touchEndEvent);

    gameService.tick();
    expect(gameService.getSnapshot().snake[0]).toEqual({ x: 11, y: 10 });

    gameService.destroy();
  });

  it('high score persists across game service instances', () => {
    localStorage.setItem('snake_highscore_e2e-user', '100');
    const svc1 = createGameService('e2e-user');
    expect(svc1.getSnapshot().highScore).toBe(100);
    svc1.destroy();

    const svc2 = createGameService('e2e-user');
    expect(svc2.getSnapshot().highScore).toBe(100);
    svc2.destroy();
  });

  it('wall mode setting persists across game service instances', () => {
    const svc1 = createGameService('e2e-user');
    svc1.setWallMode('wrap');
    svc1.destroy();

    const svc2 = createGameService('e2e-user');
    expect(svc2.getSnapshot().wallMode).toBe('wrap');
    svc2.destroy();
  });

  it('resize scales canvas for narrow viewports', () => {
    const renderer = createCanvasRenderer();
    renderer.resize(300);
    const inner = renderer.getContainer().firstElementChild as HTMLElement;
    expect(inner.style.transform).toBe('scale(0.65)');
    renderer.resize(500);
    expect(inner.style.transform).toBe('');
  });

  it('logout teardown removes renderer DOM, stops animation frame, and removes resize listener', () => {
    const appContainer = document.createElement('div');
    document.body.appendChild(appContainer);

    const renderer = createCanvasRenderer();
    appContainer.appendChild(renderer.getContainer());
    const gameService = createGameService('lifecycle-user');
    const unsubscribeGame = gameService.onGameChange((snapshot) => renderer.render(snapshot));
    const cleanupKeyboard = setupKeyboardInput(gameService);
    const cleanupTouch = setupTouchInput(gameService, renderer.getCanvas());
    const resizeHandler = () => renderer.resize(window.innerWidth);
    window.addEventListener('resize', resizeHandler);

    gameService.transition({ type: 'START' });
    expect(appContainer.children.length).toBe(1);

    // Teardown path mirroring main.ts lines 31-47
    cleanupKeyboard();
    cleanupTouch();
    unsubscribeGame();
    gameService.destroy();
    window.removeEventListener('resize', resizeHandler);
    renderer.getContainer().remove();

    expect(appContainer.children.length).toBe(0);
    expect(cancelAnimationFrame).toHaveBeenCalled();

    // Keyboard event after teardown should not throw
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));

    document.body.removeChild(appContainer);
  });

  it('full logout and re-login cycle creates fresh modules without resource leaks', () => {
    const appContainer = document.createElement('div');
    document.body.appendChild(appContainer);

    // Session 1 — setup
    const renderer1 = createCanvasRenderer();
    appContainer.appendChild(renderer1.getContainer());
    const gameService1 = createGameService('user-session1');
    const renderSpy1 = vi.spyOn(renderer1, 'render');
    const unsubscribeGame1 = gameService1.onGameChange((snapshot) => renderer1.render(snapshot));
    const cleanupKeyboard1 = setupKeyboardInput(gameService1);
    const cleanupTouch1 = setupTouchInput(gameService1, renderer1.getCanvas());
    const resizeHandler1 = () => renderer1.resize(window.innerWidth);
    window.addEventListener('resize', resizeHandler1);

    // Session 1 — use the game
    gameService1.transition({ type: 'START' });
    expect(gameService1.getSnapshot().state).toBe('PLAYING');

    // Session 1 — teardown (mirrors main.ts lines 31-47)
    cleanupKeyboard1();
    cleanupTouch1();
    unsubscribeGame1();
    gameService1.destroy();
    window.removeEventListener('resize', resizeHandler1);
    renderer1.getContainer().remove();

    expect(appContainer.children.length).toBe(0);
    renderSpy1.mockClear();

    // Session 2 — setup (simulating re-login)
    const renderer2 = createCanvasRenderer();
    appContainer.appendChild(renderer2.getContainer());
    const gameService2 = createGameService('user-session2');
    const renderSpy2 = vi.spyOn(renderer2, 'render');
    const unsubscribeGame2 = gameService2.onGameChange((snapshot) => renderer2.render(snapshot));
    const cleanupKeyboard2 = setupKeyboardInput(gameService2);
    const cleanupTouch2 = setupTouchInput(gameService2, renderer2.getCanvas());
    const resizeHandler2 = () => renderer2.resize(window.innerWidth);
    window.addEventListener('resize', resizeHandler2);

    // Session 2 — verify fresh state
    expect(gameService2.getSnapshot().state).toBe('MENU');
    gameService2.transition({ type: 'START' });
    expect(gameService2.getSnapshot().state).toBe('PLAYING');
    gameService2.transition({ type: 'PAUSE' });
    expect(renderSpy2).toHaveBeenCalled();
    expect(renderSpy1).not.toHaveBeenCalled();

    // Session 2 — verify keyboard works (currently PAUSED, Escape resumes to PLAYING)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(gameService2.getSnapshot().state).toBe('PLAYING');
    // Now pause again via keyboard to verify full round-trip
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(gameService2.getSnapshot().state).toBe('PAUSED');

    // Session 2 — cleanup
    cleanupKeyboard2();
    cleanupTouch2();
    unsubscribeGame2();
    gameService2.destroy();
    window.removeEventListener('resize', resizeHandler2);
    renderer2.getContainer().remove();
    document.body.removeChild(appContainer);
  });

  it('keyboard events after teardown do not reach destroyed game service', () => {
    const gameService = createGameService('teardown-kb-user');
    const cleanup = setupKeyboardInput(gameService);

    gameService.transition({ type: 'START' });
    expect(gameService.getSnapshot().state).toBe('PLAYING');

    cleanup();
    gameService.destroy();

    const transitionSpy = vi.spyOn(gameService, 'transition');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(transitionSpy).not.toHaveBeenCalled();
  });

  it('touch events after teardown do not reach destroyed game service', () => {
    const renderer = createCanvasRenderer();
    const gameService = createGameService('teardown-touch-user');
    const canvas = renderer.getCanvas();
    const cleanup = setupTouchInput(gameService, canvas);

    gameService.transition({ type: 'START' });
    expect(gameService.getSnapshot().state).toBe('PLAYING');

    cleanup();
    gameService.destroy();

    const transitionSpy = vi.spyOn(gameService, 'transition');

    const ts = new Event('touchstart', { cancelable: true });
    Object.assign(ts, {
      touches: [{ clientX: 100, clientY: 100 }],
      preventDefault: vi.fn(),
    });
    canvas.dispatchEvent(ts);

    const te = new Event('touchend', { cancelable: true });
    Object.assign(te, {
      changedTouches: [{ clientX: 200, clientY: 100 }],
      preventDefault: vi.fn(),
    });
    canvas.dispatchEvent(te);

    expect(transitionSpy).not.toHaveBeenCalled();
  });

  it('game service destroy stops animation frame loop', () => {
    const cancelSpy = vi.mocked(cancelAnimationFrame);
    cancelSpy.mockClear();

    const gameService = createGameService('destroy-raf-user');
    gameService.transition({ type: 'START' });
    gameService.destroy();

    expect(cancelSpy).toHaveBeenCalled();

    cancelSpy.mockClear();
    gameService.destroy();
    expect(cancelSpy).not.toHaveBeenCalled();
  });

  it('resize listener does not fire after teardown', () => {
    const renderer = createCanvasRenderer();
    const resizeSpy = vi.spyOn(renderer, 'resize');
    const resizeHandler = () => renderer.resize(window.innerWidth);
    window.addEventListener('resize', resizeHandler);

    window.removeEventListener('resize', resizeHandler);
    resizeSpy.mockClear();
    window.dispatchEvent(new Event('resize'));

    expect(resizeSpy).not.toHaveBeenCalled();
  });
});
