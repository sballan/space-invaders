import { chromium, type Page } from "npm:playwright@1.40.0";
import { ensureDir } from "https://deno.land/std@0.208.0/fs/mod.ts";

/**
 * Analyzes a game screenshot and decides on the next action
 * Returns one of: "move_left", "move_right", "shoot", "stay"
 */
function decideAction(turnNumber: number): string {
  // Simple strategy: alternate between shooting and moving
  // In a more sophisticated version, this could analyze the screenshot
  const cycle = turnNumber % 6;

  if (cycle === 0 || cycle === 1) {
    return "shoot";
  } else if (cycle === 2) {
    return "move_left";
  } else if (cycle === 3) {
    return "shoot";
  } else if (cycle === 4) {
    return "move_right";
  } else {
    return "shoot";
  }
}

/**
 * Waits for debug pause message in console
 */
async function waitForPauseMessage(
  page: Page,
  expectedState: "PAUSED" | "RESUMED",
  timeoutMs = 2000,
) {
  let found = false;

  // Listen for console messages
  const messagePromise = new Promise<void>((resolve) => {
    const handler = (msg: { text: () => string }) => {
      const text = msg.text();
      if (text.includes(`[DEBUG PAUSE] ${expectedState}`)) {
        found = true;
        page.off("console", handler);
        resolve();
      }
    };
    page.on("console", handler);

    // Timeout fallback
    setTimeout(() => {
      if (!found) {
        page.off("console", handler);
        resolve();
      }
    }, timeoutMs);
  });

  await messagePromise;

  if (found) {
    console.log(`✓ Confirmed: Game is ${expectedState}`);
  } else {
    console.log(`⚠ Timeout waiting for ${expectedState} confirmation`);
  }
}

async function playGame() {
  console.log(
    "Launching browser to play Space Invaders with pause-based control...",
  );

  // Create session directory with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const sessionDir = `temp/screenshots/session-${timestamp}`;
  await ensureDir(sessionDir);
  console.log(`Screenshots will be saved to: ${sessionDir}`);

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  browser.on("disconnected", () => {
    console.log("Browser was closed/disconnected");
  });

  try {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 720 });

    // Enable console log capture
    page.on("console", (msg) => {
      if (msg.text().includes("[DEBUG PAUSE]")) {
        console.log(`Browser console: ${msg.text()}`);
      }
    });

    await page.goto("http://localhost:8000");
    await page.waitForTimeout(1500);

    console.log("Game loaded! Taking initial screenshot...");
    await page.screenshot({ path: `${sessionDir}/00-menu.png` });

    // Start the game
    console.log("Starting the game...");
    await page.click("text=START GAME");
    await page.waitForTimeout(1000);

    // Immediately pause the game with Shift+P
    console.log("\n=== Turn 0: Initial pause ===");
    console.log("Pressing Shift+P to pause...");
    await page.keyboard.press("Shift+KeyP");
    await waitForPauseMessage(page, "PAUSED");
    await page.waitForTimeout(100);

    // Take initial paused screenshot
    await page.screenshot({ path: `${sessionDir}/01-turn-000-paused.png` });
    console.log("Initial paused state captured");

    // Play for N turns
    const totalTurns = 50;
    console.log(`\nPlaying for ${totalTurns} turns...`);

    for (let turn = 1; turn <= totalTurns; turn++) {
      console.log(`\n=== Turn ${turn} ===`);

      // Decide on action based on the "analysis" of the screenshot
      const action = decideAction(turn);
      console.log(`Decision: ${action}`);

      // Unpause the game
      console.log("Unpausing (Shift+P)...");
      await page.keyboard.press("Shift+KeyP");
      await waitForPauseMessage(page, "RESUMED");
      await page.waitForTimeout(50);

      // Execute the action
      console.log(`Executing action: ${action}...`);
      switch (action) {
        case "move_left":
          await page.keyboard.down("ArrowLeft");
          await page.waitForTimeout(150);
          await page.keyboard.up("ArrowLeft");
          break;
        case "move_right":
          await page.keyboard.down("ArrowRight");
          await page.waitForTimeout(150);
          await page.keyboard.up("ArrowRight");
          break;
        case "shoot":
          await page.keyboard.press("Space");
          await page.waitForTimeout(100);
          break;
        case "stay":
          await page.waitForTimeout(150);
          break;
      }

      // Pause the game again
      console.log("Pausing again (Shift+P)...");
      await page.keyboard.press("Shift+KeyP");
      await waitForPauseMessage(page, "PAUSED");
      await page.waitForTimeout(100);

      // Take screenshot of paused state
      const paddedNum = String(turn).padStart(3, "0");
      await page.screenshot({
        path: `${sessionDir}/01-turn-${paddedNum}-paused.png`,
      });
      console.log(`✓ Turn ${turn} complete, screenshot saved`);
    }

    // Final screenshot
    console.log("\n=== Game complete ===");
    await page.screenshot({ path: `${sessionDir}/999-final.png` });
    console.log(`\nFinished playing! Captured ${totalTurns + 1} turns.`);
    console.log(`Check ${sessionDir}/ for gameplay captures.`);
  } catch (error) {
    console.error("Error during gameplay:", error);
  } finally {
    await browser.close();
  }
}

playGame().catch(console.error);
