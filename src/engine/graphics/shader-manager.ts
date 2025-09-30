/**
 * Shader Management System
 * Handles compilation, linking, and caching of WebGL shaders and programs
 * Provides a safe abstraction for shader operations with error handling
 */

import { Matrix4 } from "../../utils/math.ts";

/**
 * Represents a compiled WebGL shader program with its attributes and uniforms
 */
export interface ShaderProgram {
  /** The WebGL program object */
  program: WebGLProgram;
  /** Map of attribute names to their locations */
  attributes: Map<string, number>;
  /** Map of uniform names to their locations */
  uniforms: Map<string, WebGLUniformLocation>;
}

/**
 * Configuration for creating a shader program
 */
export interface ShaderConfig {
  /** Vertex shader source code */
  vertexSource: string;
  /** Fragment shader source code */
  fragmentSource: string;
  /** List of attribute names to bind */
  attributes: string[];
  /** List of uniform names to cache locations for */
  uniforms: string[];
}

/**
 * Manages shader compilation, program linking, and uniform/attribute handling
 */
export class ShaderManager {
  private gl: WebGL2RenderingContext;
  private programs: Map<string, ShaderProgram> = new Map();
  private currentProgram: WebGLProgram | null = null;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
  }

  /**
   * Creates and compiles a shader program from vertex and fragment shader sources
   */
  createProgram(name: string, config: ShaderConfig): ShaderProgram {
    // Check if program already exists
    if (this.programs.has(name)) {
      throw new Error(`Shader program '${name}' already exists`);
    }

    const gl = this.gl;

    // Compile vertex shader
    const vertexShader = this.compileShader(
      gl.VERTEX_SHADER,
      config.vertexSource,
    );

    // Compile fragment shader
    const fragmentShader = this.compileShader(
      gl.FRAGMENT_SHADER,
      config.fragmentSource,
    );

    // Create and link program
    const program = gl.createProgram();
    if (!program) {
      throw new Error("Failed to create WebGL program");
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    // Check for linking errors
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const error = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      throw new Error(`Failed to link shader program '${name}': ${error}`);
    }

    // Clean up individual shaders (they're now part of the program)
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    // Cache attribute locations
    const attributes = new Map<string, number>();
    for (const attributeName of config.attributes) {
      const location = gl.getAttribLocation(program, attributeName);
      if (location === -1) {
        console.warn(
          `Attribute '${attributeName}' not found in shader '${name}'`,
        );
      } else {
        attributes.set(attributeName, location);
      }
    }

    // Cache uniform locations
    const uniforms = new Map<string, WebGLUniformLocation>();
    for (const uniformName of config.uniforms) {
      const location = gl.getUniformLocation(program, uniformName);
      if (!location) {
        console.warn(`Uniform '${uniformName}' not found in shader '${name}'`);
      } else {
        uniforms.set(uniformName, location);
      }
    }

    const shaderProgram: ShaderProgram = {
      program,
      attributes,
      uniforms,
    };

    // Cache the program
    this.programs.set(name, shaderProgram);

    return shaderProgram;
  }

  /**
   * Compiles a single shader (vertex or fragment)
   */
  private compileShader(type: number, source: string): WebGLShader {
    const gl = this.gl;

    const shader = gl.createShader(type);
    if (!shader) {
      throw new Error("Failed to create shader");
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    // Check for compilation errors
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      const shaderType = type === gl.VERTEX_SHADER ? "vertex" : "fragment";
      throw new Error(
        `Failed to compile ${shaderType} shader: ${error}\n\nSource:\n${source}`,
      );
    }

    return shader;
  }

  /**
   * Gets a previously created shader program by name
   */
  getProgram(name: string): ShaderProgram {
    const program = this.programs.get(name);
    if (!program) {
      throw new Error(`Shader program '${name}' not found`);
    }
    return program;
  }

  /**
   * Activates a shader program for rendering
   */
  useProgram(name: string): ShaderProgram {
    const shaderProgram = this.getProgram(name);

    // Only switch if it's different from current program
    if (this.currentProgram !== shaderProgram.program) {
      this.gl.useProgram(shaderProgram.program);
      this.currentProgram = shaderProgram.program;
    }

    return shaderProgram;
  }

  /**
   * Sets a uniform matrix4 value
   */
  setUniformMatrix4(
    program: ShaderProgram,
    name: string,
    matrix: Matrix4,
  ): void {
    const location = program.uniforms.get(name);
    if (location) {
      this.gl.uniformMatrix4fv(location, false, matrix);
    }
  }

  /**
   * Sets a uniform vec2 value
   */
  setUniformVec2(
    program: ShaderProgram,
    name: string,
    x: number,
    y: number,
  ): void {
    const location = program.uniforms.get(name);
    if (location) {
      this.gl.uniform2f(location, x, y);
    }
  }

  /**
   * Sets a uniform vec3 value
   */
  setUniformVec3(
    program: ShaderProgram,
    name: string,
    x: number,
    y: number,
    z: number,
  ): void {
    const location = program.uniforms.get(name);
    if (location) {
      this.gl.uniform3f(location, x, y, z);
    }
  }

  /**
   * Sets a uniform vec4 value
   */
  setUniformVec4(
    program: ShaderProgram,
    name: string,
    x: number,
    y: number,
    z: number,
    w: number,
  ): void {
    const location = program.uniforms.get(name);
    if (location) {
      this.gl.uniform4f(location, x, y, z, w);
    }
  }

  /**
   * Sets a uniform float value
   */
  setUniformFloat(program: ShaderProgram, name: string, value: number): void {
    const location = program.uniforms.get(name);
    if (location) {
      this.gl.uniform1f(location, value);
    }
  }

  /**
   * Sets a uniform integer value
   */
  setUniformInt(program: ShaderProgram, name: string, value: number): void {
    const location = program.uniforms.get(name);
    if (location) {
      this.gl.uniform1i(location, value);
    }
  }

  /**
   * Gets an attribute location from a program
   */
  getAttributeLocation(program: ShaderProgram, name: string): number {
    const location = program.attributes.get(name);
    if (location === undefined) {
      throw new Error(`Attribute '${name}' not found in shader program`);
    }
    return location;
  }

  /**
   * Deletes a shader program and frees its resources
   */
  deleteProgram(name: string): void {
    const shaderProgram = this.programs.get(name);
    if (shaderProgram) {
      this.gl.deleteProgram(shaderProgram.program);
      this.programs.delete(name);

      // Clear current program if it was the deleted one
      if (this.currentProgram === shaderProgram.program) {
        this.currentProgram = null;
      }
    }
  }

  /**
   * Deletes all shader programs and frees resources
   */
  cleanup(): void {
    for (const [name] of this.programs) {
      this.deleteProgram(name);
    }
    this.currentProgram = null;
  }

  /**
   * Lists all available shader program names
   */
  getAvailablePrograms(): string[] {
    return Array.from(this.programs.keys());
  }
}

/**
 * Common shader sources for 2D sprite rendering
 */
export const DefaultShaders = {
  /**
   * Basic sprite vertex shader
   * Transforms vertices from screen coordinates to clip space
   */
  spriteVertex: `#version 300 es
    precision highp float;

    // Input vertex attributes
    in vec2 a_position;    // Vertex position in screen coordinates (0-800, 0-600)
    in vec2 a_texCoord;    // Texture coordinates (0-1 range)
    in vec4 a_color;       // Vertex color (for tinting)

    // Uniforms (keeping for compatibility but not using matrices)
    uniform mat4 u_projection; // Not used - we do direct conversion
    uniform mat4 u_model;      // Not used - we do direct conversion

    // Output to fragment shader
    out vec2 v_texCoord;   // Interpolated texture coordinates
    out vec4 v_color;      // Interpolated vertex color

    void main() {
      // Convert screen coordinates to clip space directly
      // x: 0-800 -> -1 to 1
      // y: 0-600 -> 1 to -1 (flip Y for WebGL bottom-left origin)
      float x = (a_position.x / 400.0) - 1.0;
      float y = 1.0 - (a_position.y / 300.0);

      gl_Position = vec4(x, y, 0.0, 1.0);

      // Pass texture coordinates and color to fragment shader
      v_texCoord = a_texCoord;
      v_color = a_color;
    }
  `,

  /**
   * Alien sprite fragment shader
   * Procedurally generates alien-like shapes using UV coordinates
   */
  spriteFragment: `#version 300 es
    precision highp float;

    // Input from vertex shader
    in vec2 v_texCoord;    // Interpolated texture coordinates
    in vec4 v_color;       // Interpolated vertex color

    // Uniforms
    uniform sampler2D u_texture; // The sprite texture
    uniform float u_alpha;       // Global alpha multiplier

    // Output color
    out vec4 fragColor;

    void main() {
      vec2 uv = v_texCoord;

      // Create alien body shape using distance fields
      vec2 center = vec2(0.5, 0.5);
      float dist = distance(uv, center);

      // Main body - oval shape
      vec2 bodyUV = (uv - center) * vec2(1.2, 1.8);
      float body = 1.0 - smoothstep(0.35, 0.4, length(bodyUV));

      // Head - larger oval at top
      vec2 headCenter = vec2(0.5, 0.25);
      vec2 headUV = (uv - headCenter) * vec2(1.5, 2.0);
      float head = 1.0 - smoothstep(0.3, 0.35, length(headUV));

      // Eyes - two bright spots
      vec2 eyeLeft = vec2(0.35, 0.2);
      vec2 eyeRight = vec2(0.65, 0.2);
      float leftEye = 1.0 - smoothstep(0.05, 0.08, distance(uv, eyeLeft));
      float rightEye = 1.0 - smoothstep(0.05, 0.08, distance(uv, eyeRight));
      float eyes = leftEye + rightEye;

      // Tentacles/legs at bottom
      float tentacle1 = 1.0 - smoothstep(0.02, 0.04, abs(uv.x - 0.3)) * (1.0 - smoothstep(0.7, 1.0, uv.y));
      float tentacle2 = 1.0 - smoothstep(0.02, 0.04, abs(uv.x - 0.5)) * (1.0 - smoothstep(0.65, 1.0, uv.y));
      float tentacle3 = 1.0 - smoothstep(0.02, 0.04, abs(uv.x - 0.7)) * (1.0 - smoothstep(0.7, 1.0, uv.y));
      float tentacles = tentacle1 + tentacle2 + tentacle3;

      // Combine all parts
      float alien = max(max(body, head), max(eyes, tentacles));

      // Create base alien color
      vec3 alienColor = v_color.rgb;

      // Make eyes brighter
      if (eyes > 0.5) {
        alienColor = mix(alienColor, vec3(1.0, 1.0, 0.8), 0.8);
      }

      // Add some texture/details
      float detail = sin(uv.x * 20.0) * sin(uv.y * 15.0) * 0.1;
      alienColor += detail * alienColor;

      // Final color with alpha based on alien shape
      fragColor = vec4(alienColor, alien * u_alpha);

      // Discard transparent pixels
      if (alien < 0.1) {
        discard;
      }
    }
  `,
};
