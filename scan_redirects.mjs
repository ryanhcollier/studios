import fs from 'fs';
import puppeteer from 'puppeteer';
import pLimit from 'p-limit';
import http2 from 'http2';
import https from 'https';
import http from 'http';

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

let studios = JSON.parse(fs.readFileSync('src/data/studios.json', 'utf8'));

// Strip trailing slashes for cleaner comparison
const normalizeUrl = u => u.toLowerCase().replace(/\/$/, '').replace(/^https?:\/\/(www\.)?/, '');

async function checkRedirect(originalUrl) {
  try {
    const res = await fetch(originalUrl, {
      method: 'GET',
      headers: { 'User-Agent': USER_AGENT },
      redirect: 'follow',
      // Keep timeout short so it doesn't hang on 400 dead domains forever
      signal: AbortSignal.timeout(10000) 
    });
    
    const finalUrl = res.url;
    // If it redirected to something meaningfully different (not just adding/removing trailing slash or www)
    if (finalUrl && normalizeUrl(finalUrl) !== normalizeUrl(originalUrl)) {
      return finalUrl;
    }
    return null; // Did not meaningfully redirect
  } catch (e) {
    // If it failed completely, just return null, maybe it blocks fetch
    return null;
  }
}

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
    return false; // Safest fallback
  }
};

const slugify = (text) => text.toString().toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-');

async function run() {
  console.log(`Starting scan of ${studios.length} studios...`);
  const limitFast = pLimit(20);
  
  let updatedCount = 0;
  const updatedStudios = [];
  
  // 1. Parallel fetch to check for redirects
  await Promise.all(studios.map(studio => limitFast(async () => {
    const newUrl = await checkRedirect(studio.url);
    if (newUrl) {
      console.log(`\n[Redirect] ${studio.name}: ${studio.url} -> \x1b[32m${newUrl}\x1b[0m`);
      studio.url = newUrl;
      updatedStudios.push(studio);
      updatedCount++;
    }
  })));

  console.log(`\nFound ${updatedCount} websites that have changed domains or protocols.`);
  
  if (updatedCount === 0) {
    console.log("No further processing needed. All links are up to date.");
    process.exit(0);
  }
  
  // Save intermediate state in case puppeteer crashes
  fs.writeFileSync('src/data/studios.json', JSON.stringify(studios, null, 2));

  // 2. Headless Chrome Pass for the UPDATED studios
  console.log(`\nRe-evaluating X-Frame-Options and regenerating screenshots for the ${updatedCount} changed domains...`);
  
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  const limitSlow = pLimit(5);
  
  await Promise.all(updatedStudios.map(studio => limitSlow(async () => {
    // A. Recheck iframe permissions for the new URL
    studio.allowsIframe = await checkAllowsIframe(studio.url);
    
    // B. Re-Capture local screenshot
    try {
      const page = await browser.newPage();
      await page.setUserAgent(USER_AGENT);
      page.setDefaultNavigationTimeout(35000);
      await page.goto(studio.url, { waitUntil: 'networkidle2' });
      const slug = slugify(studio.name);
      await page.screenshot({ path: `public/screenshots/${slug}.jpg`, type: 'jpeg', quality: 90 });
      await page.close();
      console.log(`[Success] Processed updated domain: ${studio.name} (Iframe: ${studio.allowsIframe})`);
    } catch(e) {
      console.log(`[Failed] Screenshot failed for ${studio.name}: ${e.message}`);
    }
  })));

  await browser.close();
  
  // Final save
  fs.writeFileSync('src/data/studios.json', JSON.stringify(studios, null, 2));
  console.log("\nFinished sanitizing JSON database.");
}

run();
