import { initAuth, authService } from './auth';
import { createGameService } from './game';
import { createCanvasRenderer } from './renderer';
import { setupKeyboardInput } from './input/keyboard';
import { setupTouchInput } from './input/touch';

const appContainer = document.querySelector<HTMLDivElement>('#app')!;

let cleanupKeyboard: (() => void) | undefined;
let cleanupTouch: (() => void) | undefined;
let unsubscribeGame: (() => void) | undefined;
let gameService: ReturnType<typeof createGameService> | undefined;
let renderer: ReturnType<typeof createCanvasRenderer> | undefined;
let resizeHandler: (() => void) | undefined;

authService.onAuthChange((authState) => {
  if (authState.isAuthenticated && authState.currentUser) {
    renderer = createCanvasRenderer();
    appContainer.appendChild(renderer.getContainer());

    gameService = createGameService(authState.currentUser.id);
    unsubscribeGame = gameService.onGameChange((snapshot) => renderer!.render(snapshot));

    cleanupKeyboard = setupKeyboardInput(gameService);
    cleanupTouch = setupTouchInput(gameService, renderer.getCanvas());

    resizeHandler = () => renderer!.resize(window.innerWidth);
    window.addEventListener('resize', resizeHandler);
    requestAnimationFrame(() => renderer!.resize(window.innerWidth));
    renderer.render(gameService.getSnapshot());
  } else {
    cleanupKeyboard?.();
    cleanupKeyboard = undefined;
    cleanupTouch?.();
    cleanupTouch = undefined;
    unsubscribeGame?.();
    unsubscribeGame = undefined;
    gameService?.destroy();
    gameService = undefined;
    if (resizeHandler) {
      window.removeEventListener('resize', resizeHandler);
      resizeHandler = undefined;
    }
    if (renderer) {
      renderer.getContainer().remove();
      renderer = undefined;
    }
  }
});

initAuth(appContainer);
