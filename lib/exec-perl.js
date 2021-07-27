const { exec } = require('shelljs');

function execPerl(filePath, ...params) {
  if (!/\.pl$/.test(filePath)) {
    filePath = filePath + '.pl';
  }

  return new Promise((resolve, reject) => {
    exec(
      `perl ${filePath} ${params.join(' ')}`,
      { silent: true },
      (code, stdout, stderr) => {
        if (stdout != null) resolve(stdout);
        if (stderr != null) reject(stderr);
      },
    );
  });
}

module.exports = execPerl;
