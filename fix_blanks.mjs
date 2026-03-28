import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import puppeteer from 'puppeteer';
import pLimit from 'p-limit';

const DIR = 'public/screenshots';
const studios = JSON.parse(fs.readFileSync('src/data/studios.json', 'utf8'));

// Extremely reliable solid-color detection mapping via pixel standard deviation
async function isSolidColor(imagePath) {
  try {
    const { channels } = await sharp(imagePath).stats();
    // A standard deviation over the pixel values close to 0 indicates a completely solid color (all pixels the same).
    // Sites with slight gradient/noise might sit at ~1 or 2. Typical websites are > 20.
    const maxStdev = Math.max(...channels.map(c => c.stdev));
    return maxStdev < 3; // Safe threshold for pure blank black/white/grey pages
  } catch (e) {
    console.error('Error analyzing image:', imagePath, e);
    return false;
  }
}

const slugify = (text) => text.toString().toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-');

async function run() {
  console.log("Analyzing all screenshots to detect blank geometry...");
  const files = fs.readdirSync(DIR).filter(f => f.endsWith('.jpg'));
  
  const solidSlugs = [];
  
  // 1. Analyze existing library
  for (const file of files) {
    const isSolid = await isSolidColor(path.join(DIR, file));
    if (isSolid) {
      solidSlugs.push(file.replace('.jpg', ''));
    }
  }

  console.log(`\nFound ${solidSlugs.length} completely blank screens.`);
  
  if (solidSlugs.length === 0) {
    console.log("No blank screens detected! Safe to exit.");
    process.exit(0);
  }

  // Find the studio objects that match these slugs
  const studiosToFix = [];
  for (const slug of solidSlugs) {
    // Reverse-lookup strategy
    const studio = studios.find(s => slugify(s.name) === slug);
    if (studio) studiosToFix.push(studio);
  }

  console.log(`\nSpinning up Puppeteer to rescue ${studiosToFix.length} studios with extended delays...`);
  
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  const limit = pLimit(5); // Throttle
  const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

  await Promise.all(studiosToFix.map(studio => limit(async () => {
    try {
      const page = await browser.newPage();
      await page.setUserAgent(USER_AGENT);
      page.setDefaultNavigationTimeout(35000);
      
      console.log(`Re-visiting: ${studio.name}`);
      await page.goto(studio.url, { waitUntil: 'load' }); // Use softer 'load' to not get stuck on trackers
      
      // Request criteria: Wait exactly 5 seconds before taking the snapshot
      await new Promise(r => setTimeout(r, 5000));
      
      const slug = slugify(studio.name);
      await page.screenshot({ path: `public/screenshots/${slug}.jpg`, type: 'jpeg', quality: 90 });
      await page.close();
      console.log(`[Fixed] Recreated detailed screenshot for ${studio.name}`);
    } catch(e) {
      console.log(`[Failed] Rescue attempt failed for ${studio.name}: ${e.message}`);
    }
  })));

  await browser.close();
  console.log("\nFinished blank screenshot rescue operation.");
}

run();
