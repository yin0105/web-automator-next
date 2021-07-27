const { chunkPromises } = require('chunk-promises');
const MediumRecordMaker = require('../medium');
const Wikimedia = require('../../../wikimedia');
const Wikipedia = require('../../../wikipedia');

class PictureRecordMaker extends MediumRecordMaker {
  constructor(cridb) {
    super({ cridb, subtype: 'picture' });
  }

  async createForThing({ name: thingName, id: thingID, status = 'pending' }) {
    const pictureRecordMaker = this;
    const validLicense = /^(cc|PD|OldOS|Stamp-PD|FAL|OGL|MPL|GFD|GPL|LGPL|BSD)/;
    const { items = [] } = (await Wikipedia.getMedia(thingName)) || {};
    const promiseGets = items.map((item) => async () => {
      const { type = '' } = item;
      let description, source, pictureName;
      if (!type.includes('image')) return;

      if (item.description) {
        description = (item.description.text || '').replace(
          /\bSee(:| here\b).*?(\n|\.(?!\w))/g,
          '',
        );
      }

      if (!item.license || !validLicense.test(item.license.code)) {
        return;
      }

      if (item.original) {
        source = item.original.source;
      }

      if (item.caption) {
        pictureName = item.caption.text;
      }

      if (!source) return;
      if (!pictureName && description && description.trim()) {
        pictureName = description.replace(/\(\w{2}\)|\n.{0,}/g, '').trim();
      }

      const nickname = source.split('/').pop();
      const caption = `${description}\n\nSource: ${source}`;

      return await pictureRecordMaker.create({
        status,
        nickname,
        url: source,
        content: caption,
        name: pictureName,
        tags: [{ id: thingID, type: 'thing' }],
      });
    });

    const results = await chunkPromises(promiseGets);
    return results
      .map((obj) => Object.values(obj || {}))
      .flat()
      .filter((id) => !!id);
  }

  async create({ url, nickname, name, tags = [], status = 'pending' }) {
    if (!url) [url] = arguments;
    const { cridb, subtype } = this;
    const extension = url.split('.').pop();
    nickname = nickname || url.replace(/.*File:|\..*/gi, '');
    name =
      name ||
      nickname
        .replace('wkpd-', '')
        .replace('_', ' ')
        .replace(/(\..+)$/gi, '');
    const fileName = url.replace(/.*File:/gi, '');

    if (fileName.includes('infobox')) {
      return { infobox: true };
    }

    if (!url) {
      url = Wikimedia.getImageURL(fileName);
    }

    if (!nickname.includes('wkpd')) {
      nickname = `wkpd-${nickname}`;
    }

    const pictureID = await this.getRecordID(nickname);
    const tagsOnDB = await this.getRecordTags(pictureID);
    tags = [...tags, ...tagsOnDB];
    const requestData = {
      url,
      status,
      subtype,
      name,
      nickname,
      tags,
      ext: extension,
    };

    return {
      pictureID: await cridb.saveMedium({
        url,
        id: pictureID,
        data: requestData,
      }),
    };
  }
}

module.exports = PictureRecordMaker;
