/**
 * Space Invaders Game Logic
 * Main game implementation using the modular game engine
 * Handles game states, entity spawning, and game-specific mechanics
 */

import { GameEngine, GameState } from "../engine/core/game-engine.ts";
import { ComponentFactory } from "../engine/core/component.ts";
import { InputSystem } from "../engine/input/input-system.ts";
import { InputManager } from "../engine/input/input-manager.ts";
import { CollisionSystem } from "../engine/physics/collision-system.ts";
import { AudioManager } from "../engine/audio/audio-manager.ts";
import { SpaceInvadersSystem } from "./space-invaders-system.ts";

/**
 * Game configuration and constants
 */
const GAME_CONFIG = {
  // Screen dimensions
  SCREEN_WIDTH: 800,
  SCREEN_HEIGHT: 600,

  // Player settings
  PLAYER_SPEED: 250,
  PLAYER_SIZE: { width: 80, height: 60 }, // Made much larger
  PLAYER_START_X: 400,
  PLAYER_START_Y: 500, // Moved player higher to be visible

  // Invader settings
  INVADER_ROWS: 5,
  INVADER_COLS: 11,
  INVADER_SIZE: { width: 60, height: 40 }, // Made much larger
  INVADER_SPACING_X: 60,
  INVADER_SPACING_Y: 50,
  INVADER_START_X: 75,
  INVADER_START_Y: 100,
  INVADER_SPEED: 30,
  INVADER_DROP_SPEED: 30,

  // Bullet settings
  BULLET_SPEED: 400,
  BULLET_SIZE: { width: 8, height: 20 }, // Made larger for visibility
  MAX_PLAYER_BULLETS: 3,

  // Game progression
  INVADER_SCORE_VALUES: [10, 20, 30, 40, 50], // Points per row (bottom to top)
  PLAYER_LIVES: 3,
};

/**
 * Space Invaders game implementation
 */
export class SpaceInvadersGame {
  private gameEngine: GameEngine;
  private inputSystem: InputSystem;
  private collisionSystem: CollisionSystem;
  private audioManager: AudioManager;

  // Game state
  private score = 0;
  private lives = GAME_CONFIG.PLAYER_LIVES;
  private level = 1;
  private gameStarted = false;

  // Entity references
  private playerId: number | null = null;
  private invaderFormation: { entityId: number; row: number; col: number }[] =
    [];
  private invaderDirection = 1; // 1 = right, -1 = left
  private invaderMoveTimer = 0;
  private invaderShootTimer = 0;

  // Game timing
  private readonly INVADER_MOVE_INTERVAL = 1.0; // Seconds between moves
  private readonly INVADER_SHOOT_INTERVAL = 2.0; // Seconds between shots

  constructor(canvas: HTMLCanvasElement) {
    // Initialize core engine
    this.gameEngine = new GameEngine(canvas, { debug: true, pauseOnBlur: false });

    // Initialize subsystems
    const inputManager = new InputManager(canvas);
    this.inputSystem = new InputSystem(inputManager);
    this.collisionSystem = new CollisionSystem();
    this.audioManager = new AudioManager();

    // Register systems with the engine
    const systemManager = this.gameEngine.getSystemManager();
    systemManager.registerSystem(this.inputSystem);
    systemManager.registerSystem(this.collisionSystem);
    systemManager.registerSystem(new SpaceInvadersSystem(this.gameEngine));

    // Set up collision handlers
    this.setupCollisionHandlers();

    // Set up camera for the game area
    this.setupCamera();
  }

  /**
   * Sets up game-specific collision handlers
   */
  private setupCollisionHandlers(): void {
    // Player bullet hits invader
    this.collisionSystem.registerCollisionHandler("bullet_enemy", (event) => {
      const bullet = event.entityA.hasComponent("bullet")
        ? event.entityA
        : event.entityB;
      const invader = bullet === event.entityA ? event.entityB : event.entityA;

      // Award points based on invader row
      const invaderData = this.invaderFormation.find((inv) =>
        inv.entityId === invader.id
      );
      if (invaderData) {
        const points = GAME_CONFIG.INVADER_SCORE_VALUES[invaderData.row] || 10;
        this.addScore(points);

        // Remove from formation
        this.invaderFormation = this.invaderFormation.filter((inv) =>
          inv.entityId !== invader.id
        );

        // Play sound effect (disabled for now)
        // this.audioManager.playSfx("invader_destroyed", 0.6);
      }

      // Destroy both entities
      bullet.destroy();
      invader.destroy();

      // Check win condition
      if (this.invaderFormation.length === 0) {
        this.nextLevel();
      }
    });

    // Invader bullet hits player
    this.collisionSystem.registerCollisionHandler("bullet_player", (event) => {
      const bullet = event.entityA.hasComponent("bullet")
        ? event.entityA
        : event.entityB;
      const player = bullet === event.entityA ? event.entityB : event.entityA;

      // Destroy bullet
      bullet.destroy();

      // Damage player
      this.damagePlayer();
    });

    // Invader hits player (collision)
    this.collisionSystem.registerCollisionHandler("player_enemy", (event) => {
      this.damagePlayer();
    });

    // Boundary collisions for bullets
    this.collisionSystem.registerCollisionHandler("boundary", (event) => {
      // Destroy bullets that hit screen boundaries
      const bullet = event.entityA.hasComponent("bullet")
        ? event.entityA
        : event.entityB.hasComponent("bullet")
        ? event.entityB
        : null;

      if (bullet) {
        bullet.destroy();
      }
    });
  }

  /**
   * Sets up the camera for the game view
   */
  private setupCamera(): void {
    const graphics = this.gameEngine.getGraphicsEngine();

    // Set camera to show the full screen area (0-800, 0-600)
    graphics.setCameraPosition(0, 0); // Top-left corner
    graphics.setCameraZoom(1.0);

    console.log("Camera set to position: (0, 0) to show full screen");
    console.log(`Screen dimensions: ${GAME_CONFIG.SCREEN_WIDTH} x ${GAME_CONFIG.SCREEN_HEIGHT}`);
  }

  /**
   * Loads game assets
   */
  async loadAssets(): Promise<void> {
    try {
      // Skip audio initialization for now to avoid hanging
      console.log("Skipping audio initialization for now...");

      // Note: In a real game, you would load actual texture and audio files
      // For this demo, we'll use the white texture that's created by default
      console.log("Game assets loaded (using default textures)");
    } catch (error) {
      console.error("Failed to load game assets:", error);
      // Don't throw the error, just continue
      console.log("Continuing...");
    }
  }

  /**
   * Initializes the engine and starts it running
   */
  initialize(): void {
    console.log("Starting game engine...");
    this.gameEngine.start();
    console.log("Game engine started successfully");
  }

  /**
   * Starts a new game
   */
  startGame(): void {
    // Clear any existing entities
    this.gameEngine.getEntityManager().clear();

    // Reset game state
    this.score = 0;
    this.lives = GAME_CONFIG.PLAYER_LIVES;
    this.level = 1;
    this.gameStarted = true;

    // Create game entities
    this.createPlayer();
    console.log("Player created");

    this.createInvaderFormation();
    console.log("Invader formation created, count:", this.invaderFormation.length);

    this.createBoundaries();
    console.log("Boundaries created");

    // Start game loop
    this.gameEngine.setGameState(GameState.Running);

    const entityManager = this.gameEngine.getEntityManager();
    const allEntities = entityManager.getAllEntities();
    console.log("Total entities created:", allEntities.length);

    console.log("Space Invaders game started!");
  }

  /**
   * Creates the player entity
   */
  private createPlayer(): void {
    const entityManager = this.gameEngine.getEntityManager();

    const player = entityManager.createEntityWithComponents(
      ComponentFactory.createPosition(
        GAME_CONFIG.PLAYER_START_X,
        GAME_CONFIG.PLAYER_START_Y,
      ),
      ComponentFactory.createVelocity(0, 0, GAME_CONFIG.PLAYER_SPEED),
      ComponentFactory.createSprite(
        "__white",
        GAME_CONFIG.PLAYER_SIZE.width,
        GAME_CONFIG.PLAYER_SIZE.height,
      ),
      ComponentFactory.createInput({
        "ArrowLeft": "move_left",
        "ArrowRight": "move_right",
        "Space": "fire",
      }),
      ComponentFactory.createWeapon(
        0.3,
        GAME_CONFIG.MAX_PLAYER_BULLETS,
        GAME_CONFIG.BULLET_SPEED,
        10,
      ),
      ComponentFactory.createHealth(1),
      ComponentFactory.createCollision(
        GAME_CONFIG.PLAYER_SIZE.width,
        GAME_CONFIG.PLAYER_SIZE.height,
        ["player"],
        ["enemy", "enemy_bullet"],
      ),
    );

    // Set player sprite color to green
    const sprite = player.getComponent<
      import("../engine/core/component.ts").SpriteComponent
    >("sprite")!;
    sprite.color = { r: 0, g: 1, b: 0, a: 1 };

    this.playerId = player.id;

    // Debug: Log player position
    const position = player.getComponent<import("../engine/core/component.ts").PositionComponent>("position")!;
    console.log(`Player created at position: (${position.position.x}, ${position.position.y})`);
  }

  /**
   * Creates the invader formation
   */
  private createInvaderFormation(): void {
    const entityManager = this.gameEngine.getEntityManager();
    this.invaderFormation = [];

    for (let row = 0; row < GAME_CONFIG.INVADER_ROWS; row++) {
      for (let col = 0; col < GAME_CONFIG.INVADER_COLS; col++) {
        const x = GAME_CONFIG.INVADER_START_X +
          col * GAME_CONFIG.INVADER_SPACING_X;
        const y = GAME_CONFIG.INVADER_START_Y +
          row * GAME_CONFIG.INVADER_SPACING_Y;

        const invader = entityManager.createEntityWithComponents(
          ComponentFactory.createPosition(x, y),
          ComponentFactory.createVelocity(0, 0, GAME_CONFIG.INVADER_SPEED),
          ComponentFactory.createSprite(
            "__white",
            GAME_CONFIG.INVADER_SIZE.width,
            GAME_CONFIG.INVADER_SIZE.height,
          ),
          ComponentFactory.createHealth(1),
          ComponentFactory.createCollision(
            GAME_CONFIG.INVADER_SIZE.width,
            GAME_CONFIG.INVADER_SIZE.height,
            ["enemy"],
            ["player", "player_bullet"],
          ),
          ComponentFactory.createScore(
            GAME_CONFIG.INVADER_SCORE_VALUES[row] || 10,
          ),
        );

        // Set invader color based on row
        const sprite = invader.getComponent<
          import("../engine/core/component.ts").SpriteComponent
        >("sprite")!;
        const hue = row / GAME_CONFIG.INVADER_ROWS;
        sprite.color = { r: 1, g: 1 - hue, b: hue, a: 1 };

        this.invaderFormation.push({
          entityId: invader.id,
          row,
          col,
        });

        // Debug: Log first few invader positions
        if (this.invaderFormation.length <= 3) {
          const invaderPos = invader.getComponent<import("../engine/core/component.ts").PositionComponent>("position")!;
          console.log(`Invader ${this.invaderFormation.length} created at position: (${invaderPos.position.x}, ${invaderPos.position.y})`);
        }
      }
    }
  }

  /**
   * Creates invisible boundary entities for collision detection
   */
  private createBoundaries(): void {
    const entityManager = this.gameEngine.getEntityManager();

    // Top boundary (destroys bullets)
    entityManager.createEntityWithComponents(
      ComponentFactory.createPosition(GAME_CONFIG.SCREEN_WIDTH / 2, -10),
      ComponentFactory.createCollision(GAME_CONFIG.SCREEN_WIDTH, 20, [
        "boundary",
      ], ["bullet"]),
    );

    // Bottom boundary (destroys bullets)
    entityManager.createEntityWithComponents(
      ComponentFactory.createPosition(
        GAME_CONFIG.SCREEN_WIDTH / 2,
        GAME_CONFIG.SCREEN_HEIGHT + 10,
      ),
      ComponentFactory.createCollision(GAME_CONFIG.SCREEN_WIDTH, 20, [
        "boundary",
      ], ["bullet"]),
    );

    // Left boundary
    entityManager.createEntityWithComponents(
      ComponentFactory.createPosition(-10, GAME_CONFIG.SCREEN_HEIGHT / 2),
      ComponentFactory.createCollision(20, GAME_CONFIG.SCREEN_HEIGHT, [
        "boundary",
      ], ["enemy"]),
    );

    // Right boundary
    entityManager.createEntityWithComponents(
      ComponentFactory.createPosition(
        GAME_CONFIG.SCREEN_WIDTH + 10,
        GAME_CONFIG.SCREEN_HEIGHT / 2,
      ),
      ComponentFactory.createCollision(20, GAME_CONFIG.SCREEN_HEIGHT, [
        "boundary",
      ], ["enemy"]),
    );
  }

  /**
   * Updates game logic (called each frame)
   */
  update(deltaTime: number): void {
    if (
      !this.gameStarted || this.gameEngine.getGameState() !== GameState.Running
    ) {
      return;
    }

    // Update invader movement
    this.updateInvaderMovement(deltaTime);

    // Update invader shooting
    this.updateInvaderShooting(deltaTime);

    // Check game over conditions
    this.checkGameOverConditions();

    // Constrain player to screen bounds
    this.constrainPlayerToScreen();
  }

  /**
   * Updates invader formation movement
   */
  private updateInvaderMovement(deltaTime: number): void {
    this.invaderMoveTimer += deltaTime;

    if (this.invaderMoveTimer >= this.INVADER_MOVE_INTERVAL) {
      this.invaderMoveTimer = 0;

      const entityManager = this.gameEngine.getEntityManager();
      let shouldMoveDown = false;

      // Check if any invader hit the screen edge
      for (const invaderData of this.invaderFormation) {
        const entity = entityManager.getEntity(invaderData.entityId);
        if (!entity || !entity.active) continue;

        const position = entity.getComponent<
          import("../engine/core/component.ts").PositionComponent
        >("position")!;

        if (
          (position.position.x <= 50 && this.invaderDirection < 0) ||
          (position.position.x >= GAME_CONFIG.SCREEN_WIDTH - 50 &&
            this.invaderDirection > 0)
        ) {
          shouldMoveDown = true;
          break;
        }
      }

      // Move invaders
      for (const invaderData of this.invaderFormation) {
        const entity = entityManager.getEntity(invaderData.entityId);
        if (!entity || !entity.active) continue;

        const position = entity.getComponent<
          import("../engine/core/component.ts").PositionComponent
        >("position")!;

        if (shouldMoveDown) {
          // Move down and reverse direction
          position.position.y += GAME_CONFIG.INVADER_DROP_SPEED;
        } else {
          // Move horizontally
          position.position.x += this.invaderDirection *
            GAME_CONFIG.INVADER_SPEED;
        }
      }

      // Reverse direction if moved down
      if (shouldMoveDown) {
        this.invaderDirection *= -1;

        // Increase speed slightly each time they drop
        // (Note: In a more complex system, this would modify velocity components)
      }
    }
  }

  /**
   * Updates invader shooting
   */
  private updateInvaderShooting(deltaTime: number): void {
    this.invaderShootTimer += deltaTime;

    if (this.invaderShootTimer >= this.INVADER_SHOOT_INTERVAL) {
      this.invaderShootTimer = 0;

      // Random chance for an invader to shoot
      if (Math.random() < 0.3 && this.invaderFormation.length > 0) {
        const randomIndex = Math.floor(
          Math.random() * this.invaderFormation.length,
        );
        const invaderData = this.invaderFormation[randomIndex];

        this.createInvaderBullet(invaderData.entityId);
      }
    }
  }

  /**
   * Creates a bullet fired by an invader
   */
  private createInvaderBullet(invaderId: number): void {
    const entityManager = this.gameEngine.getEntityManager();
    const invader = entityManager.getEntity(invaderId);

    if (!invader || !invader.active) return;

    const position = invader.getComponent<
      import("../engine/core/component.ts").PositionComponent
    >("position")!;

    const bullet = entityManager.createEntityWithComponents(
      ComponentFactory.createPosition(
        position.position.x,
        position.position.y + 20,
      ),
      ComponentFactory.createVelocity(
        0,
        GAME_CONFIG.BULLET_SPEED * 0.6,
        GAME_CONFIG.BULLET_SPEED,
      ),
      ComponentFactory.createSprite(
        "__white",
        GAME_CONFIG.BULLET_SIZE.width,
        GAME_CONFIG.BULLET_SIZE.height,
      ),
      ComponentFactory.createBullet(10, invaderId, 10),
      ComponentFactory.createLifetime(10),
      ComponentFactory.createCollision(
        GAME_CONFIG.BULLET_SIZE.width,
        GAME_CONFIG.BULLET_SIZE.height,
        ["enemy_bullet"],
        ["player", "boundary"],
      ),
    );

    // Set bullet color to red
    const sprite = bullet.getComponent<
      import("../engine/core/component.ts").SpriteComponent
    >("sprite")!;
    sprite.color = { r: 1, g: 0, b: 0, a: 1 };
  }

  /**
   * Checks for game over conditions
   */
  private checkGameOverConditions(): void {
    // Check if invaders reached the bottom
    const entityManager = this.gameEngine.getEntityManager();

    for (const invaderData of this.invaderFormation) {
      const entity = entityManager.getEntity(invaderData.entityId);
      if (!entity || !entity.active) continue;

      const position = entity.getComponent<
        import("../engine/core/component.ts").PositionComponent
      >("position")!;

      if (position.position.y >= GAME_CONFIG.SCREEN_HEIGHT - 100) {
        this.gameOver();
        return;
      }
    }

    // Check if player is dead
    if (this.lives <= 0) {
      this.gameOver();
    }
  }

  /**
   * Constrains the player to stay within screen bounds
   */
  private constrainPlayerToScreen(): void {
    if (!this.playerId) return;

    const entityManager = this.gameEngine.getEntityManager();
    const player = entityManager.getEntity(this.playerId);

    if (!player || !player.active) return;

    const position = player.getComponent<
      import("../engine/core/component.ts").PositionComponent
    >("position")!;
    const halfWidth = GAME_CONFIG.PLAYER_SIZE.width / 2;

    // Constrain horizontal movement
    if (position.position.x < halfWidth) {
      position.position.x = halfWidth;
    } else if (position.position.x > GAME_CONFIG.SCREEN_WIDTH - halfWidth) {
      position.position.x = GAME_CONFIG.SCREEN_WIDTH - halfWidth;
    }
  }

  /**
   * Handles player taking damage
   */
  private damagePlayer(): void {
    this.lives--;
    // this.audioManager.playSfx("player_hit", 0.8);

    if (this.lives > 0) {
      // Respawn player with temporary invulnerability
      // (This would be handled by the health system)
      console.log(`Player hit! Lives remaining: ${this.lives}`);
    }
  }

  /**
   * Adds score and handles bonus logic
   */
  private addScore(points: number): void {
    this.score += points;
    console.log(`Score: ${this.score} (+${points})`);
  }

  /**
   * Advances to the next level
   */
  private nextLevel(): void {
    this.level++;
    console.log(`Level ${this.level}!`);

    // Clear remaining bullets
    const entityManager = this.gameEngine.getEntityManager();
    const bullets = entityManager.getEntitiesWithComponents("bullet");
    bullets.forEach((bullet) => bullet.destroy());

    // Create new invader formation
    this.createInvaderFormation();

    // Reset timers
    this.invaderMoveTimer = 0;
    this.invaderShootTimer = 0;
    this.invaderDirection = 1;

    // Play level up sound (disabled for now)
    // this.audioManager.playSfx("level_up", 0.7);
  }

  /**
   * Handles game over
   */
  private gameOver(): void {
    this.gameEngine.setGameState(GameState.GameOver);
    this.gameStarted = false;

    console.log(`Game Over! Final Score: ${this.score}`);
    // this.audioManager.playSfx("game_over", 1.0);
  }

  /**
   * Pauses or resumes the game
   */
  togglePause(): void {
    const currentState = this.gameEngine.getGameState();

    if (currentState === GameState.Running) {
      this.gameEngine.setGameState(GameState.Paused);
    } else if (currentState === GameState.Paused) {
      this.gameEngine.setGameState(GameState.Running);
    }
  }

  /**
   * Starts the game engine
   */
  start(): void {
    this.gameEngine.start();
  }

  /**
   * Stops the game engine
   */
  stop(): void {
    this.gameEngine.stop();
  }

  /**
   * Updates the game (called from the main loop)
   */
  render(): void {
    // The game engine handles both update and rendering automatically
    // No need to call update here as the ECS systems handle it
  }

  /**
   * Gets current game statistics
   */
  getGameStats(): {
    score: number;
    lives: number;
    level: number;
    invadersRemaining: number;
    gameState: string;
  } {
    return {
      score: this.score,
      lives: this.lives,
      level: this.level,
      invadersRemaining: this.invaderFormation.length,
      gameState: this.gameEngine.getGameState(),
    };
  }

  /**
   * Destroys the game and cleans up resources
   */
  destroy(): void {
    this.gameEngine.destroy();
    this.audioManager.destroy();
  }
}
