const DBPedia = require('../../../dbpedia');

const ThingRecordMaker = require('../thing');

class PlaceRecordMaker extends ThingRecordMaker {
  constructor(cridb) {
    super({ cridb, subtype: 'place' });
  }

  async create({
    notes,
    startDate,
    name: placeName,
    status = 'pending',
    tags = [],
    tagsForArticle = [],
  }) {
    if (!placeName) [placeName] = arguments;
    const { cridb, subtype } = this;
    let [coordinate, realname, placeID] = await Promise.all([
      this.getCoordinate(placeName),
      this.getRealName(placeName),
      this.getRecordID(placeName),
    ]);
    const tagsOnDB = await this.getRecordTags(placeID);
    notes = notes ? `\n${notes}` : '';
    notes = `wkpd-${placeName}${notes}`;
    const requestData = {
      status,
      notes,
      subtype,
      ...coordinate,
      name: realname,
      tags: [...tags, ...tagsOnDB],
    };

    placeID = await cridb.saveThing({
      id: placeID,
      data: requestData,
    });

    const startEventRecordMaker = cridb.recordMaker.event.start;
    const articleRecordMaker = cridb.recordMaker.medium.article;

    const recordMakerParams = {
      status,
      name: placeName,
      id: placeID,
    };

    const [
      { eventID: startEventID },
      { articleID },
      pictureRecordIDs,
    ] = await Promise.all([
      startDate
        ? startEventRecordMaker.createPlaceStartEvent({
            date: startDate,
            ...recordMakerParams,
          })
        : { eventID: null },

      articleRecordMaker.createForThing({
        tags: tagsForArticle,
        ...recordMakerParams,
      }),

      this.createPictureRecords(recordMakerParams),
    ]);

    return {
      placeID,
      articleID,
      startEventID,
      pictureRecordIDs,
    };
  }

  async getCoordinate(placeName) {
    const dbpediaRecord = await DBPedia.get(placeName);
    const params = [0, 'value'];
    const [lat, long] = ['lat', 'long'].map((key) => {
      let result = dbpediaRecord.find(key, ...params);
      if (!result) {
        if (dbpediaRecord.find(`${key}D`, ...params)) {
          const lastKey = { lat: 'Ns', long: 'Ew' }[key];
          result = ['D', 'M', 'S', lastKey]
            .map((posKey) => {
              return dbpediaRecord.find(`${key}${posKey}`);
            })
            .join(' ');
        } else {
          result = dbpediaRecord.find(`${key}d`, ...params);
        }
      }
      return result;
    });

    return { lat, long };
  }
}

module.exports = PlaceRecordMaker;
