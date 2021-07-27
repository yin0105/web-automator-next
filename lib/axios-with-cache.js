const axios = require('axios');
const { setupCache } = require('axios-cache-adapter');

const cache = setupCache({
  maxAge: 15 * 60 * 1000,
});

const api = axios.create({
  adapter: cache.adapter,
});

module.exports = api;
