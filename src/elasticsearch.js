'use struct';

var config = null;

module.exports = (data, DBInstanceIdentifier) => {
  try {
    init(DBInstanceIdentifier);
  }
  catch(error) {
    return error;
  };

  const es = require('elasticsearch');
  const client = new es.Client({
    host: config.host
  });

  client.bulk({
    body: body(data)
  }, (error, responce) => {
    if (error) return error;
    else return null;
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
