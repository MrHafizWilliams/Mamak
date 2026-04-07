const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const axios = require('axios');

const router = express.Router();

// ==========================================
// 1. REGISTER (Buat Akaun Baru)
// ==========================================
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if email or username is already taken
    let existingEmail = await User.findOne({ email });
    if (existingEmail) return res.status(400).json({ message: 'Alamak, email ni dah ada orang guna!' });

    let existingUsername = await User.findOne({ username });
    if (existingUsername) return res.status(400).json({ message: 'Username ni dah kena kebas, boss.' });

    // Hash the password securely
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Save the new user to the database
    const newUser = new User({
      username,
      email,
      password: hashedPassword
    });
    await newUser.save();

    // Generate a JWT Token (Valid for 7 days)
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ token, user: { id: newUser._id, username: newUser.username, email: newUser.email } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error masa register.' });
  }
});

// ==========================================
// 2. LOGIN (Log Masuk)
// ==========================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Email salah atau belum register.' });

    // Compare the entered password with the hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Password salah boss.' });

    // Generate a JWT Token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({ 
      token, 
      user: { id: user._id, username: user.username, email: user.email, profilePic: user.profilePic } 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error masa login.' });
  }
});

// ==========================================
// 3. GOOGLE SOCIAL LOGIN
// ==========================================
router.post('/google', async (req, res) => {
  try {
    const { token } = req.body; // Token received from React frontend

    // 1. Verify the token with Google's servers
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    const { sub, name, email, picture } = payload; // 'sub' is Google's unique user ID

    // 2. Check if this user already exists in our MongoDB
    let user = await User.findOne({ email });

    if (!user) {
      // 3. If they are new, register them automatically!
      // Generate a random username (e.g., alibakar842)
      const baseUsername = name.replace(/\s+/g, '').toLowerCase();
      const randomNum = Math.floor(Math.random() * 1000);
      
      const bcrypt = require('bcryptjs'); // Ensure bcrypt is available
      // Create a random, heavily hashed password since they log in via Google
      const secureRandomPassword = await bcrypt.hash(sub + process.env.JWT_SECRET, 10);
      
      user = new User({
        username: `${baseUsername}${randomNum}`,
        email: email,
        password: secureRandomPassword,
        profilePic: picture
      });
      await user.save();
    }

    // 4. Generate our Mamak.com JWT token (Valid for 30 days so they stay logged in)
    const jwt = require('jsonwebtoken'); // Ensure jwt is available
    const jwtToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    
    res.status(200).json({ 
      token: jwtToken, 
      user: { id: user._id, username: user.username } 
    });

  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(401).json({ message: 'Alamak, Google login gagal boss.' });
  }
});

// ==========================================
// 4. GITHUB SOCIAL LOGIN
// ==========================================
router.post('/github', async (req, res) => {
  const { code } = req.body;

  try {
    // 1. Swap the 'code' for an Access Token from GitHub
    const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code: code
    }, {
      headers: { Accept: 'application/json' }
    });

    const accessToken = tokenResponse.data.access_token;
    if (!accessToken) return res.status(400).json({ message: 'GitHub token failed.' });

    // 2. Fetch the user's GitHub profile data
    const githubUserResponse = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    // GitHub emails are often kept private, so we might have to fetch emails separately
    const githubEmailResponse = await axios.get('https://api.github.com/user/emails', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const primaryEmailObj = githubEmailResponse.data.find(e => e.primary) || githubEmailResponse.data[0];
    
    const githubData = githubUserResponse.data;
    const email = primaryEmailObj.email;

    // 3. Find or Create the user in our database
    let user = await User.findOne({ email });

    if (!user) {
      const bcrypt = require('bcryptjs');
      const secureRandomPassword = await bcrypt.hash(githubData.node_id + process.env.JWT_SECRET, 10);
      
      user = new User({
        username: githubData.login, // GitHub usernames are unique!
        email: email,
        password: secureRandomPassword,
        profilePic: githubData.avatar_url
      });
      await user.save();
    }

    // 4. Generate Mamak.com JWT
    const jwt = require('jsonwebtoken');
    const jwtToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    
    res.status(200).json({ token: jwtToken, user: { id: user._id, username: user.username } });

  } catch (error) {
    console.error('GitHub Auth Error:', error.response?.data || error.message);
    res.status(500).json({ message: 'Server error masa GitHub login.' });
  }
});

// ==========================================
// 5. DISCORD SOCIAL LOGIN
// ==========================================
router.post('/discord', async (req, res) => {
  const { code } = req.body;
  try {
    // Discord requires data formatted as URL Encoded
    const params = new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID,
      client_secret: process.env.DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: 'http://localhost:5173/oauth/callback'
    });

    const tokenRes = await axios.post('https://discord.com/api/oauth2/token', params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    // Fetch user data
    const userRes = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenRes.data.access_token}` }
    });

    const discordData = userRes.data;
    const email = discordData.email;
    if (!email) return res.status(400).json({ message: 'Email tidak dijumpai dalam akaun Discord.' });

    let user = await User.findOne({ email });

    if (!user) {
      const bcrypt = require('bcryptjs');
      const secureRandomPassword = await bcrypt.hash(discordData.id + process.env.JWT_SECRET, 10);
      
      user = new User({
        username: `${discordData.username}${Math.floor(Math.random() * 1000)}`,
        email: email,
        password: secureRandomPassword,
        // Discord avatars use a specific URL format
        profilePic: discordData.avatar ? `https://cdn.discordapp.com/avatars/${discordData.id}/${discordData.avatar}.png` : ''
      });
      await user.save();
    }

    const jwt = require('jsonwebtoken');
    const jwtToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.status(200).json({ token: jwtToken, user: { id: user._id, username: user.username } });

  } catch (error) {
    console.error('Discord Auth Error:', error.response?.data || error.message);
    res.status(500).json({ message: 'Server error masa Discord login.' });
  }
});

// ==========================================
// 6. FACEBOOK SOCIAL LOGIN
// ==========================================
router.post('/facebook', async (req, res) => {
  const { code } = req.body;
  try {
    // Facebook uses GET requests for exchanging tokens
    const tokenRes = await axios.get(`https://graph.facebook.com/v19.0/oauth/access_token?client_id=${process.env.FACEBOOK_APP_ID}&redirect_uri=http://localhost:5173/oauth/callback&client_secret=${process.env.FACEBOOK_APP_SECRET}&code=${code}`);
    
    // Fetch user data
    const userRes = await axios.get(`https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${tokenRes.data.access_token}`);
    
    const fbData = userRes.data;
    const email = fbData.email;
    if (!email) return res.status(400).json({ message: 'Email tidak dijumpai dalam akaun Facebook.' });

    let user = await User.findOne({ email });

    if (!user) {
      const bcrypt = require('bcryptjs');
      const secureRandomPassword = await bcrypt.hash(fbData.id + process.env.JWT_SECRET, 10);
      const baseName = fbData.name.replace(/\s+/g, '').toLowerCase();
      
      user = new User({
        username: `${baseName}${Math.floor(Math.random() * 1000)}`,
        email: email,
        password: secureRandomPassword,
        profilePic: fbData.picture?.data?.url || ''
      });
      await user.save();
    }

    const jwt = require('jsonwebtoken');
    const jwtToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.status(200).json({ token: jwtToken, user: { id: user._id, username: user.username } });

  } catch (error) {
    console.error('Facebook Auth Error:', error.response?.data || error.message);
    res.status(500).json({ message: 'Server error masa Facebook login.' });
  }
});

module.exports = router;