'use strict';

const moment = require('moment');
const fs = require('fs');

module.exports = (data, DBInstanceIdentifier) => {
  let config = null;
  try {
    config = init(DBInstanceIdentifier);
  }
  catch(error) {
    return Promise.reject(error);
  };

  const type = require('./type')
  let types = type(data[0]);
  let contain = [];
  Object.keys(types).forEach((value, index, arr) => {
    contain.push(value+':'+types[value]);
  })
  let schema = contain.join(",");

  const bq = require('@google-cloud/bigquery');
  let client = bq({
    projectId: config.projectId,
    keyFilename: config.keyFilename
  });

  let json = '';
  data.forEach(obj => {
    json = json + JSON.stringify(obj) + '\n';
  });
  const path = '/tmp/' + config.table + '.json';
  fs.writeFileSync(path, json, 'utf-8');

  return insert(client, config, schema, path).then(() => {
    fs.unlinkSync(path);
  }).catch(error => {
    throw error;
  });
}

function init(DBInstanceIdentifier) {
  let tableBase = process.env.BQ_TABLE_BASE_NAME
  let table = process.env.BQ_TABLE_NAME;
  if (typeof table === 'undefined') {
    if (typeof tableBase === 'undefined') {
      console.log('Not export table base name to "BQ_TABLE_BASE_NAME", use "AWS_DB_INSTANCE_IDENTIFIER": ' + DBInstanceIdentifier);
      tableBase = DBInstanceIdentifier;
    }
    table = tableBase.replace(/-/g, "_")+ "_query_log" + moment().add(-1, 'h').format('YYYYMMDD');
  }

  const config = {
    projectId: process.env.BQ_PROJECT_ID,
    dataset: process.env.BQ_DATASET_NAME,
    table: table,
    keyFilename: './secret.json'
  }

  if (typeof config.projectId === 'undefined') throw new Error('You have to export BigQuery project ID to "BQ_PROJECT_ID"');
  if (typeof config.dataset === 'undefined') throw new Error('You have to export BigQuery dataset name to "BQ_DATASET_NAME"');
  if (!fs.existsSync(config.keyFilename)) throw new Error('You have to build this app to contain BigQuery key file to "secret.json" in project root');

  return config;
}

function dataset(client, config) {
  return client.dataset(config.dataset).exists().then(res => {
    if (!res[0]) {
      return client.createDataset(config.dataset).then(res => { return res[0] }).catch(error => {
        throw error;
      });
    }
    return client.dataset(config.dataset);
  }).catch(error => {
    throw error;
  });
}

function table(client, config, schema) {
  return dataset(client, config).then(dataset => {
    return dataset.table(config.table).exists().then(res => {
      if (!res[0]) {
        const options = {
          schema: schema
        };

        return dataset.createTable(config.table, options).then(res => { return res[0] }).catch(error => {
          throw error;
        });
      }
      return dataset.table(config.table);
    });
  }).catch(error => {
    throw error;
  });
}

function insert(client, config, schema, path) {
  return table(client, config, schema).then(table => {
    table.import(path).then(() => {}).catch(error => {
      throw error;
    });
  }).catch(error => {
    throw error;
  });
}
