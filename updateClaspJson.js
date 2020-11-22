const json = require('json-update');
const TEST_ID = '1I0PUYyXPnEHjHqKMdDsR7teuIwfVojZM3u75cRC44yJ8p9XWmkYf3D_y';
const PROD_ID = '1bH0ZhwKTOVwX3NciuJLem3Wl4T0n1AlxTkxRrBckoOc15-MIAt51ydc6';

const token = {
  token: {
    access_token:
      'ya29.a0AfH6SMDYd21Au2WoD8L0yfcU22b1J9ixl7xxhmw8rgr30iV5KayMvaurOGQmz-nM3EVnI1206wZZd_R_tI62GBcflsinKAT9RVVNLyxnxYMlxmXBB_96ebwHEFXGWX7bmOt-Vhlj9r8deZijDmTfyYCNc9VfCpEvDRtQDWJUdTc',
    refresh_token:
      '1//04mo8FEb0U0AdCgYIARAAGAQSNwF-L9IrwywLIjpHd9H3Ei0-adhNL-qvZ2TYm5sZ7Rj8v-jwsQeetKBXD99c-BQR8zLVJF2SOso',
    scope:
      'https://www.googleapis.com/auth/service.management https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/script.deployments https://www.googleapis.com/auth/userinfo.profile openid https://www.googleapis.com/auth/logging.read https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/drive.metadata.readonly https://www.googleapis.com/auth/script.projects https://www.googleapis.com/auth/script.webapp.deploy https://www.googleapis.com/auth/cloud-platform',
    token_type: 'Bearer',
    id_token:
      'eyJhbGciOiJSUzI1NiIsImtpZCI6ImRlZGMwMTJkMDdmNTJhZWRmZDVmOTc3ODRlMWJjYmUyM2MxOTcyNGQiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhenAiOiIxMDcyOTQ0OTA1NDk5LXZtMnYyaTVkdm4wYTBkMm80Y2EzNmkxdmdlOGN2Ym4wLmFwcHMuZ29vZ2xldXNlcmNvbnRlbnQuY29tIiwiYXVkIjoiMTA3Mjk0NDkwNTQ5OS12bTJ2Mmk1ZHZuMGEwZDJvNGNhMzZpMXZnZThjdmJuMC5hcHBzLmdvb2dsZXVzZXJjb250ZW50LmNvbSIsInN1YiI6IjExNTg0Mzc1ODkwMzc4MTk3OTAwNSIsImhkIjoidXJzYS5jb2RlcyIsImVtYWlsIjoibmF0ZUB1cnNhLmNvZGVzIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImF0X2hhc2giOiJqWkRQMHk0RExWbkIyRUlITml6NG9nIiwibmFtZSI6Ik5hdGUgU2FyZ2VudCIsInBpY3R1cmUiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vYS0vQU9oMTRHaEo4RjBWeEtwWjhnNDFvYmZYaWtZQ21DOEZTa0FkaFVjemFoR0Q9czk2LWMiLCJnaXZlbl9uYW1lIjoiTmF0ZSIsImZhbWlseV9uYW1lIjoiU2FyZ2VudCIsImxvY2FsZSI6ImVuIiwiaWF0IjoxNjA1OTA2NDU1LCJleHAiOjE2MDU5MTAwNTV9.IfK1RAqWd2C3PFmm7q9RiQKCwtavgQytL1dsdolqUlYC7-QCyYROdN7l0F4GsRG-LFULAhr9m1XmckTmToCiwnPzhR9Zcfp152tv60v01XEGR49ytEPn4fYVZF9oRn3K28klEheHqwHDTOa6MXVq6CUFa9pl4eKIL_qm89VsZr-VfOvgekfLtVYS9ZsTTvFPU_IV99iNHTBjWi3l_aD1GkVFfI5bYwvDHSna2mMEZBF2XM86Dz3dsojEUHkUUAZ5qvDTVfT3tfP3mhEWlVRE1uDFsLYE7M9zSiQl2a0nyUPDOoTrIrcNRCRVU7EipiLVsleY0lhIgZndrzNY7kk7zA',
    expiry_date: 1605910054731,
  },
  oauth2ClientSettings: {
    clientId:
      '1072944905499-vm2v2i5dvn0a0d2o4ca36i1vge8cvbn0.apps.googleusercontent.com',
    clientSecret: 'v6V3fKV_zWU7iw1DrpO1rknX',
    redirectUri: 'http://localhost',
  },
  isLocalCreds: false,
};

const runType = process.argv[2];
if (!runType) {
  console.log("No run type selected. Please use either 'prod' or 'test'.");
} else {
  json
    .update('../../.clasprc.json', token)
    .then(() => {
      console.log('Clasp user updated');
    })
    .catch((err) => console.error(err));

  json
    .update('.clasp.json', {
      rootDir: 'src/',
      scriptId: runType === 'prod' ? PROD_ID : TEST_ID,
    })
    .then(() => {
      console.log('Clasp settings updated');
    })
    .catch((err) => console.error(err));
}
