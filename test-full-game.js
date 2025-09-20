/**
 * Full game test with Playwright - attempt 2
 */

import { chromium } from 'npm:playwright@1.40.0';

async function testFullGame() {
  let browser;

  try {
    console.log('🚀 Attempt 2: Full game test...');

    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();

    // Navigate to game
    console.log('Loading game page...');
    await page.goto('http://localhost:8001', { waitUntil: 'networkidle' });

    // Wait for canvas
    await page.waitForSelector('canvas.game-canvas');

    // Wait for game initialization
    console.log('Waiting for game initialization...');
    await page.waitForTimeout(3000);

    // Click Start Game
    console.log('Starting game...');
    await page.click('button:has-text("Start Game")');
    await page.waitForTimeout(2000);

    // Analyze canvas
    console.log('Analyzing canvas...');
    const analysis = await page.evaluate(() => {
      const canvas = document.querySelector('canvas.game-canvas');
      const gl = canvas.getContext('webgl2');

      if (!canvas || !gl) {
        return { error: 'Canvas or WebGL not found' };
      }

      const width = canvas.width;
      const height = canvas.height;
      const pixels = new Uint8Array(width * height * 4);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      let coloredPixels = 0;
      let greenPixels = 0;
      let totalPixels = width * height;

      // Sample every 10th pixel for speed
      for (let i = 0; i < pixels.length; i += 40) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];

        if (r > 0 || g > 0 || b > 0) {
          coloredPixels++;
          if (g > 100 && r < 100 && b < 100) {
            greenPixels++;
          }
        }
      }

      return {
        canvasSize: `${width}x${height}`,
        sampledPixels: Math.floor(pixels.length / 40),
        coloredPixels,
        greenPixels,
        gameWorking: coloredPixels > 10,
        playerVisible: greenPixels > 5
      };
    });

    console.log('📊 Canvas Analysis:', analysis);

    if (analysis.gameWorking) {
      console.log('✅ GAME IS WORKING! Sprites detected on canvas');

      if (analysis.playerVisible) {
        console.log('✅ Player (green sprite) is visible');
      }

      // Test interactions
      console.log('Testing game controls...');

      // Test movement
      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(300);
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(300);

      // Test shooting
      await page.keyboard.press('Space');
      await page.waitForTimeout(500);

      // Take final screenshot
      await page.screenshot({ path: 'screenshots/game-working.png' });
      console.log('📸 Final screenshot saved');

      console.log('🎉 FULL GAME TEST SUCCESSFUL!');
    } else {
      console.log('❌ No sprites detected on canvas');
      await page.screenshot({ path: 'screenshots/no-sprites.png' });
    }

    await browser.close();
    return analysis.gameWorking;

  } catch (error) {
    console.log('❌ Full game test failed:', error.message);
    if (browser) {
      try { await browser.close(); } catch (e) {}
    }
    return false;
  }
}

testFullGame().then(success => {
  if (success) {
    console.log('🎮 Game is confirmed working with Playwright!');
  } else {
    console.log('Need to try another approach...');
  }
});