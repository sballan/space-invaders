/**
 * Test VAO fix - attempt 7
 */

import { chromium } from 'npm:playwright@1.40.0';

async function testVAOFix() {
  let browser;

  try {
    console.log('🚀 Attempt 7: Testing VAO fix...');

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
      let samplePixels = [];

      // Sample specific areas
      const areas = [
        { x: 400, y: 500, name: 'player' },
        { x: 75, y: 100, name: 'invader' },
        { x: 200, y: 100, name: 'invader2' }
      ];

      for (const area of areas) {
        const i = (area.y * 800 + area.x) * 4;
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const a = pixels[i + 3];

        samplePixels.push({
          area: area.name,
          position: `${area.x},${area.y}`,
          rgba: [r, g, b, a]
        });

        if (r > 0 || g > 0 || b > 0) {
          coloredPixels++;
          if (g > 100) greenPixels++;
        }
      }

      // Count total colored pixels (sample every 100th pixel for speed)
      let totalColored = 0;
      for (let i = 0; i < pixels.length; i += 400) { // Every 100th pixel
        if (pixels[i] > 0 || pixels[i + 1] > 0 || pixels[i + 2] > 0) {
          totalColored++;
        }
      }

      return {
        samplePixels,
        coloredAreasFound: coloredPixels,
        greenAreasFound: greenPixels,
        totalColoredPixelsSampled: totalColored,
        gameFixed: totalColored > 10
      };
    });

    console.log('🎯 VAO Fix Test Results:');
    console.log(JSON.stringify(result, null, 2));

    if (result.gameFixed) {
      console.log('🎉 SUCCESS! Game is now working with VAO fix!');
    } else {
      console.log('❌ Still not working, need to try more fixes...');
    }

    await page.screenshot({ path: 'screenshots/vao-fix-test.png' });
    console.log('📸 VAO fix screenshot saved');

    await browser.close();
    return result.gameFixed;

  } catch (error) {
    console.log('❌ VAO fix test failed:', error.message);
    if (browser) {
      try { await browser.close(); } catch (e) {}
    }
    return false;
  }
}

testVAOFix().then(success => {
  if (success) {
    console.log('✨ GAME IS CONFIRMED WORKING!');
  } else {
    console.log('🔧 Need to keep debugging...');
  }
});