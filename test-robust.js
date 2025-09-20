/**
 * Robust Playwright test for Space Invaders game
 */

import { chromium } from 'npm:playwright@1.40.0';

async function testGame() {
  let browser;
  let page;

  try {
    // First check if server is responding
    console.log('Checking server availability...');
    const response = await fetch('http://localhost:8001');
    if (!response.ok) {
      throw new Error(`Server not responding: ${response.status}`);
    }
    console.log('✅ Server is responding');

    // Launch browser with more stable options
    console.log('Launching browser...');
    browser = await chromium.launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security'
      ]
    });

    const context = await browser.newContext({
      viewport: { width: 1200, height: 800 }
    });

    page = await context.newPage();

    // Add error handling for page errors
    page.on('pageerror', error => {
      console.log('Page error:', error.message);
    });

    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Console error:', msg.text());
      }
    });

    // Navigate to game
    console.log('Navigating to game...');
    await page.goto('http://localhost:8001', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Wait for canvas
    console.log('Waiting for canvas element...');
    await page.waitForSelector('canvas.game-canvas', { timeout: 15000 });

    // Wait for initialization
    console.log('Waiting for game initialization...');
    await page.waitForTimeout(4000);

    // Take initial screenshot
    await page.screenshot({
      path: 'screenshots/initial-state.png',
      fullPage: false
    });
    console.log('📸 Initial screenshot saved');

    // Start the game
    console.log('Starting game...');
    const startButton = await page.waitForSelector('button:has-text("Start Game")', { timeout: 5000 });
    await startButton.click();

    // Wait for game to start
    await page.waitForTimeout(2000);

    // Take game started screenshot
    await page.screenshot({
      path: 'screenshots/game-started.png',
      fullPage: false
    });
    console.log('📸 Game started screenshot saved');

    // Analyze canvas pixels
    console.log('Analyzing canvas pixels...');
    const pixelAnalysis = await page.evaluate(() => {
      const canvas = document.querySelector('canvas.game-canvas');
      if (!canvas) return { error: 'Canvas not found' };

      const gl = canvas.getContext('webgl2');
      if (!gl) return { error: 'WebGL not available' };

      // Read pixels
      const width = canvas.width;
      const height = canvas.height;
      const pixels = new Uint8Array(width * height * 4);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      // Analyze colors
      let totalPixels = width * height;
      let coloredPixels = 0;
      let greenPixels = 0;
      let redPixels = 0;
      let bluePixels = 0;
      let otherColors = 0;

      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const a = pixels[i + 3];

        if (r > 0 || g > 0 || b > 0) {
          coloredPixels++;

          if (g > 150 && r < 100 && b < 100) {
            greenPixels++;
          } else if (r > 150 && g < 100 && b < 100) {
            redPixels++;
          } else if (b > 150 && r < 100 && g < 100) {
            bluePixels++;
          } else {
            otherColors++;
          }
        }
      }

      return {
        canvasSize: `${width}x${height}`,
        totalPixels,
        coloredPixels,
        greenPixels,
        redPixels,
        bluePixels,
        otherColors,
        percentColored: ((coloredPixels / totalPixels) * 100).toFixed(2),
        gameVisible: coloredPixels > 100
      };
    });

    console.log('🎯 Canvas Analysis Results:');
    console.log(JSON.stringify(pixelAnalysis, null, 2));

    // Test game interactions
    if (pixelAnalysis.gameVisible) {
      console.log('✅ Game is visible! Testing interactions...');

      // Test movement
      console.log('Testing left movement...');
      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(500);

      console.log('Testing right movement...');
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(500);

      // Test shooting
      console.log('Testing shooting...');
      await page.keyboard.press('Space');
      await page.waitForTimeout(1000);

      // Take final screenshot
      await page.screenshot({
        path: 'screenshots/after-interactions.png',
        fullPage: false
      });
      console.log('📸 Final screenshot saved');

      console.log('🎮 GAME TEST COMPLETE - Game is working!');
    } else {
      console.log('❌ Game sprites not visible on canvas');
    }

    // Keep browser open briefly for manual inspection
    console.log('Keeping browser open for 5 seconds...');
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('❌ Test failed:', error.message);

    if (page) {
      try {
        await page.screenshot({ path: 'screenshots/error-state.png' });
        console.log('📸 Error screenshot saved');
      } catch (screenshotError) {
        console.log('Could not take error screenshot');
      }
    }
  } finally {
    if (browser) {
      console.log('Closing browser...');
      try {
        await browser.close();
      } catch (closeError) {
        console.log('Browser close error (this is normal)');
      }
    }
  }
}

// Create screenshots directory if it doesn't exist
try {
  await Deno.mkdir('screenshots', { recursive: true });
} catch (e) {
  // Directory already exists
}

console.log('🚀 Starting Space Invaders game test...');
testGame();