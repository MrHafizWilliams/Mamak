const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  bio: { type: String, default: "Baru lepak kat sini. ☕" },
  profilePic: { type: String, default: "" }, // We will store the Cloudinary URL here
  coverPic: { type: String, default: "" }, // Store the Cover Picture
  
  // --- ADD THESE NEW FIELDS ---
  birthday: { type: Date, default: null },
  interests: [{ type: String }], // Array of strings (tags)
  links: [{ label: String, url: String }], // Array of link objects
  // -----------------------------

  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { 
  timestamps: true 
});

module.exports = mongoose.model('User', UserSchema);