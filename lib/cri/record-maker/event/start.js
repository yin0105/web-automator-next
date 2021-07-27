const dateParser = require('../../../date-parser');

const EventRecordMaker = require('../event');

class StartEventRecordMaker extends EventRecordMaker {
  constructor(cridb) {
    super({ cridb, subtype: 'start' });
  }

  async createPlaceStartEvent({
    name: placeName,
    id: placeID,
    status = 'pending',
    tags = [],
    date,
  }) {
    if (!placeName) [placeName] = arguments;
    const { cridb, subtype } = this;
    const eventID = await this.getRecordID(placeName);
    const tagsOnDB = await this.getRecordTags(eventID);
    date = dateParser(date);
    tags = [
      {
        type: 'thing',
        id: placeID,
      },
      ...tags,
      ...tagsOnDB,
    ];
    const requestData = {
      status,
      subtype,
      date,
      tags,
      notes: `wkpd-${placeName}`,
    };

    return {
      eventID: await cridb.saveEvent({
        id: eventID,
        data: requestData,
      }),
    };
  }
}

module.exports = StartEventRecordMaker;
