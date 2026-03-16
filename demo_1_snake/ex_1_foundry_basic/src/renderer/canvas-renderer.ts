import type { GameSnapshot } from '../game/types';
import { GAME_CONFIG } from '../game/types';
import { COLORS } from './colors';

export interface Renderer {
  render(snapshot: GameSnapshot): void;
  getCanvas(): HTMLCanvasElement;
  getContainer(): HTMLDivElement;
  resize(viewportWidth: number): void;
}

export function createCanvasRenderer(): Renderer {
  const canvas = document.createElement('canvas');
  canvas.width = GAME_CONFIG.CANVAS_WIDTH;
  canvas.height = GAME_CONFIG.CANVAS_HEIGHT;
  canvas.style.touchAction = 'none';

  const scoreBar = document.createElement('div');
  scoreBar.style.width = GAME_CONFIG.CANVAS_WIDTH + 'px';
  scoreBar.style.padding = '4px 10px';
  scoreBar.style.boxSizing = 'border-box';
  scoreBar.style.fontFamily = 'monospace';
  scoreBar.style.fontSize = '14px';
  scoreBar.style.color = COLORS.TEXT;
  scoreBar.style.backgroundColor = COLORS.BACKGROUND;
  scoreBar.style.display = 'flex';
  scoreBar.style.justifyContent = 'space-between';
  const scoreSpan = document.createElement('span');
  scoreSpan.textContent = 'Score: 0';
  const highSpan = document.createElement('span');
  highSpan.textContent = 'High: 0';
  scoreBar.appendChild(scoreSpan);
  scoreBar.appendChild(highSpan);

  const container = document.createElement('div');
  container.appendChild(scoreBar);
  container.appendChild(canvas);

  const clipWrapper = document.createElement('div');
  clipWrapper.appendChild(container);

  const ctxOrNull = canvas.getContext('2d');
  if (ctxOrNull === null) {
    throw new Error('Canvas 2D context not supported');
  }
  const ctx = ctxOrNull;

  function render(snapshot: GameSnapshot): void {
    // Clear canvas
    ctx.fillStyle = COLORS.BACKGROUND;
    ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);

    // Draw grid lines
    ctx.strokeStyle = COLORS.GRID_LINE;
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GAME_CONFIG.GRID_COLS; i++) {
      ctx.beginPath();
      ctx.moveTo(i * GAME_CONFIG.CELL_SIZE, 0);
      ctx.lineTo(i * GAME_CONFIG.CELL_SIZE, GAME_CONFIG.CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let j = 0; j <= GAME_CONFIG.GRID_ROWS; j++) {
      ctx.beginPath();
      ctx.moveTo(0, j * GAME_CONFIG.CELL_SIZE);
      ctx.lineTo(GAME_CONFIG.CANVAS_WIDTH, j * GAME_CONFIG.CELL_SIZE);
      ctx.stroke();
    }

    // Draw food and snake only when not in MENU state (food defaults to {x:0,y:0} before first game)
    if (snapshot.state !== 'MENU') {
      // Draw food
      ctx.fillStyle = COLORS.FOOD;
      ctx.fillRect(
        snapshot.food.x * GAME_CONFIG.CELL_SIZE,
        snapshot.food.y * GAME_CONFIG.CELL_SIZE,
        GAME_CONFIG.CELL_SIZE,
        GAME_CONFIG.CELL_SIZE
      );

      // Draw snake body (index 1 to end)
      ctx.fillStyle = COLORS.SNAKE_BODY;
      for (let i = 1; i < snapshot.snake.length; i++) {
        ctx.fillRect(
          snapshot.snake[i].x * GAME_CONFIG.CELL_SIZE,
          snapshot.snake[i].y * GAME_CONFIG.CELL_SIZE,
          GAME_CONFIG.CELL_SIZE,
          GAME_CONFIG.CELL_SIZE
        );
      }

      // Draw snake head (index 0)
      if (snapshot.snake.length > 0) {
        ctx.fillStyle = COLORS.SNAKE_HEAD;
        ctx.fillRect(
          snapshot.snake[0].x * GAME_CONFIG.CELL_SIZE,
          snapshot.snake[0].y * GAME_CONFIG.CELL_SIZE,
          GAME_CONFIG.CELL_SIZE,
          GAME_CONFIG.CELL_SIZE
        );
      }
    }

    // State overlays
    if (snapshot.state === 'MENU') {
      ctx.fillStyle = COLORS.OVERLAY_BG;
      ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
      ctx.fillStyle = COLORS.TEXT;
      ctx.textAlign = 'center';
      ctx.font = 'bold 32px monospace';
      ctx.fillText('Snake Game', 200, 160);
      ctx.font = '16px monospace';
      ctx.fillText('Tap or Press Space/Enter to Start', 200, 220);
      ctx.font = '14px monospace';
      ctx.fillText('High Score: ' + snapshot.highScore, 200, 260);
      ctx.fillText('Wall Mode: ' + snapshot.wallMode, 200, 290);
      ctx.fillText('Double-Tap or Press W to Toggle Wall Mode', 200, 310);
    }

    if (snapshot.state === 'PAUSED') {
      ctx.fillStyle = COLORS.OVERLAY_BG;
      ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
      ctx.fillStyle = COLORS.TEXT;
      ctx.textAlign = 'center';
      ctx.font = 'bold 32px monospace';
      ctx.fillText('Paused', 200, 200);
      ctx.font = '16px monospace';
      ctx.fillText('Tap or Press Escape to Resume', 200, 240);
    }

    if (snapshot.state === 'GAME_OVER') {
      ctx.fillStyle = COLORS.OVERLAY_BG;
      ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
      ctx.fillStyle = COLORS.TEXT;
      ctx.textAlign = 'center';
      ctx.font = 'bold 32px monospace';
      ctx.fillText('Game Over', 200, 160);
      ctx.font = '20px monospace';
      ctx.fillText('Score: ' + snapshot.score, 200, 210);
      ctx.font = '16px monospace';
      ctx.fillText('High Score: ' + snapshot.highScore, 200, 250);
      ctx.fillText('Tap or Press Space/Enter to Play Again', 200, 290);
      ctx.font = '14px monospace';
      ctx.fillText('Wall Mode: ' + snapshot.wallMode, 200, 320);
      ctx.fillText('Double-Tap or Press W to Toggle Wall Mode', 200, 340);
    }

    // Update score bar text (spans cached at creation time)
    scoreSpan.textContent = 'Score: ' + snapshot.score;
    highSpan.textContent = 'High: ' + snapshot.highScore;
  }

  function getCanvas(): HTMLCanvasElement {
    return canvas;
  }

  function resize(viewportWidth: number): void {
    if (viewportWidth < 440) {
      const scoreBarHeight = scoreBar.offsetHeight || 22;
      const scale = (viewportWidth - 40) / 400;
      container.style.transform = 'scale(' + scale + ')';
      container.style.transformOrigin = 'top left';
      clipWrapper.style.width = (viewportWidth - 40) + 'px';
      clipWrapper.style.height = (scoreBarHeight + canvas.height) * scale + 'px';
      clipWrapper.style.overflow = 'hidden';
    } else {
      container.style.transform = '';
      container.style.transformOrigin = '';
      clipWrapper.style.width = '';
      clipWrapper.style.height = '';
      clipWrapper.style.overflow = '';
    }
  }

  function getContainer(): HTMLDivElement {
    return clipWrapper;
  }

  return { render, getCanvas, getContainer, resize };
}
