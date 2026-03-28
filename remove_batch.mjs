import fs from 'fs';

let studios = JSON.parse(fs.readFileSync('src/data/studios.json', 'utf8'));
const initialCount = studios.length;

const targets = ['origin', 'vmlthompson', 'twobulls', 'typecode', 'openproject', 'enginedigital'];

const removed = [];

studios = studios.filter(s => {
  const norm = s.name.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (targets.includes(norm)) {
    removed.push(s.name);
    return false;
  }
  return true;
});

fs.writeFileSync('src/data/studios.json', JSON.stringify(studios, null, 2));
console.log(`Removed ${removed.length} studios: ${removed.join(', ')}`);
console.log(`Count went from ${initialCount} to ${studios.length}.`);
