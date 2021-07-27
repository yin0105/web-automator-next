const RecordMaker = require('../record-maker');

class EventRecordMaker extends RecordMaker {
  constructor({ cridb, subtype }) {
    super({
      cridb,
      subtype,
      recordType: 'event',
    });
  }
}

module.exports = EventRecordMaker;

EventRecordMaker.General = require('./event/general');
EventRecordMaker.Ontology = require('./event/ontology');
EventRecordMaker.Start = require('./event/start');
