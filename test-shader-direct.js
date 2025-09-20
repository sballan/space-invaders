/**
 * Test our game shaders directly - attempt 15
 */

import { chromium } from "npm:playwright@1.40.0";

async function testShaderDirect() {
  let browser;

  try {
    console.log("🚀 Attempt 15: Testing game shaders directly...");

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto("http://localhost:8001");
    await page.waitForSelector("canvas.game-canvas");
    await page.waitForTimeout(3000);

    const shaderDirectTest = await page.evaluate(() => {
      const canvas = document.querySelector("canvas.game-canvas");
      const gl = canvas.getContext("webgl2");

      // Use the exact same shaders as our game engine
      const vertexShaderSource = `#version 300 es
        precision highp float;

        // Input vertex attributes
        in vec2 a_position;    // Vertex position in world coordinates
        in vec2 a_texCoord;    // Texture coordinates (0-1 range)
        in vec4 a_color;       // Vertex color (for tinting)

        // Uniforms (constant for all vertices in a draw call)
        uniform mat4 u_projection; // Projection matrix (world to clip space)
        uniform mat4 u_model;      // Model matrix (object to world space)

        // Output to fragment shader
        out vec2 v_texCoord;   // Interpolated texture coordinates
        out vec4 v_color;      // Interpolated vertex color

        void main() {
          // Transform vertex position to clip space
          gl_Position = u_projection * u_model * vec4(a_position, 0.0, 1.0);

          // Pass texture coordinates and color to fragment shader
          v_texCoord = a_texCoord;
          v_color = a_color;
        }
      `;

      const fragmentShaderSource = `#version 300 es
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
          // Sample the texture at the interpolated coordinates
          vec4 texColor = texture(u_texture, v_texCoord);

          // Apply vertex color tinting and global alpha
          fragColor = texColor * v_color * vec4(1.0, 1.0, 1.0, u_alpha);

          // Discard fully transparent pixels (optional optimization)
          if (fragColor.a < 0.01) {
            discard;
          }
        }
      `;

      // Compile shaders
      const vs = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vs, vertexShaderSource);
      gl.compileShader(vs);

      const fs = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fs, fragmentShaderSource);
      gl.compileShader(fs);

      // Check compilation
      const vsOk = gl.getShaderParameter(vs, gl.COMPILE_STATUS);
      const fsOk = gl.getShaderParameter(fs, gl.COMPILE_STATUS);

      if (!vsOk) {
        return { error: "VS compile error: " + gl.getShaderInfoLog(vs) };
      }
      if (!fsOk) {
        return { error: "FS compile error: " + gl.getShaderInfoLog(fs) };
      }

      // Create program
      const program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);

      const linked = gl.getProgramParameter(program, gl.LINK_STATUS);
      if (!linked) {
        return { error: "Link error: " + gl.getProgramInfoLog(program) };
      }

      gl.useProgram(program);

      // Create simple white texture
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      const whitePixel = new Uint8Array([255, 255, 255, 255]);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        1,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        whitePixel,
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

      // Set up uniforms
      const projLoc = gl.getUniformLocation(program, "u_projection");
      const modelLoc = gl.getUniformLocation(program, "u_model");
      const texLoc = gl.getUniformLocation(program, "u_texture");
      const alphaLoc = gl.getUniformLocation(program, "u_alpha");

      // Set projection matrix (screen coords to clip space)
      if (projLoc) {
        const projection = new Float32Array([
          2 / 800,
          0,
          0,
          0,
          0,
          -2 / 600,
          0,
          0,
          0,
          0,
          1,
          0,
          -1,
          1,
          0,
          1,
        ]);
        gl.uniformMatrix4fv(projLoc, false, projection);
      }

      // Set identity model matrix
      if (modelLoc) {
        const identity = new Float32Array([
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
        gl.uniformMatrix4fv(modelLoc, false, identity);
      }

      // Set texture and alpha
      if (texLoc) gl.uniform1i(texLoc, 0);
      if (alphaLoc) gl.uniform1f(alphaLoc, 1.0);

      // Create vertex data for a large green rectangle
      const vertices = new Float32Array([
        // pos_x, pos_y, tex_u, tex_v, color_r, color_g, color_b, color_a
        300,
        200,
        0,
        0,
        0,
        1,
        0,
        1, // Top-left (green)
        500,
        200,
        1,
        0,
        0,
        1,
        0,
        1, // Top-right (green)
        300,
        400,
        0,
        1,
        0,
        1,
        0,
        1, // Bottom-left (green)
        500,
        400,
        1,
        1,
        0,
        1,
        0,
        1, // Bottom-right (green)
      ]);

      // Set up VAO
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);

      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

      // Set up attributes
      const posLoc = gl.getAttribLocation(program, "a_position");
      const uvLoc = gl.getAttribLocation(program, "a_texCoord");
      const colorLoc = gl.getAttribLocation(program, "a_color");

      if (posLoc >= 0) {
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 8 * 4, 0);
      }

      if (uvLoc >= 0) {
        gl.enableVertexAttribArray(uvLoc);
        gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 8 * 4, 2 * 4);
      }

      if (colorLoc >= 0) {
        gl.enableVertexAttribArray(colorLoc);
        gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 8 * 4, 4 * 4);
      }

      // Create indices for triangle strip
      const indices = new Uint16Array([0, 1, 2, 1, 3, 2]);
      const indexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

      // Clear and draw
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      // Enable blending
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

      const drawError = gl.getError();

      // Read results
      const pixels = new Uint8Array(800 * 600 * 4);
      gl.readPixels(0, 0, 800, 600, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      let greenPixels = 0;
      let anyColoredPixels = 0;

      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i] > 0 || pixels[i + 1] > 0 || pixels[i + 2] > 0) {
          anyColoredPixels++;
          if (pixels[i + 1] > 100) greenPixels++;
        }
      }

      return {
        currentTextureWasBound: currentTexture ? "yes" : "no",
        attributes: { posLoc, uvLoc, colorLoc },
        drawError,
        greenPixelsWithGameShader: greenPixels,
        anyColoredPixelsWithGameShader: anyColoredPixels,
        gameShaderWorked: anyColoredPixels > 100,
      };
    });

    console.log("🎨 Direct Shader Test Results:");
    console.log(JSON.stringify(textureTest, null, 2));

    if (textureTest.gameShaderWorked) {
      console.log("🎉 SUCCESS! Game shaders work when used directly!");
    } else {
      console.log("❌ Even direct shader test failed");
    }

    await page.screenshot({ path: "screenshots/shader-direct-test.png" });
    await browser.close();

    return textureTest.gameShaderWorked;
  } catch (error) {
    console.log("❌ Direct shader test failed:", error.message);
    if (browser) {
      try {
        await browser.close();
      } catch (e) {}
    }
    return false;
  }
}

testShaderDirect();
