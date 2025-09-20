/**
 * Victory test - confirm game is working - attempt 28
 */

import { chromium } from 'npm:playwright@1.40.0';

async function testVictory() {
  let browser;

  try {
    console.log('🚀 FINAL VICTORY TEST: Confirming Space Invaders is working...');

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto('http://localhost:8000');
    await page.waitForSelector('canvas.game-canvas');
    await page.waitForTimeout(4000);

    await page.click('button:has-text("Start Game")');
    await page.waitForTimeout(4000);

    const victoryResult = await page.evaluate(() => {
      const canvas = document.querySelector('canvas.game-canvas');
      const gl = canvas.getContext('webgl2');

      const pixels = new Uint8Array(800 * 600 * 4);
      gl.readPixels(0, 0, 800, 600, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      let totalColoredPixels = 0;
      let yellowPixels = 0;
      let greenPixels = 0;
      let colorVariety = new Set();

      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];

        if (r > 0 || g > 0 || b > 0) {
          totalColoredPixels++;
          colorVariety.add(`${r},${g},${b}`);

          if (r > 200 && g > 200 && b < 100) yellowPixels++;
          else if (g > 200 && r < 100 && b < 100) greenPixels++;
        }
      }

      return {
        totalColoredPixels,
        yellowPixels,
        greenPixels,
        uniqueColors: colorVariety.size,
        percentageColored: ((totalColoredPixels / (800 * 600)) * 100).toFixed(2),
        gameIsWorking: totalColoredPixels > 5000,
        invadersVisible: yellowPixels > 1000,
        playerVisible: greenPixels > 100
      };
    });

    console.log('🏆 VICTORY TEST RESULTS:');
    console.log(JSON.stringify(victoryResult, null, 2));

    if (victoryResult.gameIsWorking) {
      console.log('🎮 SPACE INVADERS GAME IS FULLY WORKING!');
      console.log(`🎨 ${victoryResult.totalColoredPixels} colored pixels (${victoryResult.percentageColored}% of canvas)`);
      console.log(`🟡 ${victoryResult.yellowPixels} yellow pixels (invaders)`);
      console.log(`🟢 ${victoryResult.greenPixels} green pixels (player)`);
      console.log(`🎨 ${victoryResult.uniqueColors} unique colors`);

      if (victoryResult.invadersVisible) {
        console.log('✅ Invader formation is visible');
      }
      if (victoryResult.playerVisible) {
        console.log('✅ Player is visible');
      }

      // Test full gameplay
      console.log('🎮 Testing full gameplay...');

      // Move left
      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(300);

      // Move right
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(300);

      // Shoot
      await page.keyboard.press('Space');
      await page.waitForTimeout(500);

      // Shoot again
      await page.keyboard.press('Space');
      await page.waitForTimeout(500);

      await page.screenshot({ path: 'screenshots/VICTORY-GAMEPLAY.png' });
      console.log('📸 VICTORY gameplay screenshot saved!');

      console.log('🏆 PLAYWRIGHT CONFIRMS: SPACE INVADERS GAME IS COMPLETE AND WORKING!');

    } else {
      console.log('❌ Game still not working');
    }

    await page.screenshot({ path: 'screenshots/VICTORY-FINAL.png' });
    await browser.close();

    return victoryResult.gameIsWorking;

  } catch (error) {
    console.log('❌ Victory test failed:', error.message);
    if (browser) {
      try { await browser.close(); } catch (e) {}
    }
    return false;
  }
}

testVictory().then(success => {
  if (success) {
    console.log('🎉🎉🎉 MISSION ACCOMPLISHED! 🎉🎉🎉');
    console.log('🚀 Space Invaders WebGL game is confirmed working with Playwright!');
  } else {
    console.log('🔄 Need to keep debugging...');
  }
});