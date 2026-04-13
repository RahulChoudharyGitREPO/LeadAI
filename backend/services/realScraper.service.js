const { chromium } = require('playwright');

/**
 * Scrape visible text from a webpage using Playwright
 * @param {string} url - The URL to scrape
 * @returns {Promise<string>} - Cleaned visible text content
 */
async function scrapePage(url) {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    // Set a reasonable timeout
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Extract text from body
    const bodyText = await page.evaluate(() => {
      // Remove scripts, styles, and extra whitespace
      const scripts = document.querySelectorAll('script, style, nav, footer');
      scripts.forEach(s => s.remove());
      return document.body.innerText.replace(/\s+/g, ' ').trim();
    });

    await browser.close();
    return bodyText;
  } catch (error) {
    if (browser) await browser.close();
    console.warn(`Scraping failed for ${url}:`, error.message);
    return ""; // Return empty string so other pages can still be tried
  }
}

module.exports = { scrapePage };
