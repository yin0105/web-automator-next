const DBPedia = require('../../../dbpedia');
const Wikipedia = require('../../../wikipedia');
const parseDate = require('../../../date-parser');

const EventRecordMaker = require('../event');

class GeneralEventRecordMaker extends EventRecordMaker {
  constructor(cridb) {
    super({ cridb, subtype: 'event' });
  }

  async create({ name: eventName, status = 'pending', tags = [] }) {
    if (!eventName) [eventName] = arguments;
    const { cridb } = this;
    eventName = eventName || arguments[0];
    const eventID = await this.getRecordID(eventName);
    const [tagsOnDB, eventDate, realname] = await Promise.all([
      this.getRecordTags(eventID),
      this.getEventDate(eventName),
      this.getRealName(eventName),
    ]);
    const requestData = {
      status,
      subtype: 'event',
      name: realname,
      date: eventDate,
      descr: `wkpd-${eventName}`,
      tags: [...tags, ...tagsOnDB],
    };

    return {
      eventID: await cridb.saveEvent({
        id: eventID,
        data: requestData,
      }),
    };
  }

  async getEventDate(eventName) {
    const dbpediaRecord = await DBPedia.get(eventName);
    let eventDate = dbpediaRecord.find('data', 0, 'value');
    let dateConvertNeeded = !!eventDate;
    const [foundingYear, dissolutionYear] = [
      'foundingYear',
      'dissolutionYear',
    ].map((key) => dbpediaRecord.find(key, 0, 'value'));

    if (foundingYear && dissolutionYear) {
      eventDate = `${foundingYear}-${dissolutionYear}`;
      dateConvertNeeded = false;
    }

    if (eventDate) {
      if (dateConvertNeeded) {
        eventDate = parseDate(eventDate);
      }
    } else {
      eventDate = await Wikipedia.getEventDate(eventName);
    }

    return eventDate;
  }
}

module.exports = GeneralEventRecordMaker;
