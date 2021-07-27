const DBPedia = require('../../../dbpedia');
const ThingRecordMaker = require('../thing');

const isTest = typeof jest == 'object';

class PersonRecordMaker extends ThingRecordMaker {
  constructor(cridb) {
    super({ cridb, subtype: 'person' });
  }

  async create({
    notes,
    name: personName,
    status = 'pending',
    tags = [],
    tagsForArticle = [],
  }) {
    if (!personName) [personName] = arguments;
    const { cridb, subtype } = this;

    if (isTest) {
      console.time('get nationality, realname, record-id');
    }

    let [nationality, realname, personID] = await Promise.all([
      this.getNationality(personName),
      this.getRealName(personName),
      this.getRecordID(personName),
    ]);

    console.timeEnd('get nationality, realname, record-id');

    console.time('get record tags');
    const tagsOnDB = await this.getRecordTags(personID);
    console.timeEnd('get record tags');

    notes = notes ? `\n${notes}` : '';
    notes = `wkpd-${personName}${notes}`;
    const requestData = {
      status,
      nationality,
      notes,
      subtype,
      name: realname,
      tags: [...tags, ...tagsOnDB],
    };

    console.time('save thing');
    personID = await cridb.saveThing({
      id: personID,
      data: requestData,
    });
    console.timeEnd('save thing');

    const ontologyEventRecordMaker = cridb.recordMaker.event.ontology;
    const articleRecordMaker = cridb.recordMaker.medium.article;
    const recordMakerParams = {
      status,
      realname,
      id: personID,
      name: personName,
    };

    console.time('create related records');
    const [eventIDs, { articleID }, pictureRecordIDs] = await Promise.all([
      ontologyEventRecordMaker.createPersonEvents(recordMakerParams),
      articleRecordMaker.createForThing({
        tags: tagsForArticle,
        ...recordMakerParams,
      }),
      this.createPictureRecords(recordMakerParams),
    ]);
    console.time('create related records');

    return {
      personID,
      articleID,
      pictureRecordIDs,
      ...eventIDs,
    };
  }

  async getNationality(personName) {
    const dbpediaRecord = await DBPedia.get(personName);
    return dbpediaRecord.find('nationality', 0, 'value');
  }
}

module.exports = PersonRecordMaker;
