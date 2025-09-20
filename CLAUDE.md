# Claude Code Instructions for Space Invaders WebGL Game

## Development Workflow

### Required Actions After Every Code Change

1. **Run Tests**: Always execute `deno test` after making any code changes to
   ensure nothing is broken
2. **Run Linter**: Always execute `deno task check` to maintain code quality and
   type safety

Example workflow:

```bash
# After making changes
deno test
deno task check
```

### Verification Process

Before asking the user to verify changes in their browser:

1. **Use Playwright for Verification**: When you want to know if a change was
   successful, use Playwright to test the functionality automatically
2. **Create Test Scripts**: Write Playwright test scripts in `temp/tests/` to verify:
   - Visual rendering (screenshots saved to `temp/screenshots/`)
   - Canvas pixel analysis
   - Game functionality
   - User interactions

Example Playwright verification:

```javascript
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

- **Unit Tests**: `deno test tests/` - Test individual modules
- **Integration Tests**: Playwright scripts - Test full game functionality
- **Visual Tests**: Screenshot comparison via Playwright
- **Performance Tests**: Canvas pixel analysis for rendering verification

### Quality Standards

- All code must pass `deno task check` (formatting, linting, type checking)
- All tests must pass before considering changes complete
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
