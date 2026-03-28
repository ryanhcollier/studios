import fs from 'fs';
import path from 'path';
import pLimit from 'p-limit';
import puppeteer from 'puppeteer';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const studiosFile = path.join(__dirname, 'src', 'data', 'studios.json');
const outDir = path.join(__dirname, 'public', 'screenshots');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const studios = JSON.parse(fs.readFileSync(studiosFile, 'utf8'));

const slugify = (text) => text.toString().toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-');

// Helper to determine if an image is essentially a completely blank/solid color
async function isSolidColor(imagePath) {
  try {
    const { channels } = await sharp(imagePath).stats();
    const maxStdev = Math.max(...channels.map(c => c.stdev));
    return maxStdev < 3; // Safe threshold for pure blank geometry
  } catch (e) {
    return false;
  }
}

async function captureScreenshots() {
  console.log(`Starting to capture ${studios.length} screenshots...`);
  
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  const limit = pLimit(10);
  let successCount = 0;
  let failCount = 0;

  const promises = studios.map((studio, index) => limit(async () => {
    const slug = slugify(studio.name);
    const filePath = path.join(outDir, `${slug}.jpg`);
    
    // Skip if we already successfully have it and it's valid
    if (fs.existsSync(filePath)) {
      const isBlank = await isSolidColor(filePath);
      if (!isBlank) {
        console.log(`[${index + 1}/${studios.length}] Skipping ${studio.name} (Valid screenshot already exists)`);
        successCount++;
        return;
      } else {
        console.log(`[${index + 1}/${studios.length}] Existing screenshot for ${studio.name} is BLANK! Scheduling re-capture...`);
      }
    }

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });
    
    try {
      console.log(`[${index + 1}/${studios.length}] Taking screenshot of ${studio.name} (${studio.url})`);
      
      await page.goto(studio.url, { waitUntil: 'load', timeout: 35000 });
      
      // Let standard dynamic content settle
      await new Promise(r => setTimeout(r, 1000));
      await page.screenshot({ path: filePath, type: 'jpeg', quality: 80 });
      
      // Verification Pass: Did the page render a solid white/black block?
      const isBlankNow = await isSolidColor(filePath);
      
      if (isBlankNow) {
        console.log(`\x1b[33m[Warning]\x1b[0m ${studio.name} rendered as a solid block! Retrying with 5-second forced delay...`);
        // The user specifically requested: "wait 5 seconds before taking the screenshot."
        await new Promise(r => setTimeout(r, 5000));
        await page.screenshot({ path: filePath, type: 'jpeg', quality: 80 });
        console.log(`[Success] Salvaged solid-state render for ${studio.name} after 5-second delay.`);
      } else {
        console.log(`[Success] Saved ${slug}.jpg`);
      }

      successCount++;
    } catch (err) {
      console.log(`\x1b[31m[Failed]\x1b[0m Could not screenshot ${studio.name} (${studio.url}): ${err.message}`);
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
