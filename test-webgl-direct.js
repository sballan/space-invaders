/**
 * Direct WebGL test - attempt 4
 */

import { chromium } from 'npm:playwright@1.40.0';

async function testWebGLDirect() {
  let browser;

  try {
    console.log('🚀 Attempt 4: Direct WebGL test...');

    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-webgl']
    });

    const page = await browser.newPage();

    await page.goto('http://localhost:8001');
    await page.waitForSelector('canvas.game-canvas');
    await page.waitForTimeout(3000);

    // Click start game
    await page.click('button:has-text("Start Game")');
    await page.waitForTimeout(3000);

    // Force a manual WebGL draw to test if WebGL works in Playwright
    const webglTest = await page.evaluate(() => {
      const canvas = document.querySelector('canvas.game-canvas');
      const gl = canvas.getContext('webgl2');

      if (!canvas || !gl) {
        return { error: 'WebGL not available' };
      }

      // Draw a simple green rectangle manually
      const vertexShader = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vertexShader, `#version 300 es
        in vec2 a_position;
        void main() {
          gl_Position = vec4(a_position, 0.0, 1.0);
        }
      `);
      gl.compileShader(vertexShader);

      const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fragmentShader, `#version 300 es
        precision highp float;
        out vec4 fragColor;
        void main() {
          fragColor = vec4(0.0, 1.0, 0.0, 1.0);
        }
      `);
      gl.compileShader(fragmentShader);

      const program = gl.createProgram();
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        return { error: 'Shader program failed' };
      }

      const positionLocation = gl.getAttribLocation(program, 'a_position');

      // Create a large rectangle
      const vertices = new Float32Array([
        -0.5, -0.5,
         0.5, -0.5,
        -0.5,  0.5,
         0.5,  0.5
      ]);

      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

      gl.useProgram(program);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

      // Clear and draw
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      // Read back pixels
      const pixels = new Uint8Array(800 * 600 * 4);
      gl.readPixels(0, 0, 800, 600, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      let greenPixelsFound = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i + 1] > 100) { // Green channel
          greenPixelsFound++;
        }
      }

      return {
        manualWebGLTest: true,
        greenPixelsFound,
        webglWorking: greenPixelsFound > 1000
      };
    });

    console.log('🧪 WebGL Direct Test:', webglTest);

    // Take screenshot of manual test
    await page.screenshot({ path: 'screenshots/webgl-manual-test.png' });
    console.log('📸 Manual WebGL test screenshot saved');

    await browser.close();

  } catch (error) {
    console.log('❌ WebGL direct test failed:', error.message);
    if (browser) {
      try { await browser.close(); } catch (e) {}
    }
  }
}

testWebGLDirect();