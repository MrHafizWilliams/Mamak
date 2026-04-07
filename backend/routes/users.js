const express = require('express');
const cloudinary = require('cloudinary').v2;
const User = require('../models/User');
const bcrypt = require('bcrypt');
const Post = require('../models/Post');
const auth = require('../middleware/auth');

const router = express.Router();

// --- Configure Cloudinary ---
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});
// -----------------------------

// =========================================================================
// PENTING: ROUTE SPESIFIK MESTI DUDUK DI ATAS (Bypass /:id dan /:username)
// =========================================================================

// 1. GET SIGNATURE FOR SECURE UPLOAD
router.get('/upload-signature', auth, (req, res) => {
  try {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      { timestamp: timestamp, folder: 'Mamak_Posts' }, // Pastikan ini 'Mamak_Posts' sama dengan Frontend!
      process.env.CLOUDINARY_API_SECRET
    );
    res.status(200).json({ timestamp, signature, apiKey: process.env.CLOUDINARY_API_KEY, cloudName: process.env.CLOUDINARY_CLOUD_NAME });
  } catch (error) {
    console.error('Error generating signature:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// 2. GET SUGGESTED USERS (For Sidebar)
router.get('/suggestions/new', async (req, res) => {
  try {
    const users = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('username profilePic followers');
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetch suggested users:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// 3. SEARCH USERS
router.get('/search', async (req, res) => {
  const searchQuery = req.query.q;
  try {
    const users = await User.find({
      username: { $regex: searchQuery, $options: 'i' }
    }).select('username profilePic _id').limit(10);
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ message: 'Error searching users' });
  }
});

// 4. GET PROFILE BY EXACT USERNAME API
router.get('/username/:username', async (req, res) => {
  try {
    const user = await User.findOne({ 
      username: { $regex: new RegExp('^' + req.params.username + '$', 'i') } 
    }).select('-password');
    if (!user) return res.status(404).json({ message: 'Pengguna tidak dijumpai' });
    res.status(200).json(user);
  } catch (err) {
    console.error("Error fetching user profile:", err);
    res.status(500).json({ message: 'Server error masa tarik profil.' });
  }
});

// 5. KEMASKINI PROFIL (EDIT PROFILE - LEGACY)
router.put('/profile', auth, async (req, res) => {
  try {
    const { username, bio, profilePic, coverPic } = req.body;
    if (username) {
      const existingUser = await User.findOne({ username });
      if (existingUser && existingUser._id.toString() !== req.user.id) {
        return res.status(400).json({ message: 'Alamak, username ni dah ada orang guna boss.' });
      }
    }
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { username, bio, profilePic, coverPic } },
      { new: true }
    ).select('-password');
    res.status(200).json(updatedUser);
  } catch (err) {
    console.error("Gagal update profil:", err);
    res.status(500).json({ message: 'Server error masa kemaskini profil.' });
  }
});

// =========================================================================
// ROUTE PARAMETRIK MESTI DUDUK DI BAWAH (Mengandungi :id atau :username)
// =========================================================================

// 6. UPDATE PROFILE BY ID (DIGUNAKAN OLEH SETUP PROFILE FRONTEND) 🔥
router.put('/:id', auth, async (req, res) => {
  try {
    // Keselamatan: Pastikan user hanya edit profil sendiri
    if (req.user.id !== req.params.id) {
      return res.status(403).json({ message: "Anda hanya boleh kemaskini profil sendiri boss!" });
    }

    const { bio, profilePic, coverPic, birthday, interests } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          bio: bio,
          profilePic: profilePic,
          coverPic: coverPic,
          birthday: birthday,
          interests: interests
        }
      },
      { new: true }
    ).select('-password');

    res.status(200).json({ message: "Profil berjaya dikemaskini!", user: updatedUser });
  } catch (err) {
    console.error("Ralat kemaskini profil:", err);
    res.status(500).json({ message: "Server error masa kemaskini profil." });
  }
});

// 7. FOLLOW / UNFOLLOW USER
router.put('/:id/follow', auth, async (req, res) => {
  try {
    if (req.user.id === req.params.id) return res.status(403).json({ message: 'Takkan nak follow diri sendiri boss?' });

    const targetUser = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user.id);
    if (!targetUser || !currentUser) return res.status(404).json({ message: 'User tak wujud.' });

    const isFollowing = currentUser.following.includes(req.params.id);

    if (isFollowing) {
      await currentUser.updateOne({ $pull: { following: req.params.id } });
      await targetUser.updateOne({ $pull: { followers: req.user.id } });
      res.status(200).json({ message: 'Unfollowed', isFollowing: false });
    } else {
      await currentUser.updateOne({ $push: { following: req.params.id } });
      await targetUser.updateOne({ $push: { followers: req.user.id } });
      res.status(200).json({ message: 'Followed', isFollowing: true });
    }
  } catch (error) {
    console.error('Error masa follow:', error);
    res.status(500).json({ message: 'Server error masa follow.' });
  }
});

// 8. GET USER PROFILE & POSTS (CATCH-ALL UNTUK USERNAME)
router.get('/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select('-password');
    if (!user) return res.status(404).json({ message: 'User tak jumpa boss.' });

    const posts = await Post.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .populate('userId', 'username profilePic followers');

    const resharedPosts = await Post.find({ resharedBy: user._id })
      .sort({ createdAt: -1 })
      .populate('userId', 'username profilePic followers');

    res.status(200).json({ user, posts, resharedPosts });
  } catch (error) {
    res.status(500).json({ message: 'Server problem masa cari user.' });
  }
});

// ==========================================
// GET SAVED POSTS (PRIVATE TO LOGGED-IN USER)
// ==========================================
router.get('/saved/me', auth, async (req, res) => {
  try {
    // Find all posts where this user's ID is in the savedBy array
    const savedPosts = await Post.find({ savedBy: req.user.id })
      .sort({ createdAt: -1 })
      .populate('userId', 'username profilePic followers');
      
    res.status(200).json(savedPosts);
  } catch (error) {
    console.error("Error fetching saved posts:", error);
    res.status(500).json({ message: 'Server error masa tarik saved posts.' });
  }
});

// ==========================================
// DAPATKAN CADANGAN KAWAN (SUGGESTED USERS)
// ==========================================
router.get('/suggested/all', auth, async (req, res) => { // 👈 TUKAR verifyToken kepada auth
  try {
    const currentUser = await User.findById(req.user.id);
    
    // Cari pengguna yang BUKAN diri sendiri dan BELUM di-follow
    const suggestedUsers = await User.find({
      _id: { $ne: req.user.id, $nin: currentUser.following }
    })
    .select('username profilePic bio') 
    .limit(5); 

    res.status(200).json(suggestedUsers);
  } catch (err) {
    res.status(500).json({ message: "Gagal tarik cadangan kawan." });
  }
});

// ==========================================
// TUKAR KATA LALUAN (CHANGE PASSWORD)
// ==========================================
router.put('/change-password', auth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    // 1. Semak jika kata laluan lama betul
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Kata laluan lama salah.' });

    // 2. Hash kata laluan baru
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // 3. Simpan dalam database
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: 'Kata laluan berjaya ditukar.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error masa tukar kata laluan.' });
  }
});

// ==========================================
// PADAM AKAUN (DELETE ACCOUNT)
// ==========================================
router.delete('/delete-account', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'Akaun tidak dijumpai.' });

    // Padam akaun (Nota: Pada masa akan datang, anda boleh tambah logik untuk padam semua post pengguna ini juga)
    await user.deleteOne();

    res.status(200).json({ message: 'Akaun anda telah dipadam selamanya. Selamat tinggal!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error masa padam akaun.' });
  }
});

module.exports = router;