/**
 * Entity Component System Test Suite
 * Tests for Entity and EntityManager functionality
 */

import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.216.0/assert/mod.ts";
import { Entity, EntityManager } from "../../../src/engine/core/entity.ts";
import { ComponentFactory } from "../../../src/engine/core/component.ts";

Deno.test("Entity - Basic functionality", async (t) => {
  await t.step("constructor - creates entity with correct ID", () => {
    const entity = new Entity(42);
    assertEquals(entity.id, 42);
    assertEquals(entity.active, true);
  });

  await t.step("addComponent - adds component correctly", () => {
    const entity = new Entity(1);
    const position = ComponentFactory.createPosition(10, 20);

    entity.addComponent(position);

    assertEquals(entity.hasComponent("position"), true);
    assertEquals(entity.getComponent("position"), position);
  });

  await t.step("addComponent - returns entity for chaining", () => {
    const entity = new Entity(1);
    const position = ComponentFactory.createPosition(10, 20);
    const velocity = ComponentFactory.createVelocity(5, 10);

    const result = entity.addComponent(position).addComponent(velocity);

    assertEquals(result, entity);
    assertEquals(entity.hasComponent("position"), true);
    assertEquals(entity.hasComponent("velocity"), true);
  });

  await t.step("removeComponent - removes component correctly", () => {
    const entity = new Entity(1);
    const position = ComponentFactory.createPosition(10, 20);

    entity.addComponent(position);
    assertEquals(entity.hasComponent("position"), true);

    entity.removeComponent("position");
    assertEquals(entity.hasComponent("position"), false);
    assertEquals(entity.getComponent("position"), undefined);
  });

  await t.step("hasComponents - checks multiple components", () => {
    const entity = new Entity(1);
    entity.addComponent(ComponentFactory.createPosition(10, 20));
    entity.addComponent(ComponentFactory.createVelocity(5, 10));

    assertEquals(entity.hasComponents("position"), true);
    assertEquals(entity.hasComponents("velocity"), true);
    assertEquals(entity.hasComponents("position", "velocity"), true);
    assertEquals(entity.hasComponents("position", "sprite"), false);
    assertEquals(entity.hasComponents("nonexistent"), false);
  });

  await t.step("getAllComponents - returns all components", () => {
    const entity = new Entity(1);
    const position = ComponentFactory.createPosition(10, 20);
    const velocity = ComponentFactory.createVelocity(5, 10);

    entity.addComponent(position).addComponent(velocity);

    const components = entity.getAllComponents();
    assertEquals(components.length, 2);
    assertEquals(components.includes(position), true);
    assertEquals(components.includes(velocity), true);
  });

  await t.step("getComponentTypes - returns component type names", () => {
    const entity = new Entity(1);
    entity.addComponent(ComponentFactory.createPosition(10, 20));
    entity.addComponent(ComponentFactory.createVelocity(5, 10));

    const types = entity.getComponentTypes();
    assertEquals(types.length, 2);
    assertEquals(types.includes("position"), true);
    assertEquals(types.includes("velocity"), true);
  });

  await t.step("clearComponents - removes all components", () => {
    const entity = new Entity(1);
    entity.addComponent(ComponentFactory.createPosition(10, 20));
    entity.addComponent(ComponentFactory.createVelocity(5, 10));

    assertEquals(entity.getAllComponents().length, 2);

    entity.clearComponents();

    assertEquals(entity.getAllComponents().length, 0);
    assertEquals(entity.hasComponent("position"), false);
    assertEquals(entity.hasComponent("velocity"), false);
  });

  await t.step(
    "destroy - marks entity as inactive and clears components",
    () => {
      const entity = new Entity(1);
      entity.addComponent(ComponentFactory.createPosition(10, 20));

      assertEquals(entity.active, true);
      assertEquals(entity.hasComponent("position"), true);

      entity.destroy();

      assertEquals(entity.active, false);
      assertEquals(entity.hasComponent("position"), false);
    },
  );

  await t.step("clone - creates copy with new ID", () => {
    const original = new Entity(1);
    original.addComponent(ComponentFactory.createPosition(10, 20));
    original.addComponent(ComponentFactory.createVelocity(5, 10));

    const clone = original.clone(2);

    assertEquals(clone.id, 2);
    assertEquals(clone.active, original.active);
    assertEquals(clone.hasComponent("position"), true);
    assertEquals(clone.hasComponent("velocity"), true);

    // Verify components are separate instances
    const originalPos = original.getComponent<import("../../../src/engine/core/component.ts").PositionComponent>("position")!;
    const clonePos = clone.getComponent<import("../../../src/engine/core/component.ts").PositionComponent>("position")!;
    assert(originalPos !== clonePos);
    assertEquals(clonePos.position.x, originalPos.position.x);
    assertEquals(clonePos.position.y, originalPos.position.y);
  });
});

Deno.test("EntityManager - Entity management", async (t) => {
  await t.step("createEntity - creates entity with unique ID", () => {
    const manager = new EntityManager();

    const entity1 = manager.createEntity();
    const entity2 = manager.createEntity();

    assertEquals(entity1.id, 1);
    assertEquals(entity2.id, 2);
    assert(entity1.id !== entity2.id);
  });

  await t.step("getEntity - retrieves entity by ID", () => {
    const manager = new EntityManager();
    const entity = manager.createEntity();

    const retrieved = manager.getEntity(entity.id);
    assertEquals(retrieved, entity);

    const nonexistent = manager.getEntity(999);
    assertEquals(nonexistent, undefined);
  });

  await t.step("destroyEntity - marks entity for destruction", () => {
    const manager = new EntityManager();
    const entity = manager.createEntity();

    assertEquals(entity.active, true);

    manager.destroyEntity(entity.id);

    assertEquals(entity.active, false);
  });

  await t.step("removeEntity - immediately removes entity", () => {
    const manager = new EntityManager();
    const entity = manager.createEntity();

    assertEquals(manager.getEntity(entity.id), entity);

    manager.removeEntity(entity.id);

    assertEquals(manager.getEntity(entity.id), undefined);
  });

  await t.step("getActiveEntities - returns only active entities", () => {
    const manager = new EntityManager();
    const entity1 = manager.createEntity();
    const entity2 = manager.createEntity();
    const entity3 = manager.createEntity();

    manager.destroyEntity(entity2.id);

    const activeEntities = manager.getActiveEntities();
    assertEquals(activeEntities.length, 2);
    assertEquals(activeEntities.includes(entity1), true);
    assertEquals(activeEntities.includes(entity2), false);
    assertEquals(activeEntities.includes(entity3), true);
  });

  await t.step("getAllEntities - returns all entities", () => {
    const manager = new EntityManager();
    const entity1 = manager.createEntity();
    const entity2 = manager.createEntity();

    manager.destroyEntity(entity2.id);

    const allEntities = manager.getAllEntities();
    assertEquals(allEntities.length, 2);
    assertEquals(allEntities.includes(entity1), true);
    assertEquals(allEntities.includes(entity2), true);
  });

  await t.step("cleanup - removes destroyed entities", () => {
    const manager = new EntityManager();
    const entity1 = manager.createEntity();
    const entity2 = manager.createEntity();

    manager.destroyEntity(entity2.id);

    assertEquals(manager.getAllEntities().length, 2);

    manager.cleanup();

    assertEquals(manager.getAllEntities().length, 1);
    assertEquals(manager.getEntity(entity1.id), entity1);
    assertEquals(manager.getEntity(entity2.id), undefined);
  });

  await t.step("getEntitiesWithComponents - queries by components", () => {
    const manager = new EntityManager();

    const entity1 = manager.createEntity();
    entity1.addComponent(ComponentFactory.createPosition(0, 0));

    const entity2 = manager.createEntity();
    entity2.addComponent(ComponentFactory.createPosition(10, 10));
    entity2.addComponent(ComponentFactory.createVelocity(5, 5));

    const entity3 = manager.createEntity();
    entity3.addComponent(ComponentFactory.createVelocity(2, 2));

    // Query for position components
    const positionEntities = manager.getEntitiesWithComponents("position");
    assertEquals(positionEntities.length, 2);
    assertEquals(positionEntities.includes(entity1), true);
    assertEquals(positionEntities.includes(entity2), true);

    // Query for both position and velocity
    const bothEntities = manager.getEntitiesWithComponents(
      "position",
      "velocity",
    );
    assertEquals(bothEntities.length, 1);
    assertEquals(bothEntities.includes(entity2), true);

    // Query for non-existent component
    const noneEntities = manager.getEntitiesWithComponents("nonexistent");
    assertEquals(noneEntities.length, 0);
  });

  await t.step(
    "createEntityWithComponents - creates entity with components",
    () => {
      const manager = new EntityManager();

      const position = ComponentFactory.createPosition(10, 20);
      const velocity = ComponentFactory.createVelocity(5, 10);

      const entity = manager.createEntityWithComponents(position, velocity);

      assertEquals(entity.hasComponent("position"), true);
      assertEquals(entity.hasComponent("velocity"), true);
      assertEquals(entity.getComponent("position"), position);
      assertEquals(entity.getComponent("velocity"), velocity);
    },
  );

  await t.step("getEntitiesInRadius - finds entities within distance", () => {
    const manager = new EntityManager();

    const entity1 = manager.createEntity();
    entity1.addComponent(ComponentFactory.createPosition(0, 0));

    const entity2 = manager.createEntity();
    entity2.addComponent(ComponentFactory.createPosition(3, 4)); // Distance = 5

    const entity3 = manager.createEntity();
    entity3.addComponent(ComponentFactory.createPosition(10, 10)); // Distance > 5

    // Find entities within radius 6 of origin
    const nearbyEntities = manager.getEntitiesInRadius(0, 0, 6);
    assertEquals(nearbyEntities.length, 2);
    assertEquals(nearbyEntities.includes(entity1), true);
    assertEquals(nearbyEntities.includes(entity2), true);
    assertEquals(nearbyEntities.includes(entity3), false);

    // Find entities within radius 3 of origin
    const closeEntities = manager.getEntitiesInRadius(0, 0, 3);
    assertEquals(closeEntities.length, 1);
    assertEquals(closeEntities.includes(entity1), true);
  });

  await t.step("getClosestEntity - finds nearest entity", () => {
    const manager = new EntityManager();

    const entity1 = manager.createEntity();
    entity1.addComponent(ComponentFactory.createPosition(5, 0));

    const entity2 = manager.createEntity();
    entity2.addComponent(ComponentFactory.createPosition(3, 4)); // Distance = 5

    const entity3 = manager.createEntity();
    entity3.addComponent(ComponentFactory.createPosition(10, 10));

    const closest = manager.getClosestEntity(0, 0);
    assertEquals(closest, entity1); // Distance 5 is closest (entity1 at (5,0))

    const closestFromFar = manager.getClosestEntity(100, 100);
    assertEquals(closestFromFar, entity3); // Closest to (100,100)
  });

  await t.step("getStats - returns entity statistics", () => {
    const manager = new EntityManager();
    const entity1 = manager.createEntity();
    const entity2 = manager.createEntity();

    manager.destroyEntity(entity2.id);

    const stats = manager.getStats();
    assertEquals(stats.totalEntities, 2);
    assertEquals(stats.activeEntities, 1);
    assertEquals(stats.deadEntities, 1);
    assertEquals(stats.nextEntityId, 3);
  });

  await t.step("clear - removes all entities", () => {
    const manager = new EntityManager();
    manager.createEntity();
    manager.createEntity();

    assertEquals(manager.getAllEntities().length, 2);

    manager.clear();

    assertEquals(manager.getAllEntities().length, 0);
    assertEquals(manager.getStats().nextEntityId, 1);
  });
});
