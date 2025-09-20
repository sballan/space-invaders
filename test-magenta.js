/**
 * Test magenta debug shader - attempt 23
 */

import { chromium } from "npm:playwright@1.40.0";

async function testMagenta() {
  let browser;

  try {
    console.log("🚀 Attempt 23: Testing magenta debug shader...");

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto("http://localhost:8000");
    await page.waitForSelector("canvas.game-canvas");
    await page.waitForTimeout(3000);

    await page.click('button:has-text("Start Game")');
    await page.waitForTimeout(4000);

    const result = await page.evaluate(() => {
      const canvas = document.querySelector("canvas.game-canvas");
      const gl = canvas.getContext("webgl2");

      const pixels = new Uint8Array(800 * 600 * 4);
      gl.readPixels(0, 0, 800, 600, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      let magentaPixels = 0;
      let totalColoredPixels = 0;
      let redPixels = 0;
      let greenPixels = 0;
      let bluePixels = 0;

      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];

        if (r > 0 || g > 0 || b > 0) {
          totalColoredPixels++;

          // Check for magenta (high red + high blue, low green)
          if (r > 200 && b > 200 && g < 100) {
            magentaPixels++;
          } else if (r > 100) {
            redPixels++;
          } else if (g > 100) {
            greenPixels++;
          } else if (b > 100) {
            bluePixels++;
          }
        }
      }

      // Check specific areas for magenta
      const areas = [
        { x: 400, y: 500, name: "player" },
        { x: 75, y: 100, name: "invader1" },
        { x: 200, y: 150, name: "invader2" },
      ];

      const areaColors = areas.map((area) => {
        const i = (area.y * 800 + area.x) * 4;
        const rgba = [pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]];
        const isMagenta = rgba[0] > 200 && rgba[2] > 200 && rgba[1] < 100;
        return {
          area: area.name,
          position: `${area.x},${area.y}`,
          rgba,
          isMagenta,
        };
      });

      return {
        totalColoredPixels,
        magentaPixels,
        redPixels,
        greenPixels,
        bluePixels,
        areaColors,
        percentageColored: ((totalColoredPixels / (800 * 600)) * 100).toFixed(
          3,
        ),
        magentaShaderWorked: magentaPixels > 1000,
      };
    });

    console.log("🎨 MAGENTA SHADER RESULTS:");
    console.log(JSON.stringify(result, null, 2));

    if (result.magentaShaderWorked) {
      console.log("🎉 ULTIMATE SUCCESS! Magenta shader worked!");
      console.log(`💜 Found ${result.magentaPixels} magenta pixels!`);
      console.log("🎮 Game engine rendering pipeline is working!");
    } else {
      console.log("❌ Even magenta shader failed");
      console.log(`Total colored: ${result.totalColoredPixels}`);
    }

    await page.screenshot({ path: "screenshots/magenta-test.png" });
    await browser.close();

    return result.magentaShaderWorked;
  } catch (error) {
    console.log("❌ Magenta test failed:", error.message);
    if (browser) {
      try {
        await browser.close();
      } catch (e) {}
    }
    return false;
  }
}

testMagenta();
