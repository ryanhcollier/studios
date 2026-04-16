import Papa from 'papaparse';

const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1U60AENQujuIeKnW_qtsH2BCL9UFjoHqOtr4aGZBDFWA/export?format=csv';

async function testFetch() {
  const response = await fetch(SHEET_CSV_URL);
  const csvText = await response.text();
  
  Papa.parse(csvText, {
    header: false,
    skipEmptyLines: true,
    complete: (results) => {
      const parsedData = results.data.map((row) => {
        let parsedUrl = row[1];
        let parsedName = row[0];
        
        if (parsedName === 'Studio Name' || parsedName === 'Studio' || parsedName === 'Name') return null;
        
        if (parsedUrl && !/^https?:\/\//i.test(parsedUrl)) {
          parsedUrl = 'https://' + parsedUrl;
        }
        return {
          name: parsedName,
          url: parsedUrl,
        };
      }).filter(s => s && s.name && s.url);
      console.log(`Found ${parsedData.length} valid entries.`);
      console.log('First 5:', parsedData.slice(0, 5));
    }
  });
}
testFetch();
