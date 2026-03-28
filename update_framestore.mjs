import puppeteer from 'puppeteer';
import fs from 'fs';

let studios = JSON.parse(fs.readFileSync('src/data/studios.json', 'utf8'));
const t = studios.find(s => s.name === "Frame Store");
const slugify = (text) => text.toString().toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-');

(async () => {
  if (!t) {
    console.log("Not found.");
    return;
  }
  const browser = await puppeteer.launch({
    headless: "new",
    ignoreHTTPSErrors: true, 
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });
  
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
  try {
    const slug = slugify(t.name);
    console.log(`Forcing screenshot for ${t.name} at ${t.url}...`);
    await page.goto(t.url, { waitUntil: 'load', timeout: 45000 });
    await new Promise(r => setTimeout(r, 6000)); 
    await page.screenshot({ path: `public/screenshots/${slug}.jpg`, type: 'jpeg', quality: 90 });
    console.log(`[Success] Overwritten local cache for ${slug}.jpg`);
  } catch (e) {
    console.log(`[Failed] Could not screenshot ${t.name}: ${e.message}`);
  }
  await page.close();
  await browser.close();
})();
