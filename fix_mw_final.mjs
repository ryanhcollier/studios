import puppeteer from 'puppeteer';

(async () => {
  console.log("Launching Puppeteer with ignoreHTTPSErrors: true...");
  const browser = await puppeteer.launch({
    headless: "new",
    ignoreHTTPSErrors: true, // Bypass the misconfigured SSL certificate that blocked the previous attempt
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox', 
      '--window-size=1280,800',
    ]
  });
  const page = await browser.newPage();
  
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15');
  
  try {
    console.log(`Bypassing strict SSL to capture: https://www.designmw.com/`);
    await page.goto("https://www.designmw.com/", { waitUntil: 'domcontentloaded', timeout: 35000 });
    // Aggressive timeout to let media load since DOM content is usually just the frame
    await new Promise(r => setTimeout(r, 6000));
    await page.screenshot({ path: `public/screenshots/design-mw.jpg`, type: 'jpeg', quality: 90 });
    console.log(`Successfully bypassed SSL checks and rebuilt screenshot buffer: design-mw.jpg`);
  } catch (e) {
    console.log("Terminal Screenshot Failure:", e.message);
  }
  await browser.close();
})();
