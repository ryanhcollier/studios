import fs from 'fs';

let studios = JSON.parse(fs.readFileSync('src/data/studios.json', 'utf8'));
const initialCount = studios.length;

studios = studios.filter(s => !s.name.toLowerCase().includes('opperman'));

fs.writeFileSync('src/data/studios.json', JSON.stringify(studios, null, 2));
console.log(`Removed Opperman Weiss. Count went from ${initialCount} to ${studios.length}.`);
