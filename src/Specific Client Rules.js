function verifyClientRules(obj) {
  switch (obj.company) {
    case 'Sycle':
      return verifySycle(obj.records);
    case 'Sycle-Test':
      return verifySycle(obj.records);
    case 'CounselEAR':
      return verifyCounselEar(obj);
    default:
      return obj.records;
  }
}

function verifySycle(records) {
  var validStatuses = ['Confirmed','Completed'];
  var output = [];
  records.forEach(function(record) {
    var recordDate = record['Appointment Time and Date'] && record['Appointment Time and Date'].length ? new Date(record['Appointment Time and Date']) : null;
    if (!recordDate) {
      return;
    }
    if (recordDate.getTime() < new Date().getTime() && validStatuses.indexOf(record['Appointment Status']) > -1) {
      output.push(record);
    }
  });
  return output;
}

function verifyCounselEar(obj) {
  const records = obj.records;
  var SUCCESS_STATUS = ['APPOINTMENT-COMPLETE'];
  var output = [];
  records.forEach(function(record) {
    if (SUCCESS_STATUS.indexOf(record.trigger) === -1) {
      return;
    }
    record.clinicID = obj.params ? obj.params.id : null;
    record.provider_first_name = record.apptStaffList[0].firstName;
    record.provider_last_name = record.apptStaffList[0].lastName;
    record.provider_full_name = [record.apptStaffList[0].firstName, record.apptStaffList[0].lastName].join(" ");
    output.push(record);    
  });
  return output;
}