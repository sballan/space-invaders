/**
 * Playwright test to capture the working Space Invaders game
 */

import { chromium } from 'npm:playwright@1.40.0';

async function testWorkingGame() {
  let browser;

  try {
    console.log('Launching browser...');
    browser = await chromium.launch({
      headless: false,
      slowMo: 1000 // Slow down for visibility
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    // Navigate to the game
    console.log('Navigating to game...');
    await page.goto('http://localhost:8001');

    // Wait for canvas to appear
    console.log('Waiting for canvas...');
    await page.waitForSelector('canvas.game-canvas', { timeout: 10000 });

    // Wait for game initialization
    console.log('Waiting for game initialization...');
    await page.waitForTimeout(3000);

    // Take screenshot of initial state
    await page.screenshot({ path: 'screenshots/01-initial.png' });
    console.log('Initial screenshot saved');

    // Start the game
    console.log('Starting game...');
    await page.click('button:has-text("Start Game")');
    await page.waitForTimeout(2000);

    // Take screenshot after game starts
    await page.screenshot({ path: 'screenshots/02-game-started.png' });
    console.log('Game started screenshot saved');

    // Analyze what's on the canvas
    const canvasAnalysis = await page.evaluate(() => {
      const canvas = document.querySelector('canvas.game-canvas');
      if (!canvas) return { error: 'No canvas found' };

      const gl = canvas.getContext('webgl2');
      if (!gl) return { error: 'No WebGL context' };

      // Read canvas pixels
      const pixels = new Uint8Array(800 * 600 * 4);
      gl.readPixels(0, 0, 800, 600, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      let coloredPixels = 0;
      let greenPixels = 0;
      let redPixels = 0;
      let bluePixels = 0;
      let whitePixels = 0;

      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const a = pixels[i + 3];

        if (r > 0 || g > 0 || b > 0) {
          coloredPixels++;

          if (g > 200 && r < 50 && b < 50) greenPixels++;
          else if (r > 200 && g < 50 && b < 50) redPixels++;
          else if (b > 200 && r < 50 && g < 50) bluePixels++;
          else if (r > 200 && g > 200 && b > 200) whitePixels++;
        }
      }

      return {
        totalPixels: 800 * 600,
        coloredPixels,
        greenPixels,
        redPixels,
        bluePixels,
        whitePixels,
        percentColored: (coloredPixels / (800 * 600) * 100).toFixed(2)
      };
    });

    console.log('Canvas Analysis:', canvasAnalysis);

    // Try some game actions
    console.log('Testing movement...');
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(500);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(500);

    // Take screenshot after movement
    await page.screenshot({ path: 'screenshots/03-after-movement.png' });
    console.log('Movement screenshot saved');

    // Try shooting
    console.log('Testing shooting...');
    await page.keyboard.press('Space');
    await page.waitForTimeout(1000);

    // Take screenshot after shooting
    await page.screenshot({ path: 'screenshots/04-after-shooting.png' });
    console.log('Shooting screenshot saved');

    // Final analysis
    const finalAnalysis = await page.evaluate(() => {
      const canvas = document.querySelector('canvas.game-canvas');
      const gl = canvas.getContext('webgl2');
      const pixels = new Uint8Array(800 * 600 * 4);
      gl.readPixels(0, 0, 800, 600, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      let coloredPixels = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i] > 0 || pixels[i + 1] > 0 || pixels[i + 2] > 0) {
          coloredPixels++;
        }
      }

      return {
        finalColoredPixels: coloredPixels,
        gameWorking: coloredPixels > 1000 // If we have lots of colored pixels, game is working
      };
    });

    console.log('Final Analysis:', finalAnalysis);

    if (finalAnalysis.gameWorking) {
      console.log('✅ GAME IS WORKING! Sprites are visible on canvas.');
    } else {
      console.log('❌ Game not working - no sprites visible');
    }

    // Keep browser open for 10 seconds for manual inspection
    console.log('Keeping browser open for 10 seconds for inspection...');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
testWorkingGame().catch(console.error);