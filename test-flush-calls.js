/**
 * Test flush calls - attempt 22
 */

import { chromium } from "npm:playwright@1.40.0";

async function testFlushCalls() {
  let browser;

  try {
    console.log("🚀 Attempt 22: Testing flush calls and vertex uploads...");

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto("http://localhost:8000");
    await page.waitForSelector("canvas.game-canvas");
    await page.waitForTimeout(3000);

    await page.click('button:has-text("Start Game")');
    await page.waitForTimeout(2000);

    const flushTest = await page.evaluate(() => {
      const canvas = document.querySelector("canvas.game-canvas");
      const gl = canvas.getContext("webgl2");

      // Hook into WebGL functions to track what's happening
      const originalBufferSubData = gl.bufferSubData;
      const originalDrawElements = gl.drawElements;
      const originalClear = gl.clear;

      let bufferUploads = 0;
      let drawCalls = 0;
      let clearCalls = 0;
      let lastVertexData = null;

      gl.bufferSubData = function (target, offset, data) {
        bufferUploads++;
        if (target === gl.ARRAY_BUFFER && data.length > 0) {
          // Capture first few vertex values
          lastVertexData = Array.from(data.subarray(0, 16)); // First 2 vertices worth
        }
        return originalBufferSubData.call(this, target, offset, data);
      };

      gl.drawElements = function (mode, count, type, offset) {
        drawCalls++;

        // Check current state before draw
        const currentVAO = gl.getParameter(gl.VERTEX_ARRAY_BINDING);
        const currentProgram = gl.getParameter(gl.CURRENT_PROGRAM);

        console.log(
          `Draw call ${drawCalls}: count=${count}, VAO=${
            currentVAO ? "bound" : "unbound"
          }, program=${currentProgram ? "bound" : "unbound"}`,
        );

        return originalDrawElements.call(this, mode, count, type, offset);
      };

      gl.clear = function (mask) {
        clearCalls++;
        return originalClear.call(this, mask);
      };

      // Wait for some frames
      return new Promise((resolve) => {
        setTimeout(() => {
          // Read pixels to see results
          const pixels = new Uint8Array(800 * 600 * 4);
          gl.readPixels(0, 0, 800, 600, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

          let coloredPixels = 0;
          for (let i = 0; i < pixels.length; i += 4000) { // Sample every 1000th pixel
            if (pixels[i] > 0 || pixels[i + 1] > 0 || pixels[i + 2] > 0) {
              coloredPixels++;
            }
          }

          resolve({
            bufferUploads,
            drawCalls,
            clearCalls,
            lastVertexData,
            sampledColoredPixels: coloredPixels,
            pipelineWorking: drawCalls > 0 && bufferUploads > 0,
          });
        }, 2000);
      });
    });

    console.log("🔄 FLUSH TEST RESULTS:");
    console.log(JSON.stringify(flushTest, null, 2));

    if (flushTest.pipelineWorking) {
      console.log("✅ Rendering pipeline is active");
      console.log(`📊 Buffer uploads: ${flushTest.bufferUploads}`);
      console.log(`🎨 Draw calls: ${flushTest.drawCalls}`);
      console.log(`🧹 Clear calls: ${flushTest.clearCalls}`);

      if (flushTest.lastVertexData) {
        console.log(
          "📦 Last vertex data sample:",
          flushTest.lastVertexData.slice(0, 8),
        );
      }
    } else {
      console.log("❌ Rendering pipeline not working");
    }

    await page.screenshot({ path: "screenshots/flush-test.png" });
    await browser.close();

    return flushTest.pipelineWorking;
  } catch (error) {
    console.log("❌ Flush test failed:", error.message);
    if (browser) {
      try {
        await browser.close();
      } catch (e) {}
    }
    return false;
  }
}

testFlushCalls();
