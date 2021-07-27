const XLSX = require('../../xlsx');
const recordDataMap = require('../record-data-map');

function sheetNameToRecordName(sheetName) {
  sheetName = sheetName.toLowerCase().trim();

  if (['place', 'person', 'artefact', 'event', 'text'].includes(sheetName)) {
    return sheetName;
  }

  if ('maps & pictures' === sheetName) {
    return 'pictures';
  }
}

async function parseFile(filePath) {
  const sheets = await XLSX.parseFile(filePath);
  const result = {};

  Object.keys(sheets).forEach((sheetName) => {
    const sheet = sheets[sheetName];
    const recordName = sheetNameToRecordName(sheetName) || '';
    const keyMap = recordDataMap[recordName];

    if (!recordName) return;

    const records = sheet
      .map((row) => {
        const record = {};
        Object.keys(keyMap).forEach((col) => {
          const key = keyMap[col];
          const value = row[col] || null;
          if (value != null) record[key] = value;
        });
        return Object.keys(record).length ? record : null;
      })
      .filter((record) => {
        return record && String(record.url).includes('http');
      });

    result[recordName] = records;
  });

  return result;
}

module.exports = {
  sheetNameToRecordName,
  parseFile,
};
