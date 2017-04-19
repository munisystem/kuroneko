'use strict';

module.exports = (data, DBInstanceIdentifier) => {
  let config = null;
  try {
    config = init(DBInstanceIdentifier);
  }
  catch(error) {
    return Promise.reject(error);
  };

  const es = require('elasticsearch');
  let client = new es.Client({
    host: config.host
  });

  return new Promise((resolve, reject) => {
    const error = insert(client, config, data);
    if (error) reject(error);
    else resolve();
  });
}

function init(type) {
  const config = {
    host: process.env.ELASTICSEARCH_HOST,
    index: 'psql_query_log',
    type: type
  }

  if (typeof config.host === 'undefined') throw new Error('You have to export Elasticsearch host url to "ELASTICSEARCH_HOST"');
}

function body(config, data) {
  let store = [];
  const description = JSON.stringify({index: {_index: config.index, _type: config.type}});

  data.forEach((value, index, array) => {
    store.push(description);
    store.push(JSON.stringify(value));
  });

  return store;
}

function insert(client, config, data) {
  client.bulk({
    body: body(config, data)
  }, (error, responce) => {
    if (error) return error;
  });
}
