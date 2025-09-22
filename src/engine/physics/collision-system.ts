/**
 * Collision Detection System
 * Handles collision detection and resolution using AABB (Axis-Aligned Bounding Box) algorithm
 * Supports collision layers, triggers, and efficient spatial partitioning
 */

import { BaseSystem } from "../core/system.ts";
import { Entity, EntityManager } from "../core/entity.ts";
import {
  BulletComponent,
  CollisionComponent,
  HealthComponent,
  PositionComponent,
  ScoreComponent,
  VelocityComponent,
} from "../core/component.ts";
import { MathUtils, Rectangle, Vector2 } from "../../utils/math.ts";

/**
 * Collision event data
 */
export interface CollisionEvent {
  /** First entity involved in collision */
  entityA: Entity;
  /** Second entity involved in collision */
  entityB: Entity;
  /** Collision point in world coordinates */
  point: Vector2;
  /** Collision normal vector */
  normal: Vector2;
  /** Penetration depth */
  penetration: number;
  /** Whether this collision involves a trigger */
  isTrigger: boolean;
}

/**
 * Spatial partitioning cell for efficient collision detection
 */
interface SpatialCell {
  entities: Entity[];
  bounds: Rectangle;
}

/**
 * Collision system that handles all collision detection and resolution
 */
export class CollisionSystem extends BaseSystem {
  public readonly name = "collision";

  // Spatial partitioning grid for performance optimization
  private spatialGrid: Map<string, SpatialCell> = new Map();
  private cellSize = 100; // Size of each spatial cell in world units

  // Collision event handlers
  private collisionHandlers: Map<string, (event: CollisionEvent) => void> =
    new Map();

  // Statistics
  private collisionChecks = 0;
  private collisionsDetected = 0;

  constructor() {
    super(50); // Medium-high priority - run after movement but before rendering
  }

  public override initialize(_entityManager: EntityManager): void {
    // Set up default collision handlers
    this.setupDefaultHandlers();
  }

  /**
   * Sets up default collision event handlers for common game interactions
   */
  private setupDefaultHandlers(): void {
    // Bullet-Enemy collision
    this.registerCollisionHandler("bullet_enemy", (event) => {
      const bullet = this.getBulletEntity(event.entityA, event.entityB);
      const target = bullet === event.entityA ? event.entityB : event.entityA;

      if (!bullet || !target) return;

      const bulletComp = bullet.getComponent<BulletComponent>("bullet")!;
      const health = target.getComponent<HealthComponent>("health");

      // Deal damage
      if (health && !health.invulnerable) {
        health.current -= bulletComp.damage;

        // Add score if target is destroyed
        if (health.current <= 0) {
          const score = target.getComponent<ScoreComponent>("score");
          if (score && !score.awarded) {
            // Emit score event (could be handled by a score system)
            console.log(`Score: +${score.value}`);
            score.awarded = true;
          }
        }
      }

      // Mark bullet as hit and destroy it
      bulletComp.hasHit = true;
      bullet.destroy();
    });

    // Player-Enemy collision
    this.registerCollisionHandler("player_enemy", (event) => {
      const playerHealth = this.getPlayerEntity(event.entityA, event.entityB)
        ?.getComponent<HealthComponent>("health");

      if (playerHealth && !playerHealth.invulnerable) {
        playerHealth.current -= 10; // Player takes damage

        // Add invulnerability period
        playerHealth.invulnerable = true;
        playerHealth.invulnerabilityTime = 1.0; // 1 second of invulnerability
      }
    });

    // Boundary collision (keep entities in bounds)
    this.registerCollisionHandler("boundary", (_event) => {
      // This would handle screen boundary collisions
      // Implementation depends on game-specific boundary logic
    });
  }

  public update(_deltaTime: number, entityManager: EntityManager): void {
    this.collisionChecks = 0;
    this.collisionsDetected = 0;

    // Clear spatial grid
    this.spatialGrid.clear();

    // Get all entities with collision components
    const collisionEntities = this.getEntities(
      entityManager,
      "position",
      "collision",
    );

    // Populate spatial grid
    this.populateSpatialGrid(collisionEntities);

    // Perform collision detection
    this.detectCollisions(entityManager);

    // Update weapon bullet counts (remove destroyed bullets)
    this.updateWeaponBulletCounts(entityManager);
  }

  /**
   * Populates the spatial partitioning grid with entities
   */
  private populateSpatialGrid(entities: Entity[]): void {
    for (const entity of entities) {
      const _position = entity.getComponent<PositionComponent>("position")!;
      const collision = entity.getComponent<CollisionComponent>("collision")!;

      if (!collision.enabled) continue;

      // Calculate entity bounds
      const bounds = this.getEntityBounds(entity);

      // Determine which cells this entity occupies
      const minCellX = Math.floor(bounds.x / this.cellSize);
      const minCellY = Math.floor(bounds.y / this.cellSize);
      const maxCellX = Math.floor((bounds.x + bounds.width) / this.cellSize);
      const maxCellY = Math.floor((bounds.y + bounds.height) / this.cellSize);

      // Add entity to all overlapping cells
      for (let cellX = minCellX; cellX <= maxCellX; cellX++) {
        for (let cellY = minCellY; cellY <= maxCellY; cellY++) {
          const cellKey = `${cellX},${cellY}`;

          if (!this.spatialGrid.has(cellKey)) {
            this.spatialGrid.set(cellKey, {
              entities: [],
              bounds: {
                x: cellX * this.cellSize,
                y: cellY * this.cellSize,
                width: this.cellSize,
                height: this.cellSize,
              },
            });
          }

          this.spatialGrid.get(cellKey)!.entities.push(entity);
        }
      }
    }
  }

  /**
   * Detects collisions between entities in each spatial cell
   */
  private detectCollisions(_entityManager: EntityManager): void {
    const checkedPairs = new Set<string>();

    for (const cell of this.spatialGrid.values()) {
      const entities = cell.entities;

      // Check collisions between all entity pairs in this cell
      for (let i = 0; i < entities.length; i++) {
        for (let j = i + 1; j < entities.length; j++) {
          const entityA = entities[i];
          const entityB = entities[j];

          // Create unique pair identifier
          const pairId = entityA.id < entityB.id
            ? `${entityA.id}-${entityB.id}`
            : `${entityB.id}-${entityA.id}`;

          // Skip if we've already checked this pair
          if (checkedPairs.has(pairId)) continue;
          checkedPairs.add(pairId);

          this.collisionChecks++;

          // Check if these entities should collide
          if (this.shouldCollide(entityA, entityB)) {
            const collision = this.checkCollision(entityA, entityB);
            if (collision) {
              this.collisionsDetected++;
              this.handleCollision(collision);
            }
          }
        }
      }
    }
  }

  /**
   * Checks if two entities should collide based on their collision layers
   */
  private shouldCollide(entityA: Entity, entityB: Entity): boolean {
    const collisionA = entityA.getComponent<CollisionComponent>("collision")!;
    const collisionB = entityB.getComponent<CollisionComponent>("collision")!;

    // Check if entityA's layers intersect with entityB's mask
    const aCanHitB = collisionA.layers.some((layer) =>
      collisionB.mask.includes(layer)
    );

    // Check if entityB's layers intersect with entityA's mask
    const bCanHitA = collisionB.layers.some((layer) =>
      collisionA.mask.includes(layer)
    );

    return aCanHitB || bCanHitA;
  }

  /**
   * Performs AABB collision detection between two entities
   */
  private checkCollision(
    entityA: Entity,
    entityB: Entity,
  ): CollisionEvent | null {
    const boundsA = this.getEntityBounds(entityA);
    const boundsB = this.getEntityBounds(entityB);

    // AABB collision test
    if (!MathUtils.rectanglesIntersect(boundsA, boundsB)) {
      return null;
    }

    // Calculate collision details
    const centerA = {
      x: boundsA.x + boundsA.width * 0.5,
      y: boundsA.y + boundsA.height * 0.5,
    };

    const centerB = {
      x: boundsB.x + boundsB.width * 0.5,
      y: boundsB.y + boundsB.height * 0.5,
    };

    // Calculate overlap
    const overlapX =
      Math.min(boundsA.x + boundsA.width, boundsB.x + boundsB.width) -
      Math.max(boundsA.x, boundsB.x);
    const overlapY =
      Math.min(boundsA.y + boundsA.height, boundsB.y + boundsB.height) -
      Math.max(boundsA.y, boundsB.y);

    // Determine collision normal and penetration
    let normal: Vector2;
    let penetration: number;

    if (overlapX < overlapY) {
      // Horizontal collision
      normal = centerA.x < centerB.x ? { x: -1, y: 0 } : { x: 1, y: 0 };
      penetration = overlapX;
    } else {
      // Vertical collision
      normal = centerA.y < centerB.y ? { x: 0, y: -1 } : { x: 0, y: 1 };
      penetration = overlapY;
    }

    // Collision point (center of overlap)
    const point = {
      x: Math.max(boundsA.x, boundsB.x) + overlapX * 0.5,
      y: Math.max(boundsA.y, boundsB.y) + overlapY * 0.5,
    };

    // Check if either entity is a trigger
    const collisionA = entityA.getComponent<CollisionComponent>("collision")!;
    const collisionB = entityB.getComponent<CollisionComponent>("collision")!;
    const isTrigger = collisionA.isTrigger || collisionB.isTrigger;

    return {
      entityA,
      entityB,
      point,
      normal,
      penetration,
      isTrigger,
    };
  }

  /**
   * Handles a collision event by calling appropriate handlers and resolving physics
   */
  private handleCollision(collision: CollisionEvent): void {
    // Determine collision type and call appropriate handler
    const handlerKey = this.getCollisionHandlerKey(
      collision.entityA,
      collision.entityB,
    );
    const handler = this.collisionHandlers.get(handlerKey);

    if (handler) {
      handler(collision);
    }

    // Resolve collision if not a trigger
    if (!collision.isTrigger) {
      this.resolveCollision(collision);
    }
  }

  /**
   * Determines the appropriate collision handler key for two entities
   */
  private getCollisionHandlerKey(entityA: Entity, entityB: Entity): string {
    const bullet = this.getBulletEntity(entityA, entityB);

    if (bullet) {
      const other = bullet === entityA ? entityB : entityA;
      const bulletComp = bullet.getComponent<BulletComponent>("bullet")!;

      // Don't collide with owner
      if (bulletComp.owner === other.id) {
        return "";
      }

      // Check collision layers
      const bulletCollision = bullet.getComponent<CollisionComponent>(
        "collision",
      )!;
      const otherCollision = other.getComponent<CollisionComponent>(
        "collision",
      )!;

      if (
        bulletCollision.layers.includes("player_bullet") &&
        otherCollision.layers.includes("enemy")
      ) {
        return "bullet_enemy";
      }
      if (
        bulletCollision.layers.includes("enemy_bullet") &&
        otherCollision.layers.includes("player")
      ) {
        return "bullet_player";
      }
    }

    // Check for player-enemy collision
    const player = this.getPlayerEntity(entityA, entityB);
    if (player) {
      const other = player === entityA ? entityB : entityA;
      const otherCollision = other.getComponent<CollisionComponent>(
        "collision",
      )!;

      if (otherCollision.layers.includes("enemy")) {
        return "player_enemy";
      }
    }

    return "default";
  }

  /**
   * Resolves collision by separating entities and updating velocities
   */
  private resolveCollision(collision: CollisionEvent): void {
    const { entityA, entityB, normal, penetration } = collision;

    const positionA = entityA.getComponent<PositionComponent>("position")!;
    const positionB = entityB.getComponent<PositionComponent>("position")!;
    const velocityA = entityA.getComponent<VelocityComponent>("velocity");
    const velocityB = entityB.getComponent<VelocityComponent>("velocity");

    // Separate entities
    const separation = penetration * 0.5;
    positionA.position.x -= normal.x * separation;
    positionA.position.y -= normal.y * separation;
    positionB.position.x += normal.x * separation;
    positionB.position.y += normal.y * separation;

    // Update velocities if both entities have velocity components
    if (velocityA && velocityB) {
      // Simple elastic collision response
      const relativeVelocityX = velocityA.velocity.x - velocityB.velocity.x;
      const relativeVelocityY = velocityA.velocity.y - velocityB.velocity.y;
      const velocityAlongNormal = relativeVelocityX * normal.x +
        relativeVelocityY * normal.y;

      // Don't resolve if velocities are separating
      if (velocityAlongNormal > 0) return;

      // Apply collision response
      const restitution = 0.8; // Bounciness factor
      const impulse = -(1 + restitution) * velocityAlongNormal * 0.5;

      velocityA.velocity.x += impulse * normal.x;
      velocityA.velocity.y += impulse * normal.y;
      velocityB.velocity.x -= impulse * normal.x;
      velocityB.velocity.y -= impulse * normal.y;
    }
  }

  /**
   * Gets the bounding rectangle for an entity
   */
  private getEntityBounds(entity: Entity): Rectangle {
    const position = entity.getComponent<PositionComponent>("position")!;
    const collision = entity.getComponent<CollisionComponent>("collision")!;

    return {
      x: position.position.x + collision.bounds.offsetX -
        collision.bounds.width * 0.5,
      y: position.position.y + collision.bounds.offsetY -
        collision.bounds.height * 0.5,
      width: collision.bounds.width,
      height: collision.bounds.height,
    };
  }

  /**
   * Helper method to get bullet entity from two entities
   */
  private getBulletEntity(entityA: Entity, entityB: Entity): Entity | null {
    if (entityA.hasComponent("bullet")) return entityA;
    if (entityB.hasComponent("bullet")) return entityB;
    return null;
  }

  /**
   * Helper method to get player entity from two entities
   */
  private getPlayerEntity(entityA: Entity, entityB: Entity): Entity | null {
    const collisionA = entityA.getComponent<CollisionComponent>("collision");
    const collisionB = entityB.getComponent<CollisionComponent>("collision");

    if (collisionA?.layers.includes("player")) return entityA;
    if (collisionB?.layers.includes("player")) return entityB;
    return null;
  }

  /**
   * Updates weapon bullet counts after collision resolution
   */
  private updateWeaponBulletCounts(entityManager: EntityManager): void {
    const weaponEntities = this.getEntities(entityManager, "weapon");

    for (const entity of weaponEntities) {
      const weapon = entity.getComponent<
        import("../core/component.ts").WeaponComponent
      >("weapon")!;

      // Count active bullets owned by this entity
      const activeBullets = entityManager.getEntitiesWithComponents("bullet")
        .filter((bulletEntity) => {
          const bullet = bulletEntity.getComponent<BulletComponent>("bullet")!;
          return bullet.owner === entity.id && bulletEntity.active;
        }).length;

      weapon.activeBullets = activeBullets;
    }
  }

  /**
   * Registers a collision handler for specific collision types
   */
  registerCollisionHandler(
    key: string,
    handler: (event: CollisionEvent) => void,
  ): void {
    this.collisionHandlers.set(key, handler);
  }

  /**
   * Unregisters a collision handler
   */
  unregisterCollisionHandler(key: string): void {
    this.collisionHandlers.delete(key);
  }

  /**
   * Gets collision statistics for debugging
   */
  getStats(): {
    collisionChecks: number;
    collisionsDetected: number;
    spatialCells: number;
  } {
    return {
      collisionChecks: this.collisionChecks,
      collisionsDetected: this.collisionsDetected,
      spatialCells: this.spatialGrid.size,
    };
  }

  /**
   * Sets the spatial grid cell size (for performance tuning)
   */
  setSpatialCellSize(size: number): void {
    this.cellSize = Math.max(32, size); // Minimum cell size of 32 units
  }

  public override cleanup(): void {
    this.spatialGrid.clear();
    this.collisionHandlers.clear();
  }
}
