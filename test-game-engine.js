/**
 * Test game engine specifically - attempt 5
 */

import { chromium } from "npm:playwright@1.40.0";

async function testGameEngine() {
  let browser;

  try {
    console.log("🚀 Attempt 5: Testing game engine rendering...");

    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    await page.goto("http://localhost:8001");
    await page.waitForSelector("canvas.game-canvas");
    await page.waitForTimeout(3000);

    // Click start game
    await page.click('button:has-text("Start Game")');
    await page.waitForTimeout(2000);

    // Check the actual shader and rendering
    const renderingTest = await page.evaluate(() => {
      const canvas = document.querySelector("canvas.game-canvas");
      const gl = canvas.getContext("webgl2");

      if (!canvas || !gl) {
        return { error: "WebGL not available" };
      }

      // Check if there are any WebGL errors
      const glError = gl.getError();

      // Check what's bound
      const currentProgram = gl.getParameter(gl.CURRENT_PROGRAM);
      const arrayBuffer = gl.getParameter(gl.ARRAY_BUFFER_BINDING);
      const elementBuffer = gl.getParameter(gl.ELEMENT_ARRAY_BUFFER_BINDING);
      const vertexArray = gl.getParameter(gl.VERTEX_ARRAY_BINDING);

      // Check viewport
      const viewport = gl.getParameter(gl.VIEWPORT);

      // Force a manual clear to green to test if drawing works at all
      gl.clearColor(0, 1, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      // Read pixels after manual clear
      const pixels = new Uint8Array(800 * 600 * 4);
      gl.readPixels(0, 0, 800, 600, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      let greenPixels = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i + 1] > 100) {
          greenPixels++;
        }
      }

      return {
        glError,
        currentProgram: currentProgram ? "bound" : "none",
        arrayBuffer: arrayBuffer ? "bound" : "none",
        elementBuffer: elementBuffer ? "bound" : "none",
        vertexArray: vertexArray ? "bound" : "none",
        viewport: Array.from(viewport),
        greenPixelsAfterClear: greenPixels,
        clearTestWorked: greenPixels > 100000,
      };
    });

    console.log("🎨 Rendering Test:", renderingTest);

    // Take screenshot after manual clear
    await page.screenshot({ path: "screenshots/manual-clear-test.png" });
    console.log("📸 Manual clear test screenshot saved");

    await browser.close();
  } catch (error) {
    console.log("❌ Game engine test failed:", error.message);
    if (browser) {
      try {
        await browser.close();
      } catch (e) {}
    }
  }
}

testGameEngine();
