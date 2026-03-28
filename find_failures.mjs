import fs from 'fs';
import path from 'path';

const studios = JSON.parse(fs.readFileSync('src/data/studios.json', 'utf-8'));
const slugify = (text) => text.toString().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-').replace(/^-+/, '').replace(/-+$/, '');

const failures = studios.filter(s => !fs.existsSync('public/screenshots/' + slugify(s.name) + '.jpg'));

console.log('--- FAILURE LIST ---');
failures.forEach(f => console.log(f.name));

const csvLines = studios.map(s => {
  const isFailure = !fs.existsSync('public/screenshots/' + slugify(s.name) + '.jpg');
  return `"${s.name}","${s.url}","${isFailure ? 'Failed to screenshot' : ''}"`;
});

fs.writeFileSync('studios_with_flags.csv', csvLines.join('\n'), 'utf-8');
console.log('Saved to studios_with_flags.csv');
