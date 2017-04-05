'use strict';

const aws = require('aws-sdk');
const rds = new aws.RDS();
const DBInstanceIdentifier = process.env.AWS_DB_INSTANCE_IDENTIFIER;

const plpr = require('plpr');

exports.handler = (event, context, callback) => {
  downloadLogFile().then(data => {
    const logs = plpr(data);
  });
  callback(null, 'success');
}

function getLogFiles() {
  const params = {
    DBInstanceIdentifier: DBInstanceIdentifier,
  };

  const describeDBLogFilesPromise = rds.describeDBLogFiles(params).promise();
  return describeDBLogFilesPromise.then(data => {
    const obj = JSON.parse(JSON.stringify(data))['DescribeDBLogFiles']
    return obj.map((element, index, array) => {
      return element['LogFileName'];
    });
  });
}

function downloadLogFile() {
  return getLogFiles().then(data => {
    const params = {
      DBInstanceIdentifier: DBInstanceIdentifier,
      LogFileName: data[data.length-1],
    };

    const downloadLogFilePortionPromise = rds.downloadDBLogFilePortion(params).promise();
    return downloadLogFilePortionPromise.then((data, err) => {
      return JSON.parse(JSON.stringify(data))['LogFileData'];
    });
  });
}
