/**
 * Game Configuration
 * Single source of truth for all game constants and settings
 */

export const GAME_CONFIG = {
  // Screen dimensions
  screen: {
    width: 800,
    height: 600,
  },

  // Player settings
  player: {
    speed: 250,
    size: { width: 80, height: 60 },
    startX: 400,
    startY: 500,
    lives: 3,
    color: { r: 0, g: 1, b: 0, a: 1 }, // Green
  },

  // Invader settings
  invader: {
    rows: 5,
    cols: 11,
    size: { width: 60, height: 40 },
    spacingX: 60,
    spacingY: 50,
    startX: 75,
    startY: 100,
    speed: 30,
    dropSpeed: 30,
    moveInterval: 1.0,
    shootInterval: 0.1,
    shootChance: 0.7, // 70% chance to shoot when interval triggers
    scoreValues: [10, 20, 30, 40, 50], // Points per row (bottom to top)
  },

  // Bullet settings
  bullet: {
    player: {
      speed: 300,
      size: { width: 16, height: 40 },
      maxActive: 6,
      fireRate: 0.05,
      damage: 10,
      color: { r: 0, g: 1, b: 1, a: 1 }, // Cyan
    },
    enemy: {
      speed: 200,
      size: { width: 8, height: 20 },
      damage: 10,
      lifetime: 10,
      color: { r: 1, g: 0, b: 0, a: 1 }, // Red
    },
  },
} as const;
