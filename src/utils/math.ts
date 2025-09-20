/**
 * Mathematical utilities for 2D and 3D graphics operations
 * Provides vector operations, matrix transformations, and utility functions
 */

export interface Vector2 {
  x: number;
  y: number;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Vector4 {
  x: number;
  y: number;
  z: number;
  w: number;
}

/**
 * 4x4 Matrix represented as a column-major array of 16 numbers
 * Used for transformations in WebGL coordinate space
 */
export type Matrix4 = Float32Array;

/**
 * Rectangle definition for collision detection and rendering bounds
 */
export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Vector2 utility functions for 2D operations
 */
export const Vec2 = {
  /**
   * Creates a new Vector2 with given x and y coordinates
   */
  create: (x: number = 0, y: number = 0): Vector2 => ({ x, y }),

  /**
   * Adds two vectors component-wise: result = a + b
   */
  add: (a: Vector2, b: Vector2): Vector2 => ({ x: a.x + b.x, y: a.y + b.y }),

  /**
   * Subtracts two vectors component-wise: result = a - b
   */
  subtract: (a: Vector2, b: Vector2): Vector2 => ({
    x: a.x - b.x,
    y: a.y - b.y,
  }),

  /**
   * Multiplies vector by scalar: result = vector * scalar
   */
  scale: (vector: Vector2, scalar: number): Vector2 => ({
    x: vector.x * scalar,
    y: vector.y * scalar,
  }),

  /**
   * Calculates the dot product of two vectors
   */
  dot: (a: Vector2, b: Vector2): number => a.x * b.x + a.y * b.y,

  /**
   * Calculates the magnitude (length) of a vector
   */
  magnitude: (vector: Vector2): number =>
    Math.sqrt(vector.x * vector.x + vector.y * vector.y),

  /**
   * Normalizes a vector to unit length (magnitude = 1)
   */
  normalize: (vector: Vector2): Vector2 => {
    const mag = Vec2.magnitude(vector);
    return mag > 0 ? { x: vector.x / mag, y: vector.y / mag } : { x: 0, y: 0 };
  },

  /**
   * Calculates the distance between two points
   */
  distance: (a: Vector2, b: Vector2): number =>
    Vec2.magnitude(Vec2.subtract(a, b)),
};

/**
 * Matrix4 utility functions for 3D transformations
 */
export const Mat4 = {
  /**
   * Creates a 4x4 identity matrix
   */
  identity: (): Matrix4 =>
    new Float32Array([
      1,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      1,
    ]),

  /**
   * Creates an orthographic projection matrix for 2D rendering
   * Maps from world coordinates to clip space (-1 to 1)
   */
  orthographic: (
    left: number,
    right: number,
    bottom: number,
    top: number,
    near: number,
    far: number,
  ): Matrix4 => {
    const result = new Float32Array(16);
    const width = right - left;
    const height = top - bottom;
    const depth = far - near;

    // Standard orthographic projection matrix
    result[0] = 2 / width; // Scale X
    result[5] = 2 / height; // Scale Y
    result[10] = -2 / depth; // Scale Z
    result[12] = -(right + left) / width; // Translate X
    result[13] = -(top + bottom) / height; // Translate Y
    result[14] = -(far + near) / depth; // Translate Z
    result[15] = 1;

    return result;
  },

  /**
   * Creates a translation matrix for moving objects in 2D space
   */
  translation: (x: number, y: number): Matrix4 => {
    const result = Mat4.identity();
    result[12] = x;
    result[13] = y;
    return result;
  },

  /**
   * Creates a scaling matrix for resizing objects
   */
  scaling: (x: number, y: number): Matrix4 => {
    const result = Mat4.identity();
    result[0] = x;
    result[5] = y;
    return result;
  },

  /**
   * Creates a rotation matrix for rotating objects around the Z-axis (2D rotation)
   */
  rotation: (angleInRadians: number): Matrix4 => {
    const cos = Math.cos(angleInRadians);
    const sin = Math.sin(angleInRadians);
    const result = Mat4.identity();
    result[0] = cos;
    result[1] = sin;
    result[4] = -sin;
    result[5] = cos;
    return result;
  },

  /**
   * Multiplies two 4x4 matrices: result = a * b
   * Order matters: transformations are applied right to left
   */
  multiply: (a: Matrix4, b: Matrix4): Matrix4 => {
    const result = new Float32Array(16);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        result[i * 4 + j] = a[i * 4 + 0] * b[0 + j] +
          a[i * 4 + 1] * b[4 + j] +
          a[i * 4 + 2] * b[8 + j] +
          a[i * 4 + 3] * b[12 + j];
      }
    }
    return result;
  },
};

/**
 * Utility functions for common mathematical operations
 */
export const MathUtils = {
  /**
   * Converts degrees to radians
   */
  degToRad: (degrees: number): number => degrees * Math.PI / 180,

  /**
   * Converts radians to degrees
   */
  radToDeg: (radians: number): number => radians * 180 / Math.PI,

  /**
   * Clamps a value between min and max bounds
   */
  clamp: (value: number, min: number, max: number): number =>
    Math.min(Math.max(value, min), max),

  /**
   * Linear interpolation between two values
   */
  lerp: (a: number, b: number, t: number): number => a + (b - a) * t,

  /**
   * Checks if two rectangles intersect (AABB collision detection)
   */
  rectanglesIntersect: (a: Rectangle, b: Rectangle): boolean => {
    return a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y;
  },

  /**
   * Checks if a point is inside a rectangle
   */
  pointInRectangle: (point: Vector2, rect: Rectangle): boolean => {
    return point.x >= rect.x &&
      point.x <= rect.x + rect.width &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.height;
  },
};
