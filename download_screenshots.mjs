import fs from 'fs';
import path from 'path';
import pLimit from 'p-limit';
import puppeteer from 'puppeteer';

// To run this, you can compile it via tsx or just run it natively with Node 20+ if type module is set
// Assuming it's a ES module because Vite's tsconfig often sets up ES modules
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const studiosFile = path.join(__dirname, 'src', 'data', 'studios.json');
const outDir = path.join(__dirname, 'public', 'screenshots');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Read the JSON data
const studios = JSON.parse(fs.readFileSync(studiosFile, 'utf8'));

// Slugify function to create safe filenames
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')       // Replace spaces with -
    .replace(/[^\w-]+/g, '')    // Remove all non-word chars
    .replace(/--+/g, '-')       // Replace multiple - with single -
    .replace(/^-+/, '')         // Trim - from start of text
    .replace(/-+$/, '');        // Trim - from end of text
};

async function captureScreenshots() {
  console.log(`Starting to capture ${studios.length} screenshots...`);
  
  // Launch puppeteer
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  // Limit concurrency to 15 tabs at a time to speed it up
  const limit = pLimit(15);
  
  let successCount = 0;
  let failCount = 0;

  const promises = studios.map((studio, index) => limit(async () => {
    const slug = slugify(studio.name) + '.jpg';
    const filePath = path.join(outDir, slug);
    
    // Skip if we already have it
    if (fs.existsSync(filePath)) {
      console.log(`[${index + 1}/${studios.length}] Skipping ${studio.name} (already exists)`);
      successCount++;
      return;
    }

    const page = await browser.newPage();
    // Set viewport to a nice desktop size
    await page.setViewport({ width: 1280, height: 800 });
    
    try {
      console.log(`[${index + 1}/${studios.length}] Taking screenshot of ${studio.name} (${studio.url})`);
      
      // Navigate and wait till mostly loaded
      await page.goto(studio.url, { 
        waitUntil: 'networkidle2', 
        timeout: 30000 
      });
      
      // Save screenshot
      await page.screenshot({ 
        path: filePath, 
        type: 'jpeg',
        quality: 80
      });
      
      console.log(`[Success] Saved ${slug}`);
      successCount++;
    } catch (err) {
      console.log(`[Failed] Could not screenshot ${studio.name} (${studio.url}): ${err.message}`);
      failCount++;
    } finally {
      await page.close();
    }
  }));

  await Promise.allSettled(promises);
  
  console.log(`\nFinished capturing screenshots! Success: ${successCount}, Failed: ${failCount}`);
  await browser.close();
}

captureScreenshots().catch(console.error);
