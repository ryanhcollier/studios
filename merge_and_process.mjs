import fs from 'fs';
import puppeteer from 'puppeteer';
import pLimit from 'p-limit';
import http2 from 'http2';
import https from 'https';
import http from 'http';

// 1. Merge the JSONs
const existing = JSON.parse(fs.readFileSync('src/data/studios.json', 'utf8'));
const additions = JSON.parse(fs.readFileSync('new_studios_urls.json', 'utf8'));

let addedCount = 0;
const newStudiosToProcess = [];

additions.forEach(add => {
  if (!existing.some(e => e.name === add.name)) {
    existing.push(add);
    newStudiosToProcess.push(add);
    addedCount++;
  }
});

console.log(`Merged ${addedCount} new studios into studios.json. Total: ${existing.length}`);
fs.writeFileSync('src/data/studios.json', JSON.stringify(existing, null, 2));

// Stop if no new studios
if (newStudiosToProcess.length === 0) process.exit(0);

// 2. Perform the Header Checks and Screenshot generation for ONLY the new ones
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const _makeRequest = (urlStr) => {
  return new Promise((resolve, reject) => {
    let _req;
    try {
      if (urlStr.startsWith('http://')) {
        _req = http.get(urlStr, { headers: { 'User-Agent': USER_AGENT } }, resolve);
      } else {
        _req = https.get(urlStr, { headers: { 'User-Agent': USER_AGENT } }, resolve);
      }
      _req.on('error', reject);
      _req.setTimeout(5000, () => {
        _req.destroy();
        reject(new Error('Timeout'));
      });
    } catch(e) {
      reject(e);
    }
  });
};

const checkAllowsIframe = async (url) => {
  try {
    const res = await _makeRequest(url);
    const headers = res.headers || {};
    const xfo = (headers['x-frame-options'] || '').toLowerCase();
    const csp = (headers['content-security-policy'] || '').toLowerCase();
    
    if (xfo.includes('deny') || xfo.includes('sameorigin')) return false;
    if (csp.includes('frame-ancestors')) return false;
    return true;
  } catch (err) {
    // If it fails to connect entirely, assume false fallback
    return false;
  }
};

const slugify = (text) => text.toString().toLowerCase().trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');

async function processNew() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  const limit = pLimit(10);
  
  const tasks = newStudiosToProcess.map(studio => limit(async () => {
    console.log(`Processing: ${studio.name}`);
    
    // Check Header
    studio.allowsIframe = await checkAllowsIframe(studio.url);
    
    // Update main array reference (mutates `existing` array object reference if careful, but `existing` was re-parsed, so let's just find and update)
    const storedRef = existing.find(s => s.name === studio.name);
    if(storedRef) storedRef.allowsIframe = studio.allowsIframe;

    // Take Screenshot regardless of iframe status for local cache
    try {
      const page = await browser.newPage();
      await page.setUserAgent(USER_AGENT);
      page.setDefaultNavigationTimeout(30000);
      await page.goto(studio.url, { waitUntil: 'networkidle2' });
      const slug = slugify(studio.name);
      await page.screenshot({ path: `public/screenshots/${slug}.jpg`, type: 'jpeg', quality: 90 });
      await page.close();
      console.log(`[Success] Setup complete for ${studio.name} (Iframe: ${studio.allowsIframe})`);
    } catch(e) {
      console.log(`[Failed] Screenshot failed for ${studio.name}: ${e.message}`);
    }
  }));

  await Promise.all(tasks);
  await browser.close();
  
  // Re-save with iframe flags
  fs.writeFileSync('src/data/studios.json', JSON.stringify(existing, null, 2));
  console.log("All done! studios.json fully updated.");
}

processNew();
