const moment = require('moment');
const mkdirp = require('mkdirp');
const shortid = require('shortid');
const delay = require('delay');
const del = require('del');
const fs = require('fs').promises;
const stringXOR = require('../string-xor');
const execPerl = require('../exec-perl');

const exelParser = require('./db/exel-parser');
const DuplicateDetector = require('./db/duplicate-detector');
const RecordMaker = require('./record-maker');
const { default: Axios } = require('axios');

const dirForPerl = `${__dirname}/.for-perl`;
const cache = {};

class CRIDB {
  constructor(authcode) {
    this.authcode = authcode;
    this.duplicateDetector = new CRIDB.DuplicateDetector(this);
    this.recordMaker = CRIDB.RecordMaker.all(this);
  }

  static async getSecret() {
    return (await fs.readFile(__dirname + '/secret.key', 'utf8')).trim();
  }

  static createAuthcode(secret) {
    const time = moment()
      .format('ddd MMMM DD YYYY')
      .split(' ')
      .map((element) => {
        return /\d+/.test(element) ? element : element.slice(0, 3);
      })
      .join(' ');
    return stringXOR(time, secret);
  }

  static async createConnection() {
    const secret = await CRIDB.getSecret();
    const authcode = CRIDB.createAuthcode(secret);
    return new CRIDB(authcode);
  }

  request(...p) {
    const [body = {}] = p;
    const { command = '' } = body;

    if (!['get', 'search'].includes(command)) {
      return this._request(...p);
    }

    const commandCache = (cache[command] = cache[command] || {});
    const key = body[{ get: 'id', search: 'query' }[command]];

    if (commandCache[key]) {
      return commandCache[key];
    } else {
      return (commandCache[key] = this._request(...p).catch(() => {
        delete commandCache[key];
        return this._request(...p);
      }));
    }
  }

  async _request(body, retry = false) {
    const { authcode } = this;
    const requestID = Date.now() + shortid.generate();
    const dirname = `${dirForPerl}/${requestID}`;
    const uri = process.env.CRIDB_URI || 'https://login.cridb.com/api/cridb';
    const paramFiles = [
      [`${dirname}/authcode`, JSON.stringify(authcode)],
      [`${dirname}/body`, JSON.stringify(body).replace(/;/g, '')],
      [`${dirname}/uri`, uri],
    ];

    await mkdirp(dirname);
    await Promise.all(
      paramFiles.map(([path, content]) => {
        return fs.writeFile(path, content);
      }),
    );

    let data = await (uri.indexOf('localhost') >= 0
      ? Axios.post(uri, { json: JSON.stringify(body) })
      : execPerl(`${__dirname}/request`, requestID));

    try {
      data = JSON.parse(data);
    } catch (error) {
      if (retry) {
        // If the error repeats after retrying.
        console.log({ body, data });
        await fs.writeFile(`${dirname}/error`, error.message);
        throw error;
      } else {
        // Wait a few milliseconds, and retry request.
        await delay(1000 * Math.random());
        return await this.request(body, true);
      }
    }

    del(dirname, { force: true });

    const { error = false, message = '' } = data || {
      error: true,
      message: 'Data is not a object.',
    };

    if (error) {
      console.log({ data });
      throw Error(`CRIDB error: ${message}`);
    }

    return data;
  }

  async get(recordType, id) {
    return await this.request({
      command: 'get',
      record_type: recordType,
      id,
    });
  }

  async getThing(id) {
    return await this.get('thing', id);
  }

  async getEvent(id) {
    return await this.get('event', id);
  }

  async getMedium(id) {
    return await this.get('medium', id);
  }

  uniqueTags(tags) {
    return tags.filter((tag, index) => {
      const otherTagIndex = tags.findIndex((otherTag) => {
        return tag.type === otherTag.type && tag.id === otherTag.id;
      });
      return index === otherTagIndex;
    });
  }

  async removeDeletedTags(tags) {
    const cridb = this;
    const findStatusPromise = tags.map(async (tag) => {
      let { status, type, id } = tag;
      if (status || type === 'discipline') {
        return tag;
      } else {
        if (+id === 0) {
          status = 'deleted';
        } else {
          ({ status } = (await cridb.get(type, id)) || {});
        }
        return { ...tag, status };
      }
    });

    tags = await Promise.all(findStatusPromise);
    return tags.filter(({ status }) => status !== 'deleted');
  }

  async sanitizeTags(tags) {
    const uniqueTags = this.uniqueTags(tags);
    return await this.removeDeletedTags(uniqueTags);
  }

  async getTags(recordType, id) {
    const cridb = this;
    const record = await cridb.get(recordType, id);
    const { tags } = record;
    return tags || [];
  }

  async getThingTags(id) {
    return await this.getTags('thing', id);
  }

  async getEventTags(id) {
    return await this.getTags('event', id);
  }

  async getMediumTags(id) {
    return await this.getTags('medium', id);
  }

  async search(recordType, query) {
    return await this.request({
      command: 'search',
      record_type: recordType,
      query,
    });
  }

  async searchThing(query) {
    return await this.search('thing', query);
  }

  async searchEvent(query) {
    return await this.search('event', query);
  }

  async searchMedium(query) {
    return await this.search('medium', query);
  }

  async save(recordType, saveRequest) {
    const { data } = saveRequest || {};
    const { tags } = data || {};

    saveRequest = {
      ...saveRequest,
      command: 'save',
      record_type: recordType,
      data: {
        ...data,
        tags: await this.sanitizeTags(tags || []),
      },
    };

    const { id } = await this.request(saveRequest);
    return +id;
  }

  async saveThing(saveData) {
    return await this.save('thing', saveData);
  }

  async saveEvent(saveData) {
    return await this.save('event', saveData);
  }

  async saveMedium(saveData) {
    return await this.save('medium', saveData);
  }

  async delete(recordType, id) {
    const record = await this.get(recordType, id);
    if (!record) return;
    return await this.save(recordType, {
      id,
      data: {
        ...record,
        status: 'deleted',
      },
    });
  }

  async deleteThing(id) {
    return await this.delete('thing', id);
  }

  async deleteEvent(id) {
    return await this.delete('event', id);
  }

  async deleteMedium(id) {
    return await this.delete('medium', id);
  }

  async merge(recordType, [masterRecordID, ...target]) {
    if (!target.length) return;
    const cridb = this;
    const masterRecord = await cridb.get(recordType, masterRecordID);
    const { tags: masterRecordTags } = masterRecord;
    let promises = target.map(async (targetRecrodID) => {
      const targetRecrod = await cridb.get(recordType, targetRecrodID);
      const { tags: targetRecordTags } = targetRecrod;
      if (targetRecordTags) {
        masterRecordTags.push(...targetRecordTags);
      }
    });

    await Promise.all(promises);
    await cridb.save(recordType, {
      id: masterRecordID,
      data: {
        ...masterRecord,
        tags: masterRecordTags,
      },
    });

    promises = target.map(async (targetRecrodID) => {
      await cridb.delete(recordType, targetRecrodID);
    });
    await Promise.all(promises);
  }

  async mergeThing(...params) {
    return await this.merge('thing', ...params);
  }

  async mergeEvent(...params) {
    return await this.merge('event', ...params);
  }

  async mergeMedium(...params) {
    return await this.merge('medium', ...params);
  }
}

CRIDB.exelParser = exelParser;
CRIDB.DuplicateDetector = DuplicateDetector;
CRIDB.RecordMaker = RecordMaker;

module.exports = CRIDB;
