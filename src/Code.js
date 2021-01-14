//may need to format phone number if API won't accept it. No info in documentation
//once txt file is being imported, remove 'exampleJSON variable from line 42 and delete "exampleJSON.gs"
var props = PropertiesService.getScriptProperties().getProperties();

function onOpen(e) {
  var ui = SpreadsheetApp.getUi();
  buildMenu(e.sheetName);
  if (!props[e.sheetName]) {
    ui.alert(
      "Triggers aren't installed yet. Please click Scripts >> Install Triggers to setup this sheet."
    );
  }
}

function buildMenu(sheetName) {
  var ui = SpreadsheetApp.getUi();
  var menu = ui.createMenu('Scripts');
  if (!props[sheetName]) {
    menu.addItem('Install Triggers', 'enableTriggers').addToUi();
  } else {
    menu.addItem('Disable Triggers', 'disableTriggers').addToUi();
  }
}

function getSettings() {
  var settingsData = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName('Settings')
    .getDataRange()
    .getDisplayValues();
  var headers = settingsData.shift();
  var output = {};
  settingsData.forEach(function (row) {
    var key = row[0];
    var val = row[1];
    if (key && key.length && val && val.length) {
      output[key] = val;
    }
  });
  return output;
}

function emailAdmin(message, sheetName) {
  var settings = getSettings();
  var warningRecipients = settings['Warning Email List'];
  MailApp.sendEmail({
    to: warningRecipients,
    subject: `MedPB Library Error (${sheetName || ''})`,
    htmlBody: message,
  });
}

function enableTriggers(sheetName) {
  // Double check that everything is deleted first to prevent duplicate triggers.
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    ScriptApp.deleteTrigger(trigger);
  });
  if (PropertiesService.getScriptProperties().getProperty(sheetName)) {
    PropertiesService.getScriptProperties().deleteProperty(sheetName);
  }

  ScriptApp.newTrigger('scanSheet').timeBased().everyMinutes(5).create();
  ScriptApp.newTrigger('archiveSheet').timeBased().everyDays(14).create();
  PropertiesService.getScriptProperties().setProperty(
    sheetName,
    new Date().toISOString()
  );
  Utilities.sleep(2000);
  buildMenu(sheetName);
  var ui = SpreadsheetApp.getUi();
  ui.alert('Triggers were installed successfully');
}

function disableTriggers(sheetName) {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    ScriptApp.deleteTrigger(trigger);
  });
  PropertiesService.getScriptProperties().deleteProperty(sheetName);
  buildMenu(sheetName);
}

// Automated trigger function that processes incoming files.
function scanSheet() {
  const WARNING_NUMBER = 25;
  const WARNING_DURATION = 4 * 60 * 60 * 1000; // 4 hours in ms
  Logger.log('Scanning Imported Files');
  try {
    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    Logger.log('Obtained script lock');
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
      'Imported Files'
    );
    var sheetData = sheet.getDataRange().getDisplayValues();
    var headers = sheetData.shift();
    let hasSentWarningEmail = false;
    sheetData.forEach(function (row, index) {
      if (
        !row[0].length ||
        row[headers.indexOf('Status')] != 'Pending' ||
        row[headers.indexOf('Status')] == ''
      ) {
        return;
      }
      if (!hasSentWarningEmail && sheetData.length - index >= WARNING_NUMBER) {
        const sheetName = SpreadsheetApp.getActiveSpreadsheet().getName();
        const propName = `${sheetName}-pending-warning`;
        const lastPendingWarning = PropertiesService.getScriptProperties().getProperty(
          propName
        );
        const lastDate = lastPendingWarning
          ? new Date(lastPendingWarning)
          : new Date();

        hasSentWarningEmail = true;
        if (lastDate.getTime() < new Date().getTime() - WARNING_DURATION) {
          // It's been longer than the WARNING_DURATION since the last warning.
          const sheetUrl = SpreadsheetApp.getActiveSpreadsheet().getUrl();
          const message = `<a href="${sheetUrl}">${sheetName}</a> might be stuck, since it has more than ${WARNING_NUMBER} Pending.`;
          emailAdmin(message, sheetName);
          PropertiesService.getScriptProperties().setProperty(
            propName,
            new Date().toString()
          );
        }
      }
      var fileObj = {
        name: row[headers.indexOf('Filename')],
        url: row[headers.indexOf('Url')],
        date: row[headers.indexOf('Process Date')],
        records: row[headers.indexOf('Record Count')],
        status: row[headers.indexOf('Status')],
      };
      var statusObj = processFile(fileObj);
      var updatedRow = [];
      updatedRow[headers.indexOf('Filename')] = fileObj.name;
      updatedRow[headers.indexOf('Url')] = fileObj.url;
      updatedRow[headers.indexOf('Process Date')] = new Date();
      updatedRow[headers.indexOf('Record Count')] = statusObj.total;
      updatedRow[headers.indexOf('Status')] = statusObj.status;
      SpreadsheetApp.flush();
      var now = new Date();
      if (statusObj.success && statusObj.success.length) {
        addLog(statusObj.success.join(', '), now);
      }
      if (statusObj.failed && statusObj.failed.length) {
        addLog(statusObj.failed.join(', '), now);
      }
      var mismatchCount = statusObj.total - statusObj.matched || 0;
      var summary = Utilities.formatString(
        'Processed %s, %s accounts total. %s succeeded, %s failed, %s not matched.',
        fileObj.name,
        statusObj.total,
        statusObj.success ? statusObj.success.length : 0,
        statusObj.failed ? statusObj.failed.length : 0,
        mismatchCount
      );
      addLog(summary, now);
      sheet
        .getRange(index + 2, 1, 1, updatedRow.length)
        .setValues([updatedRow]);
    });
  } catch (e) {
    console.error(e.message);
  } finally {
    if (lock.hasLock()) {
      lock.releaseLock();
      Logger.log('Released script lock');
    }
  }
}

// Parse the file, remove duplicates, and sort and format the incoming records.
function processFile(obj) {
  Logger.log('Processing file: ' + obj.name);
  var fileId = getIdFromUrl(obj.url);
  var file = DriveApp.getFileById(fileId);
  var stringData = file.getBlob().getDataAsString();
  if (!stringData || stringData === '' || !stringData.length) {
    const sheetName = SpreadsheetApp.getActiveSpreadsheet().getName();
    const sheetUrl = SpreadsheetApp.getActiveSpreadsheet().getUrl();
    const message = `<a href="${sheetUrl}">${sheetName}</a> just processed a blank file. <a href="${obj.url}">${obj.name}</a>`;
    emailAdmin(message, sheetName);
    return {
      total: 0,
      matched: 0,
      success: [],
      failed: [],
      status: 'Empty File',
    };
  }

  console.log('Parsing records');
  var json = JSON.parse(stringData);
  var verifiedRecords = verifyClientRules(json);
  console.log('Verified client rules');
  var sortedRecordsObj = sortRecords(verifiedRecords);
  Logger.log('Sorted and parsed records');

  return sendRecordsToApi(sortedRecordsObj);
}

// Gets and sets up the converter object
function getConverter(isObj) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Converter');
  var data = sheet.getDataRange().getDisplayValues();
  var headers = data.shift();
  var indexes = {
    json: headers.indexOf('JSON Field Name'),
    medPB: headers.indexOf('MedPB Field Name'),
    header: headers.indexOf('Clients Sheet Header Name'),
  };

  var output = isObj ? {} : [];
  data.forEach(function (row) {
    var obj = {
      name: row[indexes.medPB].length
        ? row[indexes.medPB].trim()
        : row[indexes.header].trim(),
      type: row[indexes.medPB].length ? 'MedPB' : 'Header',
      jsonKey: row[indexes.json].trim(),
    };
    if (isObj) {
      output[obj.name] = obj;
    } else {
      output.push(obj);
    }
  });
  return output;
}

// Matches a client by first name, last name, and ID
function clientMatch(recordObj, data, converter) {
  //  Logger.log('Matching client');
  if (!data) {
    data = SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName('Clients')
      .getDataRange()
      .getDisplayValues();
  }
  var clientHeaders = data[0];
  var clientData = data.slice(1);
  var clients = [];
  clientData.forEach(function (row) {
    var clientDataObj = {};
    row.forEach(function (val, index) {
      var key = clientHeaders[index];
      clientDataObj[key] = val;
    });
    if (Object.keys(clientDataObj).length) {
      clients.push(clientDataObj);
    }
  });

  if (!converter) {
    converter = getConverter(true);
  }
  var recordKeys = {
    firstName: converter['First Name'].jsonKey,
    lastName: converter['Last Name'].jsonKey,
    clinicId: converter['Clinic ID'].jsonKey,
    locationId: converter['Location ID']
      ? converter['Location ID'].jsonKey
      : null,
  };

  if (recordKeys.clinicId) {
    for (var x = 0; x < clients.length; x++) {
      var client = clients[x];
      if (
        !recordObj[recordKeys.clinicId] ||
        !recordObj[recordKeys.clinicId].length
      ) {
        continue;
      }

      if (
        recordKeys.locationId &&
        recordObj[recordKeys.locationId] &&
        recordObj[recordKeys.locationId].length
      ) {
        console.log([
          client['Clinic ID'],
          client['Location ID'],
          recordObj[recordKeys.clinicId],
          recordObj[recordKeys.locationId],
        ]);
        if (
          client['Clinic ID'].trim() == recordObj[recordKeys.clinicId].trim() &&
          client['Location ID'].trim() ==
            recordObj[recordKeys.locationId].trim()
        ) {
          return client;
        }
      }

      if (
        !client['Location ID'] &&
        !client['Location ID'].length &&
        client['Clinic ID'].trim() == recordObj[recordKeys.clinicId].trim()
      ) {
        return client;
      }
    }
  }

  for (var y = 0; y < clients.length; y++) {
    var client = clients[y];
    if (
      !recordKeys.firstName ||
      !recordObj[recordKeys.firstName] ||
      !recordObj[recordKeys.firstName].length ||
      !recordKeys.lastName ||
      !recordObj[recordKeys.lastName] ||
      !recordObj[recordKeys.lastName].length
    ) {
      continue;
    }

    if (
      client['First Name'].toLowerCase().trim() ==
        recordObj[recordKeys.firstName].toLowerCase().trim() &&
      client['Last Name'].toLowerCase().trim() ==
        recordObj[recordKeys.lastName].toLowerCase().trim()
    ) {
      return client;
    }
  }

  return null;
}
