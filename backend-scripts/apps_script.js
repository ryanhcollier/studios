/**
 * Legwrk GitHub Webhook Trigger
 * 
 * Instructions:
 * 1. Open your Legwrk Google Sheet.
 * 2. In the top menu, go to Extensions > Apps Script.
 * 3. Delete any code there, and paste all the code below.
 * 4. Fill in your GITHUB_USERNAME and your GITHUB_PERSONAL_ACCESS_TOKEN on lines 16 and 17.
 * 5. Save the file (Ctrl+S or Cmd+S).
 * 6. On the left sidebar of the Apps Script dashboard, click on the alarm clock icon ("Triggers").
 * 7. Click "Add Trigger" (bottom right).
 * 8. Set it up this exactly:
 *    - Choose which function to run: onEditTrigger
 *    - Choose which deployment should run: Head
 *    - Select event source: From spreadsheet
 *    - Select event type: On edit
 * 9. Click save!
 */

const GITHUB_USERNAME = 'ryanhcollier'; // Replace with your Github username
const GITHUB_REPO = 'studios'; // Replace with your Github repository name
const GITHUB_PERSONAL_ACCESS_TOKEN = 'YOUR_GITHUB_PAT_HERE'; // Requires 'repo' scope token

function onEditTrigger(e) {
  if(!e || !e.range) return;
  const sheet = e.source.getActiveSheet();
  if (sheet.getIndex() !== 1) return;
  
  const row = e.range.getRow();
  const col = e.range.getColumn();
  
  // Assuming 'URL' is Col B (2). 
  if (col !== 2) return;
  if (row <= 1) return;
  
  const currentName = sheet.getRange(row, 1).getValue(); 
  const currentUrl = sheet.getRange(row, 2).getValue();

  if(currentName && currentUrl) {
    pingGitHub();
  }
}

function pingGitHub() {
  const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/dispatches`;
  
  const payload = {
    event_type: "update-sheets"
  };
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + GITHUB_PERSONAL_ACCESS_TOKEN,
      'Accept': 'application/vnd.github.v3+json'
    },
    payload: JSON.stringify(payload)
  };
  
  try {
    UrlFetchApp.fetch(url, options);
  } catch(e) {
    Logger.log('Failed to dispatch webhook: ' + e.message);
  }
}
