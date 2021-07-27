const escapeStringRegexp = require('escape-string-regexp');

class DuplicateDetector {
  constructor(cridb) {
    this.cridb = cridb;
  }

  async checkDuplicated({ name, recordType, subtype }) {
    const { cridb } = this;
    const records = await cridb.search(recordType, name);
    const nameForRegExp = escapeStringRegexp(name);
    const isSameName = new RegExp(`\\b${nameForRegExp}\\b`, 'i');
    const findDuplicated = (recordOnDB) => {
      return (
        recordOnDB.subtype === subtype &&
        ['name', 'nickname'].some((key) => {
          const nameOfRecordOnDB = String(recordOnDB[key] || '');
          return isSameName.test(nameOfRecordOnDB);
        })
      );
    };

    const { length } = records.filter(findDuplicated);
    return length > 1;
  }
}

module.exports = DuplicateDetector;
