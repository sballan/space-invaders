#!/usr/bin/env -S deno run --allow-all

/**
 * Helper script to send commands to the interactive game server
 * Usage: deno run --allow-all send-game-command.ts <command>
 * Commands: move_left, move_right, shoot, wait, quit
 */

const SOCKET_PATH = "/tmp/space-invaders.sock";

async function sendCommand(command: string): Promise<string> {
  try {
    const conn = await Deno.connect({ path: SOCKET_PATH, transport: "unix" });

    // Send command
    await conn.write(new TextEncoder().encode(command + "\n"));

    // Read response
    const buffer = new Uint8Array(4096);
    const n = await conn.read(buffer);

    if (n === null) {
      conn.close();
      return "ERROR: No response from server";
    }

    const response = new TextDecoder().decode(buffer.subarray(0, n)).trim();
    conn.close();

    return response;
  } catch (error) {
    return `ERROR: ${error instanceof Error ? error.message : String(error)}`;
  }
}

if (import.meta.main) {
  const command = Deno.args[0];

  if (!command) {
    console.error("Usage: send-game-command.ts <command>");
    console.error("Commands: move_left, move_right, shoot, wait, quit");
    Deno.exit(1);
  }

  const response = await sendCommand(command);
  console.log(response);
}

export { sendCommand };
