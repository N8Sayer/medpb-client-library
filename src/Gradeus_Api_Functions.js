// Their documentation is terrible, but apparently a couple endpoints require this.
function accessGradeusApi() {
  var key = 'c75ec36977e644809d214e6ef4dec35b';
  var secret = '9540915c5d7b4522ac43015cfaef6a31';
//  
  var http_verb = 'GET';
  var query = 'profile_id=ceb79e32-5d25-45dc-b226-c83a65da2f53';
  var content_string_md5 = query.length ? MD5(query) : '';
  var content_type = 'application/json';
  var request_uri = '/profiles';
  var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'EEE, dd MMM yyyy HH:mm:ss Z');
  var canonicalStr = [http_verb, content_string_md5, content_type, request_uri, timestamp].join("\n");
  var api_signature = Utilities.base64Encode(Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_SHA_256, canonicalStr, secret));
  Logger.log(api_signature);
//  
  var url = 'https://www.grade.us/api/v2' + request_uri;
  var options = {
    method: http_verb,
    headers: {
      'Content-Type': content_type,
      'API-Request-Timestamp': timestamp,
      'Authorization': key + ":" + api_signature
    }
  };
  var response = UrlFetchApp.fetch(url, options);
  Logger.log(response);
}

function getClientsFromGradeus() {
  var token = 'c75ec36977e644809d214e6ef4dec35b';
  var url = 'https://www.grade.us/api/v2/profiles';
  var options = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Token ' + token
    }
  };
  var response = UrlFetchApp.fetch(url, options);
  var json = JSON.parse(response);
  var clients = json.profiles.map(function(item) {
    return ['','','',item.name,item.id];
  });
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Clients').getRange(2,1,clients.length, clients[0].length).setValues(clients);
}

function getMedPBAPI() {
  var apiToken = 'c75ec36977e644809d214e6ef4dec35b';
  var secret = '9540915c5d7b4522ac43015cfaef6a31';    
  var url = Utilities.formatString('https://api.results.medpb.com/api/v1/profiles/%s/recipients', 'ceb79e32-5d25-45dc-b226-c83a65da2f53');
 
  var options = {
    method      : "GET",
    contentType : 'application/json',
    headers     : {
      Accept           : 'application/json',
      Authorization    : Utilities.formatString('Token %s', apiToken),
    },
    muteHttpExceptions : true,
  };
  var response = UrlFetchApp.fetch(url, options);
  Logger.log(response);
}

function convertBytesToStr(arr) {
  var output = arr.map(function(e) {
      return ("0" + (e < 0 ? e + 256 : e).toString(16)).slice(-2);
    })
    .join("");
  return output;
}

/**
 * ------------------------------------------
 *   MD5 function for GAS(GoogleAppsScript)
 *
 * You can get a MD5 hash value and even a 4digit short Hash value of a string.
 * ------------------------------------------
 * Usage1:
 *   `=MD5("YourStringToHash")`
 *     or
 *   `=MD5( A1 )` with the same string at A1 cell
 *   result:
 *     `FCE7453B7462D9DE0C56AFCCFB756193`.
 *     For your sure-ness you can verify it in your terminal as below.
 *     `$ md5 -s "YourStringToHash"`
 * Usage2:
 *   `=MD5("YourStringToHash", true)` for short Hash
 *    result:
 *     `6MQH`
 *     Note that it has more conflict probability.
 *
 * How to install:
 *   Copy the script, pase it at [Tools]-[Script Editor]-[<YourProject>]
 *   or go https://script.google.com and paste it.
 *   For more details go:
 *     https://developers.google.com/apps-script/articles/
 * Latest version:
 *   https://gist.github.com/KEINOS/78cc23f37e55e848905fc4224483763d
 * Author:
 *   KEINOS @ https://github.com/keinos
 * Reference and thanks to:
 *   https://stackoverflow.com/questions/7994410/hash-of-a-cell-text-in-google-spreadsheet
 * ------------------------------------------
 *
 * @param {string} input The value to hash.
 * @param {boolean} isShortMode Set true for 4 digit shortend hash, else returns usual MD5 hash.
 * @return {string} The hashed input
 * @customfunction
 *
 */
function MD5(input, isShortMode) {
  var txtHash = '';
  var rawHash = Utilities.computeDigest(
    Utilities.DigestAlgorithm.MD5,
    input,
    Utilities.Charset.UTF_8 );
  
  var isShortMode = isShortMode == true;
  
  if (!isShortMode) {
    for (i = 0; i < rawHash.length; i++) {      
      var hashVal = rawHash[i];      
      if (hashVal < 0) {
        hashVal += 256;
      };
      if (hashVal.toString(16).length == 1) {
        txtHash += '0';
      };
      txtHash += hashVal.toString(16);
    };
  } else {
    for (j = 0; j < 16; j += 8) {
      hashVal = (rawHash[j] + rawHash[j+1] + rawHash[j+2] + rawHash[j+3])
      ^ (rawHash[j+4] + rawHash[j+5] + rawHash[j+6] + rawHash[j+7]);
      
      if (hashVal < 0) {
        hashVal += 1024;
      }
      if (hashVal.toString(36).length == 1) {
        txtHash += "0";
      }      
      txtHash += hashVal.toString(36);
    }
  }
  
  // change below to "txtHash.toLowerCase()" for lower case result.
  return txtHash.toLowerCase();
}