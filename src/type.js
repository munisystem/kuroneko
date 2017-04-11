'use struct';

const intParams = ['pid']
const floatParams = ['duration']
const timestampParams = ['starttime', 'endtime']

module.exports = (data) => {
  var types = {};
  Object.keys(data).forEach(key => {
    if (intParams.indexOf(key) >= 0) {
      types[key] = 'integer';
    } else if (floatParams.indexOf(key) >= 0) {
      types[key] = 'float';
    } else if (timestampParams.indexOf(key) >= 0) {
      types[key] = 'timestamp';
    } else {
      types[key] = 'string';
    }
  });
  return types;
}
