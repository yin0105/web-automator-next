function nextTick() {
  return new Promise((resolve) => {
    process.nextTick(() => resolve());
  });
}

const globalReady = {
  add(key, thenCallback) {
    if (typeof globalReady[key] === 'function') {
      throw new TypeError(`Not Allowed Key: "${key}"`);
    }

    const promise = globalReady[key] || Promise.resolve();

    if (typeof thenCallback != 'function') {
      const value = thenCallback;
      thenCallback = () => value;
    }

    return (globalReady[key] = promise
      .then(nextTick)
      .then(thenCallback)
      .then(nextTick)
      .catch(console.log));
  },

  all() {
    const values = Object.values(globalReady);
    const promises = values.filter((value) => value instanceof Promise);
    return Promise.all(promises);
  },
};

module.exports = globalReady;
