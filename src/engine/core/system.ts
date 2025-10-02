/**
 * System Architecture
 * Defines the base system interface and common system implementations
 * Systems contain the game logic and operate on entities with specific components
 */

import { Entity, EntityManager } from "./entity.ts";
import { ComponentFactory } from "./component.ts";

/**
 * Base interface for all systems in the ECS architecture
 */
export interface System {
  /** Unique name for this system */
  readonly name: string;

  /** Priority for system execution order (lower values run first) */
  readonly priority: number;

  /** Whether this system is currently enabled */
  enabled: boolean;

  /**
   * Called once when the system is added to the game engine
   */
  initialize?(entityManager: EntityManager): void;

  /**
   * Called every frame to update the system
   * @param deltaTime Time elapsed since last frame in seconds
   * @param entityManager Entity manager for querying entities
   */
  update(deltaTime: number, entityManager: EntityManager): void;

  /**
   * Called when the system is being destroyed
   */
  cleanup?(): void;
}

/**
 * Abstract base class for systems that provides common functionality
 */
export abstract class BaseSystem implements System {
  public abstract readonly name: string;
  public readonly priority: number;
  public enabled = true;

  constructor(priority: number = 0) {
    this.priority = priority;
  }

  /**
   * Override this method to implement system logic
   */
  public abstract update(deltaTime: number, entityManager: EntityManager): void;

  /**
   * Optional initialization logic
   */
  public initialize?(entityManager: EntityManager): void;

  /**
   * Optional cleanup logic
   */
  public cleanup?(): void;

  /**
   * Helper method to get entities with required components
   */
  protected getEntities(
    entityManager: EntityManager,
    ...componentTypes: string[]
  ): Entity[] {
    return entityManager.getEntitiesWithComponents(...componentTypes);
  }
}

/**
 * System Manager handles registration and execution of systems
 */
export class SystemManager {
  private systems: Map<string, System> = new Map();
  private sortedSystems: System[] = [];
  private entityManager: EntityManager;

  constructor(entityManager: EntityManager) {
    this.entityManager = entityManager;
  }

  /**
   * Registers a system with the manager
   */
  registerSystem(system: System): void {
    if (this.systems.has(system.name)) {
      throw new Error(`System '${system.name}' is already registered`);
    }

    this.systems.set(system.name, system);
    this.sortSystems();

    // Initialize the system
    if (system.initialize) {
      system.initialize(this.entityManager);
    }
  }

  /**
   * Unregisters a system from the manager
   */
  unregisterSystem(name: string): void {
    const system = this.systems.get(name);
    if (system) {
      // Cleanup the system
      if (system.cleanup) {
        system.cleanup();
      }

      this.systems.delete(name);
      this.sortSystems();
    }
  }

  /**
   * Gets a system by name
   */
  getSystem<T extends System>(name: string): T | undefined {
    return this.systems.get(name) as T | undefined;
  }

  /**
   * Enables or disables a system
   */
  setSystemEnabled(name: string, enabled: boolean): void {
    const system = this.systems.get(name);
    if (system) {
      system.enabled = enabled;
    }
  }

  /**
   * Updates all enabled systems
   */
  update(deltaTime: number): void {
    for (const system of this.sortedSystems) {
      if (system.enabled) {
        try {
          system.update(deltaTime, this.entityManager);
        } catch (error) {
          console.error(`Error in system '${system.name}':`, error);
        }
      }
    }

    // Clean up destroyed entities after all systems have run
    this.entityManager.cleanup();
  }

  /**
   * Sorts systems by priority
   */
  private sortSystems(): void {
    this.sortedSystems = Array.from(this.systems.values())
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * Cleans up all systems
   */
  cleanup(): void {
    for (const system of this.systems.values()) {
      if (system.cleanup) {
        system.cleanup();
      }
    }
    this.systems.clear();
    this.sortedSystems = [];
  }

  /**
   * Gets all registered system names
   */
  getSystemNames(): string[] {
    return Array.from(this.systems.keys());
  }

  /**
   * Gets statistics about system management
   */
  getStats(): {
    totalSystems: number;
    enabledSystems: number;
    disabledSystems: number;
  } {
    const enabled = this.sortedSystems.filter((s) => s.enabled).length;
    return {
      totalSystems: this.systems.size,
      enabledSystems: enabled,
      disabledSystems: this.systems.size - enabled,
    };
  }
}

/**
 * Movement system - handles position updates based on velocity
 */
export class MovementSystem extends BaseSystem {
  public readonly name = "movement";

  constructor() {
    super(10); // Low priority - run early
  }

  public update(deltaTime: number, entityManager: EntityManager): void {
    const entities = this.getEntities(entityManager, "position", "velocity");

    for (const entity of entities) {
      const position = entity.getComponent<
        import("./component.ts").PositionComponent
      >("position")!;
      const velocity = entity.getComponent<
        import("./component.ts").VelocityComponent
      >("velocity")!;

      // Store previous position for collision detection
      position.previousPosition.x = position.position.x;
      position.previousPosition.y = position.position.y;

      // Apply velocity with speed limiting
      const speed = Math.sqrt(
        velocity.velocity.x ** 2 + velocity.velocity.y ** 2,
      );
      if (speed > velocity.maxSpeed) {
        const scale = velocity.maxSpeed / speed;
        velocity.velocity.x *= scale;
        velocity.velocity.y *= scale;
      }

      // Update position
      position.position.x += velocity.velocity.x * deltaTime;
      position.position.y += velocity.velocity.y * deltaTime;
    }
  }
}

/**
 * Lifetime system - destroys entities after their lifetime expires
 */
export class LifetimeSystem extends BaseSystem {
  public readonly name = "lifetime";

  constructor() {
    super(90); // High priority - run late
  }

  public update(deltaTime: number, entityManager: EntityManager): void {
    const entities = this.getEntities(entityManager, "lifetime");

    for (const entity of entities) {
      const lifetime = entity.getComponent<
        import("./component.ts").LifetimeComponent
      >("lifetime")!;

      lifetime.remaining -= deltaTime;

      if (lifetime.remaining <= 0) {
        // Trigger event if requested
        if (lifetime.triggerEvent && lifetime.eventData) {
          // Could emit an event here for other systems to handle
          console.log(
            `Entity ${entity.id} lifetime expired with event:`,
            lifetime.eventData,
          );
        }

        entityManager.destroyEntity(entity.id);
      }
    }
  }
}

/**
 * Weapon system - handles weapon firing mechanics
 */
export class WeaponSystem extends BaseSystem {
  public readonly name = "weapon";

  constructor() {
    super(20); // Medium priority
  }

  public update(deltaTime: number, entityManager: EntityManager): void {
    const entities = this.getEntities(entityManager, "weapon");

    for (const entity of entities) {
      const weapon = entity.getComponent<
        import("./component.ts").WeaponComponent
      >("weapon")!;

      // Update fire rate timer
      weapon.timeSinceLastShot += deltaTime;

      // Update can fire status
      weapon.canFire = weapon.timeSinceLastShot >= weapon.fireRate &&
        weapon.activeBullets < weapon.maxBullets;

      // Process fire request
      if (weapon.fireRequested && weapon.canFire) {
        this.fireBullet(entity, entityManager);
        weapon.fireRequested = false;
      }
    }
  }

  /**
   * Creates a bullet entity when a weapon fires
   */
  private fireBullet(
    shooter: Entity,
    entityManager: EntityManager,
  ): void {
    const position = shooter.getComponent<
      import("./component.ts").PositionComponent
    >("position");
    const weapon = shooter.getComponent<
      import("./component.ts").WeaponComponent
    >("weapon")!;

    if (!position) return;

    const bulletConfig = weapon.bulletConfig || {
      width: 4,
      height: 8,
      color: { r: 1, g: 1, b: 1, a: 1 },
    };

    // Create bullet entity
    const bullet = entityManager.createEntity();

    // Add bullet components
    bullet
      .addComponent(ComponentFactory.createPosition(
        position.position.x,
        position.position.y - 20,
      ))
      .addComponent(ComponentFactory.createVelocity(
        0,
        -weapon.bulletSpeed,
        weapon.bulletSpeed,
      ))
      .addComponent(ComponentFactory.createSprite(
        "__white",
        bulletConfig.width,
        bulletConfig.height,
      ))
      .addComponent(ComponentFactory.createBullet(
        weapon.damage,
        shooter.id,
        5,
      ))
      .addComponent(ComponentFactory.createLifetime(5))
      .addComponent(ComponentFactory.createCollision(
        bulletConfig.width,
        bulletConfig.height,
        ["player_bullet"],
        ["enemy"],
      ));

    // Set bullet color
    const sprite = bullet.getComponent<
      import("./component.ts").SpriteComponent
    >("sprite")!;
    sprite.color = bulletConfig.color;

    // Update weapon state
    weapon.timeSinceLastShot = 0;
    weapon.activeBullets++;
  }
}

/**
 * Health system - handles health updates and invulnerability
 */
export class HealthSystem extends BaseSystem {
  public readonly name = "health";

  constructor() {
    super(40); // Medium priority
  }

  public update(deltaTime: number, entityManager: EntityManager): void {
    const entities = this.getEntities(entityManager, "health");

    for (const entity of entities) {
      const health = entity.getComponent<
        import("./component.ts").HealthComponent
      >("health")!;

      // Update invulnerability timer
      if (health.invulnerabilityTime > 0) {
        health.invulnerabilityTime -= deltaTime;
        if (health.invulnerabilityTime <= 0) {
          health.invulnerable = false;
        }
      }

      // Destroy entity if health reaches zero
      if (health.current <= 0) {
        entityManager.destroyEntity(entity.id);
      }
    }
  }
}
