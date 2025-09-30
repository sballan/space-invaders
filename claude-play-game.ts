import { chromium } from "npm:playwright@1.40.0";
import { ensureDir } from "https://deno.land/std@0.208.0/fs/mod.ts";

async function playGame() {
  console.log("Launching browser to play Space Invaders...");

  // Create session directory with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const sessionDir = `temp/screenshots/session-${timestamp}`;
  await ensureDir(sessionDir);
  console.log(`Screenshots will be saved to: ${sessionDir}`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  browser.on('disconnected', () => {
    console.log("Browser was closed/disconnected");
  });

  try {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 720 });

    await page.goto("http://localhost:8000");
    await page.waitForTimeout(1500);

    console.log("Game loaded! Taking initial screenshot...");
    await page.screenshot({ path: `${sessionDir}/00-menu.png` });

    // Start the game by pressing Enter or clicking the button
    console.log("Starting the game...");
    await page.click('text=START GAME');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${sessionDir}/01-game-started.png` });

    console.log("Playing the game...");

    // Play for a while - move around and shoot
    const playDuration = 60000; // Play for 60 seconds
    const startTime = Date.now();
    let screenshotCount = 1;

    while (Date.now() - startTime < playDuration) {
      // Random movement pattern with more shooting
      const action = Math.random();

      if (action < 0.2) {
        // Move left
        await page.keyboard.down("ArrowLeft");
        await page.waitForTimeout(100);
        await page.keyboard.up("ArrowLeft");
      } else if (action < 0.4) {
        // Move right
        await page.keyboard.down("ArrowRight");
        await page.waitForTimeout(100);
        await page.keyboard.up("ArrowRight");
      } else if (action < 0.85) {
        // Shoot - do this more often
        await page.keyboard.press("Space");
        await page.waitForTimeout(30);
      } else {
        // Occasional pause
        await page.waitForTimeout(200);
      }

      // Take screenshots every 1 second
      if (Date.now() - startTime > screenshotCount * 1000) {
        screenshotCount++;
        const paddedNum = String(screenshotCount).padStart(3, '0');
        await page.screenshot({
          path: `${sessionDir}/${paddedNum}.png`
        });

        if (screenshotCount % 10 === 0) {
          console.log(`Screenshot ${screenshotCount} captured at ${Math.floor((Date.now() - startTime) / 1000)}s`);
        }
      }

      await page.waitForTimeout(30);
    }

    // Final screenshot
    await page.screenshot({ path: `${sessionDir}/999-final.png` });
    console.log(`\nFinished playing! Captured ${screenshotCount} screenshots.`);
    console.log(`Check ${sessionDir}/ for gameplay captures.`);

  } catch (error) {
    console.error("Error during gameplay:", error);
  } finally {
    await browser.close();
  }
}

playGame().catch(console.error);