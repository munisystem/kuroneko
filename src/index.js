'use strict';

const aws = require('aws-sdk');
const rds = new aws.RDS();
const DBInstanceIdentifier = process.env.AWS_DB_INSTANCE_IDENTIFIER;

const esHost = process.env.ES_HOST;
const esIndex = 'psql_query_log';

const elasticsearch = require('elasticsearch');
const client = new elasticsearch.Client({
  host: esHost
});

const plpr = require('plpr');
const logLinePrefix = process.env.PSQL_LOG_LINE_PREFIX;

exports.handler = (event, context, callback) => {
  downloadLogFile().then(data => {
    if (typeof logLinePrefix === 'undefined') throw Error.new('You have to set PostgreSQL log_line_prefix in PSQL_LOG_LINE_PREFIX');

    const logs = plpr(data, logLinePrefix);
    console.log('Insert data length: ' + logs.length);

    var body = [];
    const description = JSON.stringify({index: {_index: esIndex, _type: DBInstanceIdentifier}});
    logs.forEach((element, index, array) => {
      body.push(description);
      body.push(JSON.stringify(element));
    });

    client.bulk({
      body: body
    }, (error, response) => {
      if (error) return callback(error, 'error');
      else return callback(null, 'success');
    });
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
