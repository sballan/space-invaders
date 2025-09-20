/**
 * Playwright test script to debug the canvas rendering
 * This will capture screenshots and analyze pixel data
 */

import { chromium } from "npm:playwright@1.40.0";

async function testCanvas() {
  console.log("Starting Playwright test...");

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to the game
    console.log("Navigating to http://localhost:8001...");
    await page.goto("http://localhost:8001");

    // Wait for the page to load
    await page.waitForSelector("canvas.game-canvas", { timeout: 10000 });
    console.log("Canvas found");

    // Wait for the game to initialize
    await page.waitForTimeout(2000);

    // Take initial screenshot
    await page.screenshot({ path: "screenshots/initial.png" });
    console.log("Initial screenshot taken");

    // Click start game
    console.log("Clicking Start Game...");
    await page.click('button:has-text("Start Game")');

    // Wait for game to start
    await page.waitForTimeout(1000);

    // Take screenshot after starting game
    await page.screenshot({ path: "screenshots/game-started.png" });
    console.log("Game started screenshot taken");

    // Analyze pixel data using browser console
    const pixelAnalysis = await page.evaluate(() => {
      const canvas = document.querySelector("canvas.game-canvas");
      if (!canvas) return { error: "Canvas not found" };

      const gl = canvas.getContext("webgl2");
      if (!gl) return { error: "WebGL context not found" };

      const width = canvas.width;
      const height = canvas.height;
      const pixels = new Uint8Array(width * height * 4);

      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      let nonBlackPixels = 0;
      let nonZeroAlphaPixels = 0;
      const colorCounts = new Map();

      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const a = pixels[i + 3];

        if (a > 0) nonZeroAlphaPixels++;

        if (r > 0 || g > 0 || b > 0) {
          nonBlackPixels++;
          const color = `${r},${g},${b},${a}`;
          colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
        }
      }

      return {
        totalPixels: width * height,
        nonBlackPixels,
        nonZeroAlphaPixels,
        uniqueColors: colorCounts.size,
        topColors: Array.from(colorCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([color, count]) => ({ color, count })),
      };
    });

    console.log("Pixel Analysis Results:");
    console.log(JSON.stringify(pixelAnalysis, null, 2));

    // Try pressing space to shoot
    console.log("Testing input - pressing space...");
    await page.keyboard.press("Space");
    await page.waitForTimeout(500);

    // Take screenshot after shooting
    await page.screenshot({ path: "screenshots/after-shooting.png" });
    console.log("After shooting screenshot taken");

    // Check for any console errors
    const consoleMessages = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleMessages.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);

    if (consoleMessages.length > 0) {
      console.log("Console errors found:");
      consoleMessages.forEach((msg) => console.log("  -", msg));
    }

    // Final pixel analysis
    const finalAnalysis = await page.evaluate(() => {
      return window.analyzeCanvasPixels
        ? window.analyzeCanvasPixels()
        : "No analysis function";
    });

    console.log("Final analysis:", finalAnalysis);

    console.log(
      "\nTest complete! Check the screenshots folder for visual output.",
    );
  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    await browser.close();
  }
}

// Create screenshots directory
import { ensureDir } from "https://deno.land/std@0.216.0/fs/mod.ts";
await ensureDir("./screenshots");

// Run the test
testCanvas().catch(console.error);
