# Google Apps Script for Two-Way Synchronization 🔄

Sorry about that! There was a technical bug in the previous code: Web-hooks (APIs) cannot use `getActiveSpreadsheet()` because when the computer talks to Google, there is no "Active" screen open. It must explicitly open the sheet using the `sheetId` we send it.

## Instructions
1. Open your Google Sheet.
2. Go to `Extensions` > `Apps Script`.
3. Erase the old code and paste the completely fixed code below.
4. Click `Deploy` > `Manage Deployments` > `Edit` (pencil icon).
5. Ensure `Version` is set to **New** and click **Deploy**.

## Corrected Code to Paste:

```javascript
function doPost(e) {
  try {
    var params = JSON.parse(e.postData.contents);
    var action = params.action;
    var sheetId = params.sheetId;
    
    // IMPORTANT BUG FIX: We must open the sheet by its ID
    var ss = SpreadsheetApp.openById(sheetId);
    var sheet = ss.getSheets()[0]; // Gets the first tab of the sheet
  
    // 1. SMART CELL-LEVEL UPDATE (Dashboard -> Sheet)
    if (action === "updateRow") {
      var taskId = params.taskId;
      var taskName = params.taskName;
      var updates = params.updates;
      
      var data = sheet.getDataRange().getValues();
      var headers = data[0];
      var rowIndex = -1;
      
      // Find the exact row by Task ID or Task Name
      for (var i = 1; i < data.length; i++) {
         if ((taskId && data[i][0] == taskId) || (taskName && data[i][1] == taskName)) {
             rowIndex = i + 1;
             break;
         }
      }
      
      if (rowIndex > -1) {
         // Create Column Index Map
         var colMap = {};
         for(var j=0; j<headers.length; j++) { colMap[headers[j]] = j + 1; }
         
         // Update Specific Cells Safely without deleting your colors or formulas
         if (updates.status && colMap["Status"]) {
           sheet.getRange(rowIndex, colMap["Status"]).setValue(updates.status);
         }
         if (updates.delay_starts !== undefined && colMap["Delay Starts (Days)"]) {
           sheet.getRange(rowIndex, colMap["Delay Starts (Days)"]).setValue(updates.delay_starts);
         }
         if (updates.department && colMap["Department"]) {
           sheet.getRange(rowIndex, colMap["Department"]).setValue(updates.department);
         }
         if (updates.end_date && colMap["End Date"]) {
           sheet.getRange(rowIndex, colMap["End Date"]).setValue(updates.end_date);
         }
         if (updates.wbs_structure && colMap["WBS Structure"]) {
           sheet.getRange(rowIndex, colMap["WBS Structure"]).setValue(updates.wbs_structure);
         }
         
         return ContentService.createTextOutput(JSON.stringify({success: true, message: "Specific Row Updated"}))
           .setMimeType(ContentService.MimeType.JSON);
      }
      
      return ContentService.createTextOutput(JSON.stringify({success: false, message: "Row not found in Sheet"}))
           .setMimeType(ContentService.MimeType.JSON);
    }
    
    // 2. BULK OVERWRITE (Initial AI Proposal Export)
    sheet.clear();
    var headers = ["Task ID", "Task Name", "Start Date", "End Date", "Duration", "Progress (%)", "Task Type", "Department", "WBS Structure", "Scope", "Status", "Delay Starts (Days)", "Remarks", "Pre-requisites"];
    sheet.appendRow(headers);
    sheet.getRange("A1:N1").setFontWeight("bold").setBackground("#d9ead3");
    
    var tasks = params.tasks || [];
    for (var k = 0; k < tasks.length; k++) {
       var t = tasks[k];
       sheet.appendRow([
          t.id, t.text, t.start_date, t.end_date, t.duration, (t.progress * 100) + "%", t.type, t.department, t.wbs_structure, t.scope, t.status, 0, "", t.pre_requisites || ""
       ]);
    }
    
    return ContentService.createTextOutput(JSON.stringify({success: true, message: "Bulk Overwrite executed"}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({success: false, error: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```
