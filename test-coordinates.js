/**
 * Test coordinate system - attempt 11
 */

import { chromium } from 'npm:playwright@1.40.0';

async function testCoordinates() {
  let browser;

  try {
    console.log('🚀 Attempt 11: Testing coordinate system...');

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto('http://localhost:8001');
    await page.waitForSelector('canvas.game-canvas');
    await page.waitForTimeout(3000);

    const coordinateTest = await page.evaluate(() => {
      const canvas = document.querySelector('canvas.game-canvas');
      const gl = canvas.getContext('webgl2');

      // Test with simple shader that doesn't use projection matrix
      const simpleVertexShader = `#version 300 es
        in vec2 a_position;
        void main() {
          // Convert screen coordinates to clip space manually
          float x = (a_position.x / 400.0) - 1.0;
          float y = 1.0 - (a_position.y / 300.0);
          gl_Position = vec4(x, y, 0.0, 1.0);
        }
      `;

      const simpleFragmentShader = `#version 300 es
        precision highp float;
        out vec4 fragColor;
        void main() {
          fragColor = vec4(1.0, 0.0, 0.0, 1.0); // Red
        }
      `;

      // Compile shaders
      const vs = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vs, simpleVertexShader);
      gl.compileShader(vs);

      const fs = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fs, simpleFragmentShader);
      gl.compileShader(fs);

      // Check compilation
      const vsCompiled = gl.getShaderParameter(vs, gl.COMPILE_STATUS);
      const fsCompiled = gl.getShaderParameter(fs, gl.COMPILE_STATUS);

      if (!vsCompiled) {
        return { error: 'Vertex shader failed: ' + gl.getShaderInfoLog(vs) };
      }
      if (!fsCompiled) {
        return { error: 'Fragment shader failed: ' + gl.getShaderInfoLog(fs) };
      }

      // Create program
      const program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);

      const linked = gl.getProgramParameter(program, gl.LINK_STATUS);
      if (!linked) {
        return { error: 'Program link failed: ' + gl.getProgramInfoLog(program) };
      }

      gl.useProgram(program);

      // Create vertices in screen coordinates
      const vertices = new Float32Array([
        200, 200,  // Top-left
        600, 200,  // Top-right
        200, 400,  // Bottom-left
        600, 400   // Bottom-right
      ]);

      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

      const posLoc = gl.getAttribLocation(program, 'a_position');
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

      // Clear and draw
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      // Check result
      const pixels = new Uint8Array(800 * 600 * 4);
      gl.readPixels(0, 0, 800, 600, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      let redPixels = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i] > 100) redPixels++;
      }

      return {
        shaderCompiled: { vs: vsCompiled, fs: fsCompiled },
        programLinked: linked,
        positionAttribute: posLoc,
        redPixelsDrawn: redPixels,
        simpleDrawWorked: redPixels > 1000
      };
    });

    console.log('📐 Coordinate Test Results:');
    console.log(JSON.stringify(coordinateTest, null, 2));

    if (coordinateTest.simpleDrawWorked) {
      console.log('🎉 SUCCESS! Simple coordinate drawing worked!');
      console.log('The issue is likely in the complex projection matrix or game shader uniforms');
    } else {
      console.log('❌ Even simple drawing failed');
    }

    await page.screenshot({ path: 'screenshots/coordinate-test.png' });
    await browser.close();

  } catch (error) {
    console.log('❌ Coordinate test failed:', error.message);
    if (browser) {
      try { await browser.close(); } catch (e) {}
    }
  }
}

testCoordinates();