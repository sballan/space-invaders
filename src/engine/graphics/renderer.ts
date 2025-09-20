/**
 * WebGL Sprite Renderer
 * High-performance batch renderer for 2D sprites using WebGL
 * Supports texture atlasing, color tinting, and efficient batching
 */

import { Matrix4, Vec2, Vector2 } from "../../utils/math.ts";
import {
  DefaultShaders,
  ShaderManager,
  ShaderProgram,
} from "./shader-manager.ts";
import { Texture, TextureManager, TextureRegion } from "./texture-manager.ts";

/**
 * Vertex data for a single sprite corner
 */
interface SpriteVertex {
  /** World position */
  x: number;
  y: number;
  /** Texture coordinates */
  u: number;
  v: number;
  /** Color tint (RGBA) */
  r: number;
  g: number;
  b: number;
  a: number;
}

/**
 * Configuration for rendering a sprite
 */
export interface SpriteConfig {
  /** Position in world coordinates */
  position: Vector2;
  /** Size in world units */
  size: Vector2;
  /** Rotation angle in radians */
  rotation?: number;
  /** Color tint (RGBA values 0-1) */
  color?: { r: number; g: number; b: number; a: number };
  /** Texture or texture region to render */
  texture: Texture | TextureRegion;
  /** Anchor point (0,0 = top-left, 0.5,0.5 = center) */
  anchor?: Vector2;
}

/**
 * High-performance WebGL sprite renderer with batching
 */
export class Renderer {
  private gl: WebGL2RenderingContext;
  private shaderManager: ShaderManager;
  private textureManager: TextureManager;

  // Shader program for sprite rendering
  private spriteProgram!: ShaderProgram;

  // Vertex buffer for batching sprites
  private vertexBuffer!: WebGLBuffer;
  private indexBuffer!: WebGLBuffer;
  private vertexArray!: WebGLVertexArrayObject;

  // Batch rendering data
  private vertices: Float32Array;
  private indices: Uint16Array;
  private vertexData: number = 0; // Current vertex count
  private indexData: number = 0; // Current index count

  // Rendering state
  private projectionMatrix: Matrix4;
  private currentTexture: Texture | null = null;
  private renderCalls = 0;
  private spritesRendered = 0;

  // Configuration
  private readonly MAX_SPRITES = 1000;
  private readonly VERTICES_PER_SPRITE = 4;
  private readonly INDICES_PER_SPRITE = 6;
  private readonly FLOATS_PER_VERTEX = 8; // x, y, u, v, r, g, b, a

  constructor(
    gl: WebGL2RenderingContext,
    shaderManager: ShaderManager,
    textureManager: TextureManager,
  ) {
    this.gl = gl;
    this.shaderManager = shaderManager;
    this.textureManager = textureManager;

    // Initialize projection matrix (will be updated on resize)
    this.projectionMatrix = new Float32Array(16);

    // Allocate vertex and index arrays
    this.vertices = new Float32Array(
      this.MAX_SPRITES * this.VERTICES_PER_SPRITE * this.FLOATS_PER_VERTEX,
    );
    this.indices = new Uint16Array(this.MAX_SPRITES * this.INDICES_PER_SPRITE);

    this.initializeRenderer();
  }

  /**
   * Initializes WebGL resources for sprite rendering
   */
  private initializeRenderer(): void {
    this.createShaderProgram();
    this.createBuffers();
    this.generateIndices();
  }

  /**
   * Creates the sprite shader program
   */
  private createShaderProgram(): void {
    try {
      console.log("Creating sprite shader program...");
      this.spriteProgram = this.shaderManager.createProgram("sprite", {
        vertexSource: DefaultShaders.spriteVertex,
        fragmentSource: DefaultShaders.spriteFragment,
        attributes: ["a_position", "a_texCoord", "a_color"],
        uniforms: ["u_projection", "u_model", "u_texture", "u_alpha"],
      });
      console.log("Sprite shader program created successfully");
    } catch (error) {
      console.error("Failed to create sprite shader program:", error);
      throw error;
    }
  }

  /**
   * Creates and configures WebGL buffers
   */
  private createBuffers(): void {
    const gl = this.gl;

    // Create vertex array object
    this.vertexArray = gl.createVertexArray()!;
    gl.bindVertexArray(this.vertexArray);

    // Create vertex buffer
    this.vertexBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertices.byteLength, gl.DYNAMIC_DRAW);

    // Set up vertex attributes
    const stride = this.FLOATS_PER_VERTEX * 4; // 4 bytes per float

    // Position attribute (x, y)
    const positionLocation = this.spriteProgram.attributes.get("a_position")!;
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, stride, 0);

    // Texture coordinate attribute (u, v)
    const texCoordLocation = this.spriteProgram.attributes.get("a_texCoord")!;
    gl.enableVertexAttribArray(texCoordLocation);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, stride, 2 * 4);

    // Color attribute (r, g, b, a)
    const colorLocation = this.spriteProgram.attributes.get("a_color")!;
    gl.enableVertexAttribArray(colorLocation);
    gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, stride, 4 * 4);

    // Create index buffer
    this.indexBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      this.indices.byteLength,
      gl.STATIC_DRAW,
    );

    // Unbind vertex array
    gl.bindVertexArray(null);
  }

  /**
   * Pre-generates indices for sprite quads (two triangles per sprite)
   */
  private generateIndices(): void {
    for (let i = 0; i < this.MAX_SPRITES; i++) {
      const vertexOffset = i * this.VERTICES_PER_SPRITE;
      const indexOffset = i * this.INDICES_PER_SPRITE;

      // First triangle (top-left, bottom-left, top-right)
      this.indices[indexOffset + 0] = vertexOffset + 0;
      this.indices[indexOffset + 1] = vertexOffset + 1;
      this.indices[indexOffset + 2] = vertexOffset + 2;

      // Second triangle (bottom-left, bottom-right, top-right)
      this.indices[indexOffset + 3] = vertexOffset + 1;
      this.indices[indexOffset + 4] = vertexOffset + 3;
      this.indices[indexOffset + 5] = vertexOffset + 2;
    }

    // Upload indices to GPU
    const gl = this.gl;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, this.indices);
  }

  /**
   * Sets the projection matrix for screen-to-world coordinate transformation
   */
  setProjection(matrix: Matrix4): void {
    this.projectionMatrix = matrix;
  }

  /**
   * Begins a new frame of rendering
   */
  begin(): void {
    this.vertexData = 0;
    this.indexData = 0;
    this.renderCalls = 0;
    this.spritesRendered = 0;
    this.currentTexture = null;

    // Use sprite shader program
    this.shaderManager.useProgram("sprite");

    // Set projection matrix
    this.shaderManager.setUniformMatrix4(
      this.spriteProgram,
      "u_projection",
      this.projectionMatrix,
    );

    // Set identity model matrix (sprites handle their own transformations)
    const identityMatrix = new Float32Array([
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
    ]);
    this.shaderManager.setUniformMatrix4(
      this.spriteProgram,
      "u_model",
      identityMatrix,
    );

    // Set global alpha
    this.shaderManager.setUniformFloat(this.spriteProgram, "u_alpha", 1.0);

    // Bind vertex array
    this.gl.bindVertexArray(this.vertexArray);
  }

  /**
   * Renders a sprite with the given configuration
   */
  drawSprite(config: SpriteConfig): void {
    const texture = this.getTextureFromConfig(config);

    // Debug: Log first sprite being rendered (throttled)
    if (this.vertexData === 0 && Math.random() < 0.01) {
      console.log(
        `Drawing sprite at (${config.position.x}, ${config.position.y}) size (${config.size.x}, ${config.size.y})`,
      );
    }

    // Check if we need to flush the batch
    if (this.needsFlush(texture)) {
      this.flush();
    }

    // Set current texture if changed
    if (this.currentTexture !== texture) {
      this.currentTexture = texture;
    }

    // Add sprite vertices to batch
    this.addSpriteVertices(config);
  }

  /**
   * Extracts texture from sprite config (handles both Texture and TextureRegion)
   */
  private getTextureFromConfig(config: SpriteConfig): Texture {
    if ("texture" in config.texture) {
      // It's a TextureRegion
      return (config.texture as TextureRegion).texture;
    } else {
      // It's a Texture
      return config.texture as Texture;
    }
  }

  /**
   * Checks if the batch needs to be flushed
   */
  private needsFlush(texture: Texture): boolean {
    // Flush if texture changed or batch is full
    return (this.currentTexture !== null && this.currentTexture !== texture) ||
      (this.vertexData >= this.MAX_SPRITES * this.VERTICES_PER_SPRITE);
  }

  /**
   * Adds vertex data for a single sprite to the batch
   */
  private addSpriteVertices(config: SpriteConfig): void {
    const {
      position,
      size,
      rotation = 0,
      color = { r: 1, g: 1, b: 1, a: 1 },
      texture,
      anchor = { x: 0, y: 0 },
    } = config;

    // Calculate sprite corners relative to anchor point
    const halfWidth = size.x * 0.5;
    const halfHeight = size.y * 0.5;
    const anchorX = (anchor.x - 0.5) * size.x;
    const anchorY = (anchor.y - 0.5) * size.y;

    // Corner positions relative to sprite center
    const corners = [
      { x: -halfWidth - anchorX, y: -halfHeight - anchorY }, // Top-left
      { x: -halfWidth - anchorX, y: halfHeight - anchorY }, // Bottom-left
      { x: halfWidth - anchorX, y: -halfHeight - anchorY }, // Top-right
      { x: halfWidth - anchorX, y: halfHeight - anchorY }, // Bottom-right
    ];

    // Apply rotation if needed
    if (rotation !== 0) {
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);

      for (const corner of corners) {
        const x = corner.x * cos - corner.y * sin;
        const y = corner.x * sin + corner.y * cos;
        corner.x = x;
        corner.y = y;
      }
    }

    // Get texture coordinates
    let uvs;
    if ("uvs" in texture) {
      // TextureRegion
      const region = texture as TextureRegion;
      uvs = [
        { u: region.uvs.u1, v: region.uvs.v1 }, // Top-left
        { u: region.uvs.u1, v: region.uvs.v2 }, // Bottom-left
        { u: region.uvs.u2, v: region.uvs.v1 }, // Top-right
        { u: region.uvs.u2, v: region.uvs.v2 }, // Bottom-right
      ];
    } else {
      // Full texture
      uvs = [
        { u: 0, v: 0 }, // Top-left
        { u: 0, v: 1 }, // Bottom-left
        { u: 1, v: 0 }, // Top-right
        { u: 1, v: 1 }, // Bottom-right
      ];
    }

    // Add vertices to batch
    const vertexOffset = this.vertexData * this.FLOATS_PER_VERTEX;

    // Debug: Log vertex data for first sprite
    if (this.vertexData === 0) {
      console.log(`Adding sprite vertices:
        Position: (${position.x}, ${position.y})
        Size: (${size.x}, ${size.y})
        Color: (${color.r}, ${color.g}, ${color.b}, ${color.a})
        Corners: ${JSON.stringify(corners)}
        UVs: ${JSON.stringify(uvs)}`);
    }

    for (let i = 0; i < 4; i++) {
      const baseIndex = vertexOffset + i * this.FLOATS_PER_VERTEX;

      // Position (transformed)
      this.vertices[baseIndex + 0] = position.x + corners[i].x;
      this.vertices[baseIndex + 1] = position.y + corners[i].y;

      // Texture coordinates
      this.vertices[baseIndex + 2] = uvs[i].u;
      this.vertices[baseIndex + 3] = uvs[i].v;

      // Color
      this.vertices[baseIndex + 4] = color.r;
      this.vertices[baseIndex + 5] = color.g;
      this.vertices[baseIndex + 6] = color.b;
      this.vertices[baseIndex + 7] = color.a;

      // Debug: Log first vertex data
      if (this.vertexData === 0 && i === 0) {
        console.log(
          `First vertex: pos=(${this.vertices[baseIndex]}, ${
            this.vertices[baseIndex + 1]
          }), uv=(${this.vertices[baseIndex + 2]}, ${
            this.vertices[baseIndex + 3]
          }), color=(${this.vertices[baseIndex + 4]}, ${
            this.vertices[baseIndex + 5]
          }, ${this.vertices[baseIndex + 6]}, ${this.vertices[baseIndex + 7]})`,
        );
      }
    }

    this.vertexData += this.VERTICES_PER_SPRITE;
    this.indexData += this.INDICES_PER_SPRITE;
  }

  /**
   * Flushes the current batch to the GPU
   */
  flush(): void {
    if (this.vertexData === 0) {
      return; // Nothing to render
    }

    const gl = this.gl;

    // Ensure VAO is bound for rendering
    gl.bindVertexArray(this.vertexArray);

    // Upload vertex data
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferSubData(
      gl.ARRAY_BUFFER,
      0,
      this.vertices.subarray(0, this.vertexData * this.FLOATS_PER_VERTEX),
    );

    // Bind texture
    if (this.currentTexture) {
      this.textureManager.bindTexture(this.currentTexture, 0);
      this.shaderManager.setUniformInt(this.spriteProgram, "u_texture", 0);
    }

    // Draw the batch
    try {
      gl.drawElements(gl.TRIANGLES, this.indexData, gl.UNSIGNED_SHORT, 0);

      // Check for WebGL errors
      const error = gl.getError();
      if (error !== gl.NO_ERROR) {
        console.error("WebGL error during drawElements:", error);
      }
    } catch (error) {
      console.error("Error during rendering:", error);
    }

    // Update statistics
    this.renderCalls++;
    this.spritesRendered += this.vertexData / this.VERTICES_PER_SPRITE;

    // Reset batch
    this.vertexData = 0;
    this.indexData = 0;
  }

  /**
   * Ends the current frame and flushes any remaining sprites
   */
  end(): void {
    this.flush();
    this.gl.bindVertexArray(null);
  }

  /**
   * Gets rendering statistics for the current frame
   */
  getStats(): { renderCalls: number; spritesRendered: number } {
    return {
      renderCalls: this.renderCalls,
      spritesRendered: this.spritesRendered,
    };
  }

  /**
   * Cleans up WebGL resources
   */
  cleanup(): void {
    const gl = this.gl;

    if (this.vertexBuffer) {
      gl.deleteBuffer(this.vertexBuffer);
    }
    if (this.indexBuffer) {
      gl.deleteBuffer(this.indexBuffer);
    }
    if (this.vertexArray) {
      gl.deleteVertexArray(this.vertexArray);
    }
  }
}
