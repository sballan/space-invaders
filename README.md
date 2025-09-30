# Space Invaders WebGL Game

A classic Space Invaders game built with WebGL2, TypeScript, and Deno Fresh.

## Usage

Make sure to install Deno: https://deno.land/manual/getting_started/installation

Then start the project:

```
deno task start
```

This will watch the project directory and restart as necessary.

## Todo

### Priority Fixes
- [ ] Fix score tracking - ensure points awarded when invaders are destroyed
- [ ] Fix invader count display
- [ ] Fix game state display

### Gameplay Enhancements
- [ ] Add Invader Shooting - Make aliens fire back to increase difficulty
- [ ] Increase Game Speed - Invaders should move/descend faster as numbers decrease
- [ ] Add Shields - Classic 4 destructible barriers for cover
- [ ] Add Mystery Ship - UFO that flies across top for bonus points
- [ ] Add Difficulty Levels - Easy/Medium/Hard with different speeds
- [ ] Add High Score Persistence - Save best score to localStorage

### Visual/Audio
- [ ] Add Sound Effects - Shooting, explosions, invader movement
- [ ] Add Particle Effects - Explosions when invaders die
- [ ] Add Screen Shake - When player gets hit
- [ ] Animate Invaders - Toggle between two sprite frames

### Polish
- [ ] Game Over Screen - Show final score and restart option
- [ ] Level Complete - Transition to next level when all invaders destroyed
- [ ] Lives Display - Show ship icons instead of just number
- [ ] Pause Menu - Better pause screen with resume/quit options
