const deepMerge = require('deepmerge');
const axios = require('./axios-with-cache');
const FileDB = require('./file-db');

const dbpeidaDomains = ['http://dbpedia.org', 'http://live.dbpedia.org'];

const memoryCache = {};
const cacheDB = new FileDB('dbpedia');

function _parseDBPediaData(data, domain, keyword) {
  data =
    data[`${domain}/resource/${keyword}`] ||
    data[`${domain}/resource/${decodeURIComponent(keyword)}`];

  for (const key in data) {
    const newKey = key.split(key.includes('#') ? '#' : '/').pop();
    const decodedNewKey = decodeURIComponent(newKey);
    data[decodedNewKey] = data[key];
    delete data[key];
    data[decodedNewKey].forEach((object) => {
      if (object.type === 'uri') {
        object.keyword = object.value.split('/').pop();
      }
    });
  }

  return data;
}

async function _getFromCache(keyword) {
  return await cacheDB.read(keyword);
}

async function _getWithoutCache(keyword) {
  const requests = dbpeidaDomains.map(async (domain) => {
    const url = `${domain}/data/${keyword}.json`;
    try {
      const { data } = await axios.get(url);
      return _parseDBPediaData(data, domain, keyword);
    } catch (error) {
      console.warn(error);
      return {};
    }
  });

  const promises = await Promise.all(requests);
  const datas = promises.map((s) => s || {});
  const data = deepMerge(...datas);

  if (Object.keys(data).length) {
    await cacheDB.write({
      key: keyword,
      value: data,
    });
  } else {
    throw Error('No DBPedia data: ' + keyword);
  }

  return data;
}

async function _getData(keyword) {
  return (await _getFromCache(keyword)) || (await _getWithoutCache(keyword));
}

async function _getDataWithMemoryCache(keyword) {
  return await (memoryCache[keyword] =
    memoryCache[keyword] || _getData(keyword));
}

class DBPedia {
  constructor(data) {
    this.data = data;
  }

  static get(keyword) {
    return _getDataWithMemoryCache(keyword).then((data) => new DBPedia(data));
  }

  find(...finders) {
    let { data } = this;

    finders.forEach((finder) => {
      if (data == null) return;
      if (Array.isArray(finder)) {
        [data] = finder.map((key) => data[key]).filter((e) => e != null);
      } else if (['number', 'string'].includes(typeof finder)) {
        data = data[finder];
      } else if (typeof finder == 'function') {
        for (const key in data) {
          const element = data[key];
          if (finder(element)) {
            data = element;
            break;
          }
        }
      }
    });

    return data || null;
  }
}

module.exports = DBPedia;
