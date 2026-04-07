import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import TrendingSidebar from '../components/TrendingSidebar';
import PostCard from '../components/PostCard';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client'; // 👈 IMPORT SOCKET.IO

// Sambung ke pelayan Socket.io
const socket = io("http://localhost:5000");

function GroupTimeline() {
  const { id } = useParams(); 
  const navigate = useNavigate();
  
  // --- State Utama (Group & Tabs) ---
  const [group, setGroup] = useState(null);
  const [activeTab, setActiveTab] = useState('feed'); 
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // --- State Feed Borak (Posts) ---
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [postMedia, setPostMedia] = useState(null);
  const [postLocation, setPostLocation] = useState('');
  const [showPostPoll, setShowPostPoll] = useState(false);
  const [postPollOptions, setPostPollOptions] = useState(['', '']);
  const [scheduledFor, setScheduledFor] = useState('');
  const postFileInputRef = useRef(null);

  // --- State Bilik Sembang (Chat) ---
  const [messages, setMessages] = useState([]);
  const [newMsgText, setNewMsgText] = useState('');
  const [chatMedia, setChatMedia] = useState(null); 
  const [chatLocation, setChatLocation] = useState(''); 
  const [showChatPoll, setShowChatPoll] = useState(false);
  const [chatPoll, setChatPoll] = useState({ question: '', options: ['', ''] });
  const chatEndRef = useRef(null);
  const chatFileInputRef = useRef(null);

  // --- State Edit Komuniti ---
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({ name: '', description: '' });
  const [newCoverPic, setNewCoverPic] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const token = localStorage.getItem('token');
  const currentUserId = localStorage.getItem('userId');
  const currentUsername = localStorage.getItem('username');

  // ==========================================
  // FETCH DATA: KUMPULAN & POSTS
  // ==========================================
  useEffect(() => {
    const fetchGroupData = async () => {
      try {
        const groupRes = await axios.get(`http://localhost:5000/api/groups/${id}`);
        setGroup(groupRes.data);
        setEditData({ name: groupRes.data.name, description: groupRes.data.description });
        setIsMember(groupRes.data.members.some(m => m._id === currentUserId));
        setIsAdmin(groupRes.data.admins?.includes(currentUserId)); 

        const postsRes = await axios.get(`http://localhost:5000/api/posts/group/${id}`);
        setPosts(postsRes.data);
      } catch (err) {
        console.error("Gagal tarik data group:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchGroupData();
  }, [id, currentUserId]);

  // ==========================================
  // 🚀 SOCKET.IO: FETCH & LISTEN UNTUK CHAT BARU
  // ==========================================
  useEffect(() => {
    if (activeTab === 'chat' && (isMember || isAdmin)) {
      // 1. Tarik Sejarah Chat dari DB (Hanya sekali)
      const fetchMessages = async () => {
        try {
          const res = await axios.get(`http://localhost:5000/api/groups/${id}/messages`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setMessages(res.data);
        } catch (err) { console.error(err); }
      };
      fetchMessages();

      // 2. Beritahu Server bahawa kita masuk ke bilik komuniti ini
      socket.emit('join_group', id);

      // 3. Pasang telinga untuk dengar mesej baru
      socket.on('receive_group_message', (newMessage) => {
        setMessages((prev) => [...prev, newMessage]); // Tambah mesej ke skrin secara live!
      });

      // Cleanup function bila kita tutup chat atau tukar tab
      return () => {
        socket.off('receive_group_message');
      };
    }
  }, [activeTab, id, isMember, isAdmin, token]);

  // Auto scroll ke bawah bila buka chat / ada chat baru
  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  // ==========================================
  // HELPER: MUAT NAIK GAMBAR KE CLOUDINARY
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
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData });
      const data = await response.json();
      return data.secure_url;
    } catch (err) {
      toast.error("Gagal muat naik media.");
      return null;
    }
  };

  const handleGetLocation = (setType) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const locString = `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
        if (setType === 'post') setPostLocation(locString);
        if (setType === 'chat') setChatLocation(locString);
        toast.success("Lokasi berjaya dikesan! 📍");
      });
    }
  };

  // ==========================================
  // HANDLERS: HANTAR FEED BORAK (POST)
  // ==========================================
  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!newPost.trim() && !postMedia && !showPostPoll) return;

    try {
      let mediaUrl = '';
      if (postMedia) {
        toast.loading("Memuat naik media...", { id: 'postLoading' });
        mediaUrl = await uploadImage(postMedia);
      }

      let pollData = null;
      if (showPostPoll) {
        const validOptions = postPollOptions.filter(opt => opt.trim() !== '').map(opt => ({ text: opt }));
        if (validOptions.length >= 2) {
          pollData = { options: validOptions };
        } else {
          toast.dismiss('postLoading');
          return toast.error("Poll mesti ada sekurang-kurangnya 2 pilihan!");
        }
      }

      const res = await axios.post('http://localhost:5000/api/posts', {
        content: newPost,
        group: id,
        mediaUrl: mediaUrl,
        location: postLocation,
        poll: pollData,
        scheduledFor: scheduledFor || null
      }, { headers: { Authorization: `Bearer ${token}` } });

      setPosts([res.data, ...posts]);
      
      // Reset semua state post
      setNewPost(''); setPostMedia(null); setPostLocation(''); 
      setShowPostPoll(false); setPostPollOptions(['', '']); setScheduledFor('');
      toast.success("Borak berjaya dikongsi! 🎉", { id: 'postLoading' });
    } catch (err) {
      toast.dismiss('postLoading');
      toast.error("Gagal hantar borak.");
    }
  };

  // ==========================================
  // 🚀 HANDLERS: HANTAR SEMBANG (CHAT & SOCKET)
  // ==========================================
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMsgText.trim() && !chatMedia && !chatPoll.question) return;

    try {
      let mediaUrl = '';
      if (chatMedia) {
        toast.loading("Menghantar media...", { id: 'chatLoading' });
        mediaUrl = await uploadImage(chatMedia);
      }

      // 1. Simpan dalam database
      const res = await axios.post(`http://localhost:5000/api/groups/${id}/messages`, {
        text: newMsgText,
        mediaUrl: mediaUrl,
        location: chatLocation,
        poll: chatPoll.question ? chatPoll : null
      }, { headers: { Authorization: `Bearer ${token}` } });

      // 2. Papar di skrin kita sendiri
      setMessages([...messages, res.data]);
      
      // 3. PANCAR KE SEMUA ORANG DALAM BILIK (VIA SOCKET.IO)
      socket.emit('send_group_message', {
        groupId: id,
        message: res.data
      });
      
      // Reset semua state chat
      setNewMsgText(''); setChatMedia(null); setChatLocation('');
      setChatPoll({ question: '', options: ['', ''] });
      toast.dismiss('chatLoading');
    } catch (err) {
      toast.dismiss('chatLoading');
      toast.error("Gagal hantar mesej.");
    }
  };

  // ==========================================
  // HANDLERS: JOIN, LEAVE, EDIT, DELETE GROUP
  // ==========================================
  const handleJoinLeave = async () => {
    try {
      await axios.put(`http://localhost:5000/api/groups/${id}/join`, {}, { headers: { Authorization: `Bearer ${token}` } });
      window.location.reload(); 
    } catch (err) { console.error(err); }
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm("Biar betul nak bubarkan komuniti ni? Semua data akan hilang!")) return;
    try {
      await axios.delete(`http://localhost:5000/api/groups/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Komuniti berjaya dibubarkan.");
      navigate('/groups'); 
    } catch (err) { toast.error("Gagal padam komuniti."); }
  };

  const handleSaveGroup = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      let finalCoverPic = group.coverPic;
      if (newCoverPic) {
        toast.loading("Memuat naik gambar... ⏳", { id: 'coverUpload' });
        const uploadedCover = await uploadImage(newCoverPic);
        if (uploadedCover) finalCoverPic = uploadedCover;
        toast.dismiss('coverUpload');
      }
      const res = await axios.put(`http://localhost:5000/api/groups/${id}`, {
        name: editData.name, description: editData.description, coverPic: finalCoverPic
      }, { headers: { Authorization: `Bearer ${token}` } });
      setGroup(res.data);
      setShowEditModal(false); setNewCoverPic(null);
      toast.success("Komuniti berjaya dikemaskini! 🎉");
    } catch (err) { toast.error("Gagal kemaskini komuniti."); } 
    finally { setIsSaving(false); }
  };

  // --- UI Helpers ---
  const tabStyle = (isActive) => ({
    flex: 1, textAlign: 'center', padding: '15px 0', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px',
    color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
    borderBottom: isActive ? '4px solid var(--roti-canai)' : '4px solid transparent',
    backgroundColor: isActive ? 'rgba(255, 255, 255, 0.03)' : 'transparent',
    transition: 'all 0.2s ease'
  });

  if (loading) return <div style={{ textAlign: 'center', marginTop: '50px', color: 'var(--text-main)' }}>Memuatkan Komuniti...</div>;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', fontFamily: "'Poppins', sans-serif", maxWidth: '1200px', margin: '0 auto' }}>
      <Sidebar currentUsername={currentUsername} />

      <div className="main-feed-mobile" style={{ flex: 1, maxWidth: '600px', borderRight: '1px solid var(--border-color)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* HEADER & COVER */}
        <div style={{ position: 'relative', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ height: '150px', backgroundImage: `url(${group.coverPic || ''})`, backgroundColor: 'var(--bg-input)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
            <Link to="/groups" style={{ position: 'absolute', top: '15px', left: '15px', backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff', padding: '5px 15px', borderRadius: '20px', textDecoration: 'none', fontWeight: 'bold' }}>← Kembali</Link>
          </div>
          <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ margin: '0 0 5px 0', fontSize: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {group.name} {isAdmin && <span style={{ fontSize: '12px', backgroundColor: 'var(--roti-canai)', color: '#000', padding: '2px 8px', borderRadius: '10px' }}>👑 Admin</span>}
              </h2>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>{group.description}</p>
              <div style={{ marginTop: '10px', fontSize: '14px', color: 'var(--text-muted)' }}>👥 {group.members?.length || 0} Ahli</div>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexDirection: 'column', alignItems: 'flex-end' }}>
              {!isAdmin && (
                <button onClick={handleJoinLeave} style={{ padding: '8px 20px', borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: isMember ? 'transparent' : 'var(--text-main)', color: isMember ? 'var(--text-main)' : 'var(--bg-main)', border: isMember ? '1px solid var(--border-color)' : 'none' }}>
                  {isMember ? 'Keluar' : 'Sertai'}
                </button>
              )}
              {isAdmin && (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setShowEditModal(true)} style={{ padding: '8px 15px', borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--border-color)', fontSize: '13px' }}>✏️ Edit</button>
                  <button onClick={handleDeleteGroup} style={{ padding: '8px 15px', borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: 'transparent', color: 'var(--sirap-bandung)', border: '1px solid var(--sirap-bandung)', fontSize: '13px' }}>🗑️ Bubar</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ================= TABS ================= */}
        {(isMember || isAdmin) ? (
          <>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
              <div style={tabStyle(activeTab === 'feed')} onClick={() => setActiveTab('feed')}>📝 Feed Borak</div>
              <div style={tabStyle(activeTab === 'chat')} onClick={() => setActiveTab('chat')}>💬 Bilik Sembang</div>
            </div>

            {/* ================= TAB 1: FEED BORAK ================= */}
            {activeTab === 'feed' && (
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)' }}>
                  
                  {/* Feed Input Form */}
                  <form onSubmit={handlePostSubmit}>
                    <div style={{ display: 'flex', gap: '15px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                        {currentUsername?.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <textarea value={newPost} onChange={(e) => setNewPost(e.target.value)} placeholder={`Kongsi sesuatu dengan ${group.name}...`} style={{ width: '100%', border: 'none', backgroundColor: 'transparent', color: 'var(--text-main)', outline: 'none', resize: 'none', fontSize: '18px', fontFamily: 'inherit' }} rows="2" />
                        
                        {/* Feed Previews */}
                        {postMedia && <div style={{ fontSize: '13px', color: 'var(--roti-canai)', margin: '10px 0' }}>🖼️ Media sedia dimuat naik: {postMedia.name}</div>}
                        {postLocation && <div style={{ fontSize: '13px', color: 'var(--roti-canai)', margin: '10px 0' }}>📍 Lokasi ditambah: {postLocation}</div>}
                        {scheduledFor && <div style={{ fontSize: '13px', color: 'var(--roti-canai)', margin: '10px 0' }}>🕒 Dijadualkan pada: {new Date(scheduledFor).toLocaleString()}</div>}
                        
                        {/* Poll UI untuk Feed */}
                        {showPostPoll && (
                          <div style={{ border: '1px solid var(--border-color)', borderRadius: '15px', padding: '15px', marginTop: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                              <strong style={{ fontSize: '14px' }}>📊 Buat Poll (Soalan berdasarkan teks di atas)</strong>
                              <span style={{ cursor: 'pointer', color: 'var(--sirap-bandung)' }} onClick={() => {setShowPostPoll(false); setPostPollOptions(['', ''])}}>Batal</span>
                            </div>
                            {postPollOptions.map((opt, i) => (
                              <input key={i} type="text" placeholder={`Pilihan ${i + 1}`} value={opt} onChange={(e) => {
                                const newOpts = [...postPollOptions]; newOpts[i] = e.target.value; setPostPollOptions(newOpts);
                              }} style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', boxSizing: 'border-box' }} />
                            ))}
                            {postPollOptions.length < 4 && (
                              <span style={{ color: 'var(--roti-canai)', cursor: 'pointer', fontSize: '13px' }} onClick={() => setPostPollOptions([...postPollOptions, ''])}>+ Tambah Pilihan</span>
                            )}
                          </div>
                        )}

                        {/* Feed Toolbar & Submit */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
                          <div style={{ display: 'flex', gap: '15px', fontSize: '18px' }}>
                            <span style={{ cursor: 'pointer' }} onClick={() => postFileInputRef.current.click()} title="Media/GIF">🖼️</span>
                            <span style={{ cursor: 'pointer' }} onClick={() => setShowPostPoll(!showPostPoll)} title="Poll">📊</span>
                            <span style={{ cursor: 'pointer' }} onClick={() => handleGetLocation('post')} title="Lokasi">📍</span>
                            <span style={{ position: 'relative', cursor: 'pointer' }} title="Jadualkan Post">
                              🕒 <input type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                            </span>
                            <input type="file" ref={postFileInputRef} style={{ display: 'none' }} accept="image/*,video/*,.gif" onChange={(e) => setPostMedia(e.target.files[0])} />
                          </div>
                          <button type="submit" style={{ padding: '8px 20px', borderRadius: '20px', border: 'none', backgroundColor: 'var(--roti-canai)', color: '#000', fontWeight: 'bold', cursor: 'pointer' }}>Borak</button>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>

                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {posts.length === 0 ? <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada borak dalam komuniti ni.</p> : posts.map(post => <PostCard key={post._id} post={post} currentUserId={currentUserId} token={token} />)}
                </div>
              </div>
            )}

            {/* ================= TAB 2: BILIK SEMBANG (CHAT) ================= */}
            {activeTab === 'chat' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-main)', height: '600px' }}>
                <div style={{ flex: 1, overflowY: 'auto', padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {messages.map((msg, idx) => {
                    const isMe = msg.sender._id === currentUserId;
                    return (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                        {!isMe && <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px', marginLeft: '5px' }}>{msg.sender.username}</span>}
                        <div style={{ maxWidth: '80%', padding: '10px 15px', borderRadius: '15px', backgroundColor: isMe ? 'var(--roti-canai)' : 'var(--bg-input)', color: isMe ? '#000' : 'var(--text-main)' }}>
                          {msg.mediaUrl && <img src={msg.mediaUrl} style={{ width: '100%', borderRadius: '10px', marginBottom: '8px' }} alt="media" />}
                          {msg.text && <div style={{ wordBreak: 'break-word', fontSize: '14px' }}>{msg.text}</div>}
                          {msg.location && <div style={{ fontSize: '11px', marginTop: '5px', opacity: 0.8 }}>📍 {msg.location}</div>}
                          {msg.poll?.question && (
                            <div style={{ marginTop: '10px', padding: '10px', backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '10px' }}>
                              <strong style={{ fontSize: '13px' }}>📊 {msg.poll.question}</strong>
                              {msg.poll.options.map((opt, i) => <div key={i} style={{ fontSize: '12px', marginTop: '5px', padding: '5px', background: 'rgba(255,255,255,0.2)', borderRadius: '5px' }}>{opt.text}</div>)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input Area */}
                <div style={{ padding: '15px', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)' }}>
                  {chatMedia && <div style={{ fontSize: '12px', color: 'var(--roti-canai)', marginBottom: '5px' }}>🖼️ Gambar dipilih: {chatMedia.name} <span style={{ cursor: 'pointer', color: 'var(--sirap-bandung)' }} onClick={() => setChatMedia(null)}>✕</span></div>}
                  {chatLocation && <div style={{ fontSize: '12px', color: 'var(--roti-canai)', marginBottom: '5px' }}>📍 Lokasi: {chatLocation} <span style={{ cursor: 'pointer', color: 'var(--sirap-bandung)' }} onClick={() => setChatLocation('')}>✕</span></div>}
                  
                  {/* Chat Toolbar */}
                  <div style={{ display: 'flex', gap: '15px', marginBottom: '10px', fontSize: '18px', paddingLeft: '5px' }}>
                    <span style={{ cursor: 'pointer' }} onClick={() => chatFileInputRef.current.click()} title="Gambar/GIF">🖼️</span>
                    <span style={{ cursor: 'pointer' }} onClick={() => setShowChatPoll(true)} title="Poll Chat">📊</span>
                    <span style={{ cursor: 'pointer' }} onClick={() => handleGetLocation('chat')} title="Kongsi Lokasi">📍</span>
                    <input type="file" ref={chatFileInputRef} style={{ display: 'none' }} accept="image/*,.gif" onChange={(e) => setChatMedia(e.target.files[0])} />
                  </div>

                  <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px' }}>
                    <input type="text" value={newMsgText} onChange={(e) => setNewMsgText(e.target.value)} placeholder="Menaip mesej..." style={{ flex: 1, padding: '12px 15px', borderRadius: '30px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', outline: 'none' }} />
                    <button type="submit" disabled={!newMsgText.trim() && !chatMedia && !chatPoll.question} style={{ padding: '0 25px', borderRadius: '30px', border: 'none', backgroundColor: 'var(--text-main)', color: 'var(--bg-main)', fontWeight: 'bold', cursor: (!newMsgText.trim() && !chatMedia && !chatPoll.question) ? 'not-allowed' : 'pointer' }}>Hantar</button>
                  </form>
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', backgroundColor: 'var(--bg-card)' }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>🔒</div>
            <h3 style={{ margin: '0 0 10px 0', color: 'var(--text-main)' }}>Komuniti Tertutup</h3>
            <p style={{ margin: 0 }}>Sertai komuniti ini untuk melihat borak dan mula bersembang!</p>
          </div>
        )}
      </div>

      <div className="trending-sidebar-mobile-hide">
        <TrendingSidebar />
      </div>

      {/* ================= MODAL: EDIT GROUP ================= */}
      {showEditModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'var(--bg-card)', width: '100%', maxWidth: '500px', borderRadius: '15px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Edit Komuniti</h3>
              <span onClick={() => setShowEditModal(false)} style={{ cursor: 'pointer', fontSize: '20px' }}>✕</span>
            </div>
            <form onSubmit={handleSaveGroup}>
              <label style={{ display: 'block', position: 'relative', height: '150px', backgroundColor: 'var(--bg-input)', cursor: 'pointer', backgroundImage: newCoverPic ? `url(${URL.createObjectURL(newCoverPic)})` : (group.coverPic ? `url(${group.coverPic})` : 'none'), backgroundSize: 'cover', backgroundPosition: 'center' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }} onMouseOver={(e) => e.currentTarget.style.opacity = 1} onMouseOut={(e) => e.currentTarget.style.opacity = 0}>📷 Tukar Cover</div>
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => setNewCoverPic(e.target.files[0])} />
              </label>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <input type="text" value={editData.name} onChange={(e) => setEditData({...editData, name: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', boxSizing: 'border-box' }} required />
                <textarea value={editData.description} onChange={(e) => setEditData({...editData, description: e.target.value})} rows="3" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', boxSizing: 'border-box', resize: 'none' }} />
                <button type="submit" disabled={isSaving} style={{ width: '100%', padding: '12px', borderRadius: '30px', border: 'none', backgroundColor: 'var(--text-main)', color: 'var(--bg-main)', fontWeight: 'bold', cursor: isSaving ? 'wait' : 'pointer' }}>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: BUAT POLL CHAT ================= */}
      {showChatPoll && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'var(--bg-card)', padding: '20px', borderRadius: '15px', width: '300px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ margin: '0 0 15px 0' }}>📊 Buat Poll Sembang</h3>
            <input placeholder="Soalan (Cth: Nak lepak mana?)" style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', boxSizing: 'border-box' }} onChange={(e) => setChatPoll({...chatPoll, question: e.target.value})} />
            <input placeholder="Pilihan 1" style={{ width: '100%', padding: '10px', marginBottom: '5px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', boxSizing: 'border-box' }} onChange={(e) => {let opts=[...chatPoll.options]; opts[0]={text: e.target.value, votes: []}; setChatPoll({...chatPoll, options: opts})}} />
            <input placeholder="Pilihan 2" style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', boxSizing: 'border-box' }} onChange={(e) => {let opts=[...chatPoll.options]; opts[1]={text: e.target.value, votes: []}; setChatPoll({...chatPoll, options: opts})}} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => {setShowChatPoll(false); setChatPoll({question:'', options:['','']});}} style={{ flex: 1, backgroundColor: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border-color)', padding: '10px', borderRadius: '10px', cursor: 'pointer' }}>Batal</button>
              <button onClick={() => setShowChatPoll(false)} style={{ flex: 1, backgroundColor: 'var(--roti-canai)', color: '#000', border: 'none', padding: '10px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>Sedia</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default GroupTimeline;