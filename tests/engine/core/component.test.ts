/**
 * Component System Test Suite
 * Tests for component factory and component creation
 */

import {
  assertEquals,
} from "https://deno.land/std@0.216.0/assert/mod.ts";
import { ComponentFactory } from "../../../src/engine/core/component.ts";

Deno.test("ComponentFactory - Position component", async (t) => {
  await t.step("createPosition - creates with specified coordinates", () => {
    const position = ComponentFactory.createPosition(10, 20);

    assertEquals(position.type, "position");
    assertEquals(position.position.x, 10);
    assertEquals(position.position.y, 20);
    assertEquals(position.previousPosition.x, 10);
    assertEquals(position.previousPosition.y, 20);
  });

  await t.step("createPosition - creates with default coordinates", () => {
    const position = ComponentFactory.createPosition();

    assertEquals(position.type, "position");
    assertEquals(position.position.x, 0);
    assertEquals(position.position.y, 0);
    assertEquals(position.previousPosition.x, 0);
    assertEquals(position.previousPosition.y, 0);
  });
});

Deno.test("ComponentFactory - Velocity component", async (t) => {
  await t.step("createVelocity - creates with specified values", () => {
    const velocity = ComponentFactory.createVelocity(5, 10, 200);

    assertEquals(velocity.type, "velocity");
    assertEquals(velocity.velocity.x, 5);
    assertEquals(velocity.velocity.y, 10);
    assertEquals(velocity.maxSpeed, 200);
  });

  await t.step("createVelocity - creates with default values", () => {
    const velocity = ComponentFactory.createVelocity();

    assertEquals(velocity.type, "velocity");
    assertEquals(velocity.velocity.x, 0);
    assertEquals(velocity.velocity.y, 0);
    assertEquals(velocity.maxSpeed, 100);
  });
});

Deno.test("ComponentFactory - Sprite component", async (t) => {
  await t.step("createSprite - creates with specified texture and size", () => {
    const sprite = ComponentFactory.createSprite("player_texture", 64, 48);

    assertEquals(sprite.type, "sprite");
    assertEquals(sprite.textureName, "player_texture");
    assertEquals(sprite.size.x, 64);
    assertEquals(sprite.size.y, 48);
    assertEquals(sprite.color.r, 1);
    assertEquals(sprite.color.g, 1);
    assertEquals(sprite.color.b, 1);
    assertEquals(sprite.color.a, 1);
    assertEquals(sprite.rotation, 0);
    assertEquals(sprite.anchor.x, 0.5);
    assertEquals(sprite.anchor.y, 0.5);
    assertEquals(sprite.zOrder, 0);
    assertEquals(sprite.visible, true);
  });

  await t.step("createSprite - creates with default size", () => {
    const sprite = ComponentFactory.createSprite("test_texture");

    assertEquals(sprite.type, "sprite");
    assertEquals(sprite.textureName, "test_texture");
    assertEquals(sprite.size.x, 32);
    assertEquals(sprite.size.y, 32);
  });
});

Deno.test("ComponentFactory - Collision component", async (t) => {
  await t.step(
    "createCollision - creates with specified bounds and layers",
    () => {
      const collision = ComponentFactory.createCollision(
        40,
        60,
        ["player", "solid"],
        ["enemy", "projectile"],
      );

      assertEquals(collision.type, "collision");
      assertEquals(collision.bounds.width, 40);
      assertEquals(collision.bounds.height, 60);
      assertEquals(collision.bounds.offsetX, 0);
      assertEquals(collision.bounds.offsetY, 0);
      assertEquals(collision.layers.length, 2);
      assertEquals(collision.layers.includes("player"), true);
      assertEquals(collision.layers.includes("solid"), true);
      assertEquals(collision.mask.length, 2);
      assertEquals(collision.mask.includes("enemy"), true);
      assertEquals(collision.mask.includes("projectile"), true);
      assertEquals(collision.isTrigger, false);
      assertEquals(collision.enabled, true);
    },
  );

  await t.step("createCollision - creates with default layers", () => {
    const collision = ComponentFactory.createCollision(30, 40);

    assertEquals(collision.type, "collision");
    assertEquals(collision.bounds.width, 30);
    assertEquals(collision.bounds.height, 40);
    assertEquals(collision.layers.length, 1);
    assertEquals(collision.layers.includes("default"), true);
    assertEquals(collision.mask.length, 1);
    assertEquals(collision.mask.includes("default"), true);
  });
});

Deno.test("ComponentFactory - Health component", async (t) => {
  await t.step("createHealth - creates with specified max health", () => {
    const health = ComponentFactory.createHealth(150);

    assertEquals(health.type, "health");
    assertEquals(health.current, 150);
    assertEquals(health.maximum, 150);
    assertEquals(health.invulnerable, false);
    assertEquals(health.invulnerabilityTime, 0);
  });

  await t.step("createHealth - creates with default health", () => {
    const health = ComponentFactory.createHealth();

    assertEquals(health.type, "health");
    assertEquals(health.current, 100);
    assertEquals(health.maximum, 100);
  });
});

Deno.test("ComponentFactory - Weapon component", async (t) => {
  await t.step("createWeapon - creates with specified values", () => {
    const weapon = ComponentFactory.createWeapon(0.3, 5, 250, 15);

    assertEquals(weapon.type, "weapon");
    assertEquals(weapon.fireRate, 0.3);
    assertEquals(weapon.timeSinceLastShot, 0);
    assertEquals(weapon.maxBullets, 5);
    assertEquals(weapon.activeBullets, 0);
    assertEquals(weapon.bulletSpeed, 250);
    assertEquals(weapon.damage, 15);
    assertEquals(weapon.canFire, true);
  });

  await t.step("createWeapon - creates with default values", () => {
    const weapon = ComponentFactory.createWeapon();

    assertEquals(weapon.type, "weapon");
    assertEquals(weapon.fireRate, 0.5);
    assertEquals(weapon.maxBullets, 3);
    assertEquals(weapon.bulletSpeed, 200);
    assertEquals(weapon.damage, 10);
  });
});

Deno.test("ComponentFactory - Bullet component", async (t) => {
  await t.step("createBullet - creates with specified values", () => {
    const bullet = ComponentFactory.createBullet(25, 42, 8);

    assertEquals(bullet.type, "bullet");
    assertEquals(bullet.damage, 25);
    assertEquals(bullet.owner, 42);
    assertEquals(bullet.timeToLive, 8);
    assertEquals(bullet.hasHit, false);
  });

  await t.step("createBullet - creates with default TTL", () => {
    const bullet = ComponentFactory.createBullet(10, 1);

    assertEquals(bullet.type, "bullet");
    assertEquals(bullet.damage, 10);
    assertEquals(bullet.owner, 1);
    assertEquals(bullet.timeToLive, 5);
  });
});

Deno.test("ComponentFactory - AI component", async (t) => {
  await t.step("createAI - creates with specified behavior", () => {
    const ai = ComponentFactory.createAI("chase");

    assertEquals(ai.type, "ai");
    assertEquals(ai.behavior, "chase");
    assertEquals(ai.target, null);
    assertEquals(typeof ai.data, "object");
    assertEquals(ai.nextDecisionTime, 0);
  });

  await t.step("createAI - creates with default behavior", () => {
    const ai = ComponentFactory.createAI();

    assertEquals(ai.type, "ai");
    assertEquals(ai.behavior, "idle");
  });
});

Deno.test("ComponentFactory - Input component", async (t) => {
  await t.step("createInput - creates with specified key bindings", () => {
    const keyBindings = {
      "KeyW": "move_up",
      "KeyS": "move_down",
      "Space": "fire",
    };
    const input = ComponentFactory.createInput(keyBindings);

    assertEquals(input.type, "input");
    assertEquals(input.keyBindings.size, 3);
    assertEquals(input.keyBindings.get("KeyW"), "move_up");
    assertEquals(input.keyBindings.get("KeyS"), "move_down");
    assertEquals(input.keyBindings.get("Space"), "fire");
    assertEquals(input.activeActions.size, 0);
    assertEquals(input.mouseSensitivity, 1.0);
  });

  await t.step("createInput - creates with empty bindings", () => {
    const input = ComponentFactory.createInput();

    assertEquals(input.type, "input");
    assertEquals(input.keyBindings.size, 0);
    assertEquals(input.activeActions.size, 0);
  });
});

Deno.test("ComponentFactory - Lifetime component", async (t) => {
  await t.step("createLifetime - creates with specified duration", () => {
    const lifetime = ComponentFactory.createLifetime(10, true);

    assertEquals(lifetime.type, "lifetime");
    assertEquals(lifetime.remaining, 10);
    assertEquals(lifetime.triggerEvent, true);
  });

  await t.step("createLifetime - creates with default trigger setting", () => {
    const lifetime = ComponentFactory.createLifetime(5);

    assertEquals(lifetime.type, "lifetime");
    assertEquals(lifetime.remaining, 5);
    assertEquals(lifetime.triggerEvent, false);
  });
});

Deno.test("ComponentFactory - Score component", async (t) => {
  await t.step("createScore - creates with specified value", () => {
    const score = ComponentFactory.createScore(150);

    assertEquals(score.type, "score");
    assertEquals(score.value, 150);
    assertEquals(score.awarded, false);
  });

  await t.step("createScore - creates with zero value", () => {
    const score = ComponentFactory.createScore(0);

    assertEquals(score.type, "score");
    assertEquals(score.value, 0);
    assertEquals(score.awarded, false);
  });
});
