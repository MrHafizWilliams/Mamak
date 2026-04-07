const mongoose = require('mongoose');

const groupMessageSchema = new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String },
  // 👇 Ciri Baru
  mediaUrl: { type: String, default: '' },
  mediaType: { type: String, default: '' },
  location: { type: String, default: '' },
  poll: {
    question: String,
    options: [{ text: String, votes: [String] }] // Simpan ID user yang undi
  }
}, { timestamps: true });

module.exports = mongoose.model('GroupMessage', groupMessageSchema);