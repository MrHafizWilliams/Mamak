// Guna require, jangan guna import
const Filter = require('bad-words'); 

const filter = new Filter();

// Tambah senarai kata kesat bahasa Melayu
const malayBadWords = ['babi', 'anjing', 'pukimak', 'lancau', 'puki', 'bangsat', 'bodoh', 'sial'];
filter.addWords(...malayBadWords);

const moderateText = (text) => {
  if (!text) return text;
  try {
    return filter.clean(text);
  } catch (err) {
    return text;
  }
};

// Guna module.exports, jangan guna export default
module.exports = { moderateText };