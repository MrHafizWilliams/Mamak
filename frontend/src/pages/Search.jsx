import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import TrendingSidebar from '../components/TrendingSidebar';
import PostCard from '../components/PostCard';

function Search() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  
  // Asingkan state untuk users dan posts
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const currentUserId = localStorage.getItem('userId');
  const currentUsername = localStorage.getItem('username');
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!query) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const res = await axios.get(`http://localhost:5000/api/posts/search/all?q=${encodeURIComponent(query)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Simpan data dalam state masing-masing
        setUsers(res.data.users);
        setPosts(res.data.posts);
      } catch (err) {
        console.error("Gagal cari:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSearchResults();
  }, [query, token]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', maxWidth: '1200px', margin: '0 auto' }}>
      <Sidebar currentUsername={currentUsername} />
      
      <div style={{ flex: 1, borderRight: '1px solid var(--border-color)', minHeight: '100vh' }}>
        {/* Header */}
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, backgroundColor: 'rgba(var(--bg-main-rgb), 0.85)', backdropFilter: 'blur(10px)', zIndex: 10 }}>
          <h2 style={{ margin: 0, fontSize: '20px' }}>
            Carian: <span style={{ color: 'var(--roti-canai)' }}>{query}</span>
          </h2>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {loading ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Mencari maklumat...</p>
          ) : (
            <>
              {/* SECTION: MATCHING USERS */}
              {users.length > 0 && (
                <div>
                  <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginTop: 0 }}>👥 Pengguna</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
                    {users.map(user => (
                      <Link to={`/profile/${user.username}`} key={user._id} style={{ display: 'flex', alignItems: 'center', gap: '15px', textDecoration: 'none', backgroundColor: 'var(--bg-card)', padding: '15px', borderRadius: '15px', border: '1px solid var(--border-color)' }}>
                        {user.profilePic ? (
                          <img src={user.profilePic} alt={user.username} style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'var(--text-main)', fontSize: '20px' }}>
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div style={{ flex: 1 }}>
                          <strong style={{ display: 'block', color: 'var(--text-main)', fontSize: '16px' }}>{user.username}</strong>
                          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{user.followers?.length || 0} Followers</span>
                          {user.bio && <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: 'var(--text-main)' }}>{user.bio}</p>}
                        </div>
                        <button style={{ padding: '8px 16px', backgroundColor: 'var(--text-main)', color: 'var(--bg-main)', border: 'none', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer' }}>
                          Lihat Profil
                        </button>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION: MATCHING POSTS */}
              {posts.length > 0 && (
                <div>
                  <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginTop: 0 }}>💬 Borak</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '15px' }}>
                    {posts.map(post => (
                      <PostCard key={post._id} post={post} currentUserId={currentUserId} token={token} />
                    ))}
                  </div>
                </div>
              )}

              {/* NO RESULTS AT ALL */}
              {users.length === 0 && posts.length === 0 && (
                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                  <h3 style={{ color: 'var(--text-main)', marginBottom: '10px' }}>Tiada hasil dijumpai</h3>
                  <p style={{ color: 'var(--text-muted)' }}>Cuba cari dengan kata kunci atau nama lain.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <TrendingSidebar />
    </div>
  );
}

export default Search;