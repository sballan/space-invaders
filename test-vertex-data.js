/**
 * Test vertex data upload - attempt 9
 */

import { chromium } from "npm:playwright@1.40.0";

async function testVertexData() {
  let browser;

  try {
    console.log("🚀 Attempt 9: Testing vertex data and draw calls...");

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto("http://localhost:8001");
    await page.waitForSelector("canvas.game-canvas");
    await page.waitForTimeout(3000);

    await page.click('button:has-text("Start Game")');
    await page.waitForTimeout(2000);

    const vertexTest = await page.evaluate(() => {
      const canvas = document.querySelector("canvas.game-canvas");
      const gl = canvas.getContext("webgl2");

      // Override drawElements to see what's being drawn
      const originalDrawElements = gl.drawElements;
      let drawInfo = [];

      gl.drawElements = function (mode, count, type, offset) {
        // Check current state
        const currentVAO = gl.getParameter(gl.VERTEX_ARRAY_BINDING);
        const currentProgram = gl.getParameter(gl.CURRENT_PROGRAM);
        const viewport = gl.getParameter(gl.VIEWPORT);

        drawInfo.push({
          mode: mode === gl.TRIANGLES ? "TRIANGLES" : "OTHER",
          count,
          type: type === gl.UNSIGNED_SHORT ? "UNSIGNED_SHORT" : "OTHER",
          offset,
          vaoBinding: currentVAO ? "bound" : "unbound",
          programBinding: currentProgram ? "bound" : "unbound",
          viewport: Array.from(viewport),
        });

        // Call original
        const result = originalDrawElements.call(
          this,
          mode,
          count,
          type,
          offset,
        );

        // Check for errors after draw
        const error = gl.getError();
        if (error !== gl.NO_ERROR) {
          drawInfo[drawInfo.length - 1].error = error;
        }

        return result;
      };

      // Wait for some draws to happen
      return new Promise((resolve) => {
        setTimeout(() => {
          // Also check current WebGL state
          const currentState = {
            program: gl.getParameter(gl.CURRENT_PROGRAM) ? "bound" : "unbound",
            vao: gl.getParameter(gl.VERTEX_ARRAY_BINDING) ? "bound" : "unbound",
            arrayBuffer: gl.getParameter(gl.ARRAY_BUFFER_BINDING)
              ? "bound"
              : "unbound",
            elementBuffer: gl.getParameter(gl.ELEMENT_ARRAY_BUFFER_BINDING)
              ? "bound"
              : "unbound",
            viewport: Array.from(gl.getParameter(gl.VIEWPORT)),
          };

          // Read pixels to see if anything rendered
          const pixels = new Uint8Array(800 * 600 * 4);
          gl.readPixels(0, 0, 800, 600, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

          let coloredPixels = 0;
          for (let i = 0; i < pixels.length; i += 400) { // Sample
            if (pixels[i] > 0 || pixels[i + 1] > 0 || pixels[i + 2] > 0) {
              coloredPixels++;
            }
          }

          resolve({
            drawCalls: drawInfo.length,
            drawInfo: drawInfo.slice(0, 3), // First 3 draw calls
            currentState,
            sampledColoredPixels: coloredPixels,
            renderingWorking: coloredPixels > 0,
          });
        }, 2000);
      });
    });

    console.log("📊 Vertex Data Test Results:");
    console.log(JSON.stringify(vertexTest, null, 2));

    if (vertexTest.renderingWorking) {
      console.log("🎉 SUCCESS! Rendering is working!");
    } else {
      console.log("❌ Still no rendered pixels detected");
    }

    await page.screenshot({ path: "screenshots/vertex-test.png" });
    await browser.close();

    return vertexTest.renderingWorking;
  } catch (error) {
    console.log("❌ Vertex test failed:", error.message);
    if (browser) {
      try {
        await browser.close();
      } catch (e) {}
    }
    return false;
  }
}

testVertexData().then((success) => {
  if (!success) {
    console.log("🔄 Continuing to try more approaches...");
  }
});
