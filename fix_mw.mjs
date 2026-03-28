import puppeteer from 'puppeteer';
import fs from 'fs';

let studios = JSON.parse(fs.readFileSync('src/data/studios.json', 'utf8'));
const designMw = studios.find(s => s.name.toLowerCase().includes('design') && s.name.toLowerCase().includes('mw'));

(async () => {
  if (!designMw) return;
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox', 
      '--window-size=1280,800',
      '--disable-web-security', 
      '--disable-features=IsolateOrigins,site-per-process'
    ]
  });
  const page = await browser.newPage();
  
  // High-fidelity disguise
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15');
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
  });
  
  try {
    const overrideUrl = designMw.url.replace('http://', 'https://');
    console.log(`Trying standard capture via HTTPS: ${overrideUrl}`);
    await page.goto(overrideUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await new Promise(r => setTimeout(r, 6000));
    await page.screenshot({ path: `public/screenshots/design-mw.jpg`, type: 'jpeg', quality: 90 });
    console.log(`Successfully built local screenshot cache: design-mw.jpg`);
    
    // Save URL update
    designMw.url = overrideUrl;
    fs.writeFileSync('src/data/studios.json', JSON.stringify(studios, null, 2));

  } catch (e) {
    console.log("Screenshot failed again:", e.message);
  }
  await browser.close();
})();
