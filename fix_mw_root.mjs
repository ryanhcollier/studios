import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15');
  
  try {
    console.log(`Trying root domain: https://designmw.com`);
    await page.goto("https://designmw.com", { waitUntil: 'domcontentloaded', timeout: 35000 });
    await new Promise(r => setTimeout(r, 6000));
    await page.screenshot({ path: `public/screenshots/design-mw.jpg`, type: 'jpeg', quality: 90 });
    console.log(`Successfully bypassed SSL checks and rebuilt screenshot buffer: design-mw.jpg`);
  } catch (e) {
    console.log("Terminal Screenshot Failure:", e.message);
  }
  await browser.close();
})();
