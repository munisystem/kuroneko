'use strict';

const aws = require('aws-sdk');
const rds = new aws.RDS();

const DBInstanceIdentifier = process.env.AWS_DB_INSTANCE_IDENTIFIER;

exports.handler = (event, context, callback) => {
  getLogFiles().then(data => {
    console.log(data[data.length-1]);
  });
  callback(null, 'success');
}

function getLogFiles() {
  var params = {
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
