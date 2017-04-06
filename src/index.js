'use strict';

const aws = require('aws-sdk');
const rds = new aws.RDS();
const DBInstanceIdentifier = process.env.AWS_DB_INSTANCE_IDENTIFIER;
const esHost = process.env.ES_HOST
const esIndex = 'psql_query_log'

const elasticsearch = require('elasticsearch');
const client = new elasticsearch.Client({
  host: esHost
});

const plpr = require('plpr');

exports.handler = (event, context, callback) => {
  downloadLogFile().then((data, error) => {
    if (error) return callback(null, error);
    const logs = plpr(data);
    console.log('Insert data length: ' + logs.length);
    var body = [];
    const description = JSON.stringify({index: {_index: esIndex, _type: DBInstanceIdentifier}});
    logs.forEach((element, index, array) => {
      body.push(description);
      body.push(JSON.stringify({timestamp: new Date(element.timestamp).toISOString(), duration: element.duration, query: element.query}));
    });

    client.bulk({
      body: body
    }, (error, response) => {
      if (error) return callback(error, 'error');
      else return callback(null, 'success');
    });
  });
}

function getLogFiles() {
  const params = {
    DBInstanceIdentifier: DBInstanceIdentifier,
  };

  const describeDBLogFilesPromise = rds.describeDBLogFiles(params).promise();
  return describeDBLogFilesPromise.then((data, error) => {
    if (error) return null, error;
    const obj = JSON.parse(JSON.stringify(data))['DescribeDBLogFiles']
    return obj.map((element, index, array) => {
      return element['LogFileName'];
    });
  });
}

function downloadLogFile() {
  return getLogFiles().then((data,error) => {
    if (error) return null, error;
    const params = {
      DBInstanceIdentifier: DBInstanceIdentifier,
      LogFileName: data[data.length-2],
    };

    const downloadLogFilePortionPromise = rds.downloadDBLogFilePortion(params).promise();
    console.log('Downloading ' + DBInstanceIdentifier + ':' + data[data.length-2] +  '...')
    return downloadLogFilePortionPromise.then((data, err) => {
      if (error) return null, error;
      return JSON.parse(JSON.stringify(data))['LogFileData'];
    });
  });
}
