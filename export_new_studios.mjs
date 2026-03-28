import fs from 'fs';

const existing = JSON.parse(fs.readFileSync('src/data/studios.json', 'utf8'));
const additions = JSON.parse(fs.readFileSync('new_studios_urls.json', 'utf8'));

// The original CSV had headers: Studio, URL
let csvLines = ["Studio,URL"];

// We need exactly the ones that were just merged. 
// A simple way is to re-run the same `some` check against the original dataset? 
// Actually, `additions` contains the 43 urls. We can just export all 43. The 1 duplicate (Havas New York) won't hurt, or we can filter it easily.
// Let's filter to ensure we strictly export what was appended.
// Since we don't have the state of before the append, we'll just export the unique ones from `additions`.

const uniqueAdditions = [];
const seen = new Set();
additions.forEach(add => {
  const norm = add.name.toLowerCase().replace(/[^a-z0-9]/g, '');
  if(!seen.has(norm)) {
    seen.add(norm);
    uniqueAdditions.push(add);
  }
});

uniqueAdditions.forEach(add => {
  csvLines.push(`"${add.name}","${add.url}"`);
});

fs.writeFileSync('new_studios_export.csv', csvLines.join('\n'));
console.log("Exported " + uniqueAdditions.length + " to new_studios_export.csv");
