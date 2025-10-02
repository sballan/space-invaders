/**
 * Game Engine
 * Main engine class that coordinates all subsystems (graphics, input, physics, etc.)
 * Provides the game loop and high-level game management functionality
 */

import { GraphicsEngine } from "../graphics/graphics-engine.ts";
import { RenderSystem } from "../graphics/render-system.ts";
import { EntityManager } from "./entity.ts";
import {
  HealthSystem,
  LifetimeSystem,
  MovementSystem,
  SystemManager,
  WeaponSystem,
} from "./system.ts";

/**
 * Game engine configuration options
 */
export interface GameEngineConfig {
  /** Target frame rate (FPS) */
  targetFPS?: number;
  /** Whether to enable debug mode */
  debug?: boolean;
  /** Maximum delta time per frame (prevents huge jumps) */
  maxDeltaTime?: number;
  /** Whether to pause when window loses focus */
  pauseOnBlur?: boolean;
}

/**
 * Game state enumeration
 */
export enum GameState {
  Loading = "loading",
  Running = "running",
  Paused = "paused",
  GameOver = "gameover",
  Menu = "menu",
}

/**
 * Game engine statistics
 */
export interface GameStats {
  /** Current frames per second */
  fps: number;
  /** Current frame time in milliseconds */
  frameTime: number;
  /** Total frames rendered */
  totalFrames: number;
  /** Total game time in seconds */
  totalTime: number;
  /** Current game state */
  gameState: GameState;
  /** Entity statistics */
  entities: {
    total: number;
    active: number;
    dead: number;
  };
  /** System statistics */
  systems: {
    total: number;
    enabled: number;
    disabled: number;
  };
  /** Graphics statistics */
  graphics: {
    renderCalls: number;
    spritesRendered: number;
    textureMemory: number;
  };
}

/**
 * Main game engine class that manages all subsystems and the game loop
 */
export class GameEngine {
  private canvas: HTMLCanvasElement;
  private graphicsEngine: GraphicsEngine;
  private entityManager: EntityManager;
  private systemManager: SystemManager;

  private config: Required<GameEngineConfig>;
  private gameState: GameState = GameState.Loading;

  // Game loop timing
  private lastFrameTime = 0;
  private deltaTime = 0;
  private frameCount = 0;
  private totalTime = 0;
  private fpsCounter = 0;
  private fpsTimer = 0;
  private currentFPS = 0;

  // Game loop control
  private animationFrameId: number | null = null;
  private isRunning = false;

  // Event handlers
  private boundWindowResize = this.handleWindowResize.bind(this);
  private boundWindowBlur = this.handleWindowBlur.bind(this);
  private boundWindowFocus = this.handleWindowFocus.bind(this);

  constructor(canvas: HTMLCanvasElement, config: GameEngineConfig = {}) {
    this.canvas = canvas;

    // Set default configuration
    this.config = {
      targetFPS: 60,
      debug: false,
      maxDeltaTime: 1 / 30, // Cap at 30 FPS minimum
      pauseOnBlur: true,
      ...config,
    };

    // Initialize subsystems
    this.graphicsEngine = new GraphicsEngine(canvas);
    this.entityManager = new EntityManager();
    this.systemManager = new SystemManager(this.entityManager);

    // Register core systems
    this.registerCoreSystems();

    // Set up event listeners
    this.setupEventListeners();

    this.gameState = GameState.Menu;
  }

  /**
   * Registers the core engine systems
   */
  private registerCoreSystems(): void {
    this.systemManager.registerSystem(new MovementSystem());
    this.systemManager.registerSystem(new WeaponSystem());
    this.systemManager.registerSystem(new HealthSystem());
    this.systemManager.registerSystem(new LifetimeSystem());
    this.systemManager.registerSystem(
      new RenderSystem(this.graphicsEngine, this.config.debug),
    );
  }

  /**
   * Sets up window event listeners
   */
  private setupEventListeners(): void {
    globalThis.addEventListener("resize", this.boundWindowResize);
    if (this.config.pauseOnBlur) {
      globalThis.addEventListener("blur", this.boundWindowBlur);
      globalThis.addEventListener("focus", this.boundWindowFocus);
    }
  }

  /**
   * Handles window resize events
   */
  private handleWindowResize(): void {
    this.graphicsEngine.resize();
  }

  /**
   * Handles window blur events (pause game)
   */
  private handleWindowBlur(): void {
    if (this.gameState === GameState.Running) {
      this.pause();
    }
  }

  /**
   * Handles window focus events (resume game)
   */
  private handleWindowFocus(): void {
    if (this.gameState === GameState.Paused) {
      this.resume();
    }
  }

  /**
   * Gets the graphics engine instance
   */
  getGraphicsEngine(): GraphicsEngine {
    return this.graphicsEngine;
  }

  /**
   * Gets the entity manager instance
   */
  getEntityManager(): EntityManager {
    return this.entityManager;
  }

  /**
   * Gets the system manager instance
   */
  getSystemManager(): SystemManager {
    return this.systemManager;
  }

  /**
   * Gets the current game state
   */
  getGameState(): GameState {
    return this.gameState;
  }

  /**
   * Sets the game state
   */
  setGameState(state: GameState): void {
    const previousState = this.gameState;
    this.gameState = state;

    // Handle state transitions
    if (previousState !== state) {
      this.onStateChange(previousState, state);
    }
  }

  /**
   * Called when game state changes
   */
  private onStateChange(from: GameState, to: GameState): void {
    if (this.config.debug) {
      console.log(`Game state changed: ${from} -> ${to}`);
    }

    // Handle specific state transitions
    if (to === GameState.Running && from !== GameState.Paused) {
      // Reset timing when starting a fresh game
      this.resetTiming();
    }
  }

  /**
   * Starts the game engine
   */
  start(): void {
    if (this.isRunning) {
      console.log("Game engine already running");
      return;
    }

    console.log("Starting game engine...");
    this.isRunning = true;
    this.resetTiming();

    try {
      this.gameLoop();
      console.log("Game loop started successfully");
    } catch (error) {
      console.error("Error starting game loop:", error);
      this.isRunning = false;
      throw error;
    }

    if (this.config.debug) {
      console.log("Game engine started");
    }
  }

  /**
   * Stops the game engine
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.config.debug) {
      console.log("Game engine stopped");
    }
  }

  /**
   * Pauses the game
   */
  pause(): void {
    if (this.gameState === GameState.Running) {
      this.setGameState(GameState.Paused);
    }
  }

  /**
   * Resumes the game
   */
  resume(): void {
    if (this.gameState === GameState.Paused) {
      this.setGameState(GameState.Running);
      this.resetTiming(); // Reset timing to prevent large delta jump
    }
  }

  /**
   * Resets timing variables
   */
  private resetTiming(): void {
    this.lastFrameTime = performance.now();
    this.deltaTime = 0;
    this.fpsTimer = 0;
    this.fpsCounter = 0;
  }

  /**
   * Main game loop
   */
  private gameLoop(): void {
    if (!this.isRunning) {
      return;
    }

    const currentTime = performance.now();
    this.deltaTime = (currentTime - this.lastFrameTime) / 1000; // Convert to seconds
    this.lastFrameTime = currentTime;

    // Debug: Log game loop is running
    if (this.config.debug && this.frameCount % 60 === 0) {
      console.log(
        `Game loop running, frame: ${this.frameCount}, state: ${this.gameState}`,
      );
    }

    // Cap delta time to prevent huge jumps
    this.deltaTime = Math.min(this.deltaTime, this.config.maxDeltaTime);

    // Update frame counter and FPS
    this.frameCount++;
    this.totalTime += this.deltaTime;
    this.fpsCounter++;
    this.fpsTimer += this.deltaTime;

    if (this.fpsTimer >= 1.0) {
      this.currentFPS = this.fpsCounter;
      this.fpsCounter = 0;
      this.fpsTimer = 0;
    }

    // Update all systems (including rendering)
    if (this.gameState === GameState.Running) {
      this.systemManager.update(this.deltaTime);
    } else {
      // When paused, still render but don't update other systems
      const renderSystem = this.systemManager.getSystem<RenderSystem>("render");
      if (renderSystem) {
        renderSystem.update(0, this.entityManager);
      }
    }

    // Schedule next frame
    this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
  }

  /**
   * Gets current engine statistics
   */
  getStats(): GameStats {
    const entityStats = this.entityManager.getStats();
    const systemStats = this.systemManager.getStats();
    const graphicsStats = this.graphicsEngine.getStats();
    const memoryStats = this.graphicsEngine.getTextureMemoryUsage();

    return {
      fps: this.currentFPS,
      frameTime: this.deltaTime * 1000, // Convert to milliseconds
      totalFrames: this.frameCount,
      totalTime: this.totalTime,
      gameState: this.gameState,
      entities: {
        total: entityStats.totalEntities,
        active: entityStats.activeEntities,
        dead: entityStats.deadEntities,
      },
      systems: {
        total: systemStats.totalSystems,
        enabled: systemStats.enabledSystems,
        disabled: systemStats.disabledSystems,
      },
      graphics: {
        renderCalls: graphicsStats.renderCalls,
        spritesRendered: graphicsStats.spritesRendered,
        textureMemory: memoryStats.memoryBytes,
      },
    };
  }

  /**
   * Loads game assets (textures, sounds, etc.)
   */
  async loadAssets(
    assets: { textures?: { name: string; url: string }[] } = {},
  ): Promise<void> {
    this.setGameState(GameState.Loading);

    try {
      // Load textures
      if (assets.textures) {
        const texturePromises = assets.textures.map(({ name, url }) =>
          this.graphicsEngine.loadTexture(name, url)
        );
        await Promise.all(texturePromises);
      }

      if (this.config.debug) {
        console.log("Assets loaded successfully");
      }
    } catch (error) {
      console.error("Failed to load assets:", error);
      throw error;
    }
  }

  /**
   * Destroys the game engine and cleans up resources
   */
  destroy(): void {
    this.stop();

    // Remove event listeners
    globalThis.removeEventListener("resize", this.boundWindowResize);
    globalThis.removeEventListener("blur", this.boundWindowBlur);
    globalThis.removeEventListener("focus", this.boundWindowFocus);

    // Clean up subsystems
    this.systemManager.cleanup();
    this.entityManager.clear();
    this.graphicsEngine.destroy();

    if (this.config.debug) {
      console.log("Game engine destroyed");
    }
  }
}
