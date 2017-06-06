const moment = require('moment');
const fs = require('fs');
const bq = require('@google-cloud/bigquery');

const type = require('./type');

function init(DBInstanceIdentifier) {
  let tableBase = process.env.BQ_TABLE_BASE_NAME;
  let tableName = process.env.BQ_TABLE_NAME;
  if (typeof tableName === 'undefined') {
    if (typeof tableBase === 'undefined') {
      console.log(`Not export table base name to "BQ_TABLE_BASE_NAME", use "AWS_DB_INSTANCE_IDENTIFIER": ${DBInstanceIdentifier}`); // eslint-disable-line no-console
      tableBase = DBInstanceIdentifier;
    }
    tableName = `${tableBase.replace(/-/g, '_')}_query_log${moment().add(-1, 'h').format('YYYYMMDD')}`;
  }

  const config = {
    projectId: process.env.BQ_PROJECT_ID,
    dataset: process.env.BQ_DATASET_NAME,
    table: tableName,
    keyFilename: './secret.json',
  };

  if (typeof config.projectId === 'undefined') throw new Error('You have to export BigQuery project ID to "BQ_PROJECT_ID"');
  if (typeof config.dataset === 'undefined') throw new Error('You have to export BigQuery dataset name to "BQ_DATASET_NAME"');
  if (!fs.existsSync(config.keyFilename)) throw new Error('You have to build this app to contain BigQuery key file to "secret.json" in project root');

  return config;
}

function getDataset(client, config) {
  return client.dataset(config.dataset).exists().then((dataset) => {
    if (!dataset[0]) {
      return client.createDataset(config.dataset).then(res => res[0]).catch((err) => {
        throw err;
      });
    }
    return client.dataset(config.dataset);
  }).catch((err) => {
    throw err;
  });
}

function getTable(client, config, schema) {
  return getDataset(client, config).then((ds) => { // eslint-disable-line arrow-body-style
    return ds.table(config.table).exists().then((dsRes) => {
      if (!dsRes[0]) {
        const options = {
          schema,
        };

        return ds.createTable(config.table, options).then(res => res[0]).catch((err) => { // eslint-disable-line max-len
          throw err;
        });
      }
      return ds.table(config.table);
    });
  }).catch((err) => {
    throw err;
  });
}

function insert(client, config, schema, path) {
  return getTable(client, config, schema).then((table) => {
    table.import(path).then(() => {}).catch((err) => {
      throw err;
    });
  }).catch((err) => {
    throw err;
  });
}

module.exports = (data, DBInstanceIdentifier) => {
  let config = null;
  try {
    config = init(DBInstanceIdentifier);
  } catch (err) {
    return Promise.reject(err);
  }

  const types = type(data[0]);
  const contain = [];
  Object.keys(types).forEach((value) => {
    contain.push(`${value}:${types[value]}`);
  });
  const schema = contain.join(',');

  const client = bq({
    projectId: config.projectId,
    keyFilename: config.keyFilename,
  });

  let json = '';
  data.forEach((obj) => {
    json += `${JSON.stringify(obj)}\n`;
  });
  const path = `/tmp/${config.table}.json`;
  fs.writeFileSync(path, json, 'utf-8');

  return insert(client, config, schema, path).then(() => {
    fs.unlinkSync(path);
  }).catch((err) => {
    throw err;
  });
};
