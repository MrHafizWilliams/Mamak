import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import Sidebar from '../components/Sidebar';
import toast from 'react-hot-toast';

// Connect to the backend socket
const socket = io("http://localhost:5000");

// Koleksi Sticker/GIF percuma untuk "Laci GIF"
const STICKERS = [
  "https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif", // Hello
  "https://media.giphy.com/media/l41lUjUgLLwWrz20w/giphy.gif", // Thumbs up
  "https://media.giphy.com/media/26AHONQ79FdWZhAI0/giphy.gif", // Laugh
  "https://media.giphy.com/media/3o6ozh46EBuBHRglrO/giphy.gif", // Wink
  "https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif",     // Excited
  "https://media.giphy.com/media/11ISwbgCxEzMyY/giphy.gif"      // Confused
];

function Sembang() {
  const [conversations, setConversations] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [imageFile, setImageFile] = useState(null);
  
  // For starting new chats & UI states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showStickers, setShowStickers] = useState(false); // <--- State untuk Laci GIF

  // Real-time states
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);

  const currentUserId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');
  const currentUsername = localStorage.getItem('username');
  
  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);

  // ==========================================
  // 1. INITIALIZE SOCKET & ONLINE STATUS
  // ==========================================
  useEffect(() => {
    if (currentUserId) {
      socket.emit('user_connected', currentUserId);
      
      socket.on('get_online_users', (users) => {
        if (Array.isArray(users)) setOnlineUsers(users);
      });

      socket.on('receive_message', (message) => {
        setMessages((prev) => [...prev, message]);
        scrollToBottom();
      });

      socket.on('user_typing', () => {
        setPartnerTyping(true);
      });

      socket.on('user_stopped_typing', () => {
        setPartnerTyping(false);
      });
    }

    return () => {
      socket.off('get_online_users');
      socket.off('receive_message');
      socket.off('user_typing');
      socket.off('user_stopped_typing');
    };
  }, [currentUserId]);

  // ==========================================
  // 2. FETCH INBOX ON LOAD
  // ==========================================
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/messages/conversations', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (Array.isArray(res.data)) {
          setConversations(res.data);
        }
      } catch (err) {
        console.error("Gagal tarik inbox:", err);
      }
    };
    if (token) fetchConversations();
  }, [token]);

  // ==========================================
  // 3. SEARCH USERS TO START CHAT
  // ==========================================
  const searchUsers = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await axios.get(`http://localhost:5000/api/users/search?q=${query}`);
      setSearchResults(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartNewChat = async (userToChat) => {
    try {
      const res = await axios.post('http://localhost:5000/api/messages/conversations', 
        { receiverId: userToChat._id }, 
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      setSearchQuery("");
      setSearchResults([]);
      
      const exists = conversations.find(c => c._id === res.data._id);
      if (!exists) {
        setConversations(prev => [res.data, ...prev]);
      }
      
      openChat(res.data);
    } catch (err) {
      toast.error("Gagal mulakan sembang.");
    }
  };

  // ==========================================
  // 4. OPEN CHAT & FETCH MESSAGES
  // ==========================================
  const openChat = async (conversation) => {
    setCurrentChat(conversation);
    setShowStickers(false); // <--- Tutup laci GIF bila tukar chat
    socket.emit('join_chat', conversation._id); 

    try {
      const res = await axios.get(`http://localhost:5000/api/messages/${conversation._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(res.data || []);
      scrollToBottom();
    } catch (err) {
      console.error("Gagal buka mesej:", err);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // ==========================================
  // 5. UPLOAD IMAGE HELPER (Cloudinary)
  // ==========================================
  const uploadImage = async (file) => {
    try {
      const sigRes = await axios.get('http://localhost:5000/api/posts/upload-signature', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const { signature, timestamp, apiKey, cloudName } = sigRes.data;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp);
      formData.append('signature', signature);
      formData.append('folder', 'Mamak_Posts');

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST', body: formData
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error.message);
      return data.secure_url;
    } catch (err) {
      toast.error("Gagal upload gambar.");
      return null;
    }
  };

  // ==========================================
  // 6. SEND MESSAGE LOGIC (Teks & Gambar)
  // ==========================================
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !imageFile) return;

    let mediaUrl = null;
    
    if (imageFile) {
      toast.loading("Menghantar gambar... ⏳", { id: 'chatUpload' });
      mediaUrl = await uploadImage(imageFile);
      toast.dismiss('chatUpload');
    }

    const messageData = {
      conversationId: currentChat._id,
      text: newMessage,
      mediaUrl: mediaUrl
    };

    try {
      const res = await axios.post('http://localhost:5000/api/messages', messageData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      socket.emit('send_message', res.data);
      socket.emit('stop_typing', { conversationId: currentChat._id });

      setMessages(prev => [...prev, res.data]);
      setNewMessage("");
      setImageFile(null);
      setShowStickers(false); // Tutup sticker lepas hantar
      scrollToBottom();
    } catch (err) {
      toast.error("Mesej tak sampai.");
    }
  };

  // ==========================================
  // 7. SEND STICKER/GIF LOGIC
  // ==========================================
  const sendSticker = async (stickerUrl) => {
    try {
      const messageData = { 
        conversationId: currentChat._id, 
        text: "", 
        mediaUrl: stickerUrl 
      };

      const res = await axios.post('http://localhost:5000/api/messages', messageData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      socket.emit('send_message', res.data);
      setMessages(prev => [...prev, res.data]);
      setShowStickers(false); // Tutup laci selepas klik
      scrollToBottom();
    } catch (err) {
      toast.error("Gagal hantar GIF.");
    }
  };

  // ==========================================
  // 8. DELETE CHAT (Padam Perbualan)
  // ==========================================
  const handleDeleteChat = async () => {
    if (!window.confirm("Biar betul nak padam sejarah sembang ni? Tak boleh undur balik tau!")) return;
    
    try {
      await axios.delete(`http://localhost:5000/api/messages/conversations/${currentChat._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Buang dari senarai UI di kiri
      setConversations(conversations.filter(c => c._id !== currentChat._id));
      setCurrentChat(null); // Tutup paparan chat di kanan
      toast.success("Sembang berjaya dipadam 🗑️");
    } catch (err) {
      toast.error("Gagal padam sembang.");
    }
  };

  // ==========================================
  // 9. TYPING INDICATOR
  // ==========================================
  const handleTyping = (e) => {
    setNewMessage(e.target.value);

    if (!currentChat) return;

    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing', { conversationId: currentChat._id });
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit('stop_typing', { conversationId: currentChat._id });
    }, 2000); 
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', fontFamily: "'Poppins', sans-serif" }}>
      <Sidebar currentUsername={currentUsername} />

      <div style={{ flex: 1, display: 'flex', borderRight: '1px solid var(--border-color)' }}>
        
        {/* ================= INBOX / SEARCH SIDEBAR ================= */}
        <div style={{ width: '350px', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)' }}>
            <h2 style={{ margin: '0 0 15px 0', fontSize: '20px', fontWeight: 'bold' }}>Sembang ✉️</h2>
            
            <input 
              type="text" 
              placeholder="Cari kawan..." 
              value={searchQuery}
              onChange={searchUsers}
              style={{ width: '100%', padding: '10px 15px', borderRadius: '20px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', boxSizing: 'border-box', outline: 'none' }}
            />
            
            {searchResults.length > 0 && (
              <div style={{ marginTop: '10px', backgroundColor: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                {searchResults.map(user => (
                  <div 
                    key={user._id} 
                    onClick={() => handleStartNewChat(user)}
                    style={{ padding: '10px 15px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)' }}
                  >
                    <img src={user.profilePic || 'https://via.placeholder.com/30'} alt="avatar" style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }} />
                    <span style={{ fontWeight: 'bold' }}>{user.username}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {conversations.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '20px' }}>Tiada mesej.</p>
            ) : (
              conversations.map((conv) => {
                if (!conv || !conv.members) return null;
                const partner = conv.members.find(m => m?._id !== currentUserId) || {};
                
                if (!partner._id) return null;

                const isOnline = onlineUsers.includes(partner._id);

                return (
                  <div 
                    key={conv._id} 
                    onClick={() => openChat(conv)}
                    style={{ 
                      display: 'flex', gap: '15px', padding: '15px 20px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)',
                      backgroundColor: currentChat?._id === conv._id ? 'var(--bg-input)' : 'transparent', transition: 'background 0.2s'
                    }}
                    onMouseOver={(e) => { if (currentChat?._id !== conv._id) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)' }}
                    onMouseOut={(e) => { if (currentChat?._id !== conv._id) e.currentTarget.style.backgroundColor = 'transparent' }}
                  >
                    <div style={{ position: 'relative' }}>
                      <img src={partner.profilePic || 'https://via.placeholder.com/50'} alt="avatar" style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }} />
                      {isOnline && <div style={{ position: 'absolute', bottom: '2px', right: '2px', width: '12px', height: '12px', backgroundColor: 'var(--pandan)', borderRadius: '50%', border: '2px solid var(--bg-main)' }}></div>}
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <h4 style={{ margin: '0 0 5px 0', fontSize: '15px' }}>{partner.username || 'Unknown'}</h4>
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                        {conv.lastMessage?.text || (conv.lastMessage?.mediaUrl ? '📷 Media' : 'Mula bersembang')}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ================= CHAT WINDOW ================= */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-main)', position: 'relative' }}>
          {!currentChat ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <span style={{ fontSize: '60px', marginBottom: '10px' }}>💬</span>
              <h3>Pilih mesej untuk mula berborak</h3>
            </div>
          ) : (
            <>
              {/* HEADER (Ditambah butang Padam/Trash) */}
              {(() => {
                const partner = currentChat.members?.find(m => m?._id !== currentUserId) || {};
                const isOnline = partner._id ? onlineUsers.includes(partner._id) : false;
                
                return (
                  <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(21, 32, 43, 0.85)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <img src={partner.profilePic || 'https://via.placeholder.com/40'} alt="avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                      <div>
                        <h3 style={{ margin: 0, fontSize: '16px' }}>{partner.username || 'Unknown'}</h3>
                        <span style={{ fontSize: '12px', color: isOnline ? 'var(--pandan)' : 'var(--text-muted)', fontWeight: 'bold' }}>
                          {isOnline ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>
                    {/* BUTANG TONG SAMPAH */}
                    <button 
                      onClick={handleDeleteChat} 
                      title="Padam Sembang" 
                      style={{ background: 'none', border: 'none', color: 'var(--sirap-bandung)', fontSize: '20px', cursor: 'pointer', padding: '5px', transition: 'transform 0.2s' }}
                      onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'} 
                      onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      🗑️
                    </button>
                  </div>
                );
              })()}

              {/* MESSAGES */}
              <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {messages?.map((msg, idx) => {
                  const isMe = msg.sender === currentUserId;
                  return (
                    <div key={idx} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
                      <div style={{ 
                        padding: '10px 15px', 
                        borderRadius: isMe ? '15px 15px 0 15px' : '15px 15px 15px 0', 
                        backgroundColor: isMe ? 'var(--roti-canai)' : 'var(--bg-input)',
                        color: isMe ? '#000' : 'var(--text-main)',
                        fontSize: '14px',
                        border: isMe ? 'none' : '1px solid var(--border-color)'
                      }}>
                        {msg.mediaUrl && (
                          <img src={msg.mediaUrl} alt="media" style={{ width: '100%', borderRadius: '10px', marginBottom: msg.text ? '8px' : '0' }} />
                        )}
                        {msg.text && <div>{msg.text}</div>}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', textAlign: isMe ? 'right' : 'left' }}>
                        {new Date(msg.createdAt).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  );
                })}

                {partnerTyping && (
                  <div style={{ alignSelf: 'flex-start', maxWidth: '70%', padding: '10px 15px', borderRadius: '15px 15px 15px 0', backgroundColor: 'var(--bg-input)', color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', border: '1px solid var(--border-color)' }}>
                    Tengah taip... ✍️
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* INPUT AREA (Ditambah Butang dan Menu Laci Sticker) */}
              <div style={{ padding: '15px 20px', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', position: 'relative' }}>
                
                {/* --- LACI STICKER / GIF --- */}
                {showStickers && (
                  <div style={{ position: 'absolute', bottom: '100%', left: '20px', marginBottom: '10px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '15px', padding: '10px', width: '300px', display: 'flex', flexWrap: 'wrap', gap: '10px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', zIndex: 20 }}>
                    <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Hantar GIF</span>
                      <span onClick={() => setShowStickers(false)} style={{ cursor: 'pointer', color: 'var(--text-muted)', padding: '0 5px' }}>✕</span>
                    </div>
                    {STICKERS.map((gif, idx) => (
                      <img 
                        key={idx} 
                        src={gif} 
                        alt="gif" 
                        onClick={() => sendSticker(gif)}
                        style={{ width: '85px', height: '85px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer', transition: 'transform 0.2s' }}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      />
                    ))}
                  </div>
                )}

                {imageFile && (
                  <div style={{ position: 'relative', display: 'inline-block', marginBottom: '10px' }}>
                    <img src={URL.createObjectURL(imageFile)} alt="preview" style={{ height: '80px', borderRadius: '10px', border: '1px solid var(--border-color)' }} />
                    <button onClick={() => setImageFile(null)} style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'var(--sambal)', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '12px' }}>✕</button>
                  </div>
                )}

                <form onSubmit={sendMessage} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <label style={{ cursor: 'pointer', fontSize: '22px', padding: '5px', transition: 'transform 0.2s' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                    📷
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => setImageFile(e.target.files[0])} />
                  </label>
                  
                  {/* Butang Emoji/Sticker */}
                  <span 
                    onClick={() => setShowStickers(!showStickers)} 
                    style={{ cursor: 'pointer', fontSize: '22px', padding: '5px', transition: 'transform 0.2s' }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'} 
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    😀
                  </span>
                  
                  <input 
                    type="text" 
                    value={newMessage}
                    onChange={handleTyping}
                    placeholder="Mula menaip..."
                    style={{ flex: 1, padding: '15px 20px', borderRadius: '30px', border: 'none', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', outline: 'none', fontSize: '15px' }}
                  />
                  <button 
                    type="submit" 
                    disabled={!newMessage.trim() && !imageFile}
                    style={{ padding: '0 25px', height: '48px', borderRadius: '30px', border: 'none', backgroundColor: 'var(--roti-canai)', color: '#000', fontWeight: 'bold', cursor: (!newMessage.trim() && !imageFile) ? 'not-allowed' : 'pointer', opacity: (!newMessage.trim() && !imageFile) ? 0.5 : 1 }}
                  >
                    Hantar
                  </button>
                </form>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}

export default Sembang;