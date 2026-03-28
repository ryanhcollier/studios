import fs from 'fs';

const extractedNames = [
  "Pentagram", "Wolff Olins", "Siegel+Gale", "Collins", "Red Antler", "Porto Rocha", "Vault49", 
  "&Walsh", "Motto", "Gretel", "Order", "Base Design", "Avenue Z", "Indigo Atelier", "The Bureau of Small Projects", 
  "Ruder Finn", "VSA Partners", "Web3 MoJo", "HIYO Design", "Boundless Creative", "Brand2 Studio", "inBeat", 
  "Voy Media", "9AM", "M+C Saatchi Performance", "Character", "WITHIN", "Socium Media", "Quirk", "DPDK", 
  "Mason Interactive", "Amsive", "Linkup ST", "Work & Co", "Momentum Design Lab", "Wolf&Whale", "Area 17", 
  "Elephant", "Method", "Utility", "Zero", "Phenomenon Studio", "Snarkitecture", "2x4", "High Tide", 
  "RoAndCo", "Steven Holl Architects", "HDR", "Gensler", "CannonDesign", "Bohlin Cywinski Jackson", 
  "Commercial Type", "Sharp Type", "Studio Dumbar", "DEPT", "Droga5", "Mother", "Mother New York", 
  "Wieden+Kennedy", "R/GA", "Media.Monks", "Sid Lee", "Anomaly", "Havas", "Havas New York", "Big Spaceship", 
  "B-Reel", "Madwell", "Nova District", "Huge", "Orion Works", "Koto", "Born Social"
];

const studios = JSON.parse(fs.readFileSync('src/data/studios.json', 'utf8'));
const existingNames = studios.map(s => s.name.toLowerCase().replace(/[^a-z0-9]/g, ''));

const newStudios = extractedNames.filter(name => {
  const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  // Also check if existing name is a substring or vice versa to avoid duplicates like "Mother" vs "Mother New York"
  return !existingNames.some(existing => existing.includes(normalized) || normalized.includes(existing));
});

console.log("Found " + newStudios.length + " new studios:");
console.log(newStudios.join('\n'));
