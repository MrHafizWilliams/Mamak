const mongoose = require('mongoose');

// ==========================================
// POLL OPTION SUB-SCHEMA
// ==========================================
const PollOptionSchema = new mongoose.Schema({
  text:  { type: String, required: true, trim: true },
  votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { _id: true });

// ==========================================
// POLL SUB-SCHEMA
// ==========================================
const PollSchema = new mongoose.Schema({
  question:  { type: String, default: "" },
  options: {
    type: [PollOptionSchema],
    validate: {
      validator: (opts) => opts.length >= 2 && opts.length <= 4,
      message: 'Poll mesti ada antara 2 hingga 4 pilihan.'
    }
  },
  expiresAt: { type: Date, default: null }
}, { _id: false });

// ==========================================
// MAIN POST SCHEMA
// ==========================================
const PostSchema = new mongoose.Schema({
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, default: "" },

  // null = global Home feed | ObjectId = Group feed
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },

  // --- MEDIA FIELDS ---
  mediaUrl:  { type: String, default: "" },
  mediaType: { type: String, default: "" }, // 'image' | 'video' | 'audio' | 'raw'

  // --- POLL FIELD ---
  poll: { type: PollSchema, default: null },

  // --- LOCATION FIELD ---
  location: {
    placeName: { type: String, default: "" },
    lat:       { type: Number, default: null },
    lng:       { type: Number, default: null }
  },

  // --- SCHEDULING FIELDS ---
  // 'published' = live in feed | 'scheduled' = waiting to go live
  status:       { type: String, enum: ['published', 'scheduled'], default: 'published' },
  scheduledFor: { type: Date, default: null }, // null = not scheduled

  likes:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  savedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  resharedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [{
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text:      { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Post', PostSchema);