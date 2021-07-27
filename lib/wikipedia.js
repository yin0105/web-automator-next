const axios = require('./axios-with-cache');
const FileDB = require('./file-db');
const parseDate = require('./date-parser');
const { parse: parseHTML } = require('node-html-parser');

const wikipediaURL = 'https://en.wikipedia.org';
const memoryCache = {};
const cacheDBs = {};

function _get(...params) {
  async function get(type, name, url, params = {}) {
    const cacheDB =
      cacheDBs[type] || (cacheDBs[type] = new FileDB(`wikipedia/${type}`));
    let data = await cacheDB.read(name);
    if (!data) {
      ({ data } = await axios.get(url, { params }));
      await cacheDB.write({
        key: name,
        value: data,
      });
    }
    return data;
  }

  const [cacheKey, key] = params;
  const cache = (memoryCache[cacheKey] = memoryCache[cacheKey] || {});
  return cache[key] || (cache[key] = get(...params));
}

async function _getHTML(...params) {
  const data = await _get(...params);
  const dom = parseHTML(data);
  return {
    dom,
    text: data,
  };
}

async function _getJSON(...params) {
  const data = await _get(...params);

  if (typeof data != 'object') {
    throw Error('data is not a json object');
  }

  return data;
}

async function getRender(title) {
  const url = `${wikipediaURL}/w/index.php`;
  return await _getHTML('render', title, url, {
    title,
    action: 'render',
  });
}

async function getWiki(name) {
  const url = `${wikipediaURL}/wiki/${encodeURIComponent(name)}`;
  return await _getHTML('wiki', name, url);
}

async function getMedia(name) {
  const encodedName = encodeURIComponent(name);
  const url = `${wikipediaURL}/api/rest_v1/page/media-list/${encodedName}`;
  return await _getJSON('media', name, url);
}

async function getEventDate(eventName) {
  const { dom } = await getRender(eventName);

  try {
    const [dateElement] = dom
      .querySelectorAll('tr')
      .filter((trElement) => trElement.text.includes('Date'));
    const date = dateElement.querySelector('td').text;
    return parseDate(date);
  } catch {
    return '';
  }
}

async function getRealName(name) {
  const { dom } = await getWiki(name);
  const { text: realname } = dom.querySelector('h1') || {};
  return realname;
}

module.exports = {
  getRender,
  getWiki,
  getMedia,
  getEventDate,
  getRealName,
};
