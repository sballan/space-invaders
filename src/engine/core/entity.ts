/**
 * Entity System
 * Manages entities and their components in the ECS architecture
 * Entities are just unique IDs with attached components
 */

import { AnyComponent } from "./component.ts";

/**
 * Unique identifier for entities
 */
export type EntityId = number;

/**
 * Entity class represents a game object as a collection of components
 */
export class Entity {
  /** Unique identifier for this entity */
  public readonly id: EntityId;

  /** Map of component type to component instance */
  private components: Map<string, AnyComponent> = new Map();

  /** Whether this entity is active (should be processed by systems) */
  public active = true;

  constructor(id: EntityId) {
    this.id = id;
  }

  /**
   * Adds a component to this entity
   */
  addComponent<T extends AnyComponent>(component: T): this {
    this.components.set(component.type, component);
    return this;
  }

  /**
   * Removes a component from this entity
   */
  removeComponent(componentType: string): this {
    this.components.delete(componentType);
    return this;
  }

  /**
   * Gets a component of the specified type
   */
  getComponent<T extends AnyComponent>(componentType: string): T | undefined {
    return this.components.get(componentType) as T | undefined;
  }

  /**
   * Checks if this entity has a component of the specified type
   */
  hasComponent(componentType: string): boolean {
    return this.components.has(componentType);
  }

  /**
   * Checks if this entity has all of the specified component types
   */
  hasComponents(...componentTypes: string[]): boolean {
    return componentTypes.every((type) => this.components.has(type));
  }

  /**
   * Gets all components attached to this entity
   */
  getAllComponents(): AnyComponent[] {
    return Array.from(this.components.values());
  }

  /**
   * Gets all component types attached to this entity
   */
  getComponentTypes(): string[] {
    return Array.from(this.components.keys());
  }

  /**
   * Removes all components from this entity
   */
  clearComponents(): this {
    this.components.clear();
    return this;
  }

  /**
   * Destroys this entity by marking it as inactive
   */
  destroy(): this {
    this.active = false;
    this.components.clear();
    return this;
  }
}

/**
 * Entity Manager handles creation, destruction, and querying of entities
 */
export class EntityManager {
  private entities: Map<EntityId, Entity> = new Map();
  private nextEntityId: EntityId = 1;
  private deadEntities: Set<EntityId> = new Set();

  /**
   * Creates a new entity with a unique ID
   */
  createEntity(): Entity {
    const id = this.nextEntityId++;
    const entity = new Entity(id);
    this.entities.set(id, entity);
    return entity;
  }

  /**
   * Gets an entity by its ID
   */
  getEntity(id: EntityId): Entity | undefined {
    return this.entities.get(id);
  }

  /**
   * Marks an entity for destruction
   */
  destroyEntity(id: EntityId): void {
    const entity = this.entities.get(id);
    if (entity) {
      entity.destroy();
      this.deadEntities.add(id);
    }
  }

  /**
   * Immediately removes an entity from the manager
   */
  removeEntity(id: EntityId): void {
    this.entities.delete(id);
    this.deadEntities.delete(id);
  }

  /**
   * Gets all active entities
   */
  getActiveEntities(): Entity[] {
    return Array.from(this.entities.values()).filter((entity) => entity.active);
  }

  /**
   * Gets all entities (including inactive ones)
   */
  getAllEntities(): Entity[] {
    return Array.from(this.entities.values());
  }

  /**
   * Queries entities that have all of the specified component types
   */
  getEntitiesWithComponents(...componentTypes: string[]): Entity[] {
    return this.getActiveEntities().filter((entity) =>
      entity.hasComponents(...componentTypes)
    );
  }

  /**
   * Gets the first entity that has all of the specified component types
   */
  getFirstEntityWithComponents(
    ...componentTypes: string[]
  ): Entity | undefined {
    return this.getActiveEntities().find((entity) =>
      entity.hasComponents(...componentTypes)
    );
  }

  /**
   * Counts entities that have all of the specified component types
   */
  countEntitiesWithComponents(...componentTypes: string[]): number {
    return this.getEntitiesWithComponents(...componentTypes).length;
  }

  /**
   * Cleans up destroyed entities (call this at the end of each frame)
   */
  cleanup(): void {
    for (const id of this.deadEntities) {
      this.entities.delete(id);
    }
    this.deadEntities.clear();
  }

  /**
   * Removes all entities
   */
  clear(): void {
    this.entities.clear();
    this.deadEntities.clear();
    this.nextEntityId = 1;
  }

  /**
   * Gets statistics about entity management
   */
  getStats(): {
    totalEntities: number;
    activeEntities: number;
    deadEntities: number;
    nextEntityId: number;
  } {
    return {
      totalEntities: this.entities.size,
      activeEntities: this.getActiveEntities().length,
      deadEntities: this.deadEntities.size,
      nextEntityId: this.nextEntityId,
    };
  }

  /**
   * Creates an entity with the specified components
   */
  createEntityWithComponents(...components: AnyComponent[]): Entity {
    const entity = this.createEntity();

    for (const component of components) {
      entity.addComponent(component);
    }

    return entity;
  }

  /**
   * Finds entities within a certain distance of a position
   */
  getEntitiesInRadius(
    x: number,
    y: number,
    radius: number,
    ...requiredComponents: string[]
  ): Entity[] {
    const radiusSquared = radius * radius;

    return this.getEntitiesWithComponents("position", ...requiredComponents)
      .filter((entity) => {
        const position = entity.getComponent<
          import("./component.ts").PositionComponent
        >("position")!;
        const dx = position.position.x - x;
        const dy = position.position.y - y;
        return (dx * dx + dy * dy) <= radiusSquared;
      });
  }

  /**
   * Finds the closest entity to a position
   */
  getClosestEntity(
    x: number,
    y: number,
    ...requiredComponents: string[]
  ): Entity | undefined {
    let closestEntity: Entity | undefined;
    let closestDistanceSquared = Infinity;

    for (
      const entity of this.getEntitiesWithComponents(
        "position",
        ...requiredComponents,
      )
    ) {
      const position = entity.getComponent<
        import("./component.ts").PositionComponent
      >("position")!;
      const dx = position.position.x - x;
      const dy = position.position.y - y;
      const distanceSquared = dx * dx + dy * dy;

      if (distanceSquared < closestDistanceSquared) {
        closestDistanceSquared = distanceSquared;
        closestEntity = entity;
      }
    }

    return closestEntity;
  }
}
