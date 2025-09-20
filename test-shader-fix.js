/**
 * Test shader fix - attempt 18
 */

import { chromium } from 'npm:playwright@1.40.0';

async function testShaderFix() {
  let browser;

  try {
    console.log('🚀 Attempt 18: Testing shader fix...');

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto('http://localhost:8001');
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
      let redPixels = 0;
      let bluePixels = 0;

      // Count all colored pixels
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];

        if (r > 0 || g > 0 || b > 0) {
          coloredPixels++;

          if (g > 150 && r < 100 && b < 100) greenPixels++;
          else if (r > 150 && g < 100 && b < 100) redPixels++;
          else if (b > 150 && r < 100 && g < 100) bluePixels++;
        }
      }

      // Check specific sprite locations
      const checkSpots = [
        { x: 400, y: 500, name: 'player' },
        { x: 75, y: 100, name: 'invader1' },
        { x: 135, y: 100, name: 'invader2' },
        { x: 195, y: 100, name: 'invader3' }
      ];

      const spotColors = checkSpots.map(spot => {
        const i = (spot.y * 800 + spot.x) * 4;
        return {
          spot: spot.name,
          position: `${spot.x},${spot.y}`,
          rgba: [pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]]
        };
      });

      return {
        totalColoredPixels: coloredPixels,
        greenPixels,
        redPixels,
        bluePixels,
        percentageColored: ((coloredPixels / (800 * 600)) * 100).toFixed(3),
        spotColors,
        gameNowWorking: coloredPixels > 1000
      };
    });

    console.log('🎮 SHADER FIX RESULTS:');
    console.log(JSON.stringify(result, null, 2));

    if (result.gameNowWorking) {
      console.log('🏆 GAME IS NOW WORKING! Space Invaders sprites are visible!');
      console.log(`🎨 Found ${result.totalColoredPixels} colored pixels (${result.percentageColored}% of canvas)`);
      console.log(`🟢 Green pixels (player): ${result.greenPixels}`);
      console.log(`🔴 Red pixels: ${result.redPixels}`);
      console.log(`🔵 Blue pixels: ${result.bluePixels}`);
    } else {
      console.log('❌ Shader fix didn\'t work yet');
    }

    await page.screenshot({ path: 'screenshots/shader-fix-result.png' });
    await browser.close();

    return result.gameNowWorking;

  } catch (error) {
    console.log('❌ Shader fix test failed:', error.message);
    if (browser) {
      try { await browser.close(); } catch (e) {}
    }
    return false;
  }
}

testShaderFix();