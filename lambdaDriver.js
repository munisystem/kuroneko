'use strict';

var index = require('./dist/index')

var event = {}

var context = {}

var callback = function (err, result) {
  if (err) {
    console.log(err.message)
  } else {
    console.log(result)
  }
}

