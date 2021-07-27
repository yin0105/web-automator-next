const RecordMaker = require('../record-maker');

class ThingRecordMaker extends RecordMaker {
  constructor({ cridb, subtype }) {
    super({
      subtype,
      cridb,
      recordType: 'thing',
    });
  }

  async createPictureRecords(recordMakerParams) {
    const { cridb } = this;
    const pictureRecordMaker = cridb.recordMaker.medium.picture;
    return await pictureRecordMaker.createForThing(recordMakerParams);
  }
}

module.exports = ThingRecordMaker;

ThingRecordMaker.Person = require('./thing/person');
ThingRecordMaker.Place = require('./thing/place');
