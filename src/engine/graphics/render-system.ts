/**
 * Render System
 * ECS system that handles rendering all visible sprites
 * Manages z-ordering, texture lookup, and sprite rendering
 */

import { BaseSystem } from "../core/system.ts";
import { Entity, EntityManager } from "../core/entity.ts";
import { SpriteComponent } from "../core/component.ts";
import { GraphicsEngine } from "./graphics-engine.ts";

/**
 * Render system that processes sprite components and renders them
 */
export class RenderSystem extends BaseSystem {
  public readonly name = "render";
  private graphicsEngine: GraphicsEngine;
  private debugLogging: boolean;

  constructor(graphicsEngine: GraphicsEngine, debugLogging = false) {
    super(100); // Highest priority - render last
    this.graphicsEngine = graphicsEngine;
    this.debugLogging = debugLogging;
  }

  public update(_deltaTime: number, entityManager: EntityManager): void {
    const entities = this.getEntitiesWithSprites(entityManager);

    // Begin frame
    this.graphicsEngine.beginFrame();

    // Sort entities by z-order for proper rendering
    entities.sort((a, b) => {
      const spriteA = a.getComponent<SpriteComponent>("sprite")!;
      const spriteB = b.getComponent<SpriteComponent>("sprite")!;
      return spriteA.zOrder - spriteB.zOrder;
    });

    // Render all visible sprites
    for (const entity of entities) {
      this.renderEntity(entity);
    }

    // End frame
    this.graphicsEngine.endFrame();
  }

  /**
   * Gets all entities that should be rendered
   */
  private getEntitiesWithSprites(entityManager: EntityManager): Entity[] {
    return entityManager.getEntitiesWithComponents("position", "sprite");
  }

  /**
   * Renders a single entity
   */
  private renderEntity(entity: Entity): void {
    const position = entity.getComponent<
      import("../core/component.ts").PositionComponent
    >("position")!;
    const sprite = entity.getComponent<SpriteComponent>("sprite")!;

    if (!sprite.visible) return;

    try {
      // Get texture or texture region
      const textureManager = this.graphicsEngine.getTextureManager();
      let texture;

      if (textureManager.hasRegion(sprite.textureName)) {
        texture = textureManager.getRegion(sprite.textureName);
      } else if (textureManager.hasTexture(sprite.textureName)) {
        texture = textureManager.getTexture(sprite.textureName);
      } else {
        // Fallback to white texture
        texture = textureManager.getTexture("__white");
      }

      // Render the sprite
      this.graphicsEngine.drawSprite({
        position: position.position,
        size: sprite.size,
        rotation: sprite.rotation,
        color: sprite.color,
        texture,
        anchor: sprite.anchor,
      });
    } catch (error) {
      if (this.debugLogging) {
        console.warn(`Failed to render sprite for entity ${entity.id}:`, error);
      }
    }
  }

  /**
   * Enable or disable debug logging
   */
  setDebugLogging(enabled: boolean): void {
    this.debugLogging = enabled;
  }
}
