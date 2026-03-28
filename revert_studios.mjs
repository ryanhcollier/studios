import fs from 'fs';

let studios = JSON.parse(fs.readFileSync('src/data/studios.json', 'utf8'));
const additions = JSON.parse(fs.readFileSync('new_studios_urls.json', 'utf8'));

const normalizedAdditions = new Set(additions.map(a => a.name.toLowerCase().replace(/[^a-z0-9]/g, '')));

const initialCount = studios.length;
studios = studios.filter(s => {
  const norm = s.name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return !normalizedAdditions.has(norm);
});

fs.writeFileSync('src/data/studios.json', JSON.stringify(studios, null, 2));
console.log(`Reverted studios.json. Removed ${initialCount - studios.length} entries. Total is now strictly ${studios.length}.`);
