/**
 * Test VAO binding - attempt 6
 */

import { chromium } from "npm:playwright@1.40.0";

async function testVAO() {
  let browser;

  try {
    console.log("🚀 Attempt 6: Testing VAO binding...");

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto("http://localhost:8001");
    await page.waitForSelector("canvas.game-canvas");
    await page.waitForTimeout(3000);

    // Start game
    await page.click('button:has-text("Start Game")');
    await page.waitForTimeout(2000);

    // Check VAO state during actual rendering
    const vaoTest = await page.evaluate(() => {
      const canvas = document.querySelector("canvas.game-canvas");
      const gl = canvas.getContext("webgl2");

      // Hook into the game's rendering to check VAO state
      const originalBindVertexArray = gl.bindVertexArray;
      const originalDrawElements = gl.drawElements;

      let vaoBinding = null;
      let drawCalls = 0;

      gl.bindVertexArray = function (vao) {
        vaoBinding = vao;
        return originalBindVertexArray.call(this, vao);
      };

      gl.drawElements = function (mode, count, type, offset) {
        drawCalls++;
        const currentVAO = gl.getParameter(gl.VERTEX_ARRAY_BINDING);
        console.log(
          "Draw call",
          drawCalls,
          "- VAO bound:",
          currentVAO ? "yes" : "no",
        );
        return originalDrawElements.call(this, mode, count, type, offset);
      };

      // Wait for next frame
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            vaoBinding: vaoBinding ? "set" : "null",
            drawCalls,
            currentVAO: gl.getParameter(gl.VERTEX_ARRAY_BINDING)
              ? "bound"
              : "unbound",
          });
        }, 1000);
      });
    });

    console.log("🔗 VAO Test Results:", vaoTest);

    await page.screenshot({ path: "screenshots/vao-test.png" });
    await browser.close();
  } catch (error) {
    console.log("❌ VAO test failed:", error.message);
    if (browser) {
      try {
        await browser.close();
      } catch (e) {}
    }
  }
}

testVAO();
