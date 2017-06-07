const aws = require('aws-sdk');
const aws4 = require('aws4');
const https = require('https');
const plpr = require('plpr');
const fs = require('fs');
const pgn = require('pg-query-normalizer');

const es = require('./elasticsearch');
const bq = require('./bq');

const rds = new aws.RDS();

const DBInstanceIdentifier = process.env.AWS_DB_INSTANCE_IDENTIFIER;
const logLinePrefix = process.env.PSQL_LOG_LINE_PREFIX;
const backend = process.env.BACKEND_SERVICE;

async function downloadLogFile() {
  const params = {
    DBInstanceIdentifier,
  };
  if (typeof DBInstanceIdentifier === 'undefined') throw new Error('You have to export AWS RDS DB instance name to "AWS_DB_INSTANCE_IDENTIFIER"');

  const describeDBLogFilesPromise = rds.describeDBLogFiles(params).promise();
  const data = await describeDBLogFilesPromise;
  const obj = JSON.parse(JSON.stringify(data)).DescribeDBLogFiles;
  const files = obj.map(value => value.LogFileName);

  const filename = process.env.AWS_DB_LOGFILE_NAME;
  params.LogFileName = filename;
  if (typeof filename === 'undefined') {
    params.LogFileName = files[files.length - 2];
  }
  console.log(`Downloading: ${params.LogFileName}...`); // eslint-disable-line no-console

  const region = rds.config.region;
  process.env.AWS_ACCESS_KEY_ID = rds.config.credentials.accessKeyId;
  process.env.AWS_SECRET_ACCESS_KEY = rds.config.credentials.secretAccessKey;
  const path = `/v13/downloadCompleteLogFile/${DBInstanceIdentifier}/${params.LogFileName}`;

  const opt = aws4.sign({ service: 'rds', path, region });
  return new Promise((resolve, reject) => {
    const req = https.request(opt, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => resolve(body));
    });
    req.end();
    req.on('err', err => reject(err));
  });
}

function dataReceiver() {
  const filepath = process.env.LOCAL_LOGFILE_PATH;
  if (typeof filepath === 'undefined') {
    return downloadLogFile();
  }
  return Promise.resolve(fs.readFileSync(filepath, 'utf-8'));
}

function normalizeQueries(logs) {
  const newLogs = [];
  for (let i = 0, len = logs.length; i < len; i += 1) {
    const normalized = pgn(logs[i].query);
    newLogs[i] = logs[i];
    newLogs[i].normalized_query = normalized;
  }
  return newLogs;
}

exports.handler = (event, context, callback) => {
  dataReceiver().then((data) => {
    if (typeof logLinePrefix === 'undefined') throw new Error('You have to set PostgreSQL log_line_prefix in PSQL_LOG_LINE_PREFIX');

    const logs = plpr(data, logLinePrefix);
    if (logs.length === 0) {
      return callback(null, 'success');
    }
    console.log(`Insert data length: ${logs.length}`); // eslint-disable-line no-console

    let inserter = null;
    switch (backend) {
      case 'es':
        inserter = es;
        break;
      case 'bq':
        inserter = bq;
        break;
      default:
        throw new Error('You have to export Backend Service "es" (Elasticsearch) or "bq" (BigQuery) to "BACKEND_SERVICE"');
    }

    const normalized = normalizeQueries(logs);
    return inserter(normalized, DBInstanceIdentifier).then(() => callback(null, 'success')).catch(err => callback(err, 'error'));
  }).catch(err => callback(err, 'error'));
};
