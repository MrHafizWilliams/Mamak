const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  // TUKAR 'participants' KEPADA 'members'
  members: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  
  // KEMASKINI lastMessage untuk sokong gambar (mediaUrl)
  lastMessage: { 
    text: { type: String, default: "" },
    mediaUrl: { type: String, default: "" }
  }
}, { timestamps: true }); // Secara automatik tambah createdAt dan updatedAt

module.exports = mongoose.model('Conversation', conversationSchema);