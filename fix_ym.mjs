import fs from 'fs';
import puppeteer from 'puppeteer';

const studios = JSON.parse(fs.readFileSync('src/data/studios.json', 'utf8'));
const ym = studios.find(s => s.name === "Your Majesty");

if (ym) {
  ym.url = "https://yourmajesty.co/";
  fs.writeFileSync('src/data/studios.json', JSON.stringify(studios, null, 2));
  console.log("Updated URL in studios.json to https://yourmajesty.co/");
}

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
  
  try {
    await page.goto("https://yourmajesty.co/", { waitUntil: 'networkidle2', timeout: 45000 });
    // Let complex WebGL load
    await new Promise(r => setTimeout(r, 6000));
    await page.screenshot({ path: 'public/screenshots/your-majesty.jpg', type: 'jpeg', quality: 90 });
    console.log("Successfully securely screenshotted Your Majesty's new domain");
  } catch (e) {
    console.log("Failed: " + e.message);
  }
  await browser.close();
})();
