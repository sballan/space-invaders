/**
 * Space Invaders Game System
 * ECS system that handles the specific game logic for Space Invaders
 * Manages invader movement, shooting, and game progression
 */

import { BaseSystem } from "../engine/core/system.ts";
import { EntityManager } from "../engine/core/entity.ts";
import { ComponentFactory } from "../engine/core/component.ts";
import { GameEngine, GameState } from "../engine/core/game-engine.ts";

/**
 * Game configuration constants
 */
const GAME_CONFIG = {
  INVADER_SPEED: 30,
  INVADER_DROP_SPEED: 30,
  INVADER_MOVE_INTERVAL: 1.0,
  INVADER_SHOOT_INTERVAL: 2.0,
  SCREEN_WIDTH: 800,
  SCREEN_HEIGHT: 600,
  BULLET_SPEED: 400,
  BULLET_SIZE: { width: 4, height: 10 },
};

/**
 * Space Invaders game logic system
 */
export class SpaceInvadersSystem extends BaseSystem {
  public readonly name = "space_invaders";

  private gameEngine: GameEngine;
  private invaderDirection = 1;
  private invaderMoveTimer = 0;
  private invaderShootTimer = 0;

  constructor(gameEngine: GameEngine) {
    super(60); // Run after core systems
    this.gameEngine = gameEngine;
  }

  public update(deltaTime: number, entityManager: EntityManager): void {
    if (this.gameEngine.getGameState() !== GameState.Running) {
      return;
    }

    // Update invader movement
    this.updateInvaderMovement(deltaTime, entityManager);

    // Update invader shooting
    this.updateInvaderShooting(deltaTime, entityManager);

    // Check game conditions
    this.checkGameConditions(entityManager);

    // Constrain player to screen
    this.constrainPlayerToScreen(entityManager);
  }

  /**
   * Updates invader formation movement
   */
  private updateInvaderMovement(
    deltaTime: number,
    entityManager: EntityManager,
  ): void {
    this.invaderMoveTimer += deltaTime;

    if (this.invaderMoveTimer >= GAME_CONFIG.INVADER_MOVE_INTERVAL) {
      this.invaderMoveTimer = 0;

      const invaders = entityManager.getEntitiesWithComponents("collision")
        .filter((entity) => {
          const collision = entity.getComponent<
            import("../engine/core/component.ts").CollisionComponent
          >("collision")!;
          return collision.layers.includes("enemy");
        });

      if (invaders.length === 0) return;

      let shouldMoveDown = false;

      // Check if any invader hit the screen edge
      for (const invader of invaders) {
        const position = invader.getComponent<
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

      // Move all invaders
      for (const invader of invaders) {
        const position = invader.getComponent<
          import("../engine/core/component.ts").PositionComponent
        >("position")!;

        if (shouldMoveDown) {
          position.position.y += GAME_CONFIG.INVADER_DROP_SPEED;
        } else {
          position.position.x += this.invaderDirection *
            GAME_CONFIG.INVADER_SPEED;
        }
      }

      // Reverse direction if moved down
      if (shouldMoveDown) {
        this.invaderDirection *= -1;
      }
    }
  }

  /**
   * Updates invader shooting
   */
  private updateInvaderShooting(
    deltaTime: number,
    entityManager: EntityManager,
  ): void {
    this.invaderShootTimer += deltaTime;

    if (this.invaderShootTimer >= GAME_CONFIG.INVADER_SHOOT_INTERVAL) {
      this.invaderShootTimer = 0;

      const invaders = entityManager.getEntitiesWithComponents("collision")
        .filter((entity) => {
          const collision = entity.getComponent<
            import("../engine/core/component.ts").CollisionComponent
          >("collision")!;
          return collision.layers.includes("enemy");
        });

      // Random chance for an invader to shoot
      if (Math.random() < 0.3 && invaders.length > 0) {
        const randomIndex = Math.floor(Math.random() * invaders.length);
        const invader = invaders[randomIndex];

        this.createInvaderBullet(invader, entityManager);
      }
    }
  }

  /**
   * Creates a bullet fired by an invader
   */
  private createInvaderBullet(
    invader: import("../engine/core/entity.ts").Entity,
    entityManager: EntityManager,
  ): void {
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
      ComponentFactory.createBullet(10, invader.id, 10),
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
   * Checks win/lose conditions
   */
  private checkGameConditions(entityManager: EntityManager): void {
    const invaders = entityManager.getEntitiesWithComponents("collision")
      .filter((entity) => {
        const collision = entity.getComponent<
          import("../engine/core/component.ts").CollisionComponent
        >("collision")!;
        return collision.layers.includes("enemy");
      });

    // Win condition - no invaders left
    if (invaders.length === 0) {
      console.log("Level complete!");
      // Could trigger next level here
    }

    // Check if invaders reached bottom
    for (const invader of invaders) {
      const position = invader.getComponent<
        import("../engine/core/component.ts").PositionComponent
      >("position")!;
      if (position.position.y >= GAME_CONFIG.SCREEN_HEIGHT - 100) {
        this.gameEngine.setGameState(GameState.GameOver);
        return;
      }
    }
  }

  /**
   * Constrains player to screen bounds
   */
  private constrainPlayerToScreen(entityManager: EntityManager): void {
    const players = entityManager.getEntitiesWithComponents("collision").filter(
      (entity) => {
        const collision = entity.getComponent<
          import("../engine/core/component.ts").CollisionComponent
        >("collision")!;
        return collision.layers.includes("player");
      },
    );

    for (const player of players) {
      const position = player.getComponent<
        import("../engine/core/component.ts").PositionComponent
      >("position")!;
      const halfWidth = 20; // Half player width

      if (position.position.x < halfWidth) {
        position.position.x = halfWidth;
      } else if (position.position.x > GAME_CONFIG.SCREEN_WIDTH - halfWidth) {
        position.position.x = GAME_CONFIG.SCREEN_WIDTH - halfWidth;
      }
    }
  }
}
