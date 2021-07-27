const fs = require('fs').promises;
const XLSX = require('xlsx');

function sheetToarr(sheet) {
  const result = [];
  const range = XLSX.utils.decode_range(sheet['!ref']);
  for (let rowNum = range.s.r; rowNum <= range.e.r; rowNum++) {
    const row = [];
    for (let colNum = range.s.c; colNum <= range.e.c; colNum++) {
      const key = XLSX.utils.encode_cell({ r: rowNum, c: colNum });
      const { w } = sheet[key] || {};
      row.push(w);
    }
    result.push(row);
  }
  return result;
}

async function parseFile(filePath) {
  const content = await fs.readFile(filePath);
  const sheets = XLSX.read(content).Sheets;

  Object.keys(sheets).forEach((sheetName) => {
    sheets[sheetName] = sheetToarr(sheets[sheetName]);
  });

  return sheets;
}

module.exports = {
  sheetToarr,
  parseFile,
};
