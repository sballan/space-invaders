/**
 * Test game with magenta shader - attempt 25
 */

import { chromium } from 'npm:playwright@1.40.0';

async function testGameMagenta() {
  let browser;

  try {
    console.log('🚀 Attempt 25: Testing game with magenta shader...');

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto('http://localhost:8000');
    await page.waitForSelector('canvas.game-canvas');
    await page.waitForTimeout(4000); // Longer wait for shader compilation

    await page.click('button:has-text("Start Game")');
    await page.waitForTimeout(5000); // Wait longer for rendering

    const result = await page.evaluate(() => {
      const canvas = document.querySelector('canvas.game-canvas');
      const gl = canvas.getContext('webgl2');

      const pixels = new Uint8Array(800 * 600 * 4);
      gl.readPixels(0, 0, 800, 600, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      let magentaPixels = 0;
      let totalColoredPixels = 0;

      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];

        if (r > 0 || g > 0 || b > 0) {
          totalColoredPixels++;

          // Magenta = high red + high blue, low green
          if (r > 200 && b > 200 && g < 50) {
            magentaPixels++;
          }
        }
      }

      // Sample specific locations
      const samplePoints = [];
      for (let y = 100; y < 600; y += 100) {
        for (let x = 75; x < 800; x += 100) {
          const i = (y * 800 + x) * 4;
          const rgba = [pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]];
          if (rgba[0] > 0 || rgba[1] > 0 || rgba[2] > 0) {
            samplePoints.push({ x, y, rgba });
          }
        }
      }

      return {
        totalColoredPixels,
        magentaPixels,
        sampleColoredPoints: samplePoints.slice(0, 10), // First 10 colored points
        percentageColored: ((totalColoredPixels / (800 * 600)) * 100).toFixed(3),
        gameMagentaWorked: magentaPixels > 100
      };
    });

    console.log('💜 GAME MAGENTA RESULTS:');
    console.log(JSON.stringify(result, null, 2));

    if (result.gameMagentaWorked) {
      console.log('🏆 GAME ENGINE SUCCESS! Magenta sprites visible!');
      console.log(`💜 Found ${result.magentaPixels} magenta pixels from game!`);
    } else {
      console.log('❌ Game magenta shader failed');
      console.log(`Total colored pixels: ${result.totalColoredPixels}`);
      if (result.sampleColoredPoints.length > 0) {
        console.log('But found some colored points:', result.sampleColoredPoints);
      }
    }

    await page.screenshot({ path: 'screenshots/game-magenta.png' });
    await browser.close();

    return result.gameMagentaWorked;

  } catch (error) {
    console.log('❌ Game magenta test failed:', error.message);
    if (browser) {
      try { await browser.close(); } catch (e) {}
    }
    return false;
  }
}

testGameMagenta();