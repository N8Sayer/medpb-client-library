// Gets and converts a settings object from the Settings page.
function getSettings() {
  var settingsData = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName('Settings')
    .getDataRange()
    .getDisplayValues();
  var settings = {};
  settingsData.forEach(function (row) {
    var key = row[0];
    var val = row[1];
    if (!key || !key.length) {
      return;
    }
    settings[key] = val;
  });
  return settings;
}

// Scrapes the Drive ID from a file URL
function getIdFromUrl(url) {
  var fileRegex = /\/d\/([\w-]+)\/?/;
  var fileMatch = url.match(fileRegex);
  if (fileMatch && fileMatch.length) {
    return fileMatch[1];
  }

  var folderRegex = /([\w-]{33})/;
  var folderMatch = url.match(folderRegex);
  if (folderMatch && folderMatch.length) {
    return folderMatch[1];
  }

  return null;
}

// Easily add a log entry to the Log page
function addLog(logInfo, date) {
  if (!date) {
    date = new Date();
  }
  SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName('Log')
    .appendRow([date, String(logInfo)]);
}
