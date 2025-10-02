/**
 * Input System
 * ECS system that processes input components and updates entity state based on input
 * Bridges the gap between raw input and game entities
 */

import { BaseSystem } from "../core/system.ts";
import { EntityManager } from "../core/entity.ts";
import {
  InputComponent,
  VelocityComponent,
  WeaponComponent,
} from "../core/component.ts";
import { InputManager } from "./input-manager.ts";

/**
 * Input system that processes input components and applies input actions to entities
 */
export class InputSystem extends BaseSystem {
  public readonly name = "input";
  private inputManager: InputManager;

  constructor(inputManager: InputManager) {
    super(5); // Very high priority - process input early
    this.inputManager = inputManager;
  }

  public override initialize(_entityManager: EntityManager): void {
    // Register common game actions
    this.setupCommonActions();
  }

  /**
   * Sets up common action mappings for typical game controls
   */
  private setupCommonActions(): void {
    // Movement actions
    this.inputManager.registerAction({
      action: "move_left",
      inputs: ["ArrowLeft", "KeyA"],
      continuous: true,
    });

    this.inputManager.registerAction({
      action: "move_right",
      inputs: ["ArrowRight", "KeyD"],
      continuous: true,
    });

    this.inputManager.registerAction({
      action: "move_up",
      inputs: ["ArrowUp", "KeyW"],
      continuous: true,
    });

    this.inputManager.registerAction({
      action: "move_down",
      inputs: ["ArrowDown", "KeyS"],
      continuous: true,
    });

    // Action inputs
    this.inputManager.registerAction({
      action: "fire",
      inputs: ["Space", "Mouse0"],
      continuous: false,
    });

    this.inputManager.registerAction({
      action: "fire_continuous",
      inputs: ["Space", "Mouse0"],
      continuous: true,
    });

    // Menu actions
    this.inputManager.registerAction({
      action: "pause",
      inputs: ["Escape", "KeyP"],
      continuous: false,
    });

    this.inputManager.registerAction({
      action: "confirm",
      inputs: ["Enter", "Space"],
      continuous: false,
    });

    this.inputManager.registerAction({
      action: "cancel",
      inputs: ["Escape"],
      continuous: false,
    });
  }

  public update(deltaTime: number, entityManager: EntityManager): void {
    // Update input manager state
    this.inputManager.update();

    // Process entities with input components
    const inputEntities = this.getEntities(entityManager, "input");

    for (const entity of inputEntities) {
      const inputComponent = entity.getComponent<InputComponent>("input")!;

      // Clear previous frame's active actions
      inputComponent.activeActions.clear();

      // Process custom key bindings for this entity
      for (const [key, action] of inputComponent.keyBindings) {
        if (this.inputManager.isKeyDown(key)) {
          inputComponent.activeActions.add(action);
        }
      }

      // Add global actions that are currently active
      for (
        const action of [
          "move_left",
          "move_right",
          "move_up",
          "move_down",
          "fire",
          "fire_continuous",
        ]
      ) {
        if (this.inputManager.isActionActive(action)) {
          inputComponent.activeActions.add(action);
        }
      }

      // Process movement input if entity has velocity component
      if (entity.hasComponent("velocity")) {
        this.processMovementInput(entity, inputComponent, deltaTime);
      }

      // Process weapon input if entity has weapon component
      if (entity.hasComponent("weapon")) {
        this.processWeaponInput(entity, inputComponent, entityManager);
      }
    }
  }

  /**
   * Processes movement input for entities with velocity components
   */
  private processMovementInput(
    entity: import("../core/entity.ts").Entity,
    inputComponent: InputComponent,
    _deltaTime: number,
  ): void {
    const velocity = entity.getComponent<VelocityComponent>("velocity")!;

    // Base movement speed (units per second)
    const moveSpeed = 200;

    // Reset velocity
    velocity.velocity.x = 0;
    velocity.velocity.y = 0;

    // Apply movement based on active actions
    if (inputComponent.activeActions.has("move_left")) {
      velocity.velocity.x -= moveSpeed;
    }
    if (inputComponent.activeActions.has("move_right")) {
      velocity.velocity.x += moveSpeed;
    }
    if (inputComponent.activeActions.has("move_up")) {
      velocity.velocity.y -= moveSpeed;
    }
    if (inputComponent.activeActions.has("move_down")) {
      velocity.velocity.y += moveSpeed;
    }

    // Normalize diagonal movement to prevent faster diagonal speed
    if (velocity.velocity.x !== 0 && velocity.velocity.y !== 0) {
      const length = Math.sqrt(
        velocity.velocity.x ** 2 + velocity.velocity.y ** 2,
      );
      velocity.velocity.x = (velocity.velocity.x / length) * moveSpeed;
      velocity.velocity.y = (velocity.velocity.y / length) * moveSpeed;
    }
  }

  /**
   * Processes weapon input for entities with weapon components
   */
  private processWeaponInput(
    entity: import("../core/entity.ts").Entity,
    inputComponent: InputComponent,
    _entityManager: EntityManager,
  ): void {
    const weapon = entity.getComponent<WeaponComponent>("weapon")!;

    // Handle firing input
    const firePressed = this.inputManager.isActionPressed("fire");
    const fireContinuous = inputComponent.activeActions.has("fire_continuous");

    // Set fire request flag (WeaponSystem will handle actual bullet creation)
    if (firePressed || fireContinuous) {
      weapon.fireRequested = true;
    }
  }

  /**
   * Gets the input manager instance
   */
  getInputManager(): InputManager {
    return this.inputManager;
  }

  /**
   * Registers a new action mapping
   */
  registerAction(action: string, inputs: string[], continuous = false): void {
    this.inputManager.registerAction({
      action,
      inputs,
      continuous,
    });
  }

  /**
   * Unregisters an action mapping
   */
  unregisterAction(action: string): void {
    this.inputManager.unregisterAction(action);
  }

  /**
   * Checks if an action is currently active
   */
  isActionActive(action: string): boolean {
    return this.inputManager.isActionActive(action);
  }

  /**
   * Checks if an action was just pressed this frame
   */
  isActionPressed(action: string): boolean {
    return this.inputManager.isActionPressed(action);
  }

  /**
   * Checks if an action was just released this frame
   */
  isActionReleased(action: string): boolean {
    return this.inputManager.isActionReleased(action);
  }

  /**
   * Gets current mouse position
   */
  getMousePosition(): import("../../utils/math.ts").Vector2 {
    return this.inputManager.getMousePosition();
  }

  /**
   * Enables or disables input processing
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.inputManager.setEnabled(enabled);
  }

  public override cleanup(): void {
    this.inputManager.destroy();
  }
}
