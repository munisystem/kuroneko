'use strict';

const aws = require('aws-sdk');
const rds = new aws.RDS();
const DBInstanceIdentifier = process.env.AWS_DB_INSTANCE_IDENTIFIER;

const plpr = require('plpr');
const logLinePrefix = process.env.PSQL_LOG_LINE_PREFIX;

const backend = process.env.BACKEND_SERVICE;

const fs = require('fs');

const elasticsearch = require('./elasticsearch');
const bq = require('./bq')

exports.handler = (event, context, callback) => {
  dataReceiver().then(data => {
    if (typeof logLinePrefix === 'undefined') throw new Error('You have to set PostgreSQL log_line_prefix in PSQL_LOG_LINE_PREFIX');

    const logs = plpr(data, logLinePrefix);
    console.log('Insert data length: ' + logs.length);

    var inserter = null;
    switch (backend) {
      case 'es':
        inserter = require('./elasticsearch');
        break;
      case 'bq':
        inserter = require('./bq');
        break;
      default:
        throw new Error('You have to export Backend Service "es" (Elasticsearch) or "bq" (BigQuery) to "BACKEND_SERVICE"');
        break;
    }

    inserter(logs, DBInstanceIdentifier).then(() => {
      return callback(null, 'success');
    }).catch(error => {
      return callback(error, 'error');
    });
  }).catch(error => {
    return callback(error, 'error');
  });
}

function dataReceiver() {
  const filepath = process.env.LOCAL_LOGFILE_PATH;
  if (typeof filepath === "undefined") {
    return downloadLogFile();
  }
  const data = fs.readFileSync(filepath, 'utf-8');
  return Promise.resolve(data);
}

async function downloadLogFile() {
  let params = {
    DBInstanceIdentifier: DBInstanceIdentifier,
  };
  if (typeof DBInstanceIdentifier === 'undefined') throw new Error('You have to export AWS RDS DB instance name to "AWS_DB_INSTANCE_IDENTIFIER"');

  try {
    const describeDBLogFilesPromise = rds.describeDBLogFiles(params).promise();
    const data = await describeDBLogFilesPromise;
    let obj = JSON.parse(JSON.stringify(data))['DescribeDBLogFiles'];
    const files = obj.map((value, index, array) => {
      return value['LogFileName'];
    });

    const filename = process.env.AWS_DB_LOGFILE_NAME;
    params['LogFileName'] = filename;
    params['NumberOfLines'] = 300
    if (typeof filename === 'undefined') {
      params['LogFileName'] = files[files.length-2];
    }

    console.log('Downloading: ' + params['LogFileName'] + '...');
    let next = true;
    let marker = '0';
    let raw = '';
    while(next) {
      params['Marker'] = marker;
      const downloadLogFilePortionPromise = rds.downloadDBLogFilePortion(params).promise();
      const resp = await downloadLogFilePortionPromise;

      obj = JSON.parse(JSON.stringify(resp))
      next = obj['AdditionalDataPending'];
      marker = obj['Marker'];
      raw = raw + obj['LogFileData'];
    }
    return raw;
  } catch(error) {
    throw error;
  }
}
