const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const jwt = require('jsonwebtoken');

// Security Check: Verify JWT Token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'Akses ditolak. Tiada token.' });
  
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach user info to the request (pastikan ada req.user.id)
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token tak sah.' });
  }
};

// ==========================================
// 1. START A NEW CHAT (Dari carian nama)
// ==========================================
// Diubah dari /conversations/:receiverId ke /conversations (Terima body)
router.post('/conversations', verifyToken, async (req, res) => {
  try {
    const { receiverId } = req.body;
    const senderId = req.user.id;

    if (senderId === receiverId) {
      return res.status(400).json({ message: "Tak boleh sembang dengan diri sendiri." });
    }

    // Guna 'members' supaya selari dengan Frontend
    let conversation = await Conversation.findOne({
      members: { $all: [senderId, receiverId] }
    }).populate('members', 'username profilePic');

    if (!conversation) {
      conversation = new Conversation({
        members: [senderId, receiverId]
      });
      await conversation.save();
      conversation = await Conversation.findById(conversation._id).populate('members', 'username profilePic');
    }

    res.status(200).json(conversation);
  } catch (err) {
    console.error("Gagal buka chat room:", err);
    res.status(500).json({ message: 'Gagal buka chat room.', error: err });
  }
});

// ==========================================
// 2. GET ALL CONVERSATIONS (Inbox Kiri)
// ==========================================
router.get('/conversations', verifyToken, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      members: { $in: [req.user.id] }
    })
    .populate('members', 'username profilePic')
    .sort({ updatedAt: -1 });
    
    res.status(200).json(conversations);
  } catch (err) {
    console.error("Gagal tarik inbox:", err);
    res.status(500).json({ message: 'Gagal tarik inbox.', error: err });
  }
});

// ==========================================
// 3. SEND A NEW MESSAGE
// ==========================================
router.post('/', verifyToken, async (req, res) => {
  try {
    const { conversationId, text, mediaUrl } = req.body;

    const newMessage = new Message({
      conversationId,
      sender: req.user.id,
      text,
      mediaUrl // Sokong gambar dari Cloudinary
    });
    const savedMessage = await newMessage.save();

    // Update 'lastMessage' menggunakan Object supaya Frontend boleh tunjuk ikon 📷
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: { text: text, mediaUrl: mediaUrl },
      updatedAt: Date.now()
    });

    const populatedMessage = await savedMessage.populate('sender', 'username profilePic');
    res.status(200).json(populatedMessage);
  } catch (err) {
    console.error("Error sending message:", err);
    res.status(500).json({ message: 'Gagal hantar mesej.' });
  }
});

// ==========================================
// 4. GET MESSAGES FOR A SPECIFIC CHAT (Kanan)
// ==========================================
router.get('/:conversationId', verifyToken, async (req, res) => {
  try {
    const messages = await Message.find({
      conversationId: req.params.conversationId
    })
    .populate('sender', 'username profilePic')
    .sort({ createdAt: 1 });
    
    res.status(200).json(messages);
  } catch (err) {
    console.error("Gagal tarik mesej:", err);
    res.status(500).json({ message: 'Gagal tarik mesej.', error: err });
  }
});

// ==========================================
// 5. PADAM SEMBANG (DELETE CONVERSATION)
// ==========================================
router.delete('/conversations/:id', verifyToken, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ message: 'Sembang tidak wujud.' });

    // Pastikan user adalah salah seorang ahli
    if (!conversation.members.includes(req.user.id)) {
      return res.status(403).json({ message: 'Anda tiada hak untuk padam sembang ini.' });
    }

    // Padam perbualan (Conversation) dan semua mesej di dalamnya
    await Conversation.findByIdAndDelete(req.params.id);
    await Message.deleteMany({ conversationId: req.params.id });

    res.status(200).json({ message: 'Sembang berjaya dipadam.' });
  } catch (err) {
    console.error("Gagal padam sembang:", err);
    res.status(500).json({ message: 'Server error masa padam sembang.' });
  }
});

module.exports = router;