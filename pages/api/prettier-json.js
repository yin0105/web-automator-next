const fs = require('fs').promises;
// const inquirer = require('inquirer');
const prettierJSONStringify = require('../../lib/prettier-json');
const { getFileList } = require('../../lib/util/file');

(async () => {
  // const { filePath } = await inquirer.prompt([
  //   {
  //     type: 'input',
  //     name: 'filePath',
  //     message: 'Please enter path :',
  //   },
  // ]);
  const filePath = "";

  const files = await getFileList(filePath);

  for (let i = 0; i < files.length; i++) {
    const fileName = files[i];
    const content = await fs.readFile(fileName, 'utf8');
    const object = JSON.parse(content);
    const jsonContent = prettierJSONStringify(object);
    await fs.writeFile(fileName, jsonContent);
  }
})().catch(function(error) {
  throw error;
});
