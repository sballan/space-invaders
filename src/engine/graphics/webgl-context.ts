/**
 * WebGL Context Management
 * Handles WebGL context creation, configuration, and extension loading
 * Provides a safe abstraction over raw WebGL operations
 */

/**
 * WebGL context configuration options
 */
export interface WebGLContextOptions {
  /** Enable alpha channel in the framebuffer */
  alpha?: boolean;
  /** Enable depth buffer for 3D rendering */
  depth?: boolean;
  /** Enable stencil buffer for advanced rendering techniques */
  stencil?: boolean;
  /** Enable antialiasing for smoother edges */
  antialias?: boolean;
  /** Optimize for power efficiency vs performance */
  powerPreference?: "default" | "high-performance" | "low-power";
  /** Preserve drawing buffer contents between frames */
  preserveDrawingBuffer?: boolean;
}

/**
 * Manages WebGL rendering context and provides utility methods
 */
export class WebGLContext {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private extensions: Map<string, unknown> = new Map();

  constructor(canvas: HTMLCanvasElement, options: WebGLContextOptions = {}) {
    this.canvas = canvas;

    // Default WebGL context options optimized for 2D games
    const defaultOptions: WebGLContextOptions = {
      alpha: false, // Opaque background for better performance
      depth: false, // No depth testing needed for 2D
      stencil: false, // No stencil operations needed
      antialias: true, // Smooth sprite edges
      powerPreference: "high-performance", // Prefer performance for games
      preserveDrawingBuffer: false, // Don't preserve for better performance
      ...options,
    };

    // Attempt to get WebGL2 context first, fallback to WebGL1 if needed
    const gl = canvas.getContext(
      "webgl2",
      defaultOptions,
    ) as WebGL2RenderingContext;

    if (!gl) {
      throw new Error(
        "WebGL2 is not supported in this browser. Please use a modern browser.",
      );
    }

    this.gl = gl;
    this.loadCommonExtensions();
    this.configureInitialState();
  }

  /**
   * Gets the WebGL rendering context
   */
  getContext(): WebGL2RenderingContext {
    return this.gl;
  }

  /**
   * Gets the canvas element
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * Loads commonly used WebGL extensions
   */
  private loadCommonExtensions(): void {
    const extensionNames = [
      "EXT_texture_filter_anisotropic", // Better texture filtering
      "WEBGL_lose_context", // Context loss debugging
      "OES_texture_float", // Float textures for advanced effects
    ];

    // Load each extension and store it if available
    for (const name of extensionNames) {
      try {
        const extension = this.gl.getExtension(name);
        if (extension) {
          this.extensions.set(name, extension);
        }
      } catch (error) {
        console.warn(`Failed to load WebGL extension: ${name}`, error);
      }
    }
  }

  /**
   * Gets a loaded extension by name
   */
  getExtension<T>(name: string): T | null {
    return (this.extensions.get(name) as T) || null;
  }

  /**
   * Configures initial WebGL state for 2D rendering
   */
  private configureInitialState(): void {
    const gl = this.gl;

    // Enable blending for transparency support
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Set clear color to black
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // Disable depth testing for 2D rendering
    gl.disable(gl.DEPTH_TEST);

    // Disable face culling (we want to see both sides of sprites)
    gl.disable(gl.CULL_FACE);
  }

  /**
   * Resizes the WebGL viewport to match canvas size
   * Should be called whenever the canvas size changes
   */
  resize(): void {
    const canvas = this.canvas;
    const gl = this.gl;

    // Get the display size of the canvas
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    // Check if the canvas size needs to be updated
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      // Update canvas resolution to match display size
      canvas.width = displayWidth;
      canvas.height = displayHeight;

      // Update WebGL viewport
      gl.viewport(0, 0, displayWidth, displayHeight);
    }
  }

  /**
   * Clears the screen with the specified color
   */
  clear(r: number = 0, g: number = 0, b: number = 0, a: number = 1): void {
    const gl = this.gl;
    gl.clearColor(r, g, b, a);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  /**
   * Checks for WebGL errors and throws if any are found
   * Useful for debugging WebGL operations
   */
  checkError(operation: string = ""): void {
    const gl = this.gl;
    const error = gl.getError();

    if (error !== gl.NO_ERROR) {
      let errorMessage = `WebGL Error: ${error}`;
      if (operation) {
        errorMessage += ` during ${operation}`;
      }

      // Convert error codes to readable messages
      switch (error) {
        case gl.INVALID_ENUM:
          errorMessage += " (INVALID_ENUM)";
          break;
        case gl.INVALID_VALUE:
          errorMessage += " (INVALID_VALUE)";
          break;
        case gl.INVALID_OPERATION:
          errorMessage += " (INVALID_OPERATION)";
          break;
        case gl.OUT_OF_MEMORY:
          errorMessage += " (OUT_OF_MEMORY)";
          break;
        case gl.CONTEXT_LOST_WEBGL:
          errorMessage += " (CONTEXT_LOST_WEBGL)";
          break;
      }

      throw new Error(errorMessage);
    }
  }

  /**
   * Safely destroys the WebGL context
   * Call this when the game is being shut down
   */
  destroy(): void {
    // Force context loss to free GPU resources
    const loseContextExt = this.getExtension<WEBGL_lose_context>(
      "WEBGL_lose_context",
    );
    if (loseContextExt) {
      loseContextExt.loseContext();
    }

    // Clear extension references
    this.extensions.clear();
  }

  /**
   * Gets information about the WebGL implementation
   * Useful for debugging and feature detection
   */
  getInfo(): Record<string, string> {
    const gl = this.gl;

    return {
      vendor: gl.getParameter(gl.VENDOR) || "Unknown",
      renderer: gl.getParameter(gl.RENDERER) || "Unknown",
      version: gl.getParameter(gl.VERSION) || "Unknown",
      shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION) ||
        "Unknown",
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE)?.toString() ||
        "Unknown",
      maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS)?.toString() ||
        "Unknown",
    };
  }
}
