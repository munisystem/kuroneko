'use strict';

const aws = require('aws-sdk');
const rds = new aws.RDS();
const DBInstanceIdentifier = process.env.AWS_DB_INSTANCE_IDENTIFIER;
const esIndex = 'psql_query_log'

const elasticsearch = require('elasticsearch');
const client = new elasticsearch.Client({
  host: 'localhost:9200'
});

const plpr = require('plpr');

exports.handler = (event, context, callback) => {
  downloadLogFile().then(data => {
    const logs = plpr(data);
    console.log('Insert data length: ' + logs.length);
    var body = [];
    const description = JSON.stringify({index: {_index: esIndex, _type: DBInstanceIdentifier}});
    logs.forEach((element, index, array) => {
      body.push(description);
      body.push(JSON.stringify({timestamp: Date.parse(element.timestamp), duration: element.duration, query: element.query}));
    });

    client.bulk({
      body: body
    }, (error, response) => {
      if (error) return callback(error, error);
      else return callback(null, 'success');
    });
  });
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
    console.log('Downloading ' + DBInstanceIdentifier + ':' + data[data.length-2] +  '...')
    return downloadLogFilePortionPromise.then((data, err) => {
      return JSON.parse(JSON.stringify(data))['LogFileData'];
    });
  });
}
