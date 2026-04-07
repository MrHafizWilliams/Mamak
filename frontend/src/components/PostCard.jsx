import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast'; 

// Connect to the backend socket
const socket = io("http://localhost:5000");

function PostCard({ post, currentUserId, token }) {
  const [isFollowing, setIsFollowing] = useState(post.userId?.followers?.includes(currentUserId) || false);
  const [likes, setLikes] = useState(post.likes || []);
  const [isLiked, setIsLiked] = useState(post.likes?.includes(currentUserId) || false);
  const [reshares, setReshares] = useState(post.resharedBy || []);
  const [isReshared, setIsReshared] = useState(post.resharedBy?.includes(currentUserId) || false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState(post.comments || []);
  const [newComment, setNewComment] = useState('');
  const [poll, setPoll] = useState(post.poll || null);

  // --- STATE BARU ---
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(post.savedBy?.includes(currentUserId) || false);

  const totalVotes = poll ? poll.options.reduce((sum, opt) => sum + opt.votes.length, 0) : 0;
  const userVotedOptionId = poll ? poll.options.find(opt => opt.votes.includes(currentUserId))?._id : null;
  const isPollExpired = poll?.expiresAt ? new Date() > new Date(poll.expiresAt) : false;
  const showResults = !!userVotedOptionId || isPollExpired;

  // --- FUNGSI SEDIA ADA ---
  const handleFollow = async () => {
    try {
      const res = await axios.put(`http://localhost:5000/api/users/${post.userId._id}/follow`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setIsFollowing(res.data.isFollowing);
    } catch (err) { console.error(err); }
  };

  const handleLike = async () => {
    try {
      const res = await axios.put(`http://localhost:5000/api/posts/${post._id}/like`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setLikes(res.data);
      const nowLiked = res.data.includes(currentUserId);
      setIsLiked(nowLiked);

      if (nowLiked && post.userId._id !== currentUserId) {
        socket.emit('send_notification', { recipientId: post.userId._id, senderId: currentUserId, type: 'like', postId: post._id });
      }
    } catch (err) { console.error(err); }
  };

  const handleReshare = async () => {
    try {
      const res = await axios.put(`http://localhost:5000/api/posts/${post._id}/reshare`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setReshares(res.data);
      setIsReshared(res.data.includes(currentUserId));
    } catch (err) { console.error(err); }
  };

  const handleDelete = async () => {
    if (!window.confirm("Biar betul nak delete borak ni boss?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/posts/${post._id}`, { headers: { Authorization: `Bearer ${token}` } });
      window.location.reload();
    } catch (err) { toast.error("Gagal padam post. Cuba lagi."); }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const res = await axios.post(`http://localhost:5000/api/posts/${post._id}/comment`, { content: newComment }, { headers: { Authorization: `Bearer ${token}` } });
      setComments(prev => [...prev, res.data]);
      setNewComment('');

      if (post.userId._id !== currentUserId) {
        socket.emit('send_notification', { recipientId: post.userId._id, senderId: currentUserId, type: 'comment', postId: post._id });
      }
    } catch (err) { console.error(err); }
  };

  const handleVote = async (optionId) => {
    if (showResults) return;
    try {
      const res = await axios.put(`http://localhost:5000/api/posts/${post._id}/vote`, { optionId }, { headers: { Authorization: `Bearer ${token}` } });
      setPoll(res.data);
    } catch (err) { console.error("Gagal undi poll:", err); }
  };

  const getPercent = (optVotes) => totalVotes === 0 ? 0 : Math.round((optVotes / totalVotes) * 100);

  const handleCloseLightbox = (e) => {
    if (e.target.id === 'lightbox-overlay' || e.target.id === 'close-btn') setIsLightboxOpen(false);
  };

  // --- FUNGSI BARU: SHARE & SAVE ---
  const handleShare = async () => {
    const postUrl = `${window.location.origin}/post/${post._id}`; 
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Borak dari @${post.userId?.username} di Mamak`,
          text: post.content ? post.content.substring(0, 50) + '...' : 'Tengok borak ni!',
          url: postUrl
        });
      } catch (err) {
        console.log('Share dibatalkan pengguna');
      }
    } else {
      navigator.clipboard.writeText(postUrl);
      toast.success("Link borak berjaya disalin! 🔗");
    }
  };

  const handleSave = async () => {
    try {
      const newSaveState = !isSaved;
      setIsSaved(newSaveState);
      
      if (newSaveState) {
        toast.success("Borak disimpan di meja anda! 🔖");
      } else {
        toast("Borak dibuang dari simpanan.", { icon: '🗑️' });
      }

      await axios.put(`http://localhost:5000/api/posts/${post._id}/save`, {}, { headers: { Authorization: `Bearer ${token}` } });
    } catch (err) {
      setIsSaved(!isSaved);
      toast.error("Alamak, masalah server. Tak dapat simpan.");
    }
  };

  // ==========================================
  // FUNGSI KESAN HASHTAG (#) & MENTION (@)
  // ==========================================
  const formatContent = (text) => {
    if (!text) return text;
    
    // Pecahkan teks berdasarkan perkataan yang bermula dengan # atau @
    const parts = text.split(/([@#][\w]+)/g);
    
    return parts.map((part, index) => {
      // Jika ia adalah HASHTAG
      if (part.startsWith('#')) {
        return (
          <Link key={index} to={`/search?q=${encodeURIComponent(part)}`} style={{ color: 'var(--roti-canai)', textDecoration: 'none', fontWeight: 'bold' }}>
            {part}
          </Link>
        );
      } 
      // Jika ia adalah MENTION (Sebutan)
      else if (part.startsWith('@')) {
        const usernameOnly = part.substring(1); // Buang simbol @ untuk url profil
        return (
          <Link key={index} to={`/profile/${usernameOnly}`} style={{ color: 'var(--sirap-bandung)', textDecoration: 'none', fontWeight: 'bold' }}>
            {part}
          </Link>
        );
      }
      // Kembalikan teks biasa
      return part;
    });
  };

  return (
    <>
      <div className="post-card" style={{ backgroundColor: 'var(--bg-card)', padding: '20px', borderRadius: '15px', border: '1px solid var(--border-color)', marginBottom: '15px' }}>
        
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
          <Link to={`/profile/${post.userId?.username}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'inherit' }}>
            {post.userId?.profilePic ? (
              <img src={post.userId.profilePic} alt="avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'var(--text-main)' }}>
                {post.userId?.username?.charAt(0).toUpperCase() || '?'}
              </div>
            )}
            <div>
              <strong style={{ display: 'block', color: 'var(--text-main)' }}>@{post.userId?.username || 'Unknown'}</strong>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {new Date(post.createdAt).toLocaleDateString('ms-MY', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </Link>
          <div>
            {post.userId?._id !== currentUserId ? (
              <button onClick={handleFollow} style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '12px', border: isFollowing ? '1px solid var(--text-muted)' : 'none', backgroundColor: isFollowing ? 'transparent' : 'var(--text-main)', color: isFollowing ? 'var(--text-main)' : 'var(--bg-main)', fontWeight: 'bold', cursor: 'pointer' }}>
                {isFollowing ? 'Unfollow' : 'Follow'}
              </button>
            ) : (
              <button onClick={handleDelete} style={{ background: 'none', border: 'none', color: 'var(--sambal)', cursor: 'pointer', fontSize: '16px', padding: '5px' }}>🗑️</button>
            )}
          </div>
        </div>

        {/* CONTENT & MEDIA */}
        {/* 👇 DI SINI PERUBAHANNYA: Menggunakan formatContent(post.content) */}
        {post.content && (
          <p style={{ marginTop: '5px', whiteSpace: 'pre-wrap', lineHeight: '1.5', color: 'var(--text-main)' }}>
            {formatContent(post.content)}
          </p>
        )}
        
        {post.mediaUrl && (
          <div style={{ marginTop: '15px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
            {post.mediaType === 'image' && (
              <img src={post.mediaUrl} alt="media" onClick={() => setIsLightboxOpen(true)} style={{ width: '100%', maxHeight: '500px', objectFit: 'cover', display: 'block', backgroundColor: 'var(--bg-input)', cursor: 'zoom-in', transition: 'transform 0.2s ease-in-out' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'} />
            )}
            {post.mediaType === 'video' && <video src={post.mediaUrl} controls style={{ width: '100%', maxHeight: '500px', display: 'block', backgroundColor: 'var(--bg-input)' }} />}
          </div>
        )}

        {/* LOCATION & POLL */}
        {post.location?.placeName && (
          <div style={{ marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '5px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '4px 12px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <span>📍</span><span>{post.location.placeName}</span>
          </div>
        )}

        {/* ── ACTION BUTTONS ROW ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px' }}>
          
          {/* BAHAGIAN KIRI: Like, Reshare, Komen */}
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span onClick={handleLike} title="Suka" style={{ cursor: 'pointer', color: isLiked ? 'var(--sirap-bandung)' : 'var(--text-muted)', fontSize: '18px', transition: 'transform 0.2s', display: 'inline-block', transform: isLiked ? 'scale(1.15)' : 'scale(1)' }}>{isLiked ? '❤️' : '🤍'}</span>
              <span style={{ fontSize: '14px', color: isLiked ? 'var(--sirap-bandung)' : 'var(--text-muted)', fontWeight: isLiked ? 'bold' : 'normal' }}>{likes.length}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span onClick={handleReshare} title="Reshare" style={{ cursor: 'pointer', color: isReshared ? 'var(--pandan)' : 'var(--text-muted)', fontSize: '18px', transition: 'transform 0.2s', display: 'inline-block', transform: isReshared ? 'scale(1.15)' : 'scale(1)' }}>🔁</span>
              <span style={{ fontSize: '14px', color: isReshared ? 'var(--pandan)' : 'var(--text-muted)', fontWeight: isReshared ? 'bold' : 'normal' }}>{reshares.length}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span onClick={() => setShowComments(!showComments)} title="Komen" style={{ cursor: 'pointer', color: showComments ? 'var(--roti-canai)' : 'var(--text-muted)', fontSize: '18px', transition: 'transform 0.2s', display: 'inline-block', transform: showComments ? 'scale(1.15)' : 'scale(1)' }}>💬</span>
              <span style={{ fontSize: '14px', color: showComments ? 'var(--roti-canai)' : 'var(--text-muted)', fontWeight: showComments ? 'bold' : 'normal' }}>{comments.length}</span>
            </div>
          </div>

          {/* BAHAGIAN KANAN: Share & Save */}
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <span 
              onClick={handleShare} 
              title="Kongsi Borak"
              style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: '18px', transition: 'transform 0.2s, color 0.2s', display: 'inline-block' }}
              onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.15)'; e.currentTarget.style.color = 'var(--text-main)'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              📤
            </span>
            <span 
              onClick={handleSave} 
              title={isSaved ? "Buang dari simpanan" : "Simpan Borak"}
              style={{ cursor: 'pointer', color: isSaved ? 'var(--roti-canai)' : 'var(--text-muted)', fontSize: '18px', transition: 'transform 0.2s', display: 'inline-block', transform: isSaved ? 'scale(1.15)' : 'scale(1)' }}
              onMouseOver={(e) => { if(!isSaved) { e.currentTarget.style.transform = 'scale(1.15)'; e.currentTarget.style.color = 'var(--roti-canai)'; } }}
              onMouseOut={(e) => { if(!isSaved) { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.color = 'var(--text-muted)'; } }}
            >
              {isSaved ? '🔖' : '📑'}
            </span>
          </div>

        </div>

        {/* COMMENTS SECTION */}
        {showComments && (
          <div style={{ marginTop: '20px', backgroundColor: 'var(--bg-input)', padding: '15px', borderRadius: '10px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '15px' }}>
              {comments.map((comment, index) => (
                <div key={comment._id || index} style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', border: '1px solid var(--border-color)', flexShrink: 0 }}>
                    {comment.userId?.username?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div style={{ backgroundColor: 'var(--bg-card)', padding: '10px 15px', borderRadius: '0 15px 15px 15px', flex: 1, border: '1px solid var(--border-color)' }}>
                    <strong style={{ fontSize: '13px', color: 'var(--text-main)' }}>@{comment.userId?.username || 'Unknown'}</strong>
                    <p style={{ fontSize: '14px', margin: 0 }}>
                      {/* Boleh juga letak formatContent(comment.content) di sini kalau nak hashtag dalam komen */}
                      {formatContent(comment.content || comment.text)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={handleCommentSubmit} style={{ display: 'flex', gap: '10px' }}>
              <input type="text" placeholder="Tulis komen..." value={newComment} onChange={(e) => setNewComment(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '20px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none', fontSize: '13px' }} />
              <button type="submit" style={{ padding: '8px 15px', backgroundColor: 'var(--roti-canai)', color: '#000', border: 'none', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer' }}>Hantar</button>
            </form>
          </div>
        )}
      </div>

      {/* LIGHTBOX OVERLAY */}
      {isLightboxOpen && post.mediaType === 'image' && (
        <div id="lightbox-overlay" onClick={handleCloseLightbox} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.9)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'zoom-out' }}>
          <button id="close-btn" onClick={() => setIsLightboxOpen(false)} style={{ position: 'absolute', top: '20px', right: '30px', background: 'none', border: 'none', color: '#fff', fontSize: '40px', cursor: 'pointer', zIndex: 10000, textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>&times;</button>
          <img src={post.mediaUrl} alt="Fullscreen" style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 10px 40px rgba(0,0,0,0.8)', cursor: 'default' }} onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}

export default PostCard;