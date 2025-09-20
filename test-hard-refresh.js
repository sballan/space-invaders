/**
 * Test with hard refresh - attempt 29
 */

import { chromium } from "npm:playwright@1.40.0";

async function testHardRefresh() {
  let browser;

  try {
    console.log("🚀 Attempt 29: Testing with hard refresh and cache clear...");

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Clear cache and do hard refresh
    await page.goto("http://localhost:8000", { waitUntil: "networkidle" });

    // Force reload to get latest assets
    await page.reload({ waitUntil: "networkidle" });

    await page.waitForSelector("canvas.game-canvas");
    await page.waitForTimeout(5000); // Longer wait

    // Check what shaders are being loaded
    const shaderCheck = await page.evaluate(() => {
      // Check if there are any console errors about shader compilation
      return new Promise((resolve) => {
        const errors = [];
        const originalError = console.error;
        console.error = function (...args) {
          errors.push(args.join(" "));
          originalError.apply(console, args);
        };

        setTimeout(() => {
          resolve({ errors, timestamp: Date.now() });
        }, 1000);
      });
    });

    console.log("🔍 Shader check:", shaderCheck);

    await page.click('button:has-text("Start Game")');
    await page.waitForTimeout(5000);

    // Force multiple frames to render
    await page.evaluate(() => {
      return new Promise((resolve) => {
        let frames = 0;
        function frame() {
          frames++;
          if (frames < 10) {
            requestAnimationFrame(frame);
          } else {
            resolve();
          }
        }
        requestAnimationFrame(frame);
      });
    });

    const result = await page.evaluate(() => {
      const canvas = document.querySelector("canvas.game-canvas");
      const gl = canvas.getContext("webgl2");

      const pixels = new Uint8Array(800 * 600 * 4);
      gl.readPixels(0, 0, 800, 600, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      let coloredPixels = 0;
      let sampleColors = [];

      // More thorough sampling
      for (let i = 0; i < pixels.length; i += 400) { // Every 100th pixel
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];

        if (r > 0 || g > 0 || b > 0) {
          coloredPixels++;
          if (sampleColors.length < 20) {
            sampleColors.push([r, g, b]);
          }
        }
      }

      return {
        coloredPixelsFound: coloredPixels,
        sampleColors,
        hardRefreshWorked: coloredPixels > 10,
      };
    });

    console.log("🔄 HARD REFRESH RESULTS:");
    console.log(JSON.stringify(result, null, 2));

    if (result.hardRefreshWorked) {
      console.log("🎉 SUCCESS after hard refresh!");
      console.log(`🎨 Found ${result.coloredPixelsFound} colored pixels`);
      console.log("🎨 Sample colors:", result.sampleColors.slice(0, 5));
    } else {
      console.log("❌ Hard refresh didn't help");
    }

    await page.screenshot({ path: "screenshots/hard-refresh.png" });
    await browser.close();

    return result.hardRefreshWorked;
  } catch (error) {
    console.log("❌ Hard refresh test failed:", error.message);
    if (browser) {
      try {
        await browser.close();
      } catch (e) {}
    }
    return false;
  }
}

testHardRefresh();
