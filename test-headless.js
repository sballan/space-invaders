/**
 * Headless Playwright test - attempt 1
 */

import { chromium } from 'npm:playwright@1.40.0';

async function testHeadless() {
  let browser;

  try {
    console.log('🚀 Attempt 1: Headless test...');

    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    console.log('Navigating to localhost:8001...');
    await page.goto('http://localhost:8001', { timeout: 10000 });

    console.log('Waiting for canvas...');
    await page.waitForSelector('canvas.game-canvas', { timeout: 5000 });

    console.log('✅ SUCCESS: Page loaded and canvas found');

    // Take screenshot
    await page.screenshot({ path: 'screenshots/headless-test.png' });
    console.log('📸 Screenshot saved');

    await browser.close();
    return true;

  } catch (error) {
    console.log('❌ Headless test failed:', error.message);
    if (browser) {
      try { await browser.close(); } catch (e) {}
    }
    return false;
  }
}

testHeadless().then(success => {
  if (success) {
    console.log('Headless test worked! Trying next approach...');
  } else {
    console.log('Headless test failed. Trying different approach...');
  }
});