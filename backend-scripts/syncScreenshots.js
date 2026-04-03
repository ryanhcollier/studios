import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import sharp from 'sharp';
import Papa from 'papaparse';
import * as ftp from 'basic-ftp';
import dotenv from 'dotenv';
dotenv.config();

const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1U60AENQujuIeKnW_qtsH2BCL9UFjoHqOtr4aGZBDFWA/export?format=csv';

const slugify = (text) => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

async function syncScreenshots() {
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

  console.log(`Found ${studios.length} studios in the Google Sheet.`);

  let existingFiles = [];
  const client = new ftp.Client();
  // client.ftp.verbose = true;

  try {
    console.log("Connecting to Hostinger FTP...");
    await client.access({
      host: process.env.FTP_HOST,
      user: process.env.FTP_USER,
      password: process.env.FTP_PASSWORD,
      secure: false
    });

    const targetDir = process.env.FTP_DIR || 'public_html/legwrk/screenshots';
    console.log(`Navigating to ${targetDir}...`);
    
    // Ensure the directory exists
    try {
      await client.ensureDir(targetDir);
    } catch (e) {
      console.log("Could not ensure directory, trying to cd directly...");
      await client.cd(targetDir);
    }

    const fileList = await client.list();
    existingFiles = fileList.map(f => f.name);
    console.log(`Found ${existingFiles.length} screenshots already on the server.`);
  } catch (err) {
    console.error("FTP Connection Error:", err);
    process.exit(1);
  }

  // Filter down to the ones that genuinely need screenshots
  const missingStudios = studios.filter(s => {
    const expectedName = `${slugify(s.name)}.jpg`;
    return !existingFiles.includes(expectedName);
  });

  if (missingStudios.length === 0) {
    console.log("All studios have screenshots! Nothing to do.");
    client.close();
    process.exit(0);
  }

  console.log(`Missing screenshots for ${missingStudios.length} studios. Booting up browser...`);

  // Boot Puppeteer. (Works magically inside Github Actions VMs natively!)
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 900 });

  for (const studio of missingStudios) {
    try {
      console.log(`Capturing ${studio.name} (${studio.url})...`);
      
      let finalUrl = studio.url;
      if (!finalUrl.startsWith('http')) finalUrl = 'https://' + finalUrl;

      await page.goto(finalUrl, { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
      
      // Give it extra time for fancy animations to finish
      await new Promise(r => setTimeout(r, 4000));

      const screenshotBuffer = await page.screenshot({ type: 'jpeg', quality: 90 });

      // Resize it elegantly using sharp
      const optimizedBuffer = await sharp(screenshotBuffer)
        .resize(800, null, { withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();

      const tmpPath = path.join(process.cwd(), `${slugify(studio.name)}.jpg`);
      fs.writeFileSync(tmpPath, optimizedBuffer);

      // FTP Upload exactly this file
      console.log(`Uploading ${tmpPath} to FTP...`);
      await client.uploadFrom(tmpPath, `${slugify(studio.name)}.jpg`);

      // Cleanup
      fs.unlinkSync(tmpPath);
      console.log(`Successfully generated and uploaded for ${studio.name}!`);

    } catch (e) {
      console.error(`Failed to generate screenshot for ${studio.name}:`, e);
    }
  }

  await browser.close();
  client.close();
  console.log("All done syncing!");
}

syncScreenshots();
