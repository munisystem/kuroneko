'use struct';

var config = null;
var client = null;

module.exports = (data, DBInstanceIdentifier) => {
  try {
    init(DBInstanceIdentifier);
  }
  catch(error) {
    return Promise.reject(error);
  };

  const es = require('elasticsearch');
  client = new es.Client({
    host: config.host
  });

  return new Promise((resolve, reject) => {
    const error = insert(data);
    if (error) reject(error);
    else resolve();
  });
}

function init(type) {
  config = {
    host: process.env.ELASTICSEARCH_HOST,
    index: 'psql_query_log',
    type: type
  }

  if (typeof config.host === 'undefined') throw new Error('You have to export Elasticsearch host url to "ELASTICSEARCH_HOST"');
}

function body(data) {
  var store = [];
  const description = JSON.stringify({index: {_index: config.index, _type: config.type}});

  data.forEach((value, index, array) => {
    store.push(description);
    store.push(JSON.stringify(value));
  });

  return store;
}

function insert(data) {
  client.bulk({
    body: body(data)
  }, (error, responce) => {
    if (error) return error;
  });
}
