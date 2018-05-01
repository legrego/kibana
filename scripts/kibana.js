const crypto = require('crypto');

const orig = crypto.createHash;
crypto.createHash = function (algorithm) {
  if (algorithm === 'md5' || algorithm === 'md4') {
    console.error('bad alg', algorithm);
  }
  return orig(algorithm);
};

require('../src/babel-register');
require('../src/cli/cli');
