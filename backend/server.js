const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http'); 
const { Server } = require('socket.io'); 
const startScheduler = require('./scheduler');

// Models
const Message = require('./models/Message');
const Conversation = require('./models/Conversation');
const Notification = require('./models/Notification');

dotenv.config();

const app = express();
const server = http.createServer(app);
// Part 1: Socket.io
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "https://mamak-rho.vercel.app/"], 
    methods: ["GET", "POST"]
  }
});

// Part 2: Express Middleware
app.use(cors({
  origin: ["http://localhost:5173", "https://mamak-rho.vercel.app/"],
  credentials: true
}));
app.use(express.json());

// ==========================================
// 🗄️ MONGODB CONNECTION & SCHEDULER
// ==========================================
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected (Dapur is ready)');
    startScheduler(); 
  })
  .catch(err => console.log('❌ MongoDB Error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/users', require('./routes/users'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/notifications', require('./routes/notifications')); 

// ==========================================
// 📡 REAL-TIME LOGIC (Socket.io)
// ==========================================

// Simpan senarai pengguna yang sedang online { userId: socket.id }
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log(`📡 User Connected: ${socket.id}`);

  // --- 0. STATUS ONLINE / OFFLINE ---
  socket.on('user_connected', (userId) => {
    if (userId) {
      onlineUsers.set(userId, socket.id);
      // Beritahu SEMUA ORANG siapa yang online sekarang
      io.emit('get_online_users', Array.from(onlineUsers.keys()));
    }
  });

  // --- 1. PRIVATE CHAT ROOMS (Sembang) ---
  socket.on('join_chat', (conversationId) => {
    socket.join(conversationId);
    console.log(`💬 User joined chat room: ${conversationId}`);
  });

  socket.on('send_message', (messageData) => {
    // Hantar mesej kepada rakan di dalam bilik sembang yang sama
    socket.to(messageData.conversationId).emit('receive_message', messageData);
  });

  // --- NEW: TYPING INDICATORS (Tengah Taip...) ---
  socket.on('typing', (data) => {
    socket.to(data.conversationId).emit('user_typing', data);
  });

  socket.on('stop_typing', (data) => {
    socket.to(data.conversationId).emit('user_stopped_typing', data);
  });

  // --- 2. PERSONAL NOTIFICATION ROOM ---
  socket.on('join_notifications', (userId) => {
    socket.join(userId);
    console.log(`🔔 User ${userId} listening for notifications`);
  });

  socket.on('send_notification', async (data) => {
    const { recipientId, senderId, type, postId } = data;
    
    // Jangan hantar notifikasi pada diri sendiri
    if (recipientId === senderId) return;

    try {
      const newNotif = new Notification({
        recipient: recipientId,
        sender: senderId,
        type,
        postId
      });
      await newNotif.save();
      
      const populatedNotif = await newNotif.populate('sender', 'username profilePic');
      io.to(recipientId).emit('new_notification', populatedNotif);
    } catch (err) {
      console.error("Notification Socket Error:", err);
    }
  });

  // ==========================================
  // --- 3. NEW: SEMBANG KOMUNITI (GROUP CHAT) ---
  // ==========================================
  
  // Masukkan pengguna ke dalam "Bilik Khas" Komuniti
  socket.on('join_group', (groupId) => {
    socket.join(groupId);
    console.log(`🏘️ User joined group chat: ${groupId}`);
  });

  // Terima mesej dari penghantar dan sebarkan kepada semua ahli di dalam bilik
  socket.on('send_group_message', (data) => {
    // data mengandungi { groupId, message }
    socket.to(data.groupId).emit('receive_group_message', data.message);
  });

  // --- 4. DISCONNECT LOGIC ---
  socket.on('disconnect', () => {
    console.log(`🔌 User Disconnected: ${socket.id}`);
    
    // Cari dan buang user yang disconnect dari senarai onlineUsers
    for (let [userId, sockId] of onlineUsers.entries()) {
      if (sockId === socket.id) {
        onlineUsers.delete(userId);
        // Kemaskini senarai online kepada pengguna lain
        io.emit('get_online_users', Array.from(onlineUsers.keys()));
        break;
      }
    }
  });
});

// ==========================================
// 🚀 START SERVER
// ==========================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});