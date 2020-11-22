// Sends records to Grade.us. maxSend is the limit per API call
function sendRecordsToApi(recordObj) {
  console.log(recordObj);
  var maxSend = 50;
  var apiToken = 'c75ec36977e644809d214e6ef4dec35b';
  var recipientUrl = 'https://www.grade.us/api/v2/profiles/%s/recipients';
  var options = {
    method      : "POST",
    contentType : 'application/json',
    headers     : {
      Accept: 'application/json',
      Authorization: Utilities.formatString('Token %s', apiToken),
    },
    payload: {},
    muteHttpExceptions: true,
  };
  var statusCodes = {
    200: 'Success',
    401: 'Unauthorized Request',
    422: 'Possible Duplicate',
    500: 'Server Error'
  };
  var output = {
    status: '',
    success: [],
    failed: [],
    matched: recordObj.matched,
    total: recordObj.total
  };
  Object.keys(recordObj.records).forEach(function(profileId) {
    var url = Utilities.formatString(recipientUrl, profileId);
    var records = recordObj.records[profileId];
    for (var x = 0; x < records.length; x+= maxSend) {
      var tempRecordSlice = records.slice(x, x + maxSend);
      options.payload = JSON.stringify({ recipients: tempRecordSlice });
      try {
        var response = UrlFetchApp.fetch(url, options);
        output.status = statusCodes[response.getResponseCode()];
        var json = JSON.parse(response);
        if (json.meta && json.meta.notices) {
          output.success = [].concat.apply(output.success, json.meta.notices);
        }
        if (json.meta && json.meta.errors) {
          output.failed = [].concat.apply(output.failed, json.meta.errors);
        }
        if (json.error) {
          throw json.error;
        }
      } catch(error) {
        console.log(error);
      }
    }
  });
  return output;
}

// Sort records by Profile ID
function sortRecords(records) {
  var clientSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Clients');
  var clientData = clientSheet.getDataRange().getDisplayValues(); 
  var converter = getConverter();
  
  var output = {};
  var count = 0;
  records.forEach(function(record) {
//    Logger.log('Adding client info');
    var client = clientMatch(record, clientData);
    if (!client) {
      return;
    }
    count++;
    var id = client['Profile ID'];
    output[id] = output[id] || [];
    var formattedRecord = {};
    converter.forEach(function(obj) {
      if (obj.type !== 'MedPB') {
        return;
      }
      var val = record[obj.jsonKey];
      if (val) {
        formattedRecord[obj.name] = val;
      }
    });
    if (formattedRecord.first_name && (formattedRecord.email_address || formattedRecord.phone_number)) {
      output[id].push(formattedRecord);
    }
  });
  return {
    records: output,
    matched: count,
    total: records ? records.length : 0
  };
}

// Strip duplicate records
function removeDuplicates(records) {
  var output = [];
  records.forEach(function(record) {
    var isUnique = true;
    output.forEach(function(outputRecord) {
      if (!isUnique) {
        return;
      }
      if (isEquivalent(record, outputRecord)) {
        isUnique = false;
      }
    });
    if (isUnique) {
      output.push(record);
    }
  });
  return output;
}

// Does an equivalency check between objects
function isEquivalent(a, b) {
  var aProps = Object.getOwnPropertyNames(a);
  var bProps = Object.getOwnPropertyNames(b);
  if (aProps.length != bProps.length) {
    return false;
  }
  for (var i = 0; i < aProps.length; i++) {
    var propName = aProps[i];
    if (a[propName] !== b[propName]) {
      return false;
    }
  }
  return true;
}