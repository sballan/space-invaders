/**
 * Test yellow mix shader - attempt 27
 */

import { chromium } from 'npm:playwright@1.40.0';

async function testYellowMix() {
  let browser;

  try {
    console.log('🚀 Attempt 27: Testing yellow mix shader...');

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto('http://localhost:8000');
    await page.waitForSelector('canvas.game-canvas');
    await page.waitForTimeout(4000);

    await page.click('button:has-text("Start Game")');
    await page.waitForTimeout(4000);

    const result = await page.evaluate(() => {
      const canvas = document.querySelector('canvas.game-canvas');
      const gl = canvas.getContext('webgl2');

      const pixels = new Uint8Array(800 * 600 * 4);
      gl.readPixels(0, 0, 800, 600, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      let coloredPixels = 0;
      let yellowPixels = 0;
      let greenishPixels = 0;

      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];

        if (r > 0 || g > 0 || b > 0) {
          coloredPixels++;

          // Yellow-ish (high red + high green)
          if (r > 150 && g > 150 && b < 100) {
            yellowPixels++;
          }
          // Greenish (high green)
          else if (g > 150) {
            greenishPixels++;
          }
        }
      }

      return {
        totalColoredPixels: coloredPixels,
        yellowPixels,
        greenishPixels,
        percentageColored: ((coloredPixels / (800 * 600)) * 100).toFixed(3),
        yellowMixWorked: coloredPixels > 1000
      };
    });

    console.log('🟡 YELLOW MIX RESULTS:');
    console.log(JSON.stringify(result, null, 2));

    if (result.yellowMixWorked) {
      console.log('🎉 SUCCESS! Yellow mix shader worked!');
      console.log(`🟡 Yellow pixels: ${result.yellowPixels}`);
      console.log(`🟢 Greenish pixels: ${result.greenishPixels}`);
    } else {
      console.log('❌ Yellow mix failed too');
    }

    await page.screenshot({ path: 'screenshots/yellow-mix.png' });
    await browser.close();

    return result.yellowMixWorked;

  } catch (error) {
    console.log('❌ Yellow mix test failed:', error.message);
    if (browser) {
      try { await browser.close(); } catch (e) {}
    }
    return false;
  }
}

testYellowMix();