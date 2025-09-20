/**
 * Texture Management System
 * Handles loading, caching, and management of WebGL textures
 * Supports various texture formats and provides efficient texture atlasing
 */

/**
 * Texture configuration options
 */
export interface TextureOptions {
  /** Texture filtering mode for minification */
  minFilter?: number;
  /** Texture filtering mode for magnification */
  magFilter?: number;
  /** Horizontal wrap mode */
  wrapS?: number;
  /** Vertical wrap mode */
  wrapT?: number;
  /** Generate mipmaps automatically */
  generateMipmaps?: boolean;
  /** Flip Y axis (useful for image loading) */
  flipY?: boolean;
  /** Premultiply alpha channel */
  premultiplyAlpha?: boolean;
}

/**
 * Represents a loaded texture with metadata
 */
export interface Texture {
  /** The WebGL texture object */
  texture: WebGLTexture;
  /** Original image width in pixels */
  width: number;
  /** Original image height in pixels */
  height: number;
  /** Texture options used for creation */
  options: Required<TextureOptions>;
}

/**
 * Represents a sub-region of a texture (for sprite atlasing)
 */
export interface TextureRegion {
  /** Reference to the parent texture */
  texture: Texture;
  /** X coordinate of the region (in pixels) */
  x: number;
  /** Y coordinate of the region (in pixels) */
  y: number;
  /** Width of the region (in pixels) */
  width: number;
  /** Height of the region (in pixels) */
  height: number;
  /** Normalized texture coordinates for WebGL (0-1 range) */
  uvs: {
    u1: number; // Left
    v1: number; // Top
    u2: number; // Right
    v2: number; // Bottom
  };
}

/**
 * Manages texture loading, caching, and WebGL texture operations
 */
export class TextureManager {
  private gl: WebGL2RenderingContext;
  private textures: Map<string, Texture> = new Map();
  private regions: Map<string, TextureRegion> = new Map();
  private activeTextureUnit = 0;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
  }

  /**
   * Creates a 1x1 white texture for use as a fallback or solid color rendering
   */
  createWhiteTexture(): Texture {
    const gl = this.gl;

    // Create a 1x1 white pixel
    const whitePixel = new Uint8Array([255, 255, 255, 255]);

    const texture = gl.createTexture();
    if (!texture) {
      throw new Error("Failed to create white texture");
    }

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0, // Mip level
      gl.RGBA, // Internal format
      1, // Width
      1, // Height
      0, // Border (must be 0)
      gl.RGBA, // Format
      gl.UNSIGNED_BYTE, // Type
      whitePixel, // Data
    );

    // Set texture parameters for pixel art (no filtering)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const textureObj: Texture = {
      texture,
      width: 1,
      height: 1,
      options: {
        minFilter: gl.NEAREST,
        magFilter: gl.NEAREST,
        wrapS: gl.CLAMP_TO_EDGE,
        wrapT: gl.CLAMP_TO_EDGE,
        generateMipmaps: false,
        flipY: false,
        premultiplyAlpha: false,
      },
    };

    // Cache the white texture
    this.textures.set("__white", textureObj);
    console.log("White texture created successfully");
    return textureObj;
  }

  /**
   * Loads a texture from an image URL
   */
  async loadTexture(
    name: string,
    url: string,
    options: TextureOptions = {},
  ): Promise<Texture> {
    // Check if texture is already loaded
    if (this.textures.has(name)) {
      return this.textures.get(name)!;
    }

    const gl = this.gl;

    // Set default texture options optimized for pixel art games
    const defaultOptions: Required<TextureOptions> = {
      minFilter: gl.NEAREST, // Sharp pixel art scaling
      magFilter: gl.NEAREST, // Sharp pixel art scaling
      wrapS: gl.CLAMP_TO_EDGE, // Don't repeat textures
      wrapT: gl.CLAMP_TO_EDGE, // Don't repeat textures
      generateMipmaps: false, // Not needed for 2D pixel art
      flipY: true, // Flip Y to match image coordinate system
      premultiplyAlpha: false, // Keep alpha separate for blending
      ...options,
    };

    // Load the image
    const image = await this.loadImage(url);

    // Create WebGL texture
    const texture = gl.createTexture();
    if (!texture) {
      throw new Error(`Failed to create texture for '${name}'`);
    }

    // Bind and configure texture
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Set pixel store parameters
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, defaultOptions.flipY);
    gl.pixelStorei(
      gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,
      defaultOptions.premultiplyAlpha,
    );

    // Upload image data to GPU
    gl.texImage2D(
      gl.TEXTURE_2D,
      0, // Mip level
      gl.RGBA, // Internal format
      gl.RGBA, // Format
      gl.UNSIGNED_BYTE, // Type
      image, // Image data
    );

    // Set texture parameters
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      defaultOptions.minFilter,
    );
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MAG_FILTER,
      defaultOptions.magFilter,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, defaultOptions.wrapS);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, defaultOptions.wrapT);

    // Generate mipmaps if requested
    if (defaultOptions.generateMipmaps) {
      gl.generateMipmap(gl.TEXTURE_2D);
    }

    const textureObj: Texture = {
      texture,
      width: image.width,
      height: image.height,
      options: defaultOptions,
    };

    // Cache the texture
    this.textures.set(name, textureObj);

    return textureObj;
  }

  /**
   * Loads an image from a URL using Promise-based approach
   */
  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();

      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Failed to load image: ${url}`));

      // Set crossOrigin for loading images from different domains
      image.crossOrigin = "anonymous";
      image.src = url;
    });
  }

  /**
   * Creates a texture region (sprite) from an existing texture
   */
  createRegion(
    name: string,
    textureName: string,
    x: number,
    y: number,
    width: number,
    height: number,
  ): TextureRegion {
    const texture = this.getTexture(textureName);

    // Calculate normalized UV coordinates
    const u1 = x / texture.width;
    const v1 = y / texture.height;
    const u2 = (x + width) / texture.width;
    const v2 = (y + height) / texture.height;

    const region: TextureRegion = {
      texture,
      x,
      y,
      width,
      height,
      uvs: { u1, v1, u2, v2 },
    };

    // Cache the region
    this.regions.set(name, region);

    return region;
  }

  /**
   * Creates multiple texture regions from a sprite sheet with uniform grid
   */
  createGridRegions(
    baseTextureName: string,
    spriteWidth: number,
    spriteHeight: number,
    margin: number = 0,
    spacing: number = 0,
  ): Map<string, TextureRegion> {
    const texture = this.getTexture(baseTextureName);
    const regions = new Map<string, TextureRegion>();

    // Calculate how many sprites fit in each dimension
    const cols = Math.floor(
      (texture.width - margin * 2 + spacing) / (spriteWidth + spacing),
    );
    const rows = Math.floor(
      (texture.height - margin * 2 + spacing) / (spriteHeight + spacing),
    );

    // Create regions for each sprite in the grid
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = margin + col * (spriteWidth + spacing);
        const y = margin + row * (spriteHeight + spacing);

        const regionName = `${baseTextureName}_${row}_${col}`;
        const region = this.createRegion(
          regionName,
          baseTextureName,
          x,
          y,
          spriteWidth,
          spriteHeight,
        );
        regions.set(regionName, region);
      }
    }

    return regions;
  }

  /**
   * Gets a previously loaded texture by name
   */
  getTexture(name: string): Texture {
    const texture = this.textures.get(name);
    if (!texture) {
      throw new Error(`Texture '${name}' not found`);
    }
    return texture;
  }

  /**
   * Gets a previously created texture region by name
   */
  getRegion(name: string): TextureRegion {
    const region = this.regions.get(name);
    if (!region) {
      throw new Error(`Texture region '${name}' not found`);
    }
    return region;
  }

  /**
   * Binds a texture to a specific texture unit
   */
  bindTexture(texture: Texture, unit: number = 0): void {
    const gl = this.gl;

    // Activate the texture unit
    gl.activeTexture(gl.TEXTURE0 + unit);
    this.activeTextureUnit = unit;

    // Bind the texture
    gl.bindTexture(gl.TEXTURE_2D, texture.texture);
  }

  /**
   * Gets the currently active texture unit
   */
  getActiveTextureUnit(): number {
    return this.activeTextureUnit;
  }

  /**
   * Deletes a texture and frees its GPU memory
   */
  deleteTexture(name: string): void {
    const texture = this.textures.get(name);
    if (texture) {
      this.gl.deleteTexture(texture.texture);
      this.textures.delete(name);

      // Remove any regions that reference this texture
      for (const [regionName, region] of this.regions) {
        if (region.texture === texture) {
          this.regions.delete(regionName);
        }
      }
    }
  }

  /**
   * Deletes all textures and regions, freeing GPU memory
   */
  cleanup(): void {
    // Delete all textures
    for (const [name] of this.textures) {
      this.deleteTexture(name);
    }

    // Clear all regions
    this.regions.clear();
  }

  /**
   * Gets information about loaded textures
   */
  getTextureInfo(): { name: string; width: number; height: number }[] {
    return Array.from(this.textures.entries()).map(([name, texture]) => ({
      name,
      width: texture.width,
      height: texture.height,
    }));
  }

  /**
   * Gets the total GPU memory usage estimate (in bytes)
   */
  getMemoryUsage(): number {
    let totalBytes = 0;

    for (const texture of this.textures.values()) {
      // Estimate 4 bytes per pixel (RGBA)
      totalBytes += texture.width * texture.height * 4;
    }

    return totalBytes;
  }

  /**
   * Checks if a texture exists
   */
  hasTexture(name: string): boolean {
    return this.textures.has(name);
  }

  /**
   * Checks if a texture region exists
   */
  hasRegion(name: string): boolean {
    return this.regions.has(name);
  }
}
