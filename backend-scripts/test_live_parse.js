import Papa from 'papaparse';

const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1U60AENQujuIeKnW_qtsH2BCL9UFjoHqOtr4aGZBDFWA/export?format=csv';

async function testFetch() {
  try {
    const response = await fetch(SHEET_CSV_URL);
    const csvText = await response.text();
    console.log("Downloaded CSV length:", csvText.length);
    console.log("CSV Head:", csvText.substring(0, 100));
    
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        console.log("Parsed rows:", results.data.length);
        const parsedData = results.data.map((row) => {
          let parsedUrl = row['Website URL'] || row['Website'] || row['URL'] || Object.values(row)[1];
          if (parsedUrl && !/^https?:\/\//i.test(parsedUrl)) {
            parsedUrl = 'https://' + parsedUrl;
          }
          return {
            name: row['Studio Name'] || row['Studio'] || row['Name'] || Object.values(row)[0],
            url: parsedUrl,
          };
        }).filter(s => s.name && s.url);
        console.log(`Found ${parsedData.length} valid entries.`);
        console.log('Last 5:', parsedData.slice(-5));
      }
    });
  } catch (err) {
    console.error("Error:", err);
  }
}
testFetch();
