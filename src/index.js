'use strict';

const aws = require('aws-sdk');
const rds = new aws.RDS();
const DBInstanceIdentifier = process.env.AWS_DB_INSTANCE_IDENTIFIER;

const plpr = require('plpr');
const logLinePrefix = process.env.PSQL_LOG_LINE_PREFIX;

const elasticsearch = require('./elasticsearch');

exports.handler = (event, context, callback) => {
  downloadLogFile().then(data => {
    if (typeof logLinePrefix === 'undefined') throw new Error('You have to set PostgreSQL log_line_prefix in PSQL_LOG_LINE_PREFIX');

    const logs = plpr(data, logLinePrefix);
    console.log('Insert data length: ' + logs.length);

    const err = elasticsearch(logs, DBInstanceIdentifier);
    if (err) return callback(err, 'error');
    else return callback(null, 'success');
  }).catch(error => {
    return callback(error, 'error');
  });
}

function getLogFiles() {
  const params = {
    DBInstanceIdentifier: DBInstanceIdentifier,
  };

  const describeDBLogFilesPromise = rds.describeDBLogFiles(params).promise();
  return describeDBLogFilesPromise.then(data  => {
    const obj = JSON.parse(JSON.stringify(data))['DescribeDBLogFiles']
    return obj.map((element, index, array) => {
      return element['LogFileName'];
    });
  }).catch(error => {
    throw error;
  });
}

function downloadLogFile() {
  return getLogFiles().then(data => {
    const params = {
      DBInstanceIdentifier: DBInstanceIdentifier,
      LogFileName: data[data.length-2],
    };

    const downloadLogFilePortionPromise = rds.downloadDBLogFilePortion(params).promise();
    console.log('Downloading ' + DBInstanceIdentifier + ':' + data[data.length-2] +  '...');
    return downloadLogFilePortionPromise.then(data => {
      return JSON.parse(JSON.stringify(data))['LogFileData'];
    }).catch(error => {
      throw error;
    });
  }).catch(error => {
    throw error;
  });
}
