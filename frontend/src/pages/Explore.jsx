import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TrendingSidebar from '../components/TrendingSidebar';
import PostCard from '../components/PostCard'; // Pastikan komponen ini wujud
import toast from 'react-hot-toast';

function Explore() {
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [trendingPosts, setTrendingPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const currentUsername = localStorage.getItem('username');
  const token = localStorage.getItem('token');
  const currentUserId = localStorage.getItem('userId');

  // ==========================================
  // FETCH DATA: SUGGESTIONS & TRENDING
  // ==========================================
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Tarik data serentak (Parallel fetching untuk lebih pantas)
        const [usersRes, postsRes] = await Promise.all([
          axios.get('http://localhost:5000/api/users/suggested/all', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('http://localhost:5000/api/posts/explore/trending', { headers: { Authorization: `Bearer ${token}` } })
        ]);

        setSuggestedUsers(usersRes.data);
        setTrendingPosts(postsRes.data);
      } catch (err) {
        console.error("Gagal tarik data Explore:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  // ==========================================
  // HANDLE FOLLOW ACTION DARI SUGGESTION
  // ==========================================
  const handleFollow = async (userId, targetUsername) => {
    try {
      await axios.put(`http://localhost:5000/api/users/${userId}/follow`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(`Berjaya follow ${targetUsername}!`);
      // Buang user tersebut dari senarai cadangan selepas di-follow
      setSuggestedUsers(prev => prev.filter(user => user._id !== userId));
    } catch (err) {
      toast.error("Gagal follow pengguna ini.");
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', fontFamily: "'Poppins', sans-serif" }}>
      <Sidebar currentUsername={currentUsername} />
      
      <div className="main-feed-mobile" style={{ flex: 1, borderRight: '1px solid var(--border-color)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* HEADER EXPORE */}
        <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, backgroundColor: 'rgba(21, 32, 43, 0.85)', backdropFilter: 'blur(10px)', zIndex: 10 }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>Teroka (Explore) 🌍</h2>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Mencari topik panas... ⏳</div>
        ) : (
          <div style={{ padding: '20px' }}>
            
            {/* BAHAGIAN 1: CADANGAN KAWAN (WHO TO FOLLOW) */}
            {suggestedUsers.length > 0 && (
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ fontSize: '16px', marginBottom: '15px', color: 'var(--text-muted)' }}>Mungkin Anda Kenal 🤝</h3>
                
                {/* Horizontal Scroll Box */}
                <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '10px', scrollbarWidth: 'thin' }}>
                  {suggestedUsers.map(user => (
                    <div key={user._id} style={{ minWidth: '140px', backgroundColor: 'var(--bg-card)', padding: '15px', borderRadius: '15px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                      <Link to={`/profile/${user.username}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <img 
                          src={user.profilePic || 'https://via.placeholder.com/60'} 
                          alt={user.username} 
                          style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', marginBottom: '10px', border: '2px solid var(--bg-input)' }} 
                        />
                        <span style={{ fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100px' }}>
                          {user.username}
                        </span>
                      </Link>
                      <button 
                        onClick={() => handleFollow(user._id, user.username)}
                        style={{ marginTop: '10px', padding: '6px 15px', borderRadius: '20px', backgroundColor: 'var(--text-main)', color: 'var(--bg-main)', border: 'none', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', transition: 'transform 0.2s' }}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        Follow
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* BAHAGIAN 2: TOPIK PANAS (TRENDING POSTS) */}
            <div>
              <h3 style={{ fontSize: '16px', marginBottom: '15px', color: 'var(--text-muted)' }}>Topik Panas 🔥</h3>
              
              {trendingPosts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <span style={{ fontSize: '40px', display: 'block', marginBottom: '10px' }}>🍃</span>
                  Belum ada topik yang panas hari ini.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {trendingPosts.map((post, index) => (
                    <div key={post._id} style={{ position: 'relative' }}>
                      {/* Lencana Ranking */}
                      <div style={{ position: 'absolute', top: '15px', right: '20px', fontSize: '24px', opacity: 0.2, fontWeight: 'bold', zIndex: 0 }}>
                        #{index + 1}
                      </div>
                      <PostCard post={post} currentUserId={currentUserId} token={token} />
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      <div className="trending-sidebar-mobile-hide">
        <TrendingSidebar />
      </div>
    </div>
  );
}

export default Explore;