import Papa from 'papaparse';

const csvText = `Studio,Website
Test Studio,test.com
Another,https://another.com
MissingUrl,
,missing-name.com
,,
`;

Papa.parse(csvText, {
  header: true,
  skipEmptyLines: true,
  complete: (results) => {
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
    console.log(parsedData);
  }
});
