/**
 * Debug Playwright test - attempt 3
 */

import { chromium } from 'npm:playwright@1.40.0';

async function testWithDebug() {
  let browser;

  try {
    console.log('🚀 Attempt 3: Debug test with longer waits...');

    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Listen to console messages from the page
    page.on('console', msg => {
      if (msg.text().includes('entities') || msg.text().includes('Rendering')) {
        console.log('🎮 Game log:', msg.text());
      }
    });

    // Navigate to game
    console.log('Loading page...');
    await page.goto('http://localhost:8001');

    // Wait for canvas
    console.log('Waiting for canvas...');
    await page.waitForSelector('canvas.game-canvas');

    // Wait longer for initialization
    console.log('Waiting 5 seconds for initialization...');
    await page.waitForTimeout(5000);

    // Check if game is initialized
    const gameInitialized = await page.evaluate(() => {
      // Look for any game-related logs or elements
      return document.querySelector('canvas.game-canvas') !== null;
    });

    console.log('Game initialized:', gameInitialized);

    // Click start game
    console.log('Clicking Start Game...');
    await page.click('button:has-text("Start Game")');

    // Wait longer for game to start
    console.log('Waiting 5 seconds for game to start...');
    await page.waitForTimeout(5000);

    // Check for console errors
    const hasErrors = await page.evaluate(() => {
      // Check if there are any error messages in console
      return window.console.error !== undefined;
    });

    console.log('Has errors:', hasErrors);

    // Detailed canvas analysis
    const detailedAnalysis = await page.evaluate(() => {
      const canvas = document.querySelector('canvas.game-canvas');
      if (!canvas) return { error: 'No canvas' };

      const gl = canvas.getContext('webgl2');
      if (!gl) return { error: 'No WebGL' };

      // Check WebGL state
      const glInfo = {
        version: gl.getParameter(gl.VERSION),
        vendor: gl.getParameter(gl.VENDOR),
        renderer: gl.getParameter(gl.RENDERER)
      };

      // Read pixels
      const pixels = new Uint8Array(800 * 600 * 4);
      gl.readPixels(0, 0, 800, 600, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      // Check for any non-black pixels
      let nonBlackPixels = 0;
      let sampleColors = [];

      // Check specific areas where we expect sprites
      const checkAreas = [
        { x: 400, y: 500, name: 'player' },
        { x: 75, y: 100, name: 'invader1' },
        { x: 200, y: 150, name: 'invader2' }
      ];

      for (const area of checkAreas) {
        const pixelIndex = (area.y * 800 + area.x) * 4;
        const r = pixels[pixelIndex];
        const g = pixels[pixelIndex + 1];
        const b = pixels[pixelIndex + 2];
        const a = pixels[pixelIndex + 3];

        sampleColors.push({
          area: area.name,
          position: `${area.x},${area.y}`,
          color: `rgba(${r},${g},${b},${a})`
        });

        if (r > 0 || g > 0 || b > 0) {
          nonBlackPixels++;
        }
      }

      return {
        glInfo,
        nonBlackPixels,
        sampleColors,
        canvasVisible: canvas.offsetWidth > 0 && canvas.offsetHeight > 0
      };
    });

    console.log('🔍 Detailed Analysis:', JSON.stringify(detailedAnalysis, null, 2));

    // Take screenshot
    await page.screenshot({ path: 'screenshots/debug-test.png' });
    console.log('📸 Debug screenshot saved');

    await browser.close();

  } catch (error) {
    console.log('❌ Debug test failed:', error.message);
    if (browser) {
      try { await browser.close(); } catch (e) {}
    }
  }
}

testWithDebug();