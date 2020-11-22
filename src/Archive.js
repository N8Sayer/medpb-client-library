function testZips() {
  const data = [
    'https://drive.google.com/file/d/1RkZuoEthecNmMNYxkSJglWhx09ov6IE6/view?usp=drivesdk',
    'https://drive.google.com/file/d/1R_3uUy5o7DAuDMVGBRoP9XJss-TTIURx/view?usp=drivesdk',
    'https://drive.google.com/file/d/1MUvhfmUgAXDYgcFjy6E2pIhCepVcjvjs/view?usp=drivesdk',
    'https://drive.google.com/file/d/1q6J7Cl1zb-VJQzW7LoLQE1Cz5frJKpdf/view?usp=drivesdk',
    'https://drive.google.com/file/d/1_APQIs5WgnY6jr1L3WNhIwWbUvi-jEdU/view?usp=drivesdk',
  ];
  const ids = [];
  const blobs = data.map(function (url, index) {
    const id = getIdFromUrl(url);
    const blob = DriveApp.getFileById(id).getBlob();
    const newName = blob.getName().replace(/\//g, '\\');
    blob.setName(newName);
    return blob;
  });
  const zip = Utilities.zip(blobs, `Test-File.zip`);

  const folder = DriveApp.getFolderById('1NqUZFUJZdTExacbBBS5c8PHfM4h_R_S7');
  folder.createFile(zip);
}

function archiveSheet() {
  const DAYS_TO_PRESERVE = 14;

  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - DAYS_TO_PRESERVE);
  startDate.setHours(0, 0, 0, 0);

  try {
    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    archiveLogs(
      'Imported Files',
      'Process Date',
      'Archive Files',
      startDate,
      endDate
    );
    deleteEmptyRows('Imported Files');
    archiveLogs('Log', 'Timestamp', 'Archive Logs', startDate, endDate);
    deleteEmptyRows('Log');
    SpreadsheetApp.flush();
  } catch (e) {
    console.log(e);
  } finally {
    if (lock.hasLock()) {
      lock.releaseLock();
    }
  }
}

function deleteEmptyRows(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const lastRow = sheet.getLastRow();
  const maxRows = sheet.getMaxRows();
  sheet.deleteRows(lastRow + 1, maxRows - lastRow);
}

function addArchiveTrigger() {
  let output = false;
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === 'archiveOldData') {
      output = true;
    }
  });

  if (output) {
    return;
  }
  ScriptApp.newTrigger('archiveOldData').timeBased().everyHours(1).create();
}

function archiveLogs(
  sheetName,
  dateColName,
  archiveSheetName,
  startDate,
  endDate
) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const dateCol = headers.indexOf(dateColName);

  const sortedRows = filterByDateRange(data, dateCol, startDate, endDate);

  function arrayEquals(a, b) {
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((val, index) => val === b[index])
    );
  }

  if (
    !sortedRows.exclusive.length ||
    (sortedRows.exclusive.length === 1 &&
      arrayEquals(sortedRows.exclusive[0], headers))
  ) {
    return;
  }

  SpreadsheetApp.getActiveSpreadsheet()
    .insertSheet(archiveSheetName)
    .getRange(1, 1, sortedRows.exclusive.length, sortedRows.exclusive[0].length)
    .setValues(sortedRows.exclusive);
  sheet.getDataRange().clearContent();
  sheet
    .getRange(1, 1, sortedRows.inclusive.length, sortedRows.inclusive[0].length)
    .setValues(sortedRows.inclusive);

  addArchiveTrigger();
}

function filterByDateRange(data, dateCol, startDate, endDate) {
  const output = {
    inclusive: [],
    exclusive: [],
  };

  let hasHeaderRow = true;
  data[0].forEach(function (cell) {
    if (typeof cell !== 'string') {
      hasHeaderRow = false;
    }
  });

  let headers;
  if (hasHeaderRow) {
    headers = data.shift();
  }

  data.forEach(function (row, index) {
    const date = row[dateCol];
    if (
      date.getTime() >= startDate.getTime() &&
      date.getTime() <= endDate.getTime()
    ) {
      output.inclusive.push(row);
    } else {
      output.exclusive.push(row);
    }
  });

  function sortByDate(rowA, rowB) {
    const a = new Date(rowA[dateCol]).getTime(),
      b = new Date(rowB[dateCol]).getTime();
    if (a === b) return 0;
    return a > b ? 1 : -1;
  }

  output.inclusive.sort(sortByDate);
  output.exclusive.sort(sortByDate);
  if (hasHeaderRow) {
    output.inclusive.unshift(headers);
    output.exclusive.unshift(headers);
  }
  return output;
}

function resetScan() {
  PropertiesService.getScriptProperties().deleteProperty(
    'archive-CounselEAR-currentPiece'
  );
}

function archiveOldData(company) {
  if (!company) {
    console.error('No company name provided.');
    return;
  }
  const MAX_CHUNK = 1000;
  const MAX_RUNTIME = 30 * 60 * 1000; // 30 minutes maximum Apps Script runtime per script.
  const now = new Date();
  const executionPropName = `lastExecution-${company}`;

  try {
    let lastExecution = PropertiesService.getScriptProperties().getProperty(
      executionPropName
    );
    if (
      lastExecution &&
      now.getTime() - new Date(lastExecution).getTime() < MAX_RUNTIME
    ) {
      return console.log(
        "Last script hasn't completed yet, but it hasn't been long enough to hit the 30 minute runtime either."
      );
    }
    if (
      lastExecution &&
      now.getTime() - new Date(lastExecution).getTime() >= MAX_RUNTIME
    ) {
      console.log(
        "Last script didn't complete successfully, but it probably just timed out. Check the previous logs for more info."
      );
      PropertiesService.getScriptProperties().setProperty(
        executionPropName,
        new Date().toString()
      );
    }
    if (!lastExecution) {
      console.log(
        "Last script completed successfully. Setting new date on 'lastExecution' property."
      );
      PropertiesService.getScriptProperties().setProperty(
        executionPropName,
        new Date().toString()
      );
    }
    console.log('Continuing execution');

    const archiveRoot = DriveApp.getFolderById(
      '1NqUZFUJZdTExacbBBS5c8PHfM4h_R_S7'
    );
    const companyArchive = archiveRoot.getFoldersByName(company).hasNext()
      ? archiveRoot.getFoldersByName(company).next()
      : archiveRoot.createFolder(company);

    const archiveSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
      'Archive Files'
    );
    const archiveData = archiveSheet.getDataRange().getValues();
    const archiveHeaders = archiveData.shift();
    const archiveDateCol = archiveHeaders.indexOf('Process Date');
    const archiveUrlCol = archiveHeaders.indexOf('Url');

    const currentPieceKey = `archive-${company}-currentPiece`;
    const currentPieceProp = PropertiesService.getScriptProperties().getProperty(
      currentPieceKey
    );
    let currentPiece;
    if (archiveData.length > MAX_CHUNK) {
      currentPiece = currentPieceProp ? parseInt(currentPieceProp, 10) : 0;
    }

    Logger.log('Archiving files and files log');
    for (
      let x = currentPiece * MAX_CHUNK;
      x < archiveData.length;
      x += MAX_CHUNK
    ) {
      Logger.log(
        `Archiving part ${Math.floor(x / MAX_CHUNK) + 1} of ${
          Math.ceil(archiveData.length / MAX_CHUNK) + 1
        }`
      );
      const batch = [archiveHeaders, ...archiveData.slice(x, x + MAX_CHUNK)];

      // Archive Imported Files Sheet
      const archiveFileName = createFileName(
        batch,
        company,
        archiveDateCol,
        'Files Log'
      );
      archiveSheetToCSV(batch, companyArchive, archiveFileName);

      // Zip Import Files
      const batchFilename = createFileName(
        batch,
        company,
        archiveDateCol,
        'Files Zip'
      );
      zipAndTrashImportFiles(
        batch,
        companyArchive,
        batchFilename,
        archiveUrlCol
      );
      currentPiece++;
      PropertiesService.getScriptProperties().setProperty(
        currentPieceKey,
        String(currentPiece)
      );
    }
    PropertiesService.getScriptProperties().deleteProperty(currentPieceKey);

    Logger.log('Archiving log sheet');
    // Archive Log Sheet
    const logSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
      'Archive Logs'
    );
    const logData = logSheet.getDataRange().getValues();
    const logHeaders = logData.shift();
    const logDateCol = logHeaders.indexOf('Timestamp');
    const logFileName = createFileName(logData, company, logDateCol, 'Logs');
    archiveSheetToCSV(logData, companyArchive, logFileName);

    Logger.log('Deleting trigger and archiving sheets');
    // Delete trigger
    ScriptApp.getProjectTriggers().forEach(function (trigger) {
      if (trigger.getHandlerFunction() === 'archiveOldData') {
        ScriptApp.deleteTrigger(trigger);
      }
    });

    SpreadsheetApp.getActiveSpreadsheet().deleteSheet(archiveSheet);
    SpreadsheetApp.getActiveSpreadsheet().deleteSheet(logSheet);
    PropertiesService.getScriptProperties().deleteProperty(executionPropName);
  } catch (e) {
    console.error(e.message);
  }
}

function zipAndTrashImportFiles(data, folder, filename, urlCol) {
  const ids = [];
  const blobs = data
    .filter(function (row, index) {
      const id = getIdFromUrl(row[urlCol]);
      return !!id;
    })
    .map(function (row, index) {
      const id = getIdFromUrl(row[urlCol]);
      ids.push(id);
      const blob = DriveApp.getFileById(id).getBlob();
      const newName = blob.getName().replace(/\//g, '\\');
      // Utilities.zip interprets forward slashes as file paths, so we replace with a backslash instead.
      blob.setName(newName);
      return blob;
    });
  const zip = Utilities.zip(blobs, `${filename}.zip`);
  folder.createFile(zip);
  const access = folder.getAccess(Session.getActiveUser()).toString();
  //  if (access === 'FILE_ORGANIZER' || access === 'OWNER') {
  //    ids.forEach(function(id) {
  //      const file = DriveApp.getFileById(id);
  //      if (!file.isTrashed()) {
  //        file.setTrashed(true);
  //      }
  //    });
  //  }
}

function archiveSheetToCSV(data, folder, filename) {
  const csvData = data
    .map(function (row) {
      return row
        .map(function (cell) {
          return `"${cell}"`;
        })
        .join(',');
    })
    .join('\n');
  folder.createFile(`${filename}.csv`, csvData, MimeType.CSV);
}

function createFileName(data, company, dateCol, append) {
  const firstDate = new Date(data.slice(1, 2)[0][dateCol]);
  const lastDate = new Date(data.slice(-1)[0][dateCol]);
  let fileName = `${Utilities.formatDate(
    firstDate,
    SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(),
    'M/d/yyyy HH:mm:ss'
  )} - ${Utilities.formatDate(
    lastDate,
    SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(),
    'M/d/yyyy HH:mm:ss'
  )} ${company}`;
  if (append) {
    fileName = `${fileName} ${append}`;
  }
  return fileName;
}
