/**
 * Integration test for Space Invaders game startup
 * Tests that the dev server starts and the game initializes correctly
 */

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { chromium } from "npm:playwright@1.49.0";

const DEV_SERVER_PORT = 8000;
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;
const STARTUP_TIMEOUT = 30000; // 30 seconds for server startup

Deno.test({
  name: "Space Invaders game starts successfully",
  sanitizeOps: false,
  sanitizeResources: false,
  permissions: {
    read: true,
    net: true,
    run: true,
    write: true,
    env: true,
  },
}, async (t) => {
  // deno-lint-ignore no-explicit-any
  let serverProcess: any = null;
  // deno-lint-ignore no-explicit-any
  let browser: any = null;

  try {
    // Step 1: Start the dev server
    await t.step("Start dev server", async () => {
      console.log("Starting dev server...");

      const command = new Deno.Command("deno", {
        args: ["task", "start"],
        stdout: "piped",
        stderr: "piped",
        stdin: "null",
      });

      serverProcess = command.spawn();

      // Wait for server to be ready by checking if port is open
      const startTime = Date.now();
      let serverReady = false;

      while (Date.now() - startTime < STARTUP_TIMEOUT) {
        try {
          const response = await fetch(DEV_SERVER_URL);
          if (response.ok) {
            serverReady = true;
            console.log("Dev server is ready!");
            break;
          }
        } catch {
          // Server not ready yet
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      assertEquals(
        serverReady,
        true,
        "Dev server failed to start within timeout",
      );
    });

    // Step 2: Launch browser and navigate to game
    await t.step("Launch browser and load game", async () => {
      console.log("Launching browser...");

      // Try with explicit executable path
      const executablePath =
        "/Users/samuelballan/Library/Caches/ms-playwright/chromium-1148/chrome-mac/Chromium.app/Contents/MacOS/Chromium";
      console.log(`Using executable: ${executablePath}`);

      browser = await chromium.launch({
        headless: true,
        executablePath: executablePath,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
        ],
      });

      const context = await browser.newContext();
      const page = await context.newPage();

      // Collect console logs
      const consoleLogs: string[] = [];
      // deno-lint-ignore no-explicit-any
      page.on("console", (msg: any) => {
        const text = msg.text();
        consoleLogs.push(text);
        console.log(`[Browser Console]: ${text}`);
      });

      // Navigate to the game page
      console.log(`Navigating to ${DEV_SERVER_URL}...`);
      await page.goto(DEV_SERVER_URL, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      // Wait for the canvas to be present
      console.log("Waiting for game canvas...");
      await page.waitForSelector("canvas.game-canvas", { timeout: 10000 });

      // Wait a bit for the game to initialize
      await page.waitForTimeout(3000);

      // Click the "Start Game" button
      console.log("Looking for Start Game button...");
      const startButton = await page.locator('button:has-text("Start Game")')
        .first();

      if (await startButton.isVisible()) {
        console.log("Clicking Start Game button...");
        await startButton.click();

        // Wait for game to start
        await page.waitForTimeout(2000);
      }

      // Check if the game started log appears
      console.log("\n=== Checking console logs for game start message ===");
      const gameStarted = consoleLogs.some((log) =>
        log.includes("GAME STARTED") ||
        log.includes("Space Invaders is now running")
      );

      // Also check for other important initialization logs
      const engineStarted = consoleLogs.some((log) =>
        log.includes("Game engine started") ||
        log.includes("engine started successfully")
      );

      const gameInitialized = consoleLogs.some((log) =>
        log.includes("Game initialized successfully") ||
        log.includes("SpaceInvadersGame instance created")
      );

      console.log("\nConsole logs summary:");
      console.log(`- Engine started: ${engineStarted}`);
      console.log(`- Game initialized: ${gameInitialized}`);
      console.log(`- Game started: ${gameStarted}`);

      // Take a screenshot for debugging
      const screenshotDir = "e2e/screenshots";
      await Deno.mkdir(screenshotDir, { recursive: true });
      await page.screenshot({
        path: `${screenshotDir}/game-startup-${Date.now()}.png`,
        fullPage: true,
      });
      console.log("Screenshot saved to e2e/screenshots/");

      // Assertions
      assertEquals(
        gameStarted,
        true,
        "Game start message not found in console logs. Logs received: " +
          consoleLogs.slice(-10).join(", "),
      );

      // Clean up browser
      await browser.close();
    });
  } finally {
    // Cleanup: Close browser if still open
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        console.error("Error closing browser:", e);
      }
    }

    // Cleanup: Stop the dev server
    if (serverProcess) {
      console.log("\nStopping dev server...");
      try {
        serverProcess.kill("SIGTERM");
        // Give it a moment to shut down gracefully
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (e) {
        console.error("Error stopping server:", e);
        // Force kill if necessary
        try {
          serverProcess.kill("SIGKILL");
        } catch {
          // Ignore errors if process already stopped
        }
      }
    }
  }
});
