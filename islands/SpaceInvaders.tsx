import { useEffect, useRef, useState } from "preact/hooks";

interface Position {
  x: number;
  y: number;
}

interface Bullet {
  x: number;
  y: number;
  active: boolean;
}

interface Invader {
  x: number;
  y: number;
  alive: boolean;
}

export default function SpaceInvaders() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<"playing" | "gameover" | "win">("playing");
  const [score, setScore] = useState(0);
  const playerRef = useRef<Position>({ x: 375, y: 520 });
  const bulletsRef = useRef<Bullet[]>([]);
  const invaderBulletsRef = useRef<Bullet[]>([]);
  const invadersRef = useRef<Invader[]>([]);
  const invaderDirectionRef = useRef(1);
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Initialize invaders
    invadersRef.current = [];
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 11; col++) {
        invadersRef.current.push({
          x: 75 + col * 60,
          y: 50 + row * 50,
          alive: true,
        });
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key] = true;
      if (e.key === " ") {
        e.preventDefault();
        shootBullet();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key] = false;
    };

    const shootBullet = () => {
      const activeBullets = bulletsRef.current.filter(b => b.active);
      if (activeBullets.length < 3) {
        bulletsRef.current.push({
          x: playerRef.current.x + 20,
          y: playerRef.current.y,
          active: true,
        });
      }
    };

    const invaderShoot = () => {
      const aliveInvaders = invadersRef.current.filter(inv => inv.alive);
      if (aliveInvaders.length > 0 && Math.random() < 0.02) {
        const shooter = aliveInvaders[Math.floor(Math.random() * aliveInvaders.length)];
        invaderBulletsRef.current.push({
          x: shooter.x + 15,
          y: shooter.y + 20,
          active: true,
        });
      }
    };

    const updateGame = () => {
      // Clear canvas
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, 800, 600);

      // Update player position
      if (keysRef.current["ArrowLeft"] && playerRef.current.x > 0) {
        playerRef.current.x -= 5;
      }
      if (keysRef.current["ArrowRight"] && playerRef.current.x < 760) {
        playerRef.current.x += 5;
      }

      // Draw player
      ctx.fillStyle = "#0f0";
      ctx.fillRect(playerRef.current.x, playerRef.current.y, 40, 30);
      ctx.fillRect(playerRef.current.x + 15, playerRef.current.y - 10, 10, 10);

      // Update and draw bullets
      bulletsRef.current = bulletsRef.current.filter(bullet => {
        if (!bullet.active) return false;

        bullet.y -= 8;
        if (bullet.y < 0) {
          bullet.active = false;
          return false;
        }

        // Check collision with invaders
        for (const invader of invadersRef.current) {
          if (invader.alive &&
              bullet.x > invader.x && bullet.x < invader.x + 30 &&
              bullet.y > invader.y && bullet.y < invader.y + 20) {
            invader.alive = false;
            bullet.active = false;
            setScore(prev => prev + 10);
            return false;
          }
        }

        ctx.fillStyle = "#0ff";
        ctx.fillRect(bullet.x, bullet.y, 3, 10);
        return true;
      });

      // Update invaders
      let shouldMoveDown = false;
      const aliveInvaders = invadersRef.current.filter(inv => inv.alive);

      if (aliveInvaders.length === 0) {
        setGameState("win");
        return;
      }

      for (const invader of aliveInvaders) {
        if ((invader.x <= 10 && invaderDirectionRef.current < 0) ||
            (invader.x >= 760 && invaderDirectionRef.current > 0)) {
          shouldMoveDown = true;
          break;
        }
      }

      if (shouldMoveDown) {
        invaderDirectionRef.current *= -1;
        for (const invader of invadersRef.current) {
          if (invader.alive) {
            invader.y += 30;
            if (invader.y >= 500) {
              setGameState("gameover");
              return;
            }
          }
        }
      }

      // Move invaders
      for (const invader of invadersRef.current) {
        if (invader.alive) {
          invader.x += invaderDirectionRef.current * 0.5;
        }
      }

      // Draw invaders
      ctx.fillStyle = "#fff";
      for (const invader of invadersRef.current) {
        if (invader.alive) {
          // Simple invader shape
          ctx.fillRect(invader.x, invader.y, 30, 20);
          ctx.fillStyle = "#000";
          ctx.fillRect(invader.x + 5, invader.y + 5, 5, 5);
          ctx.fillRect(invader.x + 20, invader.y + 5, 5, 5);
          ctx.fillStyle = "#fff";
        }
      }

      // Invader shooting
      invaderShoot();

      // Update and draw invader bullets
      invaderBulletsRef.current = invaderBulletsRef.current.filter(bullet => {
        if (!bullet.active) return false;

        bullet.y += 4;
        if (bullet.y > 600) {
          bullet.active = false;
          return false;
        }

        // Check collision with player
        if (bullet.x > playerRef.current.x && bullet.x < playerRef.current.x + 40 &&
            bullet.y > playerRef.current.y && bullet.y < playerRef.current.y + 30) {
          setGameState("gameover");
          return false;
        }

        ctx.fillStyle = "#f00";
        ctx.fillRect(bullet.x, bullet.y, 3, 10);
        return true;
      });

      // Draw score
      ctx.fillStyle = "#fff";
      ctx.font = "20px monospace";
      ctx.fillText(`Score: ${score}`, 10, 30);

      if (gameState === "playing") {
        animationRef.current = requestAnimationFrame(updateGame);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    if (gameState === "playing") {
      updateGame();
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState, score]);

  const resetGame = () => {
    setScore(0);
    setGameState("playing");
    playerRef.current = { x: 375, y: 520 };
    bulletsRef.current = [];
    invaderBulletsRef.current = [];
    invaderDirectionRef.current = 1;
  };

  return (
    <div class="game-container">
      <h1>Space Invaders</h1>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        style={{ border: "2px solid #0f0", backgroundColor: "#000" }}
      />
      {gameState !== "playing" && (
        <div class="game-overlay">
          <div class="game-message">
            <h2>{gameState === "gameover" ? "Game Over!" : "You Win!"}</h2>
            <p>Final Score: {score}</p>
            <button onClick={resetGame}>Play Again</button>
          </div>
        </div>
      )}
      <div class="controls">
        <p>Use Arrow Keys to move, Space to shoot</p>
      </div>
      <style>{`
        .game-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px;
          font-family: monospace;
        }
        h1 {
          color: #0f0;
          margin-bottom: 20px;
        }
        .game-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .game-message {
          background: #111;
          padding: 30px;
          border: 2px solid #0f0;
          text-align: center;
          color: #0f0;
        }
        .game-message h2 {
          margin-bottom: 15px;
          font-size: 32px;
        }
        .game-message p {
          margin-bottom: 20px;
          font-size: 20px;
        }
        .game-message button {
          padding: 10px 30px;
          font-size: 18px;
          background: #0f0;
          color: #000;
          border: none;
          cursor: pointer;
          font-family: monospace;
        }
        .game-message button:hover {
          background: #0a0;
        }
        .controls {
          margin-top: 20px;
          color: #666;
        }
      `}</style>
    </div>
  );
}