/**
 * Math Utilities Test Suite
 * Tests for vector operations, matrix transformations, and utility functions
 */

import {
  assertAlmostEquals,
  assertEquals,
} from "https://deno.land/std@0.216.0/assert/mod.ts";
import {
  Mat4,
  MathUtils,
  Matrix4,
  Vec2,
  Vector2,
} from "../../src/utils/math.ts";

Deno.test("Vec2 - Vector2 operations", async (t) => {
  await t.step("create - creates vector with correct values", () => {
    const vec = Vec2.create(3, 4);
    assertEquals(vec.x, 3);
    assertEquals(vec.y, 4);
  });

  await t.step("create - creates zero vector with no parameters", () => {
    const vec = Vec2.create();
    assertEquals(vec.x, 0);
    assertEquals(vec.y, 0);
  });

  await t.step("add - adds two vectors correctly", () => {
    const a: Vector2 = { x: 1, y: 2 };
    const b: Vector2 = { x: 3, y: 4 };
    const result = Vec2.add(a, b);
    assertEquals(result.x, 4);
    assertEquals(result.y, 6);
  });

  await t.step("subtract - subtracts two vectors correctly", () => {
    const a: Vector2 = { x: 5, y: 7 };
    const b: Vector2 = { x: 2, y: 3 };
    const result = Vec2.subtract(a, b);
    assertEquals(result.x, 3);
    assertEquals(result.y, 4);
  });

  await t.step("scale - multiplies vector by scalar", () => {
    const vec: Vector2 = { x: 2, y: 3 };
    const result = Vec2.scale(vec, 2.5);
    assertEquals(result.x, 5);
    assertEquals(result.y, 7.5);
  });

  await t.step("dot - calculates dot product correctly", () => {
    const a: Vector2 = { x: 2, y: 3 };
    const b: Vector2 = { x: 4, y: 5 };
    const result = Vec2.dot(a, b);
    assertEquals(result, 23); // 2*4 + 3*5 = 8 + 15 = 23
  });

  await t.step("magnitude - calculates vector length", () => {
    const vec: Vector2 = { x: 3, y: 4 };
    const result = Vec2.magnitude(vec);
    assertEquals(result, 5); // 3-4-5 triangle
  });

  await t.step("magnitude - zero vector has zero magnitude", () => {
    const vec: Vector2 = { x: 0, y: 0 };
    const result = Vec2.magnitude(vec);
    assertEquals(result, 0);
  });

  await t.step("normalize - creates unit vector", () => {
    const vec: Vector2 = { x: 3, y: 4 };
    const result = Vec2.normalize(vec);
    assertAlmostEquals(result.x, 0.6, 0.001);
    assertAlmostEquals(result.y, 0.8, 0.001);
    assertAlmostEquals(Vec2.magnitude(result), 1, 0.001);
  });

  await t.step("normalize - zero vector returns zero vector", () => {
    const vec: Vector2 = { x: 0, y: 0 };
    const result = Vec2.normalize(vec);
    assertEquals(result.x, 0);
    assertEquals(result.y, 0);
  });

  await t.step("distance - calculates distance between points", () => {
    const a: Vector2 = { x: 0, y: 0 };
    const b: Vector2 = { x: 3, y: 4 };
    const result = Vec2.distance(a, b);
    assertEquals(result, 5);
  });
});

Deno.test("Mat4 - Matrix4 operations", async (t) => {
  await t.step("identity - creates identity matrix", () => {
    const matrix = Mat4.identity();

    // Check diagonal elements are 1
    assertEquals(matrix[0], 1); // [0,0]
    assertEquals(matrix[5], 1); // [1,1]
    assertEquals(matrix[10], 1); // [2,2]
    assertEquals(matrix[15], 1); // [3,3]

    // Check off-diagonal elements are 0
    assertEquals(matrix[1], 0);
    assertEquals(matrix[2], 0);
    assertEquals(matrix[4], 0);
  });

  await t.step("translation - creates translation matrix", () => {
    const matrix = Mat4.translation(5, 10);

    // Translation values should be in positions 12 and 13
    assertEquals(matrix[12], 5);
    assertEquals(matrix[13], 10);

    // Should still be identity for rotation/scale parts
    assertEquals(matrix[0], 1);
    assertEquals(matrix[5], 1);
    assertEquals(matrix[10], 1);
    assertEquals(matrix[15], 1);
  });

  await t.step("scaling - creates scaling matrix", () => {
    const matrix = Mat4.scaling(2, 3);

    // Scale values should be in diagonal
    assertEquals(matrix[0], 2);
    assertEquals(matrix[5], 3);
    assertEquals(matrix[10], 1); // Z scale unchanged
    assertEquals(matrix[15], 1);
  });

  await t.step("rotation - creates rotation matrix", () => {
    const angle = Math.PI / 2; // 90 degrees
    const matrix = Mat4.rotation(angle);

    // For 90-degree rotation: cos(90°) = 0, sin(90°) = 1
    assertAlmostEquals(matrix[0], 0, 0.001); // cos
    assertAlmostEquals(matrix[1], 1, 0.001); // sin
    assertAlmostEquals(matrix[4], -1, 0.001); // -sin
    assertAlmostEquals(matrix[5], 0, 0.001); // cos
  });

  await t.step("orthographic - creates orthographic projection", () => {
    const matrix = Mat4.orthographic(0, 800, 0, 600, -1, 1);

    // Check that matrix maps coordinate ranges correctly
    // Width mapping: 2/(right-left) = 2/800 = 0.0025
    assertAlmostEquals(matrix[0], 2 / 800, 0.001);

    // Height mapping: 2/(top-bottom) = 2/600 = 0.00333...
    assertAlmostEquals(matrix[5], 2 / 600, 0.001);
  });

  await t.step("multiply - multiplies matrices correctly", () => {
    const translation = Mat4.translation(5, 10);
    const scaling = Mat4.scaling(2, 3);

    // Multiply scaling * translation (to preserve translation values)
    const result = Mat4.multiply(scaling, translation);

    // Result should have both translation and scaling
    assertEquals(result[0], 2); // X scale
    assertEquals(result[5], 3); // Y scale
    assertEquals(result[12], 5); // X translation
    assertEquals(result[13], 10); // Y translation
  });
});

Deno.test("MathUtils - Utility functions", async (t) => {
  await t.step("degToRad - converts degrees to radians", () => {
    assertEquals(MathUtils.degToRad(0), 0);
    assertAlmostEquals(MathUtils.degToRad(90), Math.PI / 2, 0.001);
    assertAlmostEquals(MathUtils.degToRad(180), Math.PI, 0.001);
    assertAlmostEquals(MathUtils.degToRad(360), Math.PI * 2, 0.001);
  });

  await t.step("radToDeg - converts radians to degrees", () => {
    assertEquals(MathUtils.radToDeg(0), 0);
    assertAlmostEquals(MathUtils.radToDeg(Math.PI / 2), 90, 0.001);
    assertAlmostEquals(MathUtils.radToDeg(Math.PI), 180, 0.001);
    assertAlmostEquals(MathUtils.radToDeg(Math.PI * 2), 360, 0.001);
  });

  await t.step("clamp - clamps values within range", () => {
    assertEquals(MathUtils.clamp(5, 0, 10), 5);
    assertEquals(MathUtils.clamp(-5, 0, 10), 0);
    assertEquals(MathUtils.clamp(15, 0, 10), 10);
    assertEquals(MathUtils.clamp(7.5, 0, 10), 7.5);
  });

  await t.step("lerp - linear interpolation", () => {
    assertEquals(MathUtils.lerp(0, 10, 0), 0);
    assertEquals(MathUtils.lerp(0, 10, 1), 10);
    assertEquals(MathUtils.lerp(0, 10, 0.5), 5);
    assertEquals(MathUtils.lerp(10, 20, 0.3), 13);
  });

  await t.step("rectanglesIntersect - detects rectangle intersections", () => {
    const rectA = { x: 0, y: 0, width: 10, height: 10 };
    const rectB = { x: 5, y: 5, width: 10, height: 10 };
    const rectC = { x: 20, y: 20, width: 5, height: 5 };

    assertEquals(MathUtils.rectanglesIntersect(rectA, rectB), true);
    assertEquals(MathUtils.rectanglesIntersect(rectA, rectC), false);
    assertEquals(MathUtils.rectanglesIntersect(rectB, rectC), false);
  });

  await t.step("rectanglesIntersect - edge cases", () => {
    const rectA = { x: 0, y: 0, width: 10, height: 10 };
    const rectB = { x: 10, y: 0, width: 10, height: 10 }; // Adjacent
    const rectC = { x: 11, y: 0, width: 10, height: 10 }; // Separated

    assertEquals(MathUtils.rectanglesIntersect(rectA, rectB), false);
    assertEquals(MathUtils.rectanglesIntersect(rectA, rectC), false);
  });

  await t.step("pointInRectangle - detects point inside rectangle", () => {
    const rect = { x: 10, y: 10, width: 20, height: 20 };

    assertEquals(MathUtils.pointInRectangle({ x: 15, y: 15 }, rect), true);
    assertEquals(MathUtils.pointInRectangle({ x: 10, y: 10 }, rect), true); // Corner
    assertEquals(MathUtils.pointInRectangle({ x: 30, y: 30 }, rect), true); // Other corner
    assertEquals(MathUtils.pointInRectangle({ x: 5, y: 15 }, rect), false);
    assertEquals(MathUtils.pointInRectangle({ x: 15, y: 5 }, rect), false);
  });
});
