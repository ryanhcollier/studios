import fs from 'fs';
import puppeteer from 'puppeteer';

let studios = JSON.parse(fs.readFileSync('src/data/studios.json', 'utf8'));
const initCount = studios.length;

// 1. Remove "dbny" and "division of"
studios = studios.filter(s => {
  const norm = s.name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return norm !== 'dbny' && !norm.includes('divisionof');
});

fs.writeFileSync('src/data/studios.json', JSON.stringify(studios, null, 2));
console.log(`Count went from ${initCount} to ${studios.length} after removals.`);

// 2. Identify "Studio Rodrigo" to update
const rodrigo = studios.find(s => s.name.toLowerCase().includes('rodrigo'));
const slugify = (text) => text.toString().toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-');

(async () => {
  if (!rodrigo) {
    console.log("Could not find Studio Rodrigo.");
    return;
  }
  
  console.log(`Forcing screenshot for ${rodrigo.name} at ${rodrigo.url}...`);

  const browser = await puppeteer.launch({
    headless: "new",
    ignoreHTTPSErrors: true, 
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });
  
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
  
  try {
    const slug = slugify(rodrigo.name);
    await page.goto(rodrigo.url, { waitUntil: 'load', timeout: 35000 });
    await new Promise(r => setTimeout(r, 6000)); // Crucial static buffer for complex sites
    await page.screenshot({ path: `public/screenshots/${slug}.jpg`, type: 'jpeg', quality: 90 });
    console.log(`[Success] Overwritten local cache for ${slug}.jpg`);
  } catch (e) {
    console.log(`[Failed] Could not screenshot ${rodrigo.name}: ${e.message}`);
  }
  await page.close();
  await browser.close();
})();
