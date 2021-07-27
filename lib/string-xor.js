function stringXOR(a, b) {
  if (a.length < b.length) {
    [a, b] = [b, a];
  }
  return [...a]
    .map((aChar, index) => {
      const bChar = b[index] || '';
      return String.fromCharCode(aChar.charCodeAt() ^ bChar.charCodeAt());
    })
    .join('');
}

module.exports = stringXOR;
