import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import sharp from 'sharp';
import Papa from 'papaparse';
import pLimit from 'p-limit';

const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1U60AENQujuIeKnW_qtsH2BCL9UFjoHqOtr4aGZBDFWA/export?format=csv';

const slugify = (text) => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

async function generateLocalScreenshots() {
  console.log("Fetching live Google Sheet data...");
  const response = await fetch(SHEET_CSV_URL);
  const csvText = await response.text();

  let studios = [];
  Papa.parse(csvText, {
    header: false,
    skipEmptyLines: true,
    complete: (results) => {
      studios = results.data.map(row => {
        let parsedName = row[0];
        let parsedUrl = row[1];
        
        if (parsedName === 'Studio Name' || parsedName === 'Studio' || parsedName === 'Name') return null;
        
        if (parsedUrl && !/^https?:\/\//i.test(parsedUrl)) {
          parsedUrl = 'https://' + parsedUrl;
        }
        return {
          name: parsedName,
          url: parsedUrl,
        };
      }).filter(s => s && s.name && s.url);
    }
  });

  console.log(`Found ${studios.length} studios. Booting up headless browser...`);

  // Boot Puppeteer. 
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1200,900']
  });

  const screenshotsDir = path.join(process.cwd(), '../public/screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  // 5 Concurrent tabs to radically drop execution time
  const limit = pLimit(5); 
  let completedCount = 0;

  const tasks = studios.map(studio => limit(async () => {
    let page;
    try {
      page = await browser.newPage();
      await page.setViewport({ width: 1200, height: 900 });

      console.log(`[Pending] Loading ${studio.name} (${studio.url})...`);
      
      let finalUrl = studio.url;
      if (!finalUrl.startsWith('http')) finalUrl = 'https://' + finalUrl;

      // Navigate and wait for network to effectively sit idle
      await page.goto(finalUrl, { waitUntil: 'networkidle2', timeout: 45000 }).catch(e => {
        console.log(`[Warning] Reached initial navigation timeout for ${studio.name}, proceeding to 10s wait anyway.`);
      });
      
      // EXPLICIT 10 SECOND WAIT FOR ANIMATIONS TO COMPLETE
      console.log(`[Timer] 10 second animation hard-delay started for ${studio.name}...`);
      await new Promise(r => setTimeout(r, 10000));

      const screenshotBuffer = await page.screenshot({ type: 'jpeg', quality: 90 });

      // Resize it elegantly using sharp
      const optimizedBuffer = await sharp(screenshotBuffer)
        .resize(800, null, { withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();

      const filePath = path.join(screenshotsDir, `${slugify(studio.name)}.jpg`);
      fs.writeFileSync(filePath, optimizedBuffer);

      completedCount++;
      console.log(`[Success] Overwrote ${slugify(studio.name)}.jpg (${completedCount}/${studios.length})`);

    } catch (e) {
      console.error(`[Error] Failed completely on ${studio.name}:`, e.message);
    } finally {
      if (page && !page.isClosed()) {
        await page.close().catch(() => {});
      }
    }
  }));

  await Promise.allSettled(tasks);

  await browser.close();
  console.log("\n\nAll screenshots regenerated with extreme 10s delay successfully!");
}

// Ensure execution directory is correct for paths
const currentDir = process.cwd();
if (currentDir.endsWith('backend-scripts')) {
    generateLocalScreenshots();
} else {
    process.chdir(path.join(currentDir, 'backend-scripts'));
    generateLocalScreenshots();
}
