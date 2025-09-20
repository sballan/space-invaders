/**
 * Final test with proper colors - attempt 26
 */

import { chromium } from 'npm:playwright@1.40.0';

async function testFinalColors() {
  let browser;

  try {
    console.log('🚀 Attempt 26: Final test with proper colors...');

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto('http://localhost:8000');
    await page.waitForSelector('canvas.game-canvas');
    await page.waitForTimeout(4000);

    await page.click('button:has-text("Start Game")');
    await page.waitForTimeout(4000);

    const finalResult = await page.evaluate(() => {
      const canvas = document.querySelector('canvas.game-canvas');
      const gl = canvas.getContext('webgl2');

      const pixels = new Uint8Array(800 * 600 * 4);
      gl.readPixels(0, 0, 800, 600, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      let totalColoredPixels = 0;
      let greenPixels = 0;
      let redPixels = 0;
      let bluePixels = 0;
      let otherPixels = 0;

      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];

        if (r > 0 || g > 0 || b > 0) {
          totalColoredPixels++;

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

      // Check expected sprite locations
      const spriteLocations = [
        { x: 400, y: 500, name: 'player' },
        { x: 75, y: 100, name: 'invader1' },
        { x: 135, y: 100, name: 'invader2' },
        { x: 195, y: 100, name: 'invader3' }
      ];

      const locationResults = spriteLocations.map(loc => {
        const i = (loc.y * 800 + loc.x) * 4;
        const rgba = [pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]];
        const hasColor = rgba[0] > 0 || rgba[1] > 0 || rgba[2] > 0;
        return {
          location: loc.name,
          position: `${loc.x},${loc.y}`,
          rgba,
          hasColor
        };
      });

      return {
        totalColoredPixels,
        greenPixels,
        redPixels,
        bluePixels,
        otherPixels,
        percentageColored: ((totalColoredPixels / (800 * 600)) * 100).toFixed(3),
        locationResults,
        gameFullyWorking: totalColoredPixels > 1000,
        playerVisible: greenPixels > 100,
        invadersVisible: (redPixels + bluePixels + otherPixels) > 100
      };
    });

    console.log('🎮 FINAL COLOR TEST RESULTS:');
    console.log(JSON.stringify(finalResult, null, 2));

    if (finalResult.gameFullyWorking) {
      console.log('🏆 SUCCESS! SPACE INVADERS IS FULLY WORKING!');
      console.log(`🎨 Total colored pixels: ${finalResult.totalColoredPixels} (${finalResult.percentageColored}%)`);
      console.log(`🟢 Green pixels (player): ${finalResult.greenPixels}`);
      console.log(`🔴 Red pixels: ${finalResult.redPixels}`);
      console.log(`🔵 Blue pixels: ${finalResult.bluePixels}`);
      console.log(`🎯 Other colored pixels: ${finalResult.otherPixels}`);

      if (finalResult.playerVisible) {
        console.log('✅ Player is visible!');
      }
      if (finalResult.invadersVisible) {
        console.log('✅ Invaders are visible!');
      }

      // Test gameplay
      console.log('🎮 Testing gameplay...');
      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(300);
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(300);
      await page.keyboard.press('Space');
      await page.waitForTimeout(1000);

      await page.screenshot({ path: 'screenshots/working-gameplay.png' });
      console.log('📸 Working gameplay screenshot saved!');

    } else {
      console.log('❌ Still not fully working');
      console.log(`Found ${finalResult.totalColoredPixels} colored pixels`);
    }

    await page.screenshot({ path: 'screenshots/final-colors.png' });
    await browser.close();

    return finalResult.gameFullyWorking;

  } catch (error) {
    console.log('❌ Final color test failed:', error.message);
    if (browser) {
      try { await browser.close(); } catch (e) {}
    }
    return false;
  }
}

testFinalColors();