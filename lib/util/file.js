const fs = require('fs').promises;
const path = require('path');

async function getFileList(filePath) {
  const stat = await fs.lstat(filePath);
  let files = [];

  if (stat.isFile()) {
    files = [filePath];
  } else if (stat.isDirectory()) {
    files = await fs.readdir(filePath);
    files = files.map((fileName) => path.join(filePath, fileName));
  }

  return files;
}

async function isFileExist(filePath) {
  try {
    const stat = await fs.lstat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

function isExelFile(fileName) {
  const { ext } = path.parse(fileName);
  return /\.?xlsx?/i.test(ext);
}

module.exports = {
  getFileList,
  isFileExist,
  isExelFile,
};
