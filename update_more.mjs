import fs from 'fs';
import puppeteer from 'puppeteer';

let studios = JSON.parse(fs.readFileSync('src/data/studios.json', 'utf8'));

// 1. Remove "Perception"
const initCount = studios.length;
studios = studios.filter(s => {
  const norm = s.name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return !norm.includes('perception');
});

fs.writeFileSync('src/data/studios.json', JSON.stringify(studios, null, 2));
console.log(`Count went from ${initCount} to ${studios.length} after removing Perception.`);

// 2. Identify studios to update
const namesToUpdate = ['seiden', 'framestore', 'thinc', 'method'];
const targets = [];
for (const n of namesToUpdate) {
  const match = studios.find(s => s.name.toLowerCase().includes(n));
  if (match) targets.push(match);
}

const slugify = (text) => text.toString().toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-');

(async () => {
  if (targets.length === 0) {
    console.log("None of the targets found to update.");
    return;
  }
  
  console.log(`Found ${targets.length} studios to force-update: ${targets.map(t=>t.name).join(', ')}`);

  const browser = await puppeteer.launch({
    headless: "new",
    ignoreHTTPSErrors: true, 
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });
  
  for (const t of targets) {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    try {
      const slug = slugify(t.name);
      console.log(`Forcing screenshot for ${t.name} at ${t.url}...`);
      await page.goto(t.url, { waitUntil: 'load', timeout: 45000 });
      await new Promise(r => setTimeout(r, 6000)); // Crucial static buffer for complex sites
      await page.screenshot({ path: `public/screenshots/${slug}.jpg`, type: 'jpeg', quality: 90 });
      console.log(`[Success] Overwritten local cache for ${slug}.jpg`);
    } catch (e) {
      console.log(`[Failed] Could not screenshot ${t.name}: ${e.message}`);
    }
    await page.close();
  }
  
  await browser.close();
  console.log("Batch operation complete.");
})();
