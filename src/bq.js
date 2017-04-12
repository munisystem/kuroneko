'use strict';

const moment = require('moment');
const fs = require('fs');
var config = null;
var client = null;
var schema = null;

module.exports = (data, DBInstanceIdentifier) => {
  try {
    init(DBInstanceIdentifier);
  }
  catch(error) {
    return Promise.reject(error);
  };

  const type = require('./type')
  var types = type(data[0]);
  var contain = [];
  Object.keys(types).forEach((value, index, arr) => {
    contain.push(value+':'+types[value]);
  })
  schema = contain.join(",");

  const bq = require('@google-cloud/bigquery');
  client = bq({
    projectId: config.projectId,
    keyFilename: config.keyFilename
  });

  return insert(data).then().catch(error => {
    throw error;
  });
}

function init(tableBase) {
  config = {
    projectId: process.env.BQ_PROJECT_ID,
    dataset: process.env.BQ_DATASET_NAME,
    table: tableBase.replace(/-/g, "_")+ "_query_log" + moment().add(-1, 'h').format('YYYYMMDD'),
    keyFilename: './secret.json'
  }

  if (typeof config.projectId === 'undefined') throw new Error('You have to export BigQuery project ID to "BQ_PROJECT_ID"');
  if (typeof config.dataset === 'undefined') throw new Error('You have to export BigQuery dataset name to "BQ_DATASET_NAME"');
  if (!fs.existsSync(config.keyFilename)) throw new Error('You have to build this app to contain BigQuery key file to "secret.json" in project root');

  return config;
}

function dataset() {
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

function table() {
  return dataset().then(dataset => {
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

function insert(data) {
  return table().then(table => {
    while(data.length === 0) {
      table.insert(data.slice(0, 300)).then(() => {}).catch(error => {
        throw error;
      });
      data = data.slice(300, data.length);
    }
  }).catch(error => {
    throw error;
  });
}
