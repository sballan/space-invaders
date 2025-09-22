/**
 * Graphics Engine
 * Main graphics system that coordinates WebGL context, shaders, textures, and rendering
 * Provides a high-level interface for 2D game rendering
 */

import { Mat4, Vector2 } from "../../utils/math.ts";
import { WebGLContext, WebGLContextOptions } from "./webgl-context.ts";
import { ShaderManager } from "./shader-manager.ts";
import { TextureManager } from "./texture-manager.ts";
import { Renderer, SpriteConfig } from "./renderer.ts";

/**
 * Camera configuration for 2D rendering
 */
export interface Camera2D {
  /** Camera position in world coordinates */
  position: Vector2;
  /** Camera zoom level (1.0 = normal, 2.0 = 2x zoom) */
  zoom: number;
  /** Camera rotation in radians */
  rotation: number;
}

/**
 * Main graphics engine that manages all rendering subsystems
 */
export class GraphicsEngine {
  private webglContext: WebGLContext;
  private shaderManager: ShaderManager;
  private textureManager: TextureManager;
  private renderer: Renderer;

  private canvas: HTMLCanvasElement;
  private camera: Camera2D;
  private viewportWidth = 0;
  private viewportHeight = 0;
  private projectionLogged = false;

  constructor(canvas: HTMLCanvasElement, options: WebGLContextOptions = {}) {
    this.canvas = canvas;

    // Initialize camera with default values
    this.camera = {
      position: { x: 0, y: 0 },
      zoom: 1.0,
      rotation: 0,
    };

    // Initialize WebGL context
    console.log("Initializing WebGL context...");
    this.webglContext = new WebGLContext(canvas, options);
    const gl = this.webglContext.getContext();
    console.log("WebGL context created:", gl);
    console.log("WebGL info:", this.webglContext.getInfo());

    // Initialize subsystems
    console.log("Creating shader manager...");
    this.shaderManager = new ShaderManager(gl);
    console.log("Creating texture manager...");
    this.textureManager = new TextureManager(gl);
    console.log("Creating renderer...");
    this.renderer = new Renderer(gl, this.shaderManager, this.textureManager);
    console.log("Graphics subsystems initialized");

    // Set initial viewport size
    this.resize();

    // Create default white texture for solid color rendering
    this.textureManager.createWhiteTexture();
  }

  /**
   * Gets the WebGL rendering context
   */
  getContext(): WebGL2RenderingContext {
    return this.webglContext.getContext();
  }

  /**
   * Gets the shader manager
   */
  getShaderManager(): ShaderManager {
    return this.shaderManager;
  }

  /**
   * Gets the texture manager
   */
  getTextureManager(): TextureManager {
    return this.textureManager;
  }

  /**
   * Gets the sprite renderer
   */
  getRenderer(): Renderer {
    return this.renderer;
  }

  /**
   * Sets the camera position
   */
  setCameraPosition(x: number, y: number): void {
    this.camera.position.x = x;
    this.camera.position.y = y;
    this.updateProjectionMatrix();
  }

  /**
   * Sets the camera zoom level
   */
  setCameraZoom(zoom: number): void {
    this.camera.zoom = Math.max(0.1, zoom); // Prevent negative or zero zoom
    this.updateProjectionMatrix();
  }

  /**
   * Sets the camera rotation
   */
  setCameraRotation(rotation: number): void {
    this.camera.rotation = rotation;
    this.updateProjectionMatrix();
  }

  /**
   * Gets the current camera configuration
   */
  getCamera(): Camera2D {
    return { ...this.camera };
  }

  /**
   * Converts screen coordinates to world coordinates
   */
  screenToWorld(screenX: number, screenY: number): Vector2 {
    // Normalize screen coordinates to [-1, 1] range
    const normalizedX = (screenX / this.viewportWidth) * 2 - 1;
    const normalizedY = 1 - (screenY / this.viewportHeight) * 2; // Flip Y axis

    // Apply inverse camera transformations
    const worldX = (normalizedX / this.camera.zoom) + this.camera.position.x;
    const worldY = (normalizedY / this.camera.zoom) + this.camera.position.y;

    return { x: worldX, y: worldY };
  }

  /**
   * Converts world coordinates to screen coordinates
   */
  worldToScreen(worldX: number, worldY: number): Vector2 {
    // Apply camera transformations
    const viewX = (worldX - this.camera.position.x) * this.camera.zoom;
    const viewY = (worldY - this.camera.position.y) * this.camera.zoom;

    // Convert to screen coordinates
    const screenX = (viewX + 1) * this.viewportWidth * 0.5;
    const screenY = (1 - viewY) * this.viewportHeight * 0.5;

    return { x: screenX, y: screenY };
  }

  /**
   * Resizes the viewport to match canvas size
   */
  resize(): void {
    this.webglContext.resize();

    const canvas = this.webglContext.getCanvas();
    this.viewportWidth = canvas.width;
    this.viewportHeight = canvas.height;

    this.updateProjectionMatrix();
  }

  /**
   * Updates the projection matrix based on camera and viewport
   */
  private updateProjectionMatrix(): void {
    // Calculate world space dimensions based on viewport and zoom
    const _halfWidth = (this.viewportWidth * 0.5) / this.camera.zoom;
    const _halfHeight = (this.viewportHeight * 0.5) / this.camera.zoom;

    // Create orthographic projection matrix that transforms screen coordinates to clip space
    // Screen coordinates: (0,0) top-left to (width,height) bottom-right
    // Clip space: (-1,-1) bottom-left to (1,1) top-right
    const left = 0;
    const right = this.viewportWidth;
    const bottom = this.viewportHeight; // Bottom of screen
    const top = 0; // Top of screen

    // Only log projection bounds once
    if (!this.projectionLogged) {
      console.log(
        `Projection bounds: left=${left}, right=${right}, top=${top}, bottom=${bottom}`,
      );
      this.projectionLogged = true;
    }

    const projection = Mat4.orthographic(left, right, bottom, top, -1, 1);

    // Apply camera rotation if needed
    if (this.camera.rotation !== 0) {
      const rotation = Mat4.rotation(this.camera.rotation);
      const rotatedProjection = Mat4.multiply(projection, rotation);
      this.renderer.setProjection(rotatedProjection);
    } else {
      this.renderer.setProjection(projection);
    }
  }

  /**
   * Begins a new frame of rendering
   */
  beginFrame(): void {
    // Clear the screen
    this.webglContext.clear(0, 0, 0, 1);

    // Begin sprite rendering
    this.renderer.begin();
  }

  /**
   * Renders a sprite at the specified position
   */
  drawSprite(config: SpriteConfig): void {
    this.renderer.drawSprite(config);
  }

  /**
   * Ends the current frame
   */
  endFrame(): void {
    this.renderer.end();
  }

  /**
   * Loads a texture from an image file
   */
  async loadTexture(name: string, url: string): Promise<void> {
    await this.textureManager.loadTexture(name, url);
  }

  /**
   * Creates a texture region (sprite) from an existing texture
   */
  createTextureRegion(
    name: string,
    textureName: string,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    this.textureManager.createRegion(name, textureName, x, y, width, height);
  }

  /**
   * Creates a grid of texture regions from a sprite sheet
   */
  createSpriteSheet(
    textureName: string,
    spriteWidth: number,
    spriteHeight: number,
    margin: number = 0,
    spacing: number = 0,
  ): Map<string, import("./texture-manager.ts").TextureRegion> {
    return this.textureManager.createGridRegions(
      textureName,
      spriteWidth,
      spriteHeight,
      margin,
      spacing,
    );
  }

  /**
   * Gets rendering statistics for the current frame
   */
  getStats(): { renderCalls: number; spritesRendered: number } {
    return this.renderer.getStats();
  }

  /**
   * Gets information about the WebGL implementation
   */
  getInfo(): Record<string, string> {
    return this.webglContext.getInfo();
  }

  /**
   * Gets texture memory usage information
   */
  getTextureMemoryUsage(): { textureCount: number; memoryBytes: number } {
    const textureInfo = this.textureManager.getTextureInfo();
    const memoryBytes = this.textureManager.getMemoryUsage();

    return {
      textureCount: textureInfo.length,
      memoryBytes,
    };
  }

  /**
   * Checks for WebGL errors and throws if any are found
   */
  checkError(operation?: string): void {
    this.webglContext.checkError(operation);
  }

  /**
   * Destroys the graphics engine and frees all resources
   */
  destroy(): void {
    this.renderer.cleanup();
    this.textureManager.cleanup();
    this.shaderManager.cleanup();
    this.webglContext.destroy();
  }
}
