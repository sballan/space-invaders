/**
 * Test uniform values - attempt 10
 */

import { chromium } from 'npm:playwright@1.40.0';

async function testUniforms() {
  let browser;

  try {
    console.log('🚀 Attempt 10: Testing uniform values...');

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto('http://localhost:8001');
    await page.waitForSelector('canvas.game-canvas');
    await page.waitForTimeout(3000);

    await page.click('button:has-text("Start Game")');
    await page.waitForTimeout(2000);

    const vertexTest = await page.evaluate(() => {
      const canvas = document.querySelector('canvas.game-canvas');
      const gl = canvas.getContext('webgl2');

      const program = gl.getParameter(gl.CURRENT_PROGRAM);
      if (!program) return { error: 'No program' };

      // Get uniform values
      const projectionLoc = gl.getUniformLocation(program, 'u_projection');
      const modelLoc = gl.getUniformLocation(program, 'u_model');
      const alphaLoc = gl.getUniformLocation(program, 'u_alpha');

      // We can't easily read matrix uniforms, but we can check if they exist
      const uniformsExist = {
        projection: projectionLoc !== null,
        model: modelLoc !== null,
        alpha: alphaLoc !== null
      };

      // Try a simple test: clear to blue and see if it works
      gl.clearColor(0, 0, 1, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      const testPixels = new Uint8Array(100 * 100 * 4);
      gl.readPixels(0, 0, 100, 100, gl.RGBA, gl.UNSIGNED_BYTE, testPixels);

      let bluePixels = 0;
      for (let i = 0; i < testPixels.length; i += 4) {
        if (testPixels[i + 2] > 100) bluePixels++;
      }

      // Now try to manually draw with our shader program
      const vertices = new Float32Array([
        // Position, UV, Color (RGBA)
        100, 100,  0, 0,  1, 0, 0, 1, // Red vertex
        200, 100,  1, 0,  1, 0, 0, 1,
        100, 200,  0, 1,  1, 0, 0, 1,
        200, 200,  1, 1,  1, 0, 0, 1
      ]);

      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);

      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

      // Set up attributes
      const posLoc = gl.getAttribLocation(program, 'a_position');
      const uvLoc = gl.getAttribLocation(program, 'a_texCoord');
      const colorLoc = gl.getAttribLocation(program, 'a_color');

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

      // Set projection matrix to identity (no transformation)
      if (projectionLoc) {
        const identity = new Float32Array([
          2/800, 0, 0, 0,
          0, -2/600, 0, 0,
          0, 0, 1, 0,
          -1, 1, 0, 1
        ]);
        gl.uniformMatrix4fv(projectionLoc, false, identity);
      }

      // Set model matrix to identity
      if (modelLoc) {
        const identity = new Float32Array([
          1, 0, 0, 0,
          0, 1, 0, 0,
          0, 0, 1, 0,
          0, 0, 0, 1
        ]);
        gl.uniformMatrix4fv(modelLoc, false, identity);
      }

      // Set alpha to 1
      if (alphaLoc) {
        gl.uniform1f(alphaLoc, 1.0);
      }

      // Draw
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      // Check for errors
      const drawError = gl.getError();

      // Read pixels after manual draw
      const afterDraw = new Uint8Array(300 * 300 * 4);
      gl.readPixels(50, 50, 300, 300, gl.RGBA, gl.UNSIGNED_BYTE, afterDraw);

      let redPixelsAfterDraw = 0;
      for (let i = 0; i < afterDraw.length; i += 4) {
        if (afterDraw[i] > 100) redPixelsAfterDraw++;
      }

      return {
        uniformsExist,
        attributes: { posLoc, uvLoc, colorLoc },
        blueClearWorked: bluePixels > 5000,
        drawError,
        redPixelsAfterManualDraw: redPixelsAfterDraw,
        manualDrawWorked: redPixelsAfterDraw > 100
      };
    });

    console.log('🎯 Vertex Data Test Results:');
    console.log(JSON.stringify(vertexTest, null, 2));

    if (vertexTest.manualDrawWorked) {
      console.log('🎉 SUCCESS! Manual draw with game shaders worked!');
    } else {
      console.log('❌ Manual draw failed - deeper issue in shaders');
    }

    await page.screenshot({ path: 'screenshots/vertex-data-test.png' });
    console.log('📸 Vertex data test screenshot saved');

    await browser.close();

  } catch (error) {
    console.log('❌ Vertex data test failed:', error.message);
    if (browser) {
      try { await browser.close(); } catch (e) {}
    }
  }
}

testUniforms();