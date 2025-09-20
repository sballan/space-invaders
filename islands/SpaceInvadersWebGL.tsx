/**
 * Space Invaders WebGL Island Component
 * Fresh island that renders the WebGL-based Space Invaders game
 * Minimal React/Preact wrapper around the game engine
 */

import { useEffect, useRef, useState } from "preact/hooks";
import { SpaceInvadersGame } from "../src/game/space-invaders-game.ts";

/**
 * Game statistics interface for display
 */
interface GameStats {
  score: number;
  lives: number;
  level: number;
  invadersRemaining: number;
  gameState: string;
}

/**
 * WebGL-based Space Invaders game component
 */
export default function SpaceInvadersWebGL() {
  // Canvas reference for WebGL rendering
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Game instance reference
  const gameRef = useRef<SpaceInvadersGame | null>(null);

  // Game state for UI display
  const [gameStats, setGameStats] = useState<GameStats>({
    score: 0,
    lives: 3,
    level: 1,
    invadersRemaining: 55,
    gameState: "menu",
  });

  // Loading and error states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGameStarted, setIsGameStarted] = useState(false);

  /**
   * Initialize the game when component mounts
   */
  useEffect(() => {
    // Just set loading to false initially, we'll initialize the game when canvas is available
    setIsLoading(false);
  }, []);

  /**
   * Initialize the game after the canvas is rendered
   */
  useEffect(() => {
    if (isLoading) return; // Wait until not loading

    const initializeGame = async () => {
      try {
        const canvas = canvasRef.current;
        console.log("Canvas ref:", canvas);
        console.log("Canvas element:", canvas?.tagName);

        if (!canvas) {
          console.error(
            "Canvas not found! canvasRef.current is:",
            canvasRef.current,
          );
          throw new Error("Canvas not found");
        }

        // Set canvas size
        canvas.width = 800;
        canvas.height = 600;

        // Create game instance
        console.log("Creating SpaceInvadersGame instance...");
        const game = new SpaceInvadersGame(canvas);
        gameRef.current = game;
        console.log("SpaceInvadersGame instance created");

        // Load game assets
        console.log("Loading game assets...");
        await game.loadAssets();
        console.log("Game assets loaded");

        // Initialize and start the game engine
        game.initialize();

        console.log("Game initialized successfully!");
      } catch (err) {
        console.error("Failed to initialize game:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    };

    // Small delay to ensure canvas is fully rendered
    const timer = setTimeout(initializeGame, 100);

    // Cleanup on unmount
    return () => {
      clearTimeout(timer);
      if (gameRef.current) {
        gameRef.current.destroy();
        gameRef.current = null;
      }
    };
  }, [isLoading]);

  /**
   * Update game statistics periodically
   */
  useEffect(() => {
    if (!gameRef.current || isLoading) return;

    const updateStats = () => {
      if (gameRef.current) {
        const stats = gameRef.current.getGameStats();
        setGameStats(stats);
      }
    };

    // Update stats every 100ms
    const interval = setInterval(updateStats, 100);

    return () => clearInterval(interval);
  }, [isLoading]);

  /**
   * Handles starting a new game
   */
  const handleStartGame = () => {
    if (gameRef.current) {
      gameRef.current.startGame();
      setIsGameStarted(true);
    }
  };

  /**
   * Handles pausing/resuming the game
   */
  const handleTogglePause = () => {
    if (gameRef.current) {
      gameRef.current.togglePause();
    }
  };

  /**
   * Handles restarting the game
   */
  const handleRestartGame = () => {
    if (gameRef.current) {
      gameRef.current.startGame();
      setIsGameStarted(true);
    }
  };

  /**
   * Debug function to analyze canvas pixel data
   */
  const analyzeCanvasPixels = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2");
    if (!gl) return;

    const width = canvas.width;
    const height = canvas.height;
    const pixels = new Uint8Array(width * height * 4);

    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    let nonBlackPixels = 0;
    const colorCounts = new Map();

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const a = pixels[i + 3];

      if (r > 0 || g > 0 || b > 0) {
        nonBlackPixels++;
        const color = `${r},${g},${b},${a}`;
        colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
      }
    }

    console.log(
      `Canvas analysis: ${nonBlackPixels} non-black pixels out of ${
        width * height
      }`,
    );
    console.log(
      "Top colors found:",
      Array.from(colorCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5),
    );
  };

  /**
   * Error state display
   */
  if (error) {
    return (
      <div class="game-container error">
        <h1>Space Invaders WebGL</h1>
        <div class="error-message">
          <h2>Error</h2>
          <p>{error}</p>
          <p>Please make sure your browser supports WebGL2.</p>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  /**
   * Loading state display
   */
  if (isLoading) {
    return (
      <div class="game-container loading">
        <h1>Space Invaders WebGL</h1>
        <div class="loading-message">
          <h2>Loading...</h2>
          <p>Initializing WebGL graphics engine...</p>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  /**
   * Main game display
   */
  return (
    <div class="game-container">
      <h1>Space Invaders WebGL</h1>

      {/* Game HUD */}
      <div class="game-hud">
        <div class="stat">
          <span class="label">Score:</span>
          <span class="value">{gameStats.score.toLocaleString()}</span>
        </div>
        <div class="stat">
          <span class="label">Lives:</span>
          <span class="value">{gameStats.lives}</span>
        </div>
        <div class="stat">
          <span class="label">Level:</span>
          <span class="value">{gameStats.level}</span>
        </div>
        <div class="stat">
          <span class="label">Invaders:</span>
          <span class="value">{gameStats.invadersRemaining}</span>
        </div>
        <div class="stat">
          <span class="label">State:</span>
          <span class="value state">{gameStats.gameState}</span>
        </div>
      </div>

      {/* Game Canvas */}
      <div class="canvas-container">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          class="game-canvas"
        />

        {/* Game overlay for menu/pause states */}
        {(!isGameStarted || gameStats.gameState === "paused" ||
          gameStats.gameState === "gameover") && (
          <div class="game-overlay">
            <div class="overlay-content">
              {!isGameStarted && (
                <>
                  <h2>Space Invaders</h2>
                  <p>Use Arrow Keys or WASD to move</p>
                  <p>Press Space or click to shoot</p>
                  <button
                    type="button"
                    onClick={handleStartGame}
                    class="game-button"
                  >
                    Start Game
                  </button>
                </>
              )}

              {gameStats.gameState === "paused" && (
                <>
                  <h2>Game Paused</h2>
                  <button
                    type="button"
                    onClick={handleTogglePause}
                    class="game-button"
                  >
                    Resume
                  </button>
                  <button
                    type="button"
                    onClick={handleRestartGame}
                    class="game-button secondary"
                  >
                    Restart
                  </button>
                </>
              )}

              {gameStats.gameState === "gameover" && (
                <>
                  <h2>Game Over!</h2>
                  <p>Final Score: {gameStats.score.toLocaleString()}</p>
                  <p>Level Reached: {gameStats.level}</p>
                  <button
                    type="button"
                    onClick={handleRestartGame}
                    class="game-button"
                  >
                    Play Again
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Game Controls */}
      <div class="game-controls">
        {isGameStarted && gameStats.gameState === "running" && (
          <>
            <button
              type="button"
              onClick={handleTogglePause}
              class="control-button"
            >
              Pause
            </button>
            <button
              type="button"
              onClick={handleRestartGame}
              class="control-button secondary"
            >
              Restart
            </button>
            <button
              type="button"
              onClick={analyzeCanvasPixels}
              class="control-button"
            >
              Debug Canvas
            </button>
            <button
              type="button"
              onClick={() => {
                const canvas = canvasRef.current;
                if (canvas) {
                  const link = document.createElement("a");
                  link.download = "canvas-screenshot.png";
                  link.href = canvas.toDataURL();
                  link.click();
                }
              }}
              class="control-button"
            >
              Save Screenshot
            </button>
          </>
        )}
      </div>

      {/* Game Instructions */}
      <div class="game-instructions">
        <h3>Controls</h3>
        <div class="controls-grid">
          <div class="control-item">
            <kbd>←→</kbd> or <kbd>A</kbd>
            <kbd>D</kbd>
            <span>Move</span>
          </div>
          <div class="control-item">
            <kbd>Space</kbd>
            <span>Shoot</span>
          </div>
          <div class="control-item">
            <kbd>Esc</kbd> or <kbd>P</kbd>
            <span>Pause</span>
          </div>
        </div>
      </div>

      <style>{styles}</style>
    </div>
  );
}

/**
 * Component styles
 */
const styles = `
  .game-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
    font-family: 'Courier New', monospace;
    background: #000;
    color: #0f0;
    min-height: 100vh;
  }

  .game-container.loading,
  .game-container.error {
    justify-content: center;
  }

  h1 {
    margin: 0 0 20px 0;
    font-size: 2.5rem;
    text-shadow: 0 0 10px #0f0;
    letter-spacing: 2px;
  }

  .game-hud {
    display: flex;
    gap: 30px;
    margin-bottom: 20px;
    padding: 15px 30px;
    background: rgba(0, 255, 0, 0.1);
    border: 2px solid #0f0;
    border-radius: 8px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 80px;
  }

  .stat .label {
    font-size: 0.9rem;
    opacity: 0.8;
    margin-bottom: 4px;
  }

  .stat .value {
    font-size: 1.2rem;
    font-weight: bold;
    text-shadow: 0 0 5px #0f0;
  }

  .stat .value.state {
    text-transform: capitalize;
    color: #ff0;
  }

  .canvas-container {
    position: relative;
    margin-bottom: 20px;
  }

  .game-canvas {
    border: 3px solid #0f0;
    border-radius: 8px;
    background: #000;
    box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);
  }

  .game-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
  }

  .overlay-content {
    text-align: center;
    padding: 40px;
    background: rgba(0, 255, 0, 0.1);
    border: 2px solid #0f0;
    border-radius: 12px;
    backdrop-filter: blur(5px);
  }

  .overlay-content h2 {
    font-size: 2rem;
    margin: 0 0 20px 0;
    text-shadow: 0 0 10px #0f0;
  }

  .overlay-content p {
    margin: 10px 0;
    opacity: 0.9;
    font-size: 1.1rem;
  }

  .game-button {
    background: transparent;
    border: 2px solid #0f0;
    color: #0f0;
    padding: 12px 30px;
    font-size: 1.1rem;
    font-family: inherit;
    cursor: pointer;
    margin: 10px;
    border-radius: 6px;
    transition: all 0.3s ease;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .game-button:hover {
    background: #0f0;
    color: #000;
    box-shadow: 0 0 15px #0f0;
    transform: translateY(-2px);
  }

  .game-button.secondary {
    border-color: #ff0;
    color: #ff0;
  }

  .game-button.secondary:hover {
    background: #ff0;
    color: #000;
    box-shadow: 0 0 15px #ff0;
  }

  .game-controls {
    margin-bottom: 30px;
  }

  .control-button {
    background: transparent;
    border: 1px solid #0f0;
    color: #0f0;
    padding: 8px 20px;
    font-size: 1rem;
    font-family: inherit;
    cursor: pointer;
    margin: 0 10px;
    border-radius: 4px;
    transition: all 0.2s ease;
  }

  .control-button:hover {
    background: rgba(0, 255, 0, 0.2);
    transform: translateY(-1px);
  }

  .control-button.secondary {
    border-color: #888;
    color: #888;
  }

  .control-button.secondary:hover {
    background: rgba(136, 136, 136, 0.2);
    border-color: #aaa;
    color: #aaa;
  }

  .game-instructions {
    text-align: center;
    max-width: 600px;
  }

  .game-instructions h3 {
    margin: 0 0 15px 0;
    font-size: 1.3rem;
    opacity: 0.9;
  }

  .controls-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 15px;
    justify-items: center;
  }

  .control-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  kbd {
    background: rgba(0, 255, 0, 0.2);
    border: 1px solid #0f0;
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 0.9rem;
    margin: 0 2px;
  }

  .loading-message,
  .error-message {
    text-align: center;
    padding: 40px;
    background: rgba(0, 255, 0, 0.1);
    border: 2px solid #0f0;
    border-radius: 12px;
    max-width: 500px;
  }

  .error-message {
    border-color: #f00;
    background: rgba(255, 0, 0, 0.1);
    color: #f00;
  }

  .error-message h2 {
    color: #f00;
    text-shadow: 0 0 10px #f00;
  }

  /* Responsive design */
  @media (max-width: 900px) {
    .game-canvas {
      width: 100%;
      max-width: 800px;
      height: auto;
    }

    .game-hud {
      gap: 15px;
      padding: 10px 15px;
    }

    .stat {
      min-width: 60px;
    }

    h1 {
      font-size: 2rem;
    }
  }

  @media (max-width: 600px) {
    .game-container {
      padding: 10px;
    }

    .game-hud {
      gap: 10px;
      padding: 8px 12px;
    }

    .controls-grid {
      grid-template-columns: 1fr;
      gap: 10px;
    }

    h1 {
      font-size: 1.5rem;
    }
  }
`;
