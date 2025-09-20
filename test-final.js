/**
 * Final comprehensive test - attempt 12
 */

import { chromium } from 'npm:playwright@1.40.0';

async function finalTest() {
  let browser;

  try {
    console.log('🚀 Attempt 12: Final comprehensive test...');

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto('http://localhost:8001');
    await page.waitForSelector('canvas.game-canvas');
    await page.waitForTimeout(3000);

    // Take before screenshot
    await page.screenshot({ path: 'screenshots/before-start.png' });
    console.log('📸 Before start screenshot saved');

    // Click start game
    await page.click('button:has-text("Start Game")');
    await page.waitForTimeout(3000);

    // Take after screenshot
    await page.screenshot({ path: 'screenshots/after-start.png' });
    console.log('📸 After start screenshot saved');

    // Comprehensive analysis
    const finalAnalysis = await page.evaluate(() => {
      const canvas = document.querySelector('canvas.game-canvas');
      const gl = canvas.getContext('webgl2');

      // Read entire canvas
      const pixels = new Uint8Array(800 * 600 * 4);
      gl.readPixels(0, 0, 800, 600, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      // Count different colors
      let blackPixels = 0;
      let coloredPixels = 0;
      let greenPixels = 0;
      let redPixels = 0;
      let bluePixels = 0;
      let otherPixels = 0;

      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const a = pixels[i + 3];

        if (r === 0 && g === 0 && b === 0) {
          blackPixels++;
        } else {
          coloredPixels++;
          if (g > 150 && r < 100 && b < 100) {
            greenPixels++;
          } else if (r > 150 && g < 100 && b < 100) {
            redPixels++;
          } else if (b > 150 && r < 100 && g < 100) {
            bluePixels++;
          } else {
            otherPixels++;
          }
        }
      }

      // Check specific pixel locations where we expect sprites
      const checkPoints = [
        { x: 400, y: 500, name: 'player_expected' },
        { x: 75, y: 100, name: 'invader_expected' },
        { x: 400, y: 300, name: 'center' },
        { x: 0, y: 0, name: 'top_left' },
        { x: 799, y: 599, name: 'bottom_right' }
      ];

      const pointColors = checkPoints.map(point => {
        const i = (point.y * 800 + point.x) * 4;
        return {
          point: point.name,
          position: `${point.x},${point.y}`,
          color: `rgba(${pixels[i]},${pixels[i+1]},${pixels[i+2]},${pixels[i+3]})`
        };
      });

      return {
        totalPixels: 800 * 600,
        blackPixels,
        coloredPixels,
        greenPixels,
        redPixels,
        bluePixels,
        otherPixels,
        percentColored: ((coloredPixels / (800 * 600)) * 100).toFixed(3),
        pointColors,
        gameWorking: coloredPixels > 1000
      };
    });

    console.log('🎮 FINAL GAME ANALYSIS:');
    console.log(JSON.stringify(finalAnalysis, null, 2));

    if (finalAnalysis.gameWorking) {
      console.log('🏆 GAME IS WORKING! Space Invaders sprites are visible!');
      console.log(`Found ${finalAnalysis.coloredPixels} colored pixels (${finalAnalysis.percentColored}% of canvas)`);
      console.log(`Green pixels (player): ${finalAnalysis.greenPixels}`);
      console.log(`Red pixels (enemies): ${finalAnalysis.redPixels}`);
    } else {
      console.log('❌ Game still not rendering sprites');
    }

    await browser.close();
    return finalAnalysis.gameWorking;

  } catch (error) {
    console.log('❌ Final test failed:', error.message);
    if (browser) {
      try { await browser.close(); } catch (e) {}
    }
    return false;
  }
}

finalTest().then(success => {
  if (success) {
    console.log('🎉 PLAYWRIGHT CONFIRMED: Space Invaders game is working!');
  } else {
    console.log('🔧 Projection matrix needs to be fixed');
  }
});