const DBPedia = require('../dbpedia');
const Wikipedia = require('../wikipedia');

class RecordMaker {
  constructor({ cridb, recordType, subtype }) {
    Object.assign(this, { cridb, recordType, subtype });
  }

  static all(cridb) {
    return {
      event: {
        general: new RecordMaker.Event.General(cridb),
        ontology: new RecordMaker.Event.Ontology(cridb),
        start: new RecordMaker.Event.Start(cridb),
      },
      thing: {
        person: new RecordMaker.Thing.Person(cridb),
        place: new RecordMaker.Thing.Place(cridb),
      },
      medium: {
        article: new RecordMaker.Medium.Article(cridb),
        picture: new RecordMaker.Medium.Picture(cridb),
      },
    };
  }

  async getRecordID(recordName) {
    const { cridb, recordType, subtype } = this;
    const records = await cridb.search(recordType, `wkpd-${recordName}`);
    const record = records.find(
      ({ subtype: subtypeOnDB }) => subtypeOnDB === subtype,
    );
    const { id } = record || {};
    return +id || null;
  }

  async getRecordTags(id) {
    const { cridb, recordType } = this;
    return id ? await cridb.getTags(recordType, id) : [];
  }

  async getRealName(name) {
    let realname = (await DBPedia.get(name)).find([
      ['name', 'label'],
      ({ lang }) => lang === 'en',
      'value',
    ]);

    if (!realname) {
      try {
        realname = await Wikipedia.getRealName(name);
      } catch (error) {
        console.log(`get realname error: ${error.toString()}`);
      }
    }

    if (!realname) {
      realname = decodeURIComponent(name).replace('_', ' ');
    }

    return realname;
  }
}

module.exports = RecordMaker;

RecordMaker.Event = require('./record-maker/event');
RecordMaker.Thing = require('./record-maker/thing');
RecordMaker.Medium = require('./record-maker/medium');
