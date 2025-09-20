/**
 * Debug route for canvas pixel analysis
 */

import { Head } from "$fresh/runtime.ts";

export default function DebugPage() {
  return (
    <>
      <Head>
        <title>Canvas Debug</title>
      </Head>
      <div
        style={{
          padding: "20px",
          fontFamily: "monospace",
          background: "#000",
          color: "#0f0",
          minHeight: "100vh",
        }}
      >
        <h1>Canvas Debug Tool</h1>

        <div style={{ margin: "20px 0" }}>
          <h2>Instructions:</h2>
          <ol>
            <li>
              Open the main game page in another tab:{" "}
              <a href="/" style={{ color: "#0ff" }}>http://localhost:8001</a>
            </li>
            <li>Start the game and let it run</li>
            <li>Come back to this tab</li>
            <li>Click the buttons below to analyze the canvas</li>
          </ol>
        </div>

        <div style={{ margin: "20px 0" }}>
          <button
            onclick="analyzeGameCanvas()"
            style={{
              padding: "10px 20px",
              margin: "5px",
              background: "transparent",
              border: "2px solid #0f0",
              color: "#0f0",
              cursor: "pointer",
            }}
          >
            Analyze Canvas From Main Tab
          </button>

          <button
            onclick="takeCanvasScreenshot()"
            style={{
              padding: "10px 20px",
              margin: "5px",
              background: "transparent",
              border: "2px solid #ff0",
              color: "#ff0",
              cursor: "pointer",
            }}
          >
            Download Canvas Screenshot
          </button>
        </div>

        <div
          id="results"
          style={{
            background: "rgba(0,255,0,0.1)",
            padding: "20px",
            marginTop: "20px",
            border: "1px solid #0f0",
            whiteSpace: "pre-line",
          }}
        >
          Results will appear here...
        </div>

        <script
          dangerouslySetInnerHTML={{
            __html: `
            function analyzeGameCanvas() {
              // Try to get reference to the game canvas from the main tab
              // We'll use cross-tab communication or direct DOM access

              const results = document.getElementById('results');

              try {
                // Check if we can access other tabs (same origin)
                const gameWindow = window.open('/', 'gameWindow');

                setTimeout(() => {
                  try {
                    const canvas = gameWindow.document.querySelector('canvas.game-canvas');

                    if (!canvas) {
                      results.textContent = 'ERROR: Could not find game canvas. Make sure the game is running in another tab.';
                      gameWindow.close();
                      return;
                    }

                    const gl = canvas.getContext('webgl2');
                    if (!gl) {
                      results.textContent = 'ERROR: Could not get WebGL context from game canvas.';
                      gameWindow.close();
                      return;
                    }

                    // Read pixel data
                    const width = canvas.width;
                    const height = canvas.height;
                    const pixels = new Uint8Array(width * height * 4);

                    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

                    // Analyze pixels
                    let nonBlackPixels = 0;
                    let colorMap = new Map();
                    let samplePixels = [];

                    // Sample every 10th pixel for analysis
                    for (let i = 0; i < pixels.length; i += 40) { // Every 10 pixels
                      const r = pixels[i];
                      const g = pixels[i + 1];
                      const b = pixels[i + 2];
                      const a = pixels[i + 3];

                      if (r > 0 || g > 0 || b > 0 || a < 255) {
                        nonBlackPixels++;
                        const color = \`\${r},\${g},\${b},\${a}\`;
                        colorMap.set(color, (colorMap.get(color) || 0) + 1);

                        if (samplePixels.length < 20) {
                          const pixelIndex = Math.floor(i / 4);
                          const x = pixelIndex % width;
                          const y = Math.floor(pixelIndex / width);
                          samplePixels.push({ x, y, r, g, b, a });
                        }
                      }
                    }

                    // Display results
                    let resultText = \`CANVAS ANALYSIS RESULTS:\\n\\n\`;
                    resultText += \`Canvas size: \${width} x \${height}\\n\`;
                    resultText += \`Total pixels: \${width * height}\\n\`;
                    resultText += \`Non-black pixels found: \${nonBlackPixels}\\n\`;
                    resultText += \`Unique colors: \${colorMap.size}\\n\\n\`;

                    if (colorMap.size > 0) {
                      resultText += \`TOP COLORS FOUND:\\n\`;
                      const sortedColors = Array.from(colorMap.entries())
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 10);

                      for (const [color, count] of sortedColors) {
                        resultText += \`  \${color}: \${count} pixels\\n\`;
                      }

                      resultText += \`\\nSAMPLE PIXEL LOCATIONS:\\n\`;
                      for (const pixel of samplePixels.slice(0, 10)) {
                        resultText += \`  (\${pixel.x}, \${pixel.y}): rgba(\${pixel.r}, \${pixel.g}, \${pixel.b}, \${pixel.a})\\n\`;
                      }
                    } else {
                      resultText += \`NO NON-BLACK PIXELS FOUND!\\n\`;
                      resultText += \`This means either:\\n\`;
                      resultText += \`  1. Nothing is being rendered\\n\`;
                      resultText += \`  2. Everything is being rendered as black\\n\`;
                      resultText += \`  3. Everything is being rendered with 0 alpha\\n\`;
                    }

                    results.textContent = resultText;
                    gameWindow.close();

                  } catch (err) {
                    results.textContent = \`ERROR analyzing canvas: \${err.message}\`;
                    gameWindow.close();
                  }
                }, 1000);

              } catch (error) {
                results.textContent = \`ERROR: \${error.message}\\n\\nTry running this in the same tab as the game instead.\`;
              }
            }

            function takeCanvasScreenshot() {
              const results = document.getElementById('results');
              results.textContent = 'Opening game in new tab to capture screenshot...';

              const gameWindow = window.open('/', 'gameWindow');

              setTimeout(() => {
                try {
                  const canvas = gameWindow.document.querySelector('canvas.game-canvas');
                  if (!canvas) {
                    results.textContent = 'ERROR: Could not find canvas in game tab';
                    gameWindow.close();
                    return;
                  }

                  // Create download link
                  const link = document.createElement('a');
                  link.download = 'canvas-debug.png';
                  link.href = canvas.toDataURL();
                  link.click();

                  results.textContent = 'Screenshot download triggered!';
                  gameWindow.close();

                } catch (err) {
                  results.textContent = \`ERROR: \${err.message}\`;
                  gameWindow.close();
                }
              }, 2000);
            }
          `,
          }}
        />
      </div>
    </>
  );
}
