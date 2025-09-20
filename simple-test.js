/**
 * Simple Playwright test to capture canvas state
 */

import { chromium } from "npm:playwright@1.40.0";

async function simpleTest() {
  console.log("Starting simple canvas test...");

  const browser = await chromium.launch({
    headless: false,
    devtools: true,
  });

  const page = await browser.newPage();

  try {
    // Navigate to the game
    await page.goto("http://localhost:8001");
    console.log("Page loaded");

    // Wait for canvas
    await page.waitForSelector("canvas.game-canvas");
    console.log("Canvas found");

    // Wait for initialization
    await page.waitForTimeout(3000);

    // Click start game
    await page.click('button:has-text("Start Game")');
    console.log("Start Game clicked");

    // Wait for game to start
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({
      path: "screenshots/game-state.png",
      fullPage: false,
    });
    console.log("Screenshot saved to screenshots/game-state.png");

    // Analyze canvas pixels
    const analysis = await page.evaluate(() => {
      const canvas = document.querySelector("canvas.game-canvas");
      const gl = canvas.getContext("webgl2");

      if (!canvas || !gl) {
        return { error: "Canvas or WebGL not found" };
      }

      const pixels = new Uint8Array(800 * 600 * 4);
      gl.readPixels(0, 0, 800, 600, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      let nonBlack = 0;
      let samplePixels = [];

      // Sample some pixels to see what colors exist
      for (let y = 0; y < 600; y += 50) {
        for (let x = 0; x < 800; x += 50) {
          const i = (y * 800 + x) * 4;
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          const a = pixels[i + 3];

          if (r > 0 || g > 0 || b > 0) {
            nonBlack++;
            samplePixels.push({ x, y, r, g, b, a });
          }
        }
      }

      return {
        totalSampled: (600 / 50) * (800 / 50),
        nonBlackSamples: nonBlack,
        samplePixels: samplePixels.slice(0, 10), // First 10 non-black pixels
      };
    });

    console.log("Canvas Analysis:", JSON.stringify(analysis, null, 2));

    // Keep browser open for 10 seconds for manual inspection
    console.log(
      "Browser will stay open for 10 seconds for manual inspection...",
    );
    await page.waitForTimeout(10000);
  } catch (error) {
    console.error("Test error:", error);
  } finally {
    await browser.close();
  }
}

simpleTest().catch(console.error);
