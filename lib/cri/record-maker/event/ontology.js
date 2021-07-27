const DBPedia = require('../../../dbpedia');
const SmallestPlacePicker = require('../../../smallest-place-picker');
const parseDate = require('../../../date-parser');

const EventRecordMaker = require('../event');

class OntologyEventRecordMaker extends EventRecordMaker {
  constructor(cridb) {
    super({ cridb });
  }

  async createPersonEvents({
    realname,
    id: personID,
    name: personName,
    status = 'pending',
  }) {
    if (!personName) [personName] = arguments;
    const { cridb } = this;
    const ontologyEventRecordMaker = this;
    const eventRecords = await cridb.searchEvent(realname);
    const promises = ['birth', 'death'].map(async (eventType) => {
      const findRecord = ({ subtype }) => subtype === eventType;
      const { id: eventID } = eventRecords.find(findRecord) || {};
      const params = {
        personName,
        eventType,
        cridb,
      };
      const [eventDate, tagsOnDB, eventPlaceTags] = await Promise.all([
        ontologyEventRecordMaker.getEventDate(params),
        ontologyEventRecordMaker.getRecordTags(eventID),
        ontologyEventRecordMaker.getEventPlaceTags(params),
      ]);
      const personRecord = { type: 'thing', id: personID };
      const requestData = {
        status,
        subtype: eventType,
        date: eventDate,
        tags: [personRecord, ...tagsOnDB, ...eventPlaceTags],
      };

      return await cridb.saveEvent({
        id: eventID,
        data: requestData,
      });
    });

    const [birthEventID, deathEventID] = await Promise.all(promises);

    return { birthEventID, deathEventID };
  }

  async getEventDate({ personName, eventType }) {
    const dbpediaRecord = await DBPedia.get(personName);
    let eventDate = dbpediaRecord.find(
      ['Date', 'Year'].map((key) => `${eventType}${key}`),
      0,
      'value',
    );

    if (eventDate) {
      eventDate = parseDate(eventDate);
    } else {
      eventDate = dbpediaRecord.find(
        'subject',
        ({ keyword }) => {
          const regexp = new RegExp(`Category:[0-9]{1,4}_${eventType}s`);
          return regexp.test(keyword);
        },
        'keyword',
      );
      eventDate = (eventDate || '').replace(/\D/g, '');
    }

    return eventDate;
  }

  async getEventPlaceTags({ personName, eventType, cridb }) {
    const placeRecordMaker = cridb.recordMaker.thing.place;
    const dbpediaRecord = await DBPedia.get(personName);
    const placeList = (dbpediaRecord.find(`${eventType}Place`) || [])
      .map(({ keyword }) => keyword)
      .filter((name) => name);

    const promises = placeList.map(async (placeName) => {
      try {
        await placeRecordMaker.create(placeName);
      } catch (error) {
        console.log(error);
      }
    });

    await Promise.all(promises);

    const placeName = await SmallestPlacePicker.pick(placeList);
    const placeRecords = placeName ? await cridb.searchThing(placeName) : [];
    const placeRecord = placeRecords.find(({ subtype, name = '' }) => {
      return subtype === 'place' && 1 !== name.indexOf(placeName);
    });
    const { id } = placeRecord || {};
    const tags = [];

    if (id) {
      tags.push({
        type: 'thing',
        id,
      });
    }

    return tags;
  }
}

module.exports = OntologyEventRecordMaker;
