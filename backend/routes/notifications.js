const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const jwt = require('jsonwebtoken');

// Middleware to verify user
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Tiada token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) { res.status(401).json({ message: 'Token tak sah' }); }
};

// Get user's notifications
router.get('/', verifyToken, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user.id })
      .populate('sender', 'username profilePic')
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(notifications);
  } catch (err) { res.status(500).json(err); }
});

// Mark all as read
router.put('/read', verifyToken, async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.user.id, read: false }, { read: true });
    res.json({ message: 'Semua dibaca' });
  } catch (err) { res.status(500).json(err); }
});

module.exports = router;