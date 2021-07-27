const { tabWidth } = require('../.prettierrc');

function prettierJSONStringify(value, tabSize = tabWidth) {
  return JSON.stringify(value, null, tabSize);
}

module.exports = prettierJSONStringify;
