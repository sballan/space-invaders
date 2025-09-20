/**
 * Test matrix fix v2 - attempt 16
 */

import { chromium } from "npm:playwright@1.40.0";

async function testMatrixFixV2() {
  let browser;

  try {
    console.log("🚀 Attempt 16: Testing improved matrix fix...");

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto("http://localhost:8001");
    await page.waitForSelector("canvas.game-canvas");
    await page.waitForTimeout(3000);

    await page.click('button:has-text("Start Game")');
    await page.waitForTimeout(3000);

    const testResult = await page.evaluate(() => {
      const canvas = document.querySelector("canvas.game-canvas");
      const gl = canvas.getContext("webgl2");

      // Read pixels
      const pixels = new Uint8Array(800 * 600 * 4);
      gl.readPixels(0, 0, 800, 600, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      let coloredPixels = 0;
      let greenPixels = 0;

      // Check every 100th pixel
      for (let i = 0; i < pixels.length; i += 400) {
        if (pixels[i] > 0 || pixels[i + 1] > 0 || pixels[i + 2] > 0) {
          coloredPixels++;
          if (pixels[i + 1] > 100) greenPixels++;
        }
      }

      // Check specific expected locations
      const playerArea = { x: 400, y: 500 };
      const invaderArea = { x: 75, y: 100 };

      const playerPixel = (playerArea.y * 800 + playerArea.x) * 4;
      const invaderPixel = (invaderArea.y * 800 + invaderArea.x) * 4;

      const playerColor = [
        pixels[playerPixel],
        pixels[playerPixel + 1],
        pixels[playerPixel + 2],
        pixels[playerPixel + 3],
      ];
      const invaderColor = [
        pixels[invaderPixel],
        pixels[invaderPixel + 1],
        pixels[invaderPixel + 2],
        pixels[invaderPixel + 3],
      ];

      return {
        sampledColoredPixels: coloredPixels,
        sampledGreenPixels: greenPixels,
        playerColor,
        invaderColor,
        fixWorked: coloredPixels > 10,
      };
    });

    console.log("🎯 Matrix Fix V2 Results:");
    console.log(JSON.stringify(testResult, null, 2));

    await page.screenshot({ path: "screenshots/matrix-fix-v2.png" });

    if (testResult.fixWorked) {
      console.log("🎉 SUCCESS! Matrix fix worked!");

      // Test interactions
      console.log("Testing interactions...");
      await page.keyboard.press("ArrowLeft");
      await page.waitForTimeout(500);
      await page.keyboard.press("Space");
      await page.waitForTimeout(500);

      await page.screenshot({ path: "screenshots/interactions-test.png" });
      console.log("📸 Interactions test screenshot saved");
    }

    await browser.close();
    return testResult.fixWorked;
  } catch (error) {
    console.log("❌ Matrix fix v2 failed:", error.message);
    if (browser) {
      try {
        await browser.close();
      } catch (e) {}
    }
    return false;
  }
}

testMatrixFixV2();
