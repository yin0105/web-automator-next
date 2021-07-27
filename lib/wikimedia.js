const lcfirst = require('lcfirst');
const axios = require('./axios-with-cache');
const FileDB = require('./file-db');

const uri = 'https://commons.wikimedia.org/w/api.php';
const memoryCache = {};
const cacheDB = new FileDB('wikimedia');

function getImageURL(...params) {
  const [key] = params;
  return memoryCache[key] || (memoryCache[key] = _getImageURL(...params));
}

async function _getImageURL(imageFileName) {
  let url = await cacheDB.read(imageFileName);

  if (!url) {
    const params = {
      action: 'query',
      prop: 'imageinfo',
      iiprop: 'url',
      redirects: true,
      format: 'json',
      titles: `File:${imageFileName}`,
    };

    const { data = {} } = await axios.get(uri, { params });
    const { query = {} } = data;
    const { pages = {} } = query;

    for (const key in pages) {
      const page = pages[key];
      const { title = '' } = page;
      const [imageInfo = {}] = page.imageinfo || [];
      ({ url } = imageInfo);
      if (!url && title.includes('http')) {
        url = lcfirst(title.replace('File:'));
      }
      if (url) break;
    }

    if (url) {
      await cacheDB.write({
        key: imageFileName,
        value: url,
      });
    }
  }

  return url;
}

module.exports = {
  getImageURL,
};
