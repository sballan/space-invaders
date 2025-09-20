/**
 * Test with simplified shader - attempt 17
 */

import { chromium } from "npm:playwright@1.40.0";

async function testSimpleShader() {
  let browser;

  try {
    console.log("🚀 Attempt 17: Testing with simplified coordinate shader...");

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto("http://localhost:8001");
    await page.waitForSelector("canvas.game-canvas");
    await page.waitForTimeout(3000);

    // Inject a fix directly into the page
    await page.evaluate(() => {
      // Override the default shaders with simpler ones
      window.SIMPLE_VERTEX_SHADER = `#version 300 es
        precision highp float;
        in vec2 a_position;
        in vec2 a_texCoord;
        in vec4 a_color;

        out vec2 v_texCoord;
        out vec4 v_color;

        void main() {
          // Convert screen coordinates to clip space directly
          // x: 0-800 -> -1 to 1
          // y: 0-600 -> 1 to -1 (flip Y for WebGL)
          float x = (a_position.x / 400.0) - 1.0;
          float y = 1.0 - (a_position.y / 300.0);

          gl_Position = vec4(x, y, 0.0, 1.0);
          v_texCoord = a_texCoord;
          v_color = a_color;
        }
      `;

      window.SIMPLE_FRAGMENT_SHADER = `#version 300 es
        precision highp float;
        in vec2 v_texCoord;
        in vec4 v_color;

        uniform sampler2D u_texture;
        uniform float u_alpha;

        out vec4 fragColor;

        void main() {
          vec4 texColor = texture(u_texture, v_texCoord);
          fragColor = texColor * v_color * vec4(1.0, 1.0, 1.0, u_alpha);

          // Make sure we output visible colors for debugging
          if (fragColor.a > 0.5) {
            fragColor.rgb = v_color.rgb; // Use vertex color directly
          }
        }
      `;

      console.log("Simple shaders injected");
    });

    await page.click('button:has-text("Start Game")');
    await page.waitForTimeout(3000);

    // Now test with the simple shader approach
    const simpleTest = await page.evaluate(() => {
      const canvas = document.querySelector("canvas.game-canvas");
      const gl = canvas.getContext("webgl2");

      // Try to manually draw a test sprite using the simple shader
      const vs = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vs, window.SIMPLE_VERTEX_SHADER);
      gl.compileShader(vs);

      const fs = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fs, window.SIMPLE_FRAGMENT_SHADER);
      gl.compileShader(fs);

      const program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);

      const linked = gl.getProgramParameter(program, gl.LINK_STATUS);
      const vsCompiled = gl.getShaderParameter(vs, gl.COMPILE_STATUS);
      const fsCompiled = gl.getShaderParameter(fs, gl.COMPILE_STATUS);

      if (!linked || !vsCompiled || !fsCompiled) {
        return {
          error: "Shader compilation failed",
          vsCompiled,
          fsCompiled,
          linked,
          vsError: gl.getShaderInfoLog(vs),
          fsError: gl.getShaderInfoLog(fs),
          linkError: gl.getProgramInfoLog(program),
        };
      }

      gl.useProgram(program);

      // Create white texture
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      const white = new Uint8Array([255, 255, 255, 255]);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        1,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        white,
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

      // Set uniforms
      const texLoc = gl.getUniformLocation(program, "u_texture");
      const alphaLoc = gl.getUniformLocation(program, "u_alpha");

      if (texLoc) gl.uniform1i(texLoc, 0);
      if (alphaLoc) gl.uniform1f(alphaLoc, 1.0);

      // Create vertex data for a large green square at player position
      const vertices = new Float32Array([
        // pos_x, pos_y, tex_u, tex_v, r, g, b, a
        350,
        450,
        0,
        0,
        0,
        1,
        0,
        1, // Top-left (player area)
        450,
        450,
        1,
        0,
        0,
        1,
        0,
        1, // Top-right
        350,
        550,
        0,
        1,
        0,
        1,
        0,
        1, // Bottom-left
        450,
        550,
        1,
        1,
        0,
        1,
        0,
        1, // Bottom-right
      ]);

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

      // Clear and draw
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      const drawError = gl.getError();

      // Read results
      const pixels = new Uint8Array(800 * 600 * 4);
      gl.readPixels(0, 0, 800, 600, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      let greenPixels = 0;
      let totalColored = 0;

      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i] > 0 || pixels[i + 1] > 0 || pixels[i + 2] > 0) {
          totalColored++;
          if (pixels[i + 1] > 100) greenPixels++;
        }
      }

      return {
        shaderCompilation: { vsCompiled, fsCompiled, linked },
        attributes: { posLoc, uvLoc, colorLoc },
        drawError,
        greenPixelsFound: greenPixels,
        totalColoredPixels: totalColored,
        simpleShaderWorked: totalColored > 1000,
      };
    });

    console.log("🎮 Simple Shader Test Results:");
    console.log(JSON.stringify(testResult, null, 2));

    if (testResult.simpleShaderWorked) {
      console.log("🎉 SUCCESS! Simple shader approach worked!");
    }

    await page.screenshot({ path: "screenshots/simple-shader-test.png" });
    await browser.close();

    return testResult.simpleShaderWorked;
  } catch (error) {
    console.log("❌ Simple shader test failed:", error.message);
    if (browser) {
      try {
        await browser.close();
      } catch (e) {}
    }
    return false;
  }
}

testSimpleShader().then((success) => {
  if (success) {
    console.log("Found a working approach! Now implementing it...");
  } else {
    console.log("Continuing to debug...");
  }
});
