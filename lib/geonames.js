const axios = require('./axios-with-cache');
const FileDB = require('./file-db');

const uri = 'http://api.geonames.org';
const memoryCache = {};
const cacheDBs = {};

function get(...params) {
  const [type, keyword] = params;
  const cache = (memoryCache[type] = memoryCache[type] || {});
  return cache[keyword] || (cache[keyword] = _get(...params));
}

async function _get(type, keyword, params) {
  const cacheDB =
    cacheDBs[type] || (cacheDBs[type] = new FileDB(`geonames/${type}`));
  let data = await cacheDB.read(keyword);

  params = {
    username: 'cridb',
    type: 'json',
    ...params,
  };

  if (!data) {
    const response = await axios.get(`${uri}/${type}`, { params });
    data = response.data.geonames;
    if (data) {
      await cacheDB.write({
        key: keyword,
        value: data,
      });
    }
  }

  return data;
}

async function search(keyword) {
  return await get('search', keyword, {
    q: keyword,
  });
}

async function getID(placeName) {
  const placeList = await search(placeName);
  const geonameRecord = placeList.find(({ name }) => name === placeName);
  const { geonameId = 0 } = geonameRecord || {};
  return geonameId;
}

async function getHierarchy(placeName) {
  const geonameId = await getID(placeName);

  if (!geonameId) {
    throw Error("Can't find id on geonames : " + placeName);
  }

  return await get('hierarchy', placeName, {
    geonameId,
  });
}

module.exports = {
  search,
  getID,
  getHierarchy,
};
