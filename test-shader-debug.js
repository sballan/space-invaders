/**
 * Shader debugging test - attempt 8
 */

import { chromium } from 'npm:playwright@1.40.0';

async function testShaders() {
  let browser;

  try {
    console.log('🚀 Attempt 8: Testing shader compilation and uniforms...');

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto('http://localhost:8001');
    await page.waitForSelector('canvas.game-canvas');
    await page.waitForTimeout(3000);

    await page.click('button:has-text("Start Game")');
    await page.waitForTimeout(2000);

    const shaderTest = await page.evaluate(() => {
      const canvas = document.querySelector('canvas.game-canvas');
      const gl = canvas.getContext('webgl2');

      // Get current program
      const program = gl.getParameter(gl.CURRENT_PROGRAM);
      if (!program) {
        return { error: 'No shader program bound' };
      }

      // Check shader compilation status
      const shaders = gl.getAttachedShaders(program);
      let shaderInfo = [];

      for (const shader of shaders) {
        const compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
        const type = gl.getShaderParameter(shader, gl.SHADER_TYPE);
        shaderInfo.push({
          type: type === gl.VERTEX_SHADER ? 'vertex' : 'fragment',
          compiled
        });
      }

      // Check program link status
      const linked = gl.getProgramParameter(program, gl.LINK_STATUS);

      // Check uniform locations
      const uniforms = ['u_projection', 'u_model', 'u_texture', 'u_alpha'];
      let uniformInfo = {};

      for (const uniformName of uniforms) {
        const location = gl.getUniformLocation(program, uniformName);
        uniformInfo[uniformName] = location ? 'found' : 'missing';
      }

      // Check attribute locations
      const attributes = ['a_position', 'a_texCoord', 'a_color'];
      let attributeInfo = {};

      for (const attrName of attributes) {
        const location = gl.getAttribLocation(program, attrName);
        attributeInfo[attrName] = location >= 0 ? `location_${location}` : 'missing';
      }

      // Try to manually set a clear color and draw
      gl.clearColor(1, 0, 0, 1); // Red
      gl.clear(gl.COLOR_BUFFER_BIT);

      // Read pixels after manual clear
      const pixels = new Uint8Array(100 * 100 * 4); // Small sample
      gl.readPixels(0, 0, 100, 100, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      let redPixels = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i] > 100) redPixels++;
      }

      return {
        programBound: true,
        linked,
        shaderInfo,
        uniformInfo,
        attributeInfo,
        manualClearWorked: redPixels > 5000,
        redPixelsFound: redPixels
      };
    });

    console.log('🎨 Shader Test Results:');
    console.log(JSON.stringify(shaderTest, null, 2));

    await page.screenshot({ path: 'screenshots/shader-test.png' });
    console.log('📸 Shader test screenshot saved');

    await browser.close();

  } catch (error) {
    console.log('❌ Shader test failed:', error.message);
    if (browser) {
      try { await browser.close(); } catch (e) {}
    }
  }
}

testShaders();