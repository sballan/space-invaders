/**
 * Bypass game engine entirely - attempt 21
 */

import { chromium } from 'npm:playwright@1.40.0';

async function testBypassEngine() {
  let browser;

  try {
    console.log('🚀 Attempt 21: Bypassing game engine, testing raw WebGL...');

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto('http://localhost:8000');
    await page.waitForSelector('canvas.game-canvas');
    await page.waitForTimeout(2000);

    // Inject our own WebGL code directly into the canvas
    const result = await page.evaluate(() => {
      const canvas = document.querySelector('canvas.game-canvas');

      // Get a fresh WebGL context (this might clear the existing one)
      const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: false });

      // Create ultra-simple shaders
      const vertexShaderSource = `#version 300 es
        in vec2 position;
        in vec3 color;
        out vec3 vColor;

        void main() {
          // Direct screen to clip conversion
          float x = (position.x / 400.0) - 1.0;
          float y = 1.0 - (position.y / 300.0);
          gl_Position = vec4(x, y, 0.0, 1.0);
          vColor = color;
        }
      `;

      const fragmentShaderSource = `#version 300 es
        precision mediump float;
        in vec3 vColor;
        out vec4 fragColor;

        void main() {
          fragColor = vec4(vColor, 1.0);
        }
      `;

      // Compile shaders
      function createShader(type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          console.error('Shader error:', gl.getShaderInfoLog(shader));
          return null;
        }
        return shader;
      }

      const vs = createShader(gl.VERTEX_SHADER, vertexShaderSource);
      const fs = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

      if (!vs || !fs) {
        return { error: 'Shader compilation failed' };
      }

      // Create program
      const program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        return { error: 'Program link failed: ' + gl.getProgramInfoLog(program) };
      }

      gl.useProgram(program);

      // Create vertex data for multiple sprites
      const vertices = new Float32Array([
        // Player (green square at 400, 500)
        375, 475,  0, 1, 0,  // Top-left
        425, 475,  0, 1, 0,  // Top-right
        375, 525,  0, 1, 0,  // Bottom-left
        425, 525,  0, 1, 0,  // Bottom-right

        // Invader 1 (red square at 75, 100)
        50, 75,   1, 0, 0,   // Top-left
        100, 75,  1, 0, 0,   // Top-right
        50, 125,  1, 0, 0,   // Bottom-left
        100, 125, 1, 0, 0,   // Bottom-right

        // Invader 2 (blue square at 200, 100)
        175, 75,  0, 0, 1,   // Top-left
        225, 75,  0, 0, 1,   // Top-right
        175, 125, 0, 0, 1,   // Bottom-left
        225, 125, 0, 0, 1    // Bottom-right
      ]);

      const indices = new Uint16Array([
        // Player
        0, 1, 2, 1, 3, 2,
        // Invader 1
        4, 5, 6, 5, 7, 6,
        // Invader 2
        8, 9, 10, 9, 11, 10
      ]);

      // Set up buffers
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);

      const vertexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

      const indexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

      // Set up attributes
      const posLoc = gl.getAttribLocation(program, 'position');
      const colorLoc = gl.getAttribLocation(program, 'color');

      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 5 * 4, 0);

      gl.enableVertexAttribArray(colorLoc);
      gl.vertexAttribPointer(colorLoc, 3, gl.FLOAT, false, 5 * 4, 2 * 4);

      // Clear and draw
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);

      const drawError = gl.getError();

      // Read results
      const testPixels = new Uint8Array(800 * 600 * 4);
      gl.readPixels(0, 0, 800, 600, gl.RGBA, gl.UNSIGNED_BYTE, testPixels);

      let totalColored = 0;
      let redPixels = 0;
      let greenPixels = 0;
      let bluePixels = 0;

      for (let i = 0; i < testPixels.length; i += 4) {
        if (testPixels[i] > 0 || testPixels[i + 1] > 0 || testPixels[i + 2] > 0) {
          totalColored++;
          if (testPixels[i] > 100) redPixels++;
          if (testPixels[i + 1] > 100) greenPixels++;
          if (testPixels[i + 2] > 100) bluePixels++;
        }
      }

      return {
        shaderSetupSuccess: true,
        drawError,
        totalColoredPixels: totalColored,
        redPixels,
        greenPixels,
        bluePixels,
        bypassWorked: totalColored > 1000
      };
    });

    console.log('🎯 BYPASS ENGINE RESULTS:');
    console.log(JSON.stringify(result, null, 2));

    if (result.bypassWorked) {
      console.log('🎉 SUCCESS! Raw WebGL bypass worked!');
      console.log('🟢 Green pixels (player):', result.greenPixels);
      console.log('🔴 Red pixels (invaders):', result.redPixels);
      console.log('🔵 Blue pixels (invaders):', result.bluePixels);
    } else {
      console.log('❌ Even bypassing the engine failed');
    }

    await page.screenshot({ path: 'screenshots/bypass-engine.png' });
    await browser.close();

    return result.bypassWorked;

  } catch (error) {
    console.log('❌ Bypass test failed:', error.message);
    if (browser) {
      try { await browser.close(); } catch (e) {}
    }
    return false;
  }
}

testBypassEngine();