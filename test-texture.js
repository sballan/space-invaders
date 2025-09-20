/**
 * Test texture binding - attempt 14
 */

import { chromium } from 'npm:playwright@1.40.0';

async function testTexture() {
  let browser;

  try {
    console.log('🚀 Attempt 14: Testing texture binding...');

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto('http://localhost:8001');
    await page.waitForSelector('canvas.game-canvas');
    await page.waitForTimeout(3000);

    await page.click('button:has-text("Start Game")');
    await page.waitForTimeout(2000);

    const textureTest = await page.evaluate(() => {
      const canvas = document.querySelector('canvas.game-canvas');
      const gl = canvas.getContext('webgl2');

      // Check current texture binding
      const currentTexture = gl.getParameter(gl.TEXTURE_BINDING_2D);

      // Get the white texture that should be bound
      // The issue might be that the white texture isn't actually white/visible

      // Try drawing without any texture - just solid colors
      const program = gl.getParameter(gl.CURRENT_PROGRAM);

      // Modify fragment shader behavior by setting uniform
      const textureLoc = gl.getUniformLocation(program, 'u_texture');
      const alphaLoc = gl.getUniformLocation(program, 'u_alpha');

      // Set alpha to maximum
      if (alphaLoc) {
        gl.uniform1f(alphaLoc, 1.0);
      }

      // Try creating and binding a simple red texture
      const testTexture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, testTexture);

      // Create 2x2 red texture
      const redPixels = new Uint8Array([
        255, 0, 0, 255,  // Red pixel
        255, 0, 0, 255,  // Red pixel
        255, 0, 0, 255,  // Red pixel
        255, 0, 0, 255   // Red pixel
      ]);

      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 2, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, redPixels);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

      // Bind to texture unit 0
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, testTexture);

      if (textureLoc) {
        gl.uniform1i(textureLoc, 0);
      }

      // Wait for rendering
      return new Promise(resolve => {
        setTimeout(() => {
          const pixels = new Uint8Array(800 * 600 * 4);
          gl.readPixels(0, 0, 800, 600, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

          let redPixels = 0;
          let coloredPixels = 0;

          for (let i = 0; i < pixels.length; i += 400) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];

            if (r > 0 || g > 0 || b > 0) {
              coloredPixels++;
              if (r > 100) redPixels++;
            }
          }

          resolve({
            textureWasBound: currentTexture ? 'yes' : 'no',
            redTextureSet: 'yes',
            coloredPixelsAfterTextureFix: coloredPixels,
            redPixelsAfterTextureFix: redPixels,
            textureFixWorked: coloredPixels > 10
          });
        }, 1000);
      });
    });

    console.log('🖼️ Texture Test Results:');
    console.log(JSON.stringify(textureTest, null, 2));

    if (textureTest.textureFixWorked) {
      console.log('🎉 SUCCESS! Texture fix worked!');
    }

    await page.screenshot({ path: 'screenshots/texture-test.png' });
    await browser.close();

    return textureTest.textureFixWorked;

  } catch (error) {
    console.log('❌ Texture test failed:', error.message);
    if (browser) {
      try { await browser.close(); } catch (e) {}
    }
    return false;
  }
}

testTexture();