const mkdirp = require('mkdirp');
const fs = require('fs').promises;
const shortid = require('shortid');
const del = require('del');
const globalReady = require('./global-ready');
const { isFileExist } = require('./util/file');

const globalReadyKey = 'file-db';
const dataPath = __dirname + '/file-db';

['exit', 'SIGINT', 'SIGUSR1', 'SIGUSR2', 'uncaughtException'].forEach(
  (eventName) => {
    process.on(eventName, async (exitCode) => {
      await globalReady.all();
      process.exit(exitCode || 0);
    });
  },
);

class FileDB {
  constructor({ name }) {
    if (!name) [name] = arguments;
    const dbPath = `${dataPath}/${name}`;
    this.name = name;
    this.path = dbPath;
    const { keys: keysPath } = this._getPath();
    this.ready = mkdirp(dbPath).then(async () => {
      const isFile = await isFileExist(keysPath);
      if (!isFile) {
        await fs.writeFile(keysPath, '{}');
      }
    });

    globalReady.add(globalReadyKey, this.ready);
  }

  _getPath() {
    return { keys: `${this.path}/keys` };
  }

  async destroy() {
    const that = this;
    const { path } = this;
    await globalReady.add(globalReadyKey, async () => {
      that.keys = null;
      await del(path);
    });
  }

  async _setKeys(keys) {
    const { keys: keysPath } = this._getPath();

    await globalReady.add(globalReadyKey, async function writeKeys(retry) {
      const content = JSON.stringify(keys, null, 1);

      try {
        JSON.parse(content);
      } catch {
        if (!retry) {
          console.warn('awkward json data: ' + keysPath);
        } else {
          await writeKeys(true);
          return;
        }
      }

      await fs.writeFile(keysPath, content);

      const savedContent = await fs.readFile(keysPath, 'utf8');
      if (savedContent.trim() !== content.trim()) {
        if (retry) {
          console.warn('awkward json data: ' + keysPath);
        } else {
          await writeKeys(true);
        }
      }
    });
  }

  async _getKeys() {
    const { ready } = this;
    const { keys: keysPath } = this._getPath();
    let result;
    await ready;
    await globalReady.add(globalReadyKey, async function getKeys(retry) {
      const data = await fs.readFile(keysPath, 'utf8');

      if (!data.trim()) getKeys(true);

      try {
        result = JSON.parse(data);
      } catch (error) {
        if (retry) {
          console.log({
            type: 'FileDB error!',
            keysPath,
            error: error.toString(),
            data,
          });
          process.exit(1);
        } else {
          return await getKeys(true);
        }
      }
    });

    return result;
  }

  async _setKey(key) {
    await this.ready;
    const keys = await (this.keys = this.keys || this._getKeys());
    const value = Date.now() + shortid.generate();
    keys[key] = value;
    await this._setKeys(keys);
    return value;
  }

  async _getKey(key) {
    const keys = await this._getKeys();
    return keys[key];
  }

  async write({ key, value }) {
    const { path: dbPath, ready } = this;
    await ready;
    const dbKey = (await this._getKey(key)) || (await this._setKey(key));

    await globalReady.add(globalReadyKey, async () => {
      const content = JSON.stringify(value);
      await fs.writeFile(`${dbPath}/${dbKey}`, content);
    });
  }

  async read(key) {
    const { path: dbPath, ready } = this;
    await ready;
    const dbKey = await this._getKey(key);

    if (dbKey) {
      const data = await fs.readFile(`${dbPath}/${dbKey}`, 'utf8');
      return JSON.parse(data);
    } else {
      return null;
    }
  }
}

module.exports = FileDB;
