import fs from 'fs';
import path from 'path';
import pLimit from 'p-limit';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const studiosFile = path.join(__dirname, 'src', 'data', 'studios.json');

const studios = JSON.parse(fs.readFileSync(studiosFile, 'utf8'));

console.log(`Checking headers for ${studios.length} studios...`);

const limit = pLimit(15); // Moderate concurrency

const checkUrl = async (url) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    // We just need headers, so a HEAD request is fast.
    // If it fails (some servers reject HEAD), fallback to GET.
    let response = await fetch(url, { method: 'HEAD', signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
       // fallback to GET
       const getController = new AbortController();
       const getTimeoutId = setTimeout(() => getController.abort(), 8000);
       response = await fetch(url, { method: 'GET', signal: getController.signal });
       clearTimeout(getTimeoutId);
    }
    
    const xFrameOptions = response.headers.get('x-frame-options');
    const csp = response.headers.get('content-security-policy');
    
    let blocksFraming = false;
    
    if (xFrameOptions) {
      const form = xFrameOptions.toUpperCase();
      if (form.includes('DENY') || form.includes('SAMEORIGIN')) {
        blocksFraming = true;
      }
    }
    
    if (csp) {
      const cspLower = csp.toLowerCase();
      if (cspLower.includes('frame-ancestors')) {
        blocksFraming = true; // For simplicity, if they define frame-ancestors, they usually block us
      }
    }
    
    return !blocksFraming; // returns true if ALLOWS iframe
  } catch (err) {
    // If fetch fails entirely (e.g. SSL error, timeout), we assume it's safer to use screenshot
    return false;
  }
};

const promises = studios.map((studio, index) => limit(async () => {
    const allowsIframe = await checkUrl(studio.url);
    studio.allowsIframe = allowsIframe;
    if (index % 50 === 0) {
       console.log(`Processed ${index}/${studios.length}...`);
    }
}));

async function run() {
  await Promise.allSettled(promises);
  const totalAllowed = studios.filter(s => s.allowsIframe).length;
  console.log(`Finished checking. ${totalAllowed} allow framing, ${studios.length - totalAllowed} block framing.`);
  fs.writeFileSync(studiosFile, JSON.stringify(studios, null, 2), 'utf-8');
  console.log('Saved back to studios.json!');
}

run();
