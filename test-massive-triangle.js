/**
 * Test massive triangle - attempt 24
 */

import { chromium } from 'npm:playwright@1.40.0';

async function testMassiveTriangle() {
  let browser;

  try {
    console.log('🚀 Attempt 24: Testing with massive triangle...');

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto('http://localhost:8000');
    await page.waitForSelector('canvas.game-canvas');
    await page.waitForTimeout(3000);

    // Don't start the game - just inject our own rendering
    const result = await page.evaluate(() => {
      const canvas = document.querySelector('canvas.game-canvas');
      const gl = canvas.getContext('webgl2');

      // Create the simplest possible working shader
      const vs = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vs, `#version 300 es
        in vec2 pos;
        void main() {
          gl_Position = vec4(pos, 0.0, 1.0);
        }
      `);
      gl.compileShader(vs);

      const fs = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fs, `#version 300 es
        precision mediump float;
        out vec4 color;
        void main() {
          color = vec4(0.0, 1.0, 0.0, 1.0); // Green
        }
      `);
      gl.compileShader(fs);

      const program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);

      const vsOk = gl.getShaderParameter(vs, gl.COMPILE_STATUS);
      const fsOk = gl.getShaderParameter(fs, gl.COMPILE_STATUS);
      const linked = gl.getProgramParameter(program, gl.LINK_STATUS);

      if (!vsOk || !fsOk || !linked) {
        return {
          error: 'Shader compilation failed',
          vsOk, fsOk, linked,
          vsError: gl.getShaderInfoLog(vs),
          fsError: gl.getShaderInfoLog(fs),
          linkError: gl.getProgramInfoLog(program)
        };
      }

      gl.useProgram(program);

      // Create a massive triangle that covers the entire screen
      const vertices = new Float32Array([
        -1.0, -1.0,  // Bottom-left
         3.0, -1.0,  // Bottom-right (way off screen)
        -1.0,  3.0   // Top-left (way off screen)
      ]);

      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

      const posLoc = gl.getAttribLocation(program, 'pos');
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

      // Clear and draw
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      const drawError = gl.getError();

      // Read results
      const pixels = new Uint8Array(800 * 600 * 4);
      gl.readPixels(0, 0, 800, 600, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      let greenPixels = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i + 1] > 100) greenPixels++;
      }

      return {
        shaderCompilation: { vsOk, fsOk, linked },
        positionAttribute: posLoc,
        drawError,
        greenPixelsFound: greenPixels,
        massiveTriangleWorked: greenPixels > 100000
      };
    });

    console.log('🔺 MASSIVE TRIANGLE RESULTS:');
    console.log(JSON.stringify(result, null, 2));

    if (result.massiveTriangleWorked) {
      console.log('🎉 MASSIVE TRIANGLE SUCCESS!');
      console.log(`🟢 Found ${result.greenPixelsFound} green pixels!`);
      console.log('✅ WebGL rendering definitely works in this browser!');
    } else {
      console.log('❌ Even massive triangle failed');
      console.log('🤔 This suggests a deeper WebGL issue');
    }

    await page.screenshot({ path: 'screenshots/massive-triangle.png' });
    await browser.close();

    return result.massiveTriangleWorked;

  } catch (error) {
    console.log('❌ Massive triangle test failed:', error.message);
    if (browser) {
      try { await browser.close(); } catch (e) {}
    }
    return false;
  }
}

testMassiveTriangle();