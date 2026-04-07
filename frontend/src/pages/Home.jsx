import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import EmojiPicker from 'emoji-picker-react';
import Sidebar from '../components/Sidebar';
import TrendingSidebar from '../components/TrendingSidebar';
import PostCard from '../components/PostCard';
import PostSkeleton from '../components/PostSkeleton';

// ── Helper: format a Date into datetime-local input value ──────
const toDatetimeLocal = (date) => {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); 
  return d.toISOString().slice(0, 16);
};

// ── Helper: format a Date for display in the compose tag ───────
const formatScheduled = (isoString) => {
  return new Date(isoString).toLocaleString('ms-MY', {
    day:    '2-digit',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit'
  });
};

function Home() {
  const [posts, setPosts]               = useState([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [newPost, setNewPost]           = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isPosting, setIsPosting]       = useState(false);
  const [activeTab, setActiveTab]       = useState('untuk-anda');

  // ── 🚀 Infinite Scroll State ────────────────────────────────
  const [page, setPage]                 = useState(1);
  const [hasMore, setHasMore]           = useState(true);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const observer = useRef();

  // ── Poll State ──────────────────────────────────────────────
  const [showPoll, setShowPoll]       = useState(false);
  const [pollOptions, setPollOptions] = useState(['', '']);

  // ── Emoji State ─────────────────────────────────────────────
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef(null);
  const textareaRef    = useRef(null);
  const cursorPosRef   = useRef(0);

  // ── Location State ───────────────────────────────────────────
  const [location, setLocation]               = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);

  // ── Schedule State ───────────────────────────────────────────
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [scheduledFor, setScheduledFor]             = useState(''); 
  const schedulePickerRef                           = useRef(null);

  const minSchedule = toDatetimeLocal(new Date(Date.now() + 5 * 60 * 1000));

  const token           = localStorage.getItem('token');
  const currentUserId   = localStorage.getItem('userId');
  const currentUsername = localStorage.getItem('username') || 'M';
  const currentUserPic = localStorage.getItem('profilePic');

  // ── 🚀 Infinite Scroll Observer Logic ───────────────────────
  const lastPostElementRef = useCallback(node => {
    if (isLoading || isFetchingNextPage) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });
    
    if (node) observer.current.observe(node);
  }, [isLoading, isFetchingNextPage, hasMore]);

  // ── Fetch posts (Initial & Load More) ──
  useEffect(() => {
    const fetchPosts = async () => {
      if (page === 1) setIsLoading(true);
      else setIsFetchingNextPage(true);

      try {
        // Menggunakan endpoint dengan query page & limit
        const response = await axios.get(`http://localhost:5000/api/posts?page=${page}&limit=10`);
        
        // Memandangkan backend sekarang return { posts, hasMore, currentPage }
        const newPosts = response.data.posts;
        const moreAvailable = response.data.hasMore;

        setPosts(prev => (page === 1 ? newPosts : [...prev, ...newPosts]));
        setHasMore(moreAvailable);
      } catch (error) {
        console.error("Gagal tarik borak:", error);
      } finally {
        setIsLoading(false);
        setIsFetchingNextPage(false);
      }
    };
    fetchPosts();
  }, [page]);

  // ── Close emoji picker on outside click ─────────────────────
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  // ── Close schedule picker on outside click ───────────────────
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (schedulePickerRef.current && !schedulePickerRef.current.contains(e.target)) {
        setShowSchedulePicker(false);
      }
    };
    if (showSchedulePicker) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSchedulePicker]);

  // ── Emoji Helpers ────────────────────────────────────────────
  const handleEmojiButtonClick = () => {
    if (textareaRef.current) cursorPosRef.current = textareaRef.current.selectionStart;
    setShowEmojiPicker(prev => !prev);
  };

  const handleEmojiClick = (emojiData) => {
    const emoji   = emojiData.emoji;
    const pos     = cursorPosRef.current;
    const updated = newPost.slice(0, pos) + emoji + newPost.slice(pos);
    setNewPost(updated);
    const newPos = pos + emoji.length;
    cursorPosRef.current = newPos;
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  // ── Location Handler ─────────────────────────────────────────
  const handleLocationClick = () => {
    if (location) { setLocation(null); return; }
    if (!navigator.geolocation) { alert("Browser kamu tak support geolocation boss."); return; }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        try {
          const res = await axios.get(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { 'Accept-Language': 'ms,en' } }
          );
          const addr = res.data.address;
          const placeName =
            addr.neighbourhood || addr.suburb   || addr.village ||
            addr.town          || addr.city      || addr.county  ||
            addr.state         || addr.country   || "Lokasi Semasa";
          setLocation({ placeName, lat, lng });
        } catch {
          setLocation({ placeName: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, lat, lng });
        } finally {
          setLocationLoading(false);
        }
      },
      (error) => {
        setLocationLoading(false);
        alert("Gagal detect lokasi. Cuba lagi.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // ── Schedule Helpers ─────────────────────────────────────────
  const handleScheduleConfirm = () => {
    if (!scheduledFor) return;
    setShowSchedulePicker(false);
  };

  const handleClearSchedule = () => {
    setScheduledFor('');
    setShowSchedulePicker(false);
  };

  // ── Poll Helpers ─────────────────────────────────────────────
  const handleTogglePoll = () => {
    setShowPoll(prev => !prev);
    setPollOptions(['', '']);
  };

  const handlePollOptionChange = (index, value) => {
    const updated = [...pollOptions];
    updated[index] = value;
    setPollOptions(updated);
  };

  const handleAddPollOption = () => {
    if (pollOptions.length < 4) setPollOptions([...pollOptions, '']);
  };

  const handleRemovePollOption = (index) => {
    if (pollOptions.length > 2) setPollOptions(pollOptions.filter((_, i) => i !== index));
  };

  const isPollValid = () => {
    if (!showPoll) return true;
    return pollOptions.filter(o => o.trim() !== '').length >= 2;
  };

  const canSubmit = !isPosting && (newPost.trim() || selectedFile || showPoll) && isPollValid();

  const uploadMedia = async (file) => {
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
      const resourceType = file.type.startsWith('video/') ? 'video' : 'image';
      const uploadRes = await axios.post(
        `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, 
        formData
      );
      return { url: uploadRes.data.secure_url, type: resourceType };
    } catch (err) {
      console.error("Gagal upload media:", err);
      return null;
    }
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setIsPosting(true);
    try {
      let mediaUrl  = '';
      let mediaType = '';
      if (selectedFile) {
        const uploadedData = await uploadMedia(selectedFile);
        if (!uploadedData) {
          setIsPosting(false);
          alert("Gagal memuat naik fail.");
          return;
        }
        mediaUrl = uploadedData.url;
        mediaType = uploadedData.type;
      }
      const pollPayload = showPoll
        ? { options: pollOptions.filter(o => o.trim() !== '').map(text => ({ text })) }
        : null;

      const response = await axios.post('http://localhost:5000/api/posts', {
        content:      newPost,
        mediaUrl,
        mediaType,
        poll:         pollPayload,
        location:     location     || null,
        scheduledFor: scheduledFor || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.status === 'published') {
        setPosts([response.data, ...posts]);
      } else {
        alert(`📅 Borak kamu dijadualkan untuk ${formatScheduled(scheduledFor)}!`);
      }

      setNewPost('');
      setSelectedFile(null);
      setShowPoll(false);
      setPollOptions(['', '']);
      setShowEmojiPicker(false);
      setLocation(null);
      setScheduledFor('');
      setIsPosting(false);
    } catch (error) {
      console.error(error);
      alert("Gagal hantar borak.");
      setIsPosting(false);
    }
  };

  const pollInputStyle = {
    width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px',
    color: 'var(--text-main)', fontSize: '15px', padding: '10px 12px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box'
  };

  const tagStyle = {
    display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)',
    borderRadius: '20px', padding: '5px 12px', fontSize: '13px', fontWeight: 'bold', color: 'var(--roti-canai)', marginBottom: '10px', marginRight: '8px'
  };

  return (
    <div style={{ display: 'flex', maxWidth: '1200px', margin: '0 auto', minHeight: '100vh', boxSizing: 'border-box' }}>
      <Sidebar currentUsername={currentUsername} />

      <div className="main-feed-mobile" style={{ flex: 1, borderRight: '1px solid var(--border-color)', minHeight: '100vh' }}>
        
        {/* Tabs */}
        <div style={{ position: 'sticky', top: 0, backgroundColor: 'rgba(var(--bg-main-rgb), 0.85)', backdropFilter: 'blur(10px)', zIndex: 10, borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', cursor: 'pointer' }}>
            <div onClick={() => { setPosts([]); setPage(1); setActiveTab('untuk-anda'); }} style={{ flex: 1, padding: '15px 0', textAlign: 'center', fontWeight: 'bold', color: activeTab === 'untuk-anda' ? 'var(--text-main)' : 'var(--text-muted)', borderBottom: activeTab === 'untuk-anda' ? '4px solid var(--roti-canai)' : '4px solid transparent', transition: 'all 0.2s' }}>
              Untuk Anda
            </div>
            <div onClick={() => { setActiveTab('following'); }} style={{ flex: 1, padding: '15px 0', textAlign: 'center', fontWeight: 'bold', color: activeTab === 'following' ? 'var(--text-main)' : 'var(--text-muted)', borderBottom: activeTab === 'following' ? '4px solid var(--roti-canai)' : '4px solid transparent', transition: 'all 0.2s' }}>
              Member Je (Following)
            </div>
          </div>
        </div>

        {/* COMPOSE BOX */}
        <div style={{ display: 'flex', gap: '15px', padding: '20px 20px 10px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ width: '45px', height: '45px', borderRadius: '50%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'var(--text-main)', fontSize: '18px', overflow: 'hidden' }}>
            {currentUserPic && currentUserPic !== 'undefined' ? (
              <img src={currentUserPic} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              currentUsername.charAt(0).toUpperCase()
            )}
          </div>

          <div style={{ flex: 1 }}>
            <form onSubmit={handlePostSubmit}>
              <textarea
                ref={textareaRef}
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                onBlur={(e) => { cursorPosRef.current = e.target.selectionStart; }}
                placeholder={showPoll ? "Tambah konteks untuk poll kamu..." : "Apa cerita hari ni?"}
                style={{ width: '100%', backgroundColor: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '20px', outline: 'none', resize: 'none', minHeight: '50px', fontFamily: 'inherit', padding: '10px 0' }}
                rows="2"
              />

              {selectedFile && (
                <div style={{ marginBottom: '10px', fontSize: '14px', backgroundColor: 'var(--bg-input)', padding: '10px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-main)' }}>
                  <span>📎 {selectedFile.name}</span>
                  <span style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setSelectedFile(null)}>✕</span>
                </div>
              )}

              <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                {location && (
                  <div style={tagStyle}>
                    <span>📍</span><span>{location.placeName}</span>
                    <span onClick={() => setLocation(null)} style={{ cursor: 'pointer', marginLeft: '2px' }}>✕</span>
                  </div>
                )}
                {locationLoading && (
                  <div style={tagStyle}><span>🔄</span><span>Mencari lokasi...</span></div>
                )}
                {scheduledFor && (
                  <div style={tagStyle}>
                    <span>📅</span><span>Dijadual: {formatScheduled(scheduledFor)}</span>
                    <span onClick={handleClearSchedule} style={{ cursor: 'pointer', marginLeft: '2px' }}>✕</span>
                  </div>
                )}
              </div>

              {showPoll && (
                <div style={{ marginBottom: '15px', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', color: 'var(--text-main)', fontSize: '15px' }}>📊 Buat Poll</span>
                    <span onClick={handleTogglePoll} style={{ cursor: 'pointer' }}>✕</span>
                  </div>
                  {pollOptions.map((option, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input type="text" value={option} onChange={(e) => handlePollOptionChange(index, e.target.value)} placeholder={`Pilihan ${index + 1}`} style={pollInputStyle} />
                    </div>
                  ))}
                  {pollOptions.length < 4 && (
                    <button type="button" onClick={handleAddPollOption} style={{ alignSelf: 'flex-start', background: 'none', border: '1px dashed var(--border-color)', color: 'var(--roti-canai)', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}>+ Tambah Pilihan</button>
                  )}
                </div>
              )}

              <hr style={{ borderColor: 'var(--border-color)', margin: '10px 0', borderTop: 'none' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                <div style={{ display: 'flex', gap: '15px', color: 'var(--roti-canai)', fontSize: '18px', alignItems: 'center' }}>
                  <label style={{ cursor: 'pointer', opacity: showPoll ? 0.4 : 1 }}><input type="file" disabled={showPoll} onChange={(e) => setSelectedFile(e.target.files[0])} style={{ display: 'none' }} />🖼️</label>
                  <span onClick={() => !selectedFile && handleTogglePoll()} style={{ cursor: 'pointer', opacity: selectedFile ? 0.4 : 1 }}>📊</span>
                  <div ref={emojiPickerRef} style={{ position: 'relative' }}>
                    <span onClick={handleEmojiButtonClick} style={{ cursor: 'pointer' }}>😊</span>
                    {showEmojiPicker && (
                      <div style={{ position: 'absolute', bottom: '35px', left: '0', zIndex: 100 }}>
                        <EmojiPicker onEmojiClick={handleEmojiClick} height={380} width={320} />
                      </div>
                    )}
                  </div>
                  <div ref={schedulePickerRef} style={{ position: 'relative' }}>
                    <span onClick={() => setShowSchedulePicker(prev => !prev)} style={{ cursor: 'pointer' }}>📅</span>
                    {showSchedulePicker && (
                      <div style={{ position: 'absolute', bottom: '35px', left: '0', zIndex: 100, backgroundColor: 'var(--bg-card)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <input type="datetime-local" value={scheduledFor} min={minSchedule} onChange={(e) => setScheduledFor(e.target.value)} />
                        <button type="button" onClick={handleScheduleConfirm}>OK</button>
                      </div>
                    )}
                  </div>
                  <span onClick={handleLocationClick} style={{ cursor: 'pointer' }}>📍</span>
                </div>
                <button type="submit" disabled={!canSubmit} style={{ backgroundColor: 'var(--roti-canai)', borderRadius: '30px', padding: '8px 20px', fontWeight: 'bold', cursor: canSubmit ? 'pointer' : 'not-allowed' }}>
                  {isPosting ? 'Masak...' : scheduledFor ? '📅 Jadual' : 'Borak'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* 🚀 FEED WITH INFINITE SCROLL */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {isLoading && page === 1 ? (
            <><PostSkeleton /><PostSkeleton /><PostSkeleton /></>
          ) : posts.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada borak lagi.</p>
          ) : (
            <>
              {posts.map((post, index) => {
                if (posts.length === index + 1) {
                  return (
                    <div ref={lastPostElementRef} key={post._id}>
                      <PostCard post={post} currentUserId={currentUserId} token={token} />
                    </div>
                  );
                } else {
                  return <PostCard key={post._id} post={post} currentUserId={currentUserId} token={token} />;
                }
              })}
              {isFetchingNextPage && <PostSkeleton />}
              {!hasMore && posts.length > 0 && (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', marginTop: '20px' }}>Anda sudah sampai ke penghujung borak. ☕</p>
              )}
            </>
          )}
        </div>

      </div>

      <div className="trending-sidebar-mobile-hide">
        <TrendingSidebar />
      </div>
    </div>
  );
}

export default Home;