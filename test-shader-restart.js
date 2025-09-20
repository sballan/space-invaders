/**
 * Test after shader restart - attempt 19
 */

import { chromium } from 'npm:playwright@1.40.0';

async function testAfterRestart() {
  let browser;

  try {
    console.log('🚀 Attempt 19: Testing after server restart with shader fix...');

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Note: Server is now on port 8000
    await page.goto('http://localhost:8000');
    await page.waitForSelector('canvas.game-canvas');
    await page.waitForTimeout(3000);

    await page.click('button:has-text("Start Game")');
    await page.waitForTimeout(3000);

    const result = await page.evaluate(() => {
      const canvas = document.querySelector('canvas.game-canvas');
      const gl = canvas.getContext('webgl2');

      const pixels = new Uint8Array(800 * 600 * 4);
      gl.readPixels(0, 0, 800, 600, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      let coloredPixels = 0;
      let greenPixels = 0;

      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i] > 0 || pixels[i + 1] > 0 || pixels[i + 2] > 0) {
          coloredPixels++;
          if (pixels[i + 1] > 100) greenPixels++;
        }
      }

      // Check player area specifically
      const playerX = 400;
      const playerY = 500;
      const playerPixel = (playerY * 800 + playerX) * 4;
      const playerColor = [pixels[playerPixel], pixels[playerPixel + 1], pixels[playerPixel + 2], pixels[playerPixel + 3]];

      return {
        totalColoredPixels: coloredPixels,
        greenPixels,
        playerColor,
        percentColored: ((coloredPixels / (800 * 600)) * 100).toFixed(3),
        shaderFixWorked: coloredPixels > 1000
      };
    });

    console.log('🎮 RESTART TEST RESULTS:');
    console.log(JSON.stringify(result, null, 2));

    if (result.shaderFixWorked) {
      console.log('🎉 SUCCESS! Shader fix worked after restart!');

      // Test interactions
      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(500);
      await page.keyboard.press('Space');
      await page.waitForTimeout(1000);

      await page.screenshot({ path: 'screenshots/working-game.png' });
      console.log('📸 Working game screenshot saved!');
    } else {
      console.log('❌ Still not working after restart');
    }

    await page.screenshot({ path: 'screenshots/after-restart.png' });
    await browser.close();

    return result.shaderFixWorked;

  } catch (error) {
    console.log('❌ Restart test failed:', error.message);
    if (browser) {
      try { await browser.close(); } catch (e) {}
    }
    return false;
  }
}

testAfterRestart();