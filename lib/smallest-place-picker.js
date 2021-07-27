const DBPedia = require('./dbpedia');
const GeoNames = require('./geonames');

const heirarchyValueMap = {
  country: 2,
  city: 4,
};

const sameTypeMap = {
  country: 'city',
  capital: 'country',
};

async function getHierarchySizeOfPlace(placeName, noReplacePlaceName) {
  const originPlaceName = placeName;
  const dbpediaRecord = await DBPedia.get(placeName);

  if (!noReplacePlaceName) {
    placeName =
      dbpediaRecord.find('wikiPageRedirects', 0, 'keyword') || placeName;
  }

  let records = dbpediaRecord.find('type') || [];
  for (let i = 0; i < records.length; i++) {
    const { keyword = '' } = records[i];
    const type = keyword.toLocaleLowerCase();
    for (const key in heirarchyValueMap) {
      if (type === key) return heirarchyValueMap[key];
    }
  }

  for (const type in sameTypeMap) {
    records = dbpediaRecord.find(type) || [];
    if (records.length) return heirarchyValueMap[sameTypeMap[type]];
  }

  const geonamesID = await GeoNames.getID(placeName);
  if (placeName && !geonamesID) {
    if (originPlaceName !== placeName) {
      const originHierarchy = await getHierarchySizeOfPlace(
        originPlaceName,
        true,
      );
      if (originHierarchy) return originHierarchy;
    }
    return -1;
  }

  const { length } = (await GeoNames.getHierarchy(placeName)) || [];
  return length;
}

async function pick(placeList) {
  const promises = placeList.map(async (placeName) => {
    return {
      name: placeName,
      size: await getHierarchySizeOfPlace(placeName),
    };
  });
  const placeNames = await Promise.all(promises);
  const [smallestPlace = {}] = placeNames.sort((a, b) => b.size - a.size);
  const { name } = smallestPlace;
  return name;
}

module.exports = {
  getHierarchySizeOfPlace,
  pick,
};
