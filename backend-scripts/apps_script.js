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
const GITHUB_REPO = 'legwrk'; // Replace with your Github repository name
const GITHUB_PERSONAL_ACCESS_TOKEN = 'YOUR_GITHUB_PERSONAL_ACCESS_TOKEN'; // Requires 'repo' scope token

function onEditTrigger(e) {
  if(!e || !e.range) return;
  const sheet = e.source.getActiveSheet();
  const row = e.range.getRow();
  
  // Ignore header row
  if (row <= 1) return;
  
  // === NEW: Automated Review Workflow ===
  if (sheet.getName() === "Submissions") {
    const col = e.range.getColumn();
    
    // Check if the edit happened in Column 3 (Column C) and is checked (TRUE)
    if (col === 3 && (e.value === "TRUE" || e.value === true)) {
      const name = sheet.getRange(row, 1).getValue();
      const url = sheet.getRange(row, 2).getValue();
      
      if (name && url) {
        // Find the main database sheet (assuming it is the first tab, Index 0)
        const mainSheet = e.source.getSheets()[0];
        
        // Append the verified name and url to the main sheet
        mainSheet.appendRow([name, url]);
        
        // Delete the row from the Submissions queue cleanly
        sheet.deleteRow(row);
        
        // Tell GitHub to spin up a dynamic website update
        pingGitHub();
      }
    }
    return; // Exit early, do not run the rest of the script.
  }
  
  // === EXISTING: Safe Main-Sheet Workflow ===
  // Apps Script indexes sheet objects starting at 1. If edit is on Main Sheet:
  if (sheet.getIndex() === 1) {
    const currentName = sheet.getRange(row, 1).getValue(); 
    const currentUrl = sheet.getRange(row, 2).getValue();

    if(currentName && currentUrl) {
      pingGitHub();
    }
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

/**
 * Handle POST requests from the `/submit` form.
 * 
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Click "Deploy" > "New deployment" in the top right of Apps Script editor.
 * 2. Click the gear icon next to "Select type" and check "Web app".
 * 3. Configuration:
 *    - Description: "Form Handler"
 *    - Execute as: "Me" (your Google account)
 *    - Who has access: "Anyone"
 * 4. Click "Deploy". Authorize permissions if prompted.
 * 5. Copy the resulting "Web app URL" and paste it into public/submit/index.html.
 */
function doPost(e) {
  try {
    // Parse the JSON payload sent from the form
    const data = JSON.parse(e.postData.contents);
    const name = data.name;
    const url = data.url;
    
    if (name && url) {
      // Assumes you have a sheet named 'Submissions' for the review queue
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Submissions"); 
      
      // Safety check in case the tab isn't created yet
      if (!sheet) {
        throw new Error("Submissions tab not found. Please create it in your Google Sheet.");
      }
      
      // Append the data, and automatically spawn a fresh checkbox!
      sheet.appendRow([name, url]);
      const newRow = sheet.getLastRow();
      sheet.getRange(newRow, 3).insertCheckboxes();
      
      // Hardcode your email here to bypass any Google Session permission blocks
      const emailAddress = "ryanhcollier@gmail.com"; 
      const subject = "Legwrk: New Studio Submitted!";
      const sheetUrl = "https://docs.google.com/spreadsheets/d/1U60AENQujuIeKnW_qtsH2BCL9UFjoHqOtr4aGZBDFWA/edit?gid=1430914009#gid=1430914009";
      const body = `A new studio has been submitted for review:\n\nName: ${name}\nURL: ${url}\n\nReview it here: ${sheetUrl}`;
      
      GmailApp.sendEmail(emailAddress, subject, body);
      
      // Note: We deliberately do NOT call pingGitHub() here to keep it in a review state.
      
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
        .setMimeType(ContentService.MimeType.JSON);
    } else {
      throw new Error("Missing name or url");
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.message }))
        .setMimeType(ContentService.MimeType.JSON);
  }
}
