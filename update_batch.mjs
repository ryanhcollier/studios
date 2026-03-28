import fs from 'fs';
import puppeteer from 'puppeteer';

let studios = JSON.parse(fs.readFileSync('src/data/studios.json', 'utf8'));
const initialCount = studios.length;

// 1. Remove "merkley and partners"
studios = studios.filter(s => {
  const norm = s.name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return !norm.includes('merkley');
});

// 2. Change MRY to https://wearefka.com/
const mry = studios.find(s => s.name.toLowerCase() === 'mry');
if (mry) {
  mry.url = 'https://wearefka.com/';
  console.log('Updated URL for MRY to https://wearefka.com/');
}

// 3. Find Design MW
const designMw = studios.find(s => s.name.toLowerCase().includes('design') && s.name.toLowerCase().includes('mw'));

fs.writeFileSync('src/data/studios.json', JSON.stringify(studios, null, 2));
console.log(`Count went from ${initialCount} to ${studios.length}.`);

const slugify = (text) => text.toString().toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-');

(async () => {
  if (!designMw) {
    console.log("Could not find Design MW!");
    return;
  }
  
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
  
  try {
    const slug = slugify(designMw.name);
    console.log(`Taking screenshot for ${designMw.name} at ${designMw.url} (slug: ${slug})`);
    // Some sites are heavy, use domcontentloaded + timeout sequence
    await page.goto(designMw.url, { waitUntil: 'load', timeout: 45000 });
    await new Promise(r => setTimeout(r, 6000)); // wait for animations
    await page.screenshot({ path: `public/screenshots/${slug}.jpg`, type: 'jpeg', quality: 90 });
    console.log(`Successfully built local screenshot cache: ${slug}.jpg`);
  } catch (e) {
    console.log("Screenshot failed:", e.message);
  }
  await browser.close();
})();
