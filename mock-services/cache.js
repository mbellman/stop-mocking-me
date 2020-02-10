const cacheA = require('./cache-a.json');
const cacheB = require('./cache-b');

module.exports = (_, res) => {
  return {
    ...cacheA,
    ...cacheB
  };
};