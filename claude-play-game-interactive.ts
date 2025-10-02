import { chromium, type Page } from "npm:playwright@1.40.0";
import { ensureDir } from "https://deno.land/std@0.208.0/fs/mod.ts";

/**
 * Interactive game player that communicates via Unix socket
 *
 * Protocol:
 * - Listens on /tmp/space-invaders.sock
 * - Receives command: "move_left", "move_right", "shoot", "wait", or "quit"
 * - Executes action for ACTION_DURATION_MS milliseconds
 * - Takes screenshot
 * - Responds with: "SCREENSHOT: <path>"
 * - Waits for next command
 */

const SOCKET_PATH = "/tmp/space-invaders.sock";
const ACTION_DURATION_MS = 200; // How long to run the game before pausing and taking screenshot

async function handleConnection(
  conn: Deno.Conn,
  page: Page,
  sessionDir: string,
  turnCounter: { value: number },
): Promise<boolean> {
  const buffer = new Uint8Array(1024);
  const n = await conn.read(buffer);

  if (n === null) {
    return true; // Connection closed, continue server
  }

  const command = new TextDecoder().decode(buffer.subarray(0, n)).trim();
  console.log(`RECEIVED: ${command}`);

  if (command === "quit") {
    await conn.write(new TextEncoder().encode("QUIT: Shutting down\n"));
    conn.close();
    return false; // Signal to stop server
  }

  try {
    // Unpause the game
    await page.keyboard.press("Shift+KeyP");
    await page.waitForTimeout(25);

    // Execute the action for ACTION_DURATION_MS
    switch (command) {
      case "move_left":
        await page.keyboard.down("ArrowLeft");
        await page.waitForTimeout(ACTION_DURATION_MS);
        await page.keyboard.up("ArrowLeft");
        break;
      case "move_right":
        await page.keyboard.down("ArrowRight");
        await page.waitForTimeout(ACTION_DURATION_MS);
        await page.keyboard.up("ArrowRight");
        break;
      case "shoot":
        await page.keyboard.press("Space");
        await page.waitForTimeout(ACTION_DURATION_MS);
        break;
      case "wait":
        await page.waitForTimeout(ACTION_DURATION_MS);
        break;
      default:
        console.log(`WARNING: Unknown command '${command}'`);
        await page.waitForTimeout(ACTION_DURATION_MS);
    }

    // Pause the game again
    await page.keyboard.press("Shift+KeyP");
    await page.waitForTimeout(25);

    // Take screenshot
    const screenshotPath = `${sessionDir}/turn-${
      String(turnCounter.value).padStart(3, "0")
    }.png`;
    await page.screenshot({ path: screenshotPath });
    turnCounter.value++;

    // Send response
    const response = `SCREENSHOT: ${screenshotPath}\n`;
    await conn.write(new TextEncoder().encode(response));
    console.log(`SENT: ${response.trim()}`);
  } catch (error) {
    const errorMsg = `ERROR: ${error}\n`;
    await conn.write(new TextEncoder().encode(errorMsg));
    console.error(errorMsg);
  }

  conn.close();
  return true; // Continue server
}

async function playGameInteractive() {
  console.log("READY: Starting interactive game player with Unix socket");

  // Clean up old socket if it exists
  try {
    await Deno.remove(SOCKET_PATH);
  } catch {
    // Socket doesn't exist, that's fine
  }

  // Create session directory with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const sessionDir = `temp/screenshots/session-${timestamp}`;
  await ensureDir(sessionDir);
  console.log(`SESSION_DIR: ${sessionDir}`);

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  let page: Page | null = null;
  let listener: Deno.Listener | null = null;

  try {
    page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 720 });

    console.log("LOADING: Navigating to game...");
    await page.goto("http://localhost:8000");
    await page.waitForTimeout(1500);

    // Take menu screenshot
    const menuPath = `${sessionDir}/00-menu.png`;
    await page.screenshot({ path: menuPath });
    console.log(`INITIAL_SCREENSHOT: ${menuPath}`);

    // Start the game
    console.log("STARTING: Clicking start button...");
    await page.click("text=START GAME");
    await page.waitForTimeout(100);

    // Immediately pause the game with Shift+P
    console.log("PAUSING: Game is paused and ready");
    await page.keyboard.press("Shift+KeyP");
    await page.waitForTimeout(50);

    // Start Unix socket server
    listener = Deno.listen({ path: SOCKET_PATH, transport: "unix" });
    console.log(`LISTENING: Unix socket server at ${SOCKET_PATH}`);
    console.log(
      "READY: Send commands via socket (move_left, move_right, shoot, wait, quit)",
    );

    const turnCounter = { value: 0 };
    let shouldContinue = true;

    while (shouldContinue) {
      const conn = await listener.accept();
      shouldContinue = await handleConnection(
        conn,
        page,
        sessionDir,
        turnCounter,
      );
    }

    console.log(`COMPLETE: Played ${turnCounter.value} turns`);
  } catch (error) {
    console.error("ERROR:", error);
  } finally {
    if (listener) {
      listener.close();
      try {
        await Deno.remove(SOCKET_PATH);
      } catch {
        // Ignore cleanup errors
      }
    }
    await browser.close();
    console.log("CLOSED: Browser and socket closed");
  }
}

playGameInteractive().catch(console.error);
