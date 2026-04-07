const express = require('express');
const Post    = require('../models/Post');
const Comment = require('../models/Comment');
const auth    = require('../middleware/auth');
const cloudinary = require('cloudinary').v2;
const User    = require('../models/User');
const { moderateText } = require('../utils/moderator'); // 👈 Import moderator

const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ==========================================
// DAPATKAN SIGNATURE CLOUDINARY
// ==========================================
router.get('/upload-signature', auth, (req, res) => { 
  try {
    const timestamp = Math.round((new Date).getTime() / 1000);
    
    const signature = cloudinary.utils.api_sign_request({
      timestamp: timestamp,
      folder: 'Mamak_Posts' 
    }, process.env.CLOUDINARY_API_SECRET);

    res.status(200).json({ 
      timestamp, 
      signature, 
      apiKey: process.env.CLOUDINARY_API_KEY, 
      cloudName: process.env.CLOUDINARY_CLOUD_NAME 
    });
  } catch (err) {
    console.error("Signature Error:", err);
    res.status(500).json({ message: 'Gagal jana signature Cloudinary.' });
  }
});

// ==========================================
// 1. CREATE A NEW POST (With AI Moderation) 🤖
// ==========================================
router.post('/', auth, async (req, res) => {
  try {
    const { content, mediaUrl, mediaType, group, poll, location, scheduledFor } = req.body;

    if (!content && !mediaUrl && !poll) {
      return res.status(400).json({ message: 'Kena taip sesuatu, letak file, atau buat poll boss.' });
    }

    // 👇 PROSES MODERASI: Tapis kandungan post
    const cleanedContent = moderateText(content);

    if (poll) {
      if (!poll.options || poll.options.length < 2 || poll.options.length > 4) {
        return res.status(400).json({ message: 'Poll mesti ada antara 2 hingga 4 pilihan.' });
      }
      poll.options = poll.options.map(opt => ({ 
        text: moderateText(opt.text), // 👈 Tapis teks pilihan poll juga
        votes: [] 
      }));
    }

    if (scheduledFor && new Date(scheduledFor) <= new Date()) {
      return res.status(400).json({ message: 'Masa jadual kena dalam masa depan boss.' });
    }

    const isScheduled = !!scheduledFor;

    const newPost = new Post({
      userId:       req.user.id,
      content:      cleanedContent || "", // 👈 Gunakan teks yang telah ditapis
      mediaUrl:     mediaUrl       || "",
      mediaType:    mediaType      || "",
      group:        group          || null,  
      poll:         poll           || null,
      location:     location       || null,
      status:       isScheduled ? 'scheduled' : 'published',
      scheduledFor: scheduledFor   || null
    });

    const savedPost = await newPost.save();
    
    const populatedPost = await Post.findById(savedPost._id)
      .populate('userId', 'username profilePic followers');

    res.status(201).json(populatedPost);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error masa hantar post.' });
  }
});

// ==========================================
// 2. GET ALL POSTS (Global Feed - WITH PAGINATION)
// ==========================================
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find({ group: null, status: 'published' })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'username profilePic followers');

    const totalPosts = await Post.countDocuments({ group: null, status: 'published' });
    const hasMore = skip + posts.length < totalPosts;

    res.status(200).json({
      posts,
      hasMore,
      currentPage: page
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error masa tarik borak.' });
  }
});

// ==========================================
// LIKE / UNLIKE POST
// ==========================================
router.put('/:id/like', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post tak wujud boss.' });

    if (post.likes.includes(req.user.id)) {
      post.likes = post.likes.filter(id => id.toString() !== req.user.id);
    } else {
      post.likes.push(req.user.id);
    }

    await post.save();
    res.status(200).json(post.likes);
  } catch (error) {
    res.status(500).json({ message: 'Server error masa Padu.' });
  }
});

// ==========================================
// 3. ADD A COMMENT (With AI Moderation) 🤖
// ==========================================
router.post('/:id/comment', auth, async (req, res) => {
  try {
    const { content } = req.body;

    // 👇 PROSES MODERASI: Tapis kandungan komen
    const cleanedComment = moderateText(content);

    const newComment = new Comment({
      postId:  req.params.id,
      userId:  req.user.id,
      content: cleanedComment // 👈 Gunakan komen yang telah ditapis
    });

    await newComment.save();
    const populatedComment = await Comment.findById(newComment._id)
      .populate('userId', 'username profilePic');
    res.status(201).json(populatedComment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error masa Balas.' });
  }
});

// ==========================================
// KOD-KOD LAIN (EXPLORE, TRENDING, SEARCH, DELETE, ETC)
// ==========================================

router.get('/explore/trending', auth, async (req, res) => {
  try {
    let posts = await Post.find({ group: null, status: 'published' })
      .populate('userId', 'username profilePic followers')
      .sort({ createdAt: -1 })
      .limit(30);
    posts.sort((a, b) => b.likes.length - a.likes.length);
    res.status(200).json(posts);
  } catch (err) {
    res.status(500).json({ message: "Gagal tarik topik panas." });
  }
});

router.get('/trending', async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const trendingTags = await Post.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo }, status: 'published', group: null } },
      { $project: { hashtags: { $regexFindAll: { input: "$content", regex: /#[a-zA-Z0-9_]+/ } } } },
      { $unwind: "$hashtags" }, 
      { $group: { _id: "$hashtags.match", count: { $sum: 1 } } },
      { $sort: { count: -1 } }, 
      { $limit: 5 }            
    ]);
    const formattedTrends = trendingTags.map(tag => ({ name: tag._id, count: tag.count }));
    res.status(200).json(formattedTrends);
  } catch (error) {
    res.status(500).json({ message: 'Server error masa tarik hashtag panas.' });
  }
});

router.get('/search/all', async (req, res) => {
  try {
    const searchQuery = req.query.q;
    if (!searchQuery) return res.status(400).json({ message: 'Sila masukkan kata kunci.' });
    const users = await User.find({ username: { $regex: searchQuery, $options: 'i' } }).select('username profilePic followers bio').limit(5); 
    const posts = await Post.find({ content: { $regex: searchQuery, $options: 'i' }, status: 'published', group: null }).populate('userId', 'username profilePic').sort({ createdAt: -1 });
    res.status(200).json({ users, posts });
  } catch (error) {
    res.status(500).json({ message: 'Server error masa cari.' });
  }
});

router.get('/:id/comments', async (req, res) => {
  try {
    const comments = await Comment.find({ postId: req.params.id }).sort({ createdAt: 1 }).populate('userId', 'username profilePic');
    res.status(200).json(comments);
  } catch (error) {
    res.status(500).json({ message: 'Server error masa tarik komen.' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Borak tak jumpa.' });
    if (post.userId.toString() !== req.user.id) return res.status(401).json({ message: 'Akses ditolak.' });
    await post.deleteOne();
    res.status(200).json({ message: 'Borak berjaya dipadam.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error masa delete post.' });
  }
});

router.put('/:id/reshare', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Borak tak jumpa.' });
    if (post.resharedBy.includes(req.user.id)) post.resharedBy.pull(req.user.id);
    else post.resharedBy.push(req.user.id);
    await post.save();
    res.status(200).json(post.resharedBy);
  } catch (error) {
    res.status(500).json({ message: 'Server error masa reshare.' });
  }
});

router.put('/:id/vote', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post || !post.poll) return res.status(404).json({ message: 'Poll tak jumpa.' });
    if (post.poll.expiresAt && new Date() > new Date(post.poll.expiresAt)) return res.status(400).json({ message: 'Poll dah tamat tempoh.' });
    const { optionId } = req.body;
    const userId = req.user.id;
    const targetOption = post.poll.options.id(optionId);
    if (!targetOption) return res.status(404).json({ message: 'Pilihan poll tak jumpa.' });
    post.poll.options.forEach(opt => { opt.votes = opt.votes.filter(id => id.toString() !== userId); });
    targetOption.votes.push(userId);
    await post.save();
    res.status(200).json(post.poll);
  } catch (error) {
    res.status(500).json({ message: 'Server error masa undi poll.' });
  }
});

router.get('/group/:groupId', async (req, res) => {
  try {
    const posts = await Post.find({ group: req.params.groupId }).populate('userId', 'username profilePic').sort({ createdAt: -1 });
    res.status(200).json(posts);
  } catch (err) {
    res.status(500).json({ message: 'Gagal tarik post group.' });
  }
});

router.get('/user/:userId', async (req, res) => {
  try {
    const posts = await Post.find({ userId: req.params.userId, status: 'published' }).populate('userId', 'username profilePic followers').sort({ createdAt: -1 }); 
    res.status(200).json(posts);
  } catch (err) {
    res.status(500).json({ message: 'Server error masa tarik borak profil.' });
  }
});

router.put('/:id/save', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Borak tak wujud.' });
    const isSaved = post.savedBy?.includes(req.user.id);
    if (isSaved) await post.updateOne({ $pull: { savedBy: req.user.id } });
    else await post.updateOne({ $push: { savedBy: req.user.id } });
    res.status(200).json({ message: 'Berjaya dikemaskini.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error masa simpan borak.' });
  }
});

module.exports = router;