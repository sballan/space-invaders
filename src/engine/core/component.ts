/**
 * Component System
 * Defines the base component interface and common component types
 * Components are pure data containers without behavior logic
 */

import { Vector2 } from "../../utils/math.ts";

/**
 * Base interface for all components
 * Components are data-only objects attached to entities
 */
export interface Component {
  /** Unique identifier for the component type */
  readonly type: string;
}

/**
 * Position component - tracks entity location in 2D space
 */
export interface PositionComponent extends Component {
  readonly type: "position";
  /** Current position in world coordinates */
  position: Vector2;
  /** Previous position (useful for interpolation and collision) */
  previousPosition: Vector2;
}

/**
 * Velocity component - tracks entity movement
 */
export interface VelocityComponent extends Component {
  readonly type: "velocity";
  /** Current velocity vector (units per second) */
  velocity: Vector2;
  /** Maximum speed constraint */
  maxSpeed: number;
}

/**
 * Sprite component - visual representation data
 */
export interface SpriteComponent extends Component {
  readonly type: "sprite";
  /** Name of the texture or texture region to render */
  textureName: string;
  /** Size of the sprite in world units */
  size: Vector2;
  /** Color tint (RGBA values 0-1) */
  color: { r: number; g: number; b: number; a: number };
  /** Rotation angle in radians */
  rotation: number;
  /** Anchor point for rotation and positioning */
  anchor: Vector2;
  /** Z-order for rendering (higher values render on top) */
  zOrder: number;
  /** Whether the sprite is visible */
  visible: boolean;
}

/**
 * Collision component - defines collision boundaries
 */
export interface CollisionComponent extends Component {
  readonly type: "collision";
  /** Collision boundary relative to entity position */
  bounds: {
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
  };
  /** Collision layers this entity belongs to */
  layers: string[];
  /** Collision layers this entity can collide with */
  mask: string[];
  /** Whether this entity is a trigger (no physical collision) */
  isTrigger: boolean;
  /** Whether collision is currently enabled */
  enabled: boolean;
}

/**
 * Health component - tracks entity health and damage
 */
export interface HealthComponent extends Component {
  readonly type: "health";
  /** Current health points */
  current: number;
  /** Maximum health points */
  maximum: number;
  /** Whether the entity is invulnerable to damage */
  invulnerable: boolean;
  /** Remaining invulnerability time in seconds */
  invulnerabilityTime: number;
}

/**
 * Weapon component - handles shooting mechanics
 */
export interface WeaponComponent extends Component {
  readonly type: "weapon";
  /** Time between shots in seconds */
  fireRate: number;
  /** Time since last shot */
  timeSinceLastShot: number;
  /** Maximum number of bullets that can exist simultaneously */
  maxBullets: number;
  /** Current number of active bullets */
  activeBullets: number;
  /** Bullet speed in units per second */
  bulletSpeed: number;
  /** Damage dealt by bullets */
  damage: number;
  /** Whether the weapon can currently fire */
  canFire: boolean;
}

/**
 * Bullet component - marks entities as projectiles
 */
export interface BulletComponent extends Component {
  readonly type: "bullet";
  /** Damage dealt on impact */
  damage: number;
  /** Entity that fired this bullet (for collision filtering) */
  owner: number; // Entity ID
  /** Time to live in seconds */
  timeToLive: number;
  /** Whether bullet has already hit something */
  hasHit: boolean;
}

/**
 * Input component - handles input for player-controlled entities
 */
export interface InputComponent extends Component {
  readonly type: "input";
  /** Key bindings for this entity */
  keyBindings: Map<string, string>; // Key -> Action
  /** Currently active actions */
  activeActions: Set<string>;
  /** Mouse sensitivity for mouse-controlled entities */
  mouseSensitivity: number;
}

/**
 * Lifetime component - auto-destroys entities after a time
 */
export interface LifetimeComponent extends Component {
  readonly type: "lifetime";
  /** Remaining lifetime in seconds */
  remaining: number;
  /** Whether to trigger an event when destroyed */
  triggerEvent: boolean;
  /** Event data to send when destroyed */
  eventData?: Record<string, unknown>;
}

/**
 * Score component - tracks score contribution
 */
export interface ScoreComponent extends Component {
  readonly type: "score";
  /** Points awarded when this entity is destroyed */
  value: number;
  /** Whether points have been awarded */
  awarded: boolean;
}

/**
 * Union type of all available components
 */
export type AnyComponent =
  | PositionComponent
  | VelocityComponent
  | SpriteComponent
  | CollisionComponent
  | HealthComponent
  | WeaponComponent
  | BulletComponent
  | InputComponent
  | LifetimeComponent
  | ScoreComponent;

/**
 * Helper functions for creating components with default values
 */
export const ComponentFactory = {
  /**
   * Creates a position component with default values
   */
  createPosition(x: number = 0, y: number = 0): PositionComponent {
    return {
      type: "position",
      position: { x, y },
      previousPosition: { x, y },
    };
  },

  /**
   * Creates a velocity component with default values
   */
  createVelocity(
    vx: number = 0,
    vy: number = 0,
    maxSpeed: number = 100,
  ): VelocityComponent {
    return {
      type: "velocity",
      velocity: { x: vx, y: vy },
      maxSpeed,
    };
  },

  /**
   * Creates a sprite component with default values
   */
  createSprite(
    textureName: string,
    width: number = 32,
    height: number = 32,
  ): SpriteComponent {
    return {
      type: "sprite",
      textureName,
      size: { x: width, y: height },
      color: { r: 1, g: 1, b: 1, a: 1 },
      rotation: 0,
      anchor: { x: 0.5, y: 0.5 },
      zOrder: 0,
      visible: true,
    };
  },

  /**
   * Creates a collision component with default values
   */
  createCollision(
    width: number,
    height: number,
    layers: string[] = ["default"],
    mask: string[] = ["default"],
  ): CollisionComponent {
    return {
      type: "collision",
      bounds: { width, height, offsetX: 0, offsetY: 0 },
      layers,
      mask,
      isTrigger: false,
      enabled: true,
    };
  },

  /**
   * Creates a health component with default values
   */
  createHealth(maxHealth: number = 100): HealthComponent {
    return {
      type: "health",
      current: maxHealth,
      maximum: maxHealth,
      invulnerable: false,
      invulnerabilityTime: 0,
    };
  },

  /**
   * Creates a weapon component with default values
   */
  createWeapon(
    fireRate: number = 0.5,
    maxBullets: number = 3,
    bulletSpeed: number = 200,
    damage: number = 10,
  ): WeaponComponent {
    return {
      type: "weapon",
      fireRate,
      timeSinceLastShot: 0,
      maxBullets,
      activeBullets: 0,
      bulletSpeed,
      damage,
      canFire: true,
    };
  },

  /**
   * Creates a bullet component with default values
   */
  createBullet(
    damage: number,
    owner: number,
    timeToLive: number = 5,
  ): BulletComponent {
    return {
      type: "bullet",
      damage,
      owner,
      timeToLive,
      hasHit: false,
    };
  },

  /**
   * Creates an input component with default values
   */
  createInput(keyBindings: Record<string, string> = {}): InputComponent {
    return {
      type: "input",
      keyBindings: new Map(Object.entries(keyBindings)),
      activeActions: new Set(),
      mouseSensitivity: 1.0,
    };
  },

  /**
   * Creates a lifetime component with default values
   */
  createLifetime(
    seconds: number,
    triggerEvent: boolean = false,
  ): LifetimeComponent {
    return {
      type: "lifetime",
      remaining: seconds,
      triggerEvent,
    };
  },

  /**
   * Creates a score component with default values
   */
  createScore(value: number): ScoreComponent {
    return {
      type: "score",
      value,
      awarded: false,
    };
  },
};
