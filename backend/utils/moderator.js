// Gantikan baris atas sekali dengan dynamic import atau gunakan versi yang kompatibel
const Filter = require('bad-words');

const filter = new Filter();

// Senarai kata kesat tambahan
const malayBadWords = [
  'babi', 'anjing', 'pukimak', 'lancau', 'puki', 'kontol', 
  'bangsat', 'bodoh', 'sial', 'kepala bapak', 'celaka', 'haramjadah'
];

filter.addWords(...malayBadWords);

const moderateText = (text) => {
  if (!text) return text;
  try {
    return filter.clean(text);
  } catch (err) {
    return text;
  }
};

module.exports = { moderateText };