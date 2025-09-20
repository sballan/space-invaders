/**
 * Test simplified shaders - attempt 20
 */

import { chromium } from "npm:playwright@1.40.0";

async function testSimplified() {
  let browser;

  try {
    console.log("🚀 Attempt 20: Testing simplified shaders...");

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto("http://localhost:8000"); // Updated port
    await page.waitForSelector("canvas.game-canvas");
    await page.waitForTimeout(3000);

    await page.click('button:has-text("Start Game")');
    await page.waitForTimeout(4000);

    const result = await page.evaluate(() => {
      const canvas = document.querySelector("canvas.game-canvas");
      const gl = canvas.getContext("webgl2");

      const pixels = new Uint8Array(800 * 600 * 4);
      gl.readPixels(0, 0, 800, 600, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      let coloredPixels = 0;
      let greenPixels = 0;
      let colorBreakdown = { red: 0, green: 0, blue: 0, other: 0 };

      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];

        if (r > 0 || g > 0 || b > 0) {
          coloredPixels++;

          if (g > 150 && r < 100 && b < 100) {
            colorBreakdown.green++;
            greenPixels++;
          } else if (r > 150 && g < 100 && b < 100) {
            colorBreakdown.red++;
          } else if (b > 150 && r < 100 && g < 100) {
            colorBreakdown.blue++;
          } else {
            colorBreakdown.other++;
          }
        }
      }

      // Check specific locations
      const locations = [
        { x: 400, y: 500, name: "player" },
        { x: 75, y: 100, name: "invader1" },
        { x: 135, y: 100, name: "invader2" },
        { x: 400, y: 300, name: "center" },
      ];

      const locationColors = locations.map((loc) => {
        const i = (loc.y * 800 + loc.x) * 4;
        return {
          location: loc.name,
          position: `${loc.x},${loc.y}`,
          rgba: [pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]],
        };
      });

      return {
        totalColoredPixels: coloredPixels,
        colorBreakdown,
        locationColors,
        percentageColored: ((coloredPixels / (800 * 600)) * 100).toFixed(3),
        gameWorking: coloredPixels > 1000,
      };
    });

    console.log("🎮 SIMPLIFIED SHADER RESULTS:");
    console.log(JSON.stringify(result, null, 2));

    if (result.gameWorking) {
      console.log("🏆 SUCCESS! GAME IS NOW WORKING!");
      console.log(`🎨 Found ${result.totalColoredPixels} colored pixels!`);
      console.log("🟢 Green pixels:", result.colorBreakdown.green);
      console.log("🔴 Red pixels:", result.colorBreakdown.red);
      console.log("🔵 Blue pixels:", result.colorBreakdown.blue);
    } else {
      console.log("❌ Simplified shaders still not working");
    }

    await page.screenshot({ path: "screenshots/simplified-shaders.png" });
    await browser.close();

    return result.gameWorking;
  } catch (error) {
    console.log("❌ Simplified test failed:", error.message);
    if (browser) {
      try {
        await browser.close();
      } catch (e) {}
    }
    return false;
  }
}

testSimplified();
