import fs from 'fs';
import * as cheerio from 'cheerio';
// using native fetch

const newStudios = [
  "Motto", "Avenue Z", "Indigo Atelier", "Ruder Finn", "Web3 MoJo", "HIYO Design", "Boundless Creative", 
  "Brand2 Studio", "inBeat", "9AM", "M+C Saatchi Performance", "Character", "WITHIN", "Quirk", "DPDK", 
  "Mason Interactive", "Amsive", "Momentum Design Lab", "Wolf&Whale", "Utility", "Phenomenon Studio", 
  "Snarkitecture", "HDR", "Gensler", "Bohlin Cywinski Jackson", "Commercial Type", "Sharp Type", 
  "Studio Dumbar", "Nova District", "Orion Works", "Walrus", "Quirk Creative", "QNY Creative", 
  "Noformat", "Harper & Scott", "Wade and Leta", "RIOT", "Jane Creative", "The Charles", "DD.NYC", 
  "Paper Tiger", "Lucid", "Odgis + Co"
];

const sleep = ms => new Promise(res => setTimeout(res, ms));

async function getUrl(name) {
  try {
    const query = encodeURIComponent(`${name} creative agency nyc`);
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${query}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)'
      }
    });
    const html = await res.text();
    const $ = cheerio.load(html);
    const firstLink = $('.result__url').first().attr('href');
    
    // DuckDuckGo redirects route through their own domain, so we gotta clean it
    if (firstLink) {
       // usually it's plain text in the div innerText
       const cleanUrl = $('.result__url').first().text().trim();
       if (cleanUrl) {
         return cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`;
       }
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function run() {
  const results = [];
  console.log(`Searching URLs for ${newStudios.length} studios...`);
  
  for (let i = 0; i < newStudios.length; i++) {
    const name = newStudios[i];
    const url = await getUrl(name);
    console.log(`[${i+1}/${newStudios.length}] ${name} -> ${url}`);
    
    // Always push it even if null so we can manually fix if needed
    results.push({ name, url: url || `https://www.google.com/search?q=${encodeURIComponent(name + ' nyc')}` });
    
    // Politeness delay to avoid rate limits
    await sleep(2500);
  }
  
  fs.writeFileSync('new_studios_urls.json', JSON.stringify(results, null, 2));
  console.log('Saved to new_studios_urls.json');
}

run();
