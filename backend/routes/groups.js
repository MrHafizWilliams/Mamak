const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const auth = require('../middleware/auth'); // Guna auth sedia ada
const GroupMessage = require('../models/GroupMessage');

// ==========================================
// 1. CREATE A NEW GROUP
// ==========================================
router.post('/', auth, async (req, res) => {
  try {
    const newGroup = new Group({
      name: req.body.name,
      description: req.body.description,
      coverPic: req.body.coverPic,
      creator: req.user.id,
      admins: [req.user.id], // 👈 DITAMBAH: Pembuat auto-jadi Admin
      members: [req.user.id] // Pembuat auto-join
    });

    const savedGroup = await newGroup.save();
    res.status(201).json(savedGroup);
  } catch (err) {
    res.status(500).json({ message: 'Gagal buat group.', error: err.message });
  }
});

// ==========================================
// 2. GET ALL GROUPS
// ==========================================
router.get('/', async (req, res) => {
  try {
    const groups = await Group.find()
      .populate('creator', 'username profilePic')
      .sort({ createdAt: -1 });
    res.status(200).json(groups);
  } catch (err) {
    res.status(500).json({ message: 'Gagal tarik senarai group.' });
  }
});

// ==========================================
// 3. GET A SPECIFIC GROUP (By ID)
// ==========================================
router.get('/:id', async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('creator', 'username profilePic')
      .populate('members', 'username profilePic');
    res.status(200).json(group);
  } catch (err) {
    res.status(500).json({ message: 'Group tak wujud.' });
  }
});

// ==========================================
// 4. JOIN OR LEAVE A GROUP
// ==========================================
router.put('/:id/join', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group tak wujud.' });

    if (group.members.includes(req.user.id)) {
      await group.updateOne({ $pull: { members: req.user.id } });
      res.status(200).json({ message: 'Berjaya keluar group.' });
    } else {
      await group.updateOne({ $push: { members: req.user.id } });
      res.status(200).json({ message: 'Berjaya sertai group.' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error masa join group.' });
  }
});

// ==========================================
// 5. DELETE A GROUP (KHAS UNTUK ADMIN) 👇
// ==========================================
router.delete('/:id', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group tak wujud.' });

    // Cek jika user yang nak padam ini ada dalam senarai 'admins'
    if (!group.admins.includes(req.user.id)) {
      return res.status(403).json({ message: 'Akses ditolak. Anda bukan Admin!' });
    }

    // Padam kumpulan
    await group.deleteOne();
    res.status(200).json({ message: 'Komuniti berjaya dipadam.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error masa padam group.' });
  }
});

// ==========================================
// 6. EDIT A GROUP (KHAS UNTUK ADMIN)
// ==========================================
router.put('/:id', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group tak wujud.' });

    // Cek jika user ini adalah Admin
    if (!group.admins.includes(req.user.id)) {
      return res.status(403).json({ message: 'Akses ditolak. Anda bukan Admin!' });
    }

    // Kemaskini data
    group.name = req.body.name || group.name;
    group.description = req.body.description || group.description;
    if (req.body.coverPic) group.coverPic = req.body.coverPic;

    const updatedGroup = await group.save();

    // Populate semula untuk pulangkan data yang lengkap ke frontend
    const populatedGroup = await Group.findById(updatedGroup._id)
      .populate('creator', 'username profilePic')
      .populate('members', 'username profilePic');

    res.status(200).json(populatedGroup);
  } catch (err) {
    res.status(500).json({ message: 'Server error masa kemaskini group.' });
  }
});

// ==========================================
// 7. DAPATKAN MESEJ SEMBANG KOMUNITI
// ==========================================
router.get('/:id/messages', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Komuniti tak wujud.' });
    
    // Pastikan hanya ahli boleh baca chat
    if (!group.members.includes(req.user.id) && !group.admins.includes(req.user.id)) {
      return res.status(403).json({ message: 'Anda bukan ahli komuniti ini.' });
    }

    const messages = await GroupMessage.find({ groupId: req.params.id })
      .populate('sender', 'username profilePic')
      .sort({ createdAt: 1 }); // Susun dari lama ke baru
    
    res.status(200).json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Gagal tarik mesej.' });
  }
});

// ==========================================
// 8. HANTAR MESEJ SEMBANG KOMUNITI
// ==========================================
router.post('/:id/messages', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group.members.includes(req.user.id) && !group.admins.includes(req.user.id)) {
      return res.status(403).json({ message: 'Akses ditolak.' });
    }

    const newMessage = new GroupMessage({
      groupId: req.params.id,
      sender: req.user.id,
      text: req.body.text
    });

    await newMessage.save();
    const populatedMsg = await GroupMessage.findById(newMessage._id).populate('sender', 'username profilePic');
    
    res.status(201).json(populatedMsg);
  } catch (err) {
    res.status(500).json({ message: 'Gagal hantar mesej.' });
  }
});

module.exports = router;