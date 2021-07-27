const RecordMaker = require('../record-maker');

class MediumRecordMaker extends RecordMaker {
  constructor({ cridb, subtype }) {
    super({
      cridb,
      subtype,
      recordType: 'medium',
    });
  }
}

module.exports = MediumRecordMaker;

MediumRecordMaker.Article = require('./medium/article');
MediumRecordMaker.Picture = require('./medium/picture');
