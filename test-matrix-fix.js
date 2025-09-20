/**
 * Test different projection matrix approaches - attempt 13
 */

import { chromium } from 'npm:playwright@1.40.0';

async function testMatrixFix() {
  let browser;

  try {
    console.log('🚀 Attempt 13: Testing projection matrix fixes...');

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto('http://localhost:8001');
    await page.waitForSelector('canvas.game-canvas');
    await page.waitForTimeout(3000);

    await page.click('button:has-text("Start Game")');
    await page.waitForTimeout(2000);

    const matrixTest = await page.evaluate(() => {
      const canvas = document.querySelector('canvas.game-canvas');
      const gl = canvas.getContext('webgl2');

      // Test 1: Use the working coordinate transformation from our test
      const program = gl.getParameter(gl.CURRENT_PROGRAM);

      // Set a simple projection matrix that converts screen coords directly
      const projectionLoc = gl.getUniformLocation(program, 'u_projection');
      const modelLoc = gl.getUniformLocation(program, 'u_model');

      if (projectionLoc && modelLoc) {
        // Create projection matrix that converts (0,0)-(800,600) to (-1,-1)-(1,1)
        // x: 0-800 -> -1 to 1  =>  x' = (x / 400) - 1
        // y: 0-600 -> 1 to -1  =>  y' = 1 - (y / 300)  (flip Y)
        const projection = new Float32Array([
          2/800,    0,     0,   0,  // Scale X: 2/width
          0,     -2/600,   0,   0,  // Scale Y: -2/height (negative to flip)
          0,        0,     1,   0,  // Z unchanged
          -1,       1,     0,   1   // Translate: (-1, 1)
        ]);

        gl.uniformMatrix4fv(projectionLoc, false, projection);

        // Set model matrix to identity
        const identity = new Float32Array([
          1, 0, 0, 0,
          0, 1, 0, 0,
          0, 0, 1, 0,
          0, 0, 0, 1
        ]);
        gl.uniformMatrix4fv(modelLoc, false, identity);

        console.log('Set corrected projection matrix');
      }

      // Force a frame render by waiting
      return new Promise(resolve => {
        setTimeout(() => {
          // Read pixels after matrix fix
          const pixels = new Uint8Array(800 * 600 * 4);
          gl.readPixels(0, 0, 800, 600, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

          let coloredPixels = 0;
          let greenPixels = 0;

          // Sample every 100th pixel
          for (let i = 0; i < pixels.length; i += 400) {
            if (pixels[i] > 0 || pixels[i + 1] > 0 || pixels[i + 2] > 0) {
              coloredPixels++;
              if (pixels[i + 1] > 100) greenPixels++;
            }
          }

          resolve({
            projectionMatrixSet: projectionLoc !== null,
            modelMatrixSet: modelLoc !== null,
            coloredPixelsAfterFix: coloredPixels,
            greenPixelsAfterFix: greenPixels,
            matrixFixWorked: coloredPixels > 10
          });
        }, 1000);
      });
    });

    console.log('🎯 Matrix Fix Results:');
    console.log(JSON.stringify(matrixTest, null, 2));

    if (matrixTest.matrixFixWorked) {
      console.log('🎉 SUCCESS! Projection matrix fix worked!');
    } else {
      console.log('❌ Matrix fix didn\'t work, trying another approach...');
    }

    await page.screenshot({ path: 'screenshots/matrix-fix-test.png' });
    await browser.close();

    return matrixTest.matrixFixWorked;

  } catch (error) {
    console.log('❌ Matrix test failed:', error.message);
    if (browser) {
      try { await browser.close(); } catch (e) {}
    }
    return false;
  }
}

testMatrixFix().then(success => {
  if (success) {
    console.log('✨ FOUND THE FIX! Now implementing in the game engine...');
  } else {
    console.log('🔄 Trying next approach...');
  }
});