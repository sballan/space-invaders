# Claude Code Instructions for Space Invaders WebGL Game

## Development Workflow

### Required Actions After Every Code Change

1. **Run Full Test Suite**: Always execute the complete test suite after making
   any code changes:
   - `deno task test:all`
2. **Run Linter**: Always execute `deno task check` to maintain code quality and
   type safety

Example workflow:

```bash
# After making changes
deno task check
deno task test:all
```

**IMPORTANT**: All tests (unit and e2e) must pass before considering any code
change complete.

### Playing the Game with Playwright

#### Interactive Gameplay (Claude Plays the Game)

**Script**: `claude-play-game-interactive.ts`

**How it works**:

1. Start the interactive game server (runs in background):
   ```bash
   deno run --allow-all claude-play-game-interactive.ts
   ```

2. The server:
   - Launches a headless browser with the game
   - Starts the game and pauses it immediately
   - Opens a Unix socket at `/tmp/space-invaders.sock`
   - Waits for commands

3. Send commands via the socket using the helper script:
   ```bash
   deno run --allow-all send-game-command.ts <command>
   ```

4. Available commands:
   - `move_left` - Move player left for 0.5 seconds
   - `move_right` - Move player right for 0.5 seconds
   - `shoot` - Fire weapon
   - `wait` - Do nothing, let game state evolve
   - `quit` - Shut down the game server

5. After each command, the server:
   - Unpauses the game
   - Executes the action for 0.5 seconds
   - Pauses the game again
   - Takes a screenshot
   - Responds with the screenshot path: `SCREENSHOT: <path>`

**Claude's Gameplay Loop**:

```bash
# Start server in background
deno run --allow-all claude-play-game-interactive.ts &

# Claude analyzes screenshots and sends commands
deno run --allow-all send-game-command.ts shoot
# Response: SCREENSHOT: temp/screenshots/session-<timestamp>/turn-000.png

# Claude reads the screenshot, decides next action
deno run --allow-all send-game-command.ts move_right
# Response: SCREENSHOT: temp/screenshots/session-<timestamp>/turn-001.png

# Continue playing...
deno run --allow-all send-game-command.ts shoot
deno run --allow-all send-game-command.ts wait
deno run --allow-all send-game-command.ts quit
```

**Use Cases**:

- Claude can play the game strategically based on visual feedback
- Test AI decision-making and game difficulty
- Debug specific gameplay scenarios interactively
- Verify game balance through actual strategic gameplay
- Create gameplay demonstrations and documentation

### Special Test Cases

In exceptional scenarios, it might make sense to write a quick custom script to
see what the game is doing. Generally speaking, the interactive gameplay system
mentioned above should be used instead.

1. **Use Playwright for Verification**: When you want to know if a change was
   successful, use Playwright to test the functionality automatically
2. **Create Test Scripts**: Write Playwright test scripts in `temp/tests/` to
   verify:
   - Visual rendering (screenshots saved to `temp/screenshots/`)
   - Canvas pixel analysis
   - Game functionality
   - User interactions

Example Playwright verification:

```typescript
// Create test script in temp/tests/verify-feature.js
import { chromium } from "npm:playwright@1.40.0";

async function verifyChange() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto("http://localhost:8000");
  // ... test the specific change

  await page.screenshot({ path: "temp/screenshots/verification.png" });
  await browser.close();
}
```

### Temporary File Organization

- `temp/tests/` - Playwright verification scripts
- `temp/screenshots/` - Visual verification screenshots
- `temp/debug/` - Debug HTML tools and diagnostic files

All files in `temp/` directory are gitignored and safe to create/delete.

### Development Server

- **Start server**: `deno task start`
- **Default URL**: `http://localhost:8000` (or check console output for actual
  port)
- **Auto-restart**: Server automatically restarts when files change

### Project Structure

This project contains:

- **WebGL Graphics Engine**: Modular, reusable graphics system
- **Entity Component System**: Flexible game object architecture
- **Space Invaders Game**: Complete implementation using the engine
- **Comprehensive Tests**: Full test coverage for all modules
- **Type Safety**: Strict TypeScript throughout

### Testing Strategy

- **Unit Tests**: `deno test tests/` - Test individual modules and engine
  components
- **Integration Tests**: `deno test temp/tests/` - Playwright-based browser
  testing
- **End-to-End Tests**: `deno test e2e/` - Complete user workflow testing
- **Visual Tests**: Screenshot comparison via Playwright
- **Performance Tests**: Canvas pixel analysis for rendering verification

### Quality Standards

- All code must pass `deno task check` (formatting, linting, type checking)
- **ALL tests must pass** before considering changes complete
- Use Playwright to verify visual/interactive changes work correctly
- Document any new features or significant changes
- Maintain the modular architecture for extensibility

### Debugging WebGL Issues

When debugging rendering problems:

1. Use Playwright pixel analysis to check what's actually rendered
2. Take screenshots to visually verify output
3. Test with simplified shaders to isolate issues
4. Check WebGL state (VAO, buffers, uniforms) via browser automation
5. Verify coordinate transformations with test cases

### Architecture Notes

The game engine is designed for extensibility:

- **Graphics**: WebGL2 with batch rendering and shader management
- **ECS**: Component-based entities with system processing
- **Input**: Action-mapped input with multiple device support
- **Physics**: Spatial partitioning collision detection
- **Audio**: Web Audio API integration (currently disabled)

Future expansion points:

- New enemy types via additional components
- Different weapons through weapon component variations
- Multiple backgrounds via texture management
- New game modes through additional systems
