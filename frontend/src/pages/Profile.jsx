import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // 👈 Tambah useNavigate
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import PostCard from '../components/PostCard';
import toast from 'react-hot-toast'; // 👈 Tambah toast

function Profile() {
  const { username } = useParams(); 
  const navigate = useNavigate(); // 👈 Inisialisasi navigasi

  const [profileUser, setProfileUser] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [resharedPosts, setResharedPosts] = useState([]); 
  const [savedPosts, setSavedPosts] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  // ── Tab State & Follow State ──
  const [activeTab, setActiveTab] = useState('borak'); 
  const [isFollowing, setIsFollowing] = useState(false);

  // ── Edit Modal State ──
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({ username: '', bio: '' });
  const [newProfilePic, setNewProfilePic] = useState(null);
  const [newCoverPic, setNewCoverPic] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const currentUserId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');
  const currentUsername = localStorage.getItem('username');

  const isOwnProfile = profileUser && profileUser._id === currentUserId;

  // ==========================================
  // FETCH PROFILE DATA
  // ==========================================
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        // 1. Fetch public profile data
        const res = await axios.get(`http://localhost:5000/api/users/${username}`);
        
        setProfileUser(res.data.user);
        setEditData({ username: res.data.user.username, bio: res.data.user.bio || '' });
        setUserPosts(res.data.posts);
        setResharedPosts(res.data.resharedPosts);
        setIsFollowing(res.data.user.followers.includes(currentUserId));

        // 2. SECURE FETCH: Only fetch saved posts if we are viewing our OWN profile
        if (res.data.user._id === currentUserId) {
          const savedRes = await axios.get('http://localhost:5000/api/users/saved/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setSavedPosts(savedRes.data);
        }

      } catch (err) {
        console.error("Gagal tarik profil:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [username, currentUserId, token]);

  // ==========================================
  // HANDLE FOLLOW / UNFOLLOW
  // ==========================================
  const handleFollow = async () => {
    try {
      const res = await axios.put(`http://localhost:5000/api/users/${profileUser._id}/follow`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsFollowing(res.data.isFollowing);
      
      if (res.data.isFollowing) {
        setProfileUser(prev => ({ ...prev, followers: [...prev.followers, currentUserId] }));
      } else {
        setProfileUser(prev => ({ ...prev, followers: prev.followers.filter(id => id !== currentUserId) }));
      }
    } catch (err) {
      console.error("Gagal follow:", err);
    }
  };

  // ==========================================
  // HANDLE MESEJ KAWAN (BARU) ✉️
  // ==========================================
  const handleMessageClick = async () => {
    try {
      // 1. Cipta atau dapatkan bilik sembang dengan pengguna ini
      await axios.post('http://localhost:5000/api/messages/conversations', 
        { receiverId: profileUser._id }, 
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      // 2. Bawa terus ke halaman Sembang
      navigate('/sembang');
    } catch (err) {
      toast.error("Gagal membuka ruang sembang.");
    }
  };

  // ==========================================
  // CLOUDINARY UPLOAD HELPER 
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
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error.message);

      return data.secure_url;
    } catch (err) {
      console.error("Punca Gagal Upload:", err.message);
      alert(`Gagal upload gambar: ${err.message}`);
      return null;
    }
  };

  // ==========================================
  // HANDLE SAVE PROFILE
  // ==========================================
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      let finalProfilePic = profileUser.profilePic;
      let finalCoverPic = profileUser.coverPic;

      if (newProfilePic) {
        const uploadedPfp = await uploadImage(newProfilePic);
        if (uploadedPfp) finalProfilePic = uploadedPfp;
      }

      if (newCoverPic) {
        const uploadedCover = await uploadImage(newCoverPic);
        if (uploadedCover) finalCoverPic = uploadedCover;
      }

      const res = await axios.put('http://localhost:5000/api/users/profile', {
        username: editData.username,
        bio: editData.bio,
        profilePic: finalProfilePic,
        coverPic: finalCoverPic
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (editData.username !== currentUsername) {
        localStorage.setItem('username', editData.username);
      }
      if (finalProfilePic) {
        localStorage.setItem('profilePic', finalProfilePic);
      }

      setProfileUser(res.data);
      setShowEditModal(false);
      
      if (editData.username !== username) {
        window.location.href = `/profile/${editData.username}`;
      }

    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Gagal kemaskini profil.");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Styling Helper untuk Tabs ──
  const tabStyle = (isActive) => ({
    flex: 1,
    textAlign: 'center',
    padding: '15px 0',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '15px',
    color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
    borderBottom: isActive ? '4px solid var(--roti-canai)' : '4px solid transparent',
    transition: 'all 0.2s ease',
    backgroundColor: isActive ? 'rgba(255, 255, 255, 0.03)' : 'transparent'
  });

  if (loading) return <div style={{ textAlign: 'center', marginTop: '50px', color: 'var(--text-main)' }}>Loading Profile...</div>;
  if (!profileUser) return <h2 style={{ textAlign: 'center', color: 'var(--text-main)' }}>Pengguna tidak dijumpai 🕵️‍♂️</h2>;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', maxWidth: '1200px', margin: '0 auto' }}>
      <Sidebar currentUsername={localStorage.getItem('username')} />

      <div style={{ flex: 1, borderRight: '1px solid var(--border-color)', minHeight: '100vh' }}>
        
        {/* ================= HEADER / COVER AREA ================= */}
        <div style={{ position: 'relative', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ 
            height: '200px', backgroundColor: 'var(--bg-input)', 
            backgroundImage: profileUser.coverPic ? `url(${profileUser.coverPic})` : 'none', 
            backgroundSize: 'cover', backgroundPosition: 'center' 
          }}></div>
          
          <div style={{ padding: '20px', position: 'relative' }}>
            <div style={{ 
              width: '120px', height: '120px', borderRadius: '50%', border: '4px solid var(--bg-main)', 
              backgroundColor: 'var(--bg-input)', marginTop: '-80px', display: 'flex', alignItems: 'center', 
              justifyContent: 'center', fontSize: '40px', fontWeight: 'bold', overflow: 'hidden', zIndex: 2, position: 'relative'
            }}>
              {profileUser.profilePic ? (
                <img src={profileUser.profilePic} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                profileUser.username.charAt(0).toUpperCase()
              )}
            </div>

            {/* ACTION BUTTONS */}
            <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
              {isOwnProfile ? (
                <button 
                  onClick={() => setShowEditModal(true)}
                  style={{ padding: '8px 20px', borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                >
                  Edit Profil
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '10px' }}>
                  {/* 👈 Butang Mesej Baru */}
                  <button 
                    onClick={handleMessageClick}
                    style={{ padding: '8px 15px', borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '5px', transition: 'background 0.2s' }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-input)'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    ✉️ Mesej
                  </button>

                  <button 
                    onClick={handleFollow}
                    style={{ padding: '8px 20px', borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: isFollowing ? 'transparent' : 'var(--text-main)', color: isFollowing ? 'var(--text-main)' : 'var(--bg-main)', border: isFollowing ? '1px solid var(--border-color)' : 'none' }}
                  >
                    {isFollowing ? 'Unfollow' : 'Follow'}
                  </button>
                </div>
              )}
            </div>

            <div style={{ marginTop: '10px' }}>
              <h1 style={{ margin: '0', fontSize: '24px' }}>{profileUser.username}</h1>
              <p style={{ margin: '10px 0', color: 'var(--text-main)', fontSize: '15px' }}>{profileUser.bio || "Tiada bio lagi."}</p>
              
              <div style={{ display: 'flex', gap: '20px', color: 'var(--text-muted)', fontSize: '14px', marginTop: '15px' }}>
                <span><strong style={{ color: 'var(--text-main)' }}>{profileUser.following?.length || 0}</strong> Following</span>
                <span><strong style={{ color: 'var(--text-main)' }}>{profileUser.followers?.length || 0}</strong> Followers</span>
              </div>
            </div>
          </div>
        </div>

        {/* ================= TABS NAVIGATION ================= */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
          <div style={tabStyle(activeTab === 'borak')} onClick={() => setActiveTab('borak')}>
            💬 Borak ({userPosts.length})
          </div>
          <div style={tabStyle(activeTab === 'reshare')} onClick={() => setActiveTab('reshare')}>
            🔁 Reshare ({resharedPosts.length})
          </div>
          {/* PRIVATE TAB: Only visible if you are looking at your own profile */}
          {isOwnProfile && (
            <div style={tabStyle(activeTab === 'saved')} onClick={() => setActiveTab('saved')}>
              🔒 Simpanan ({savedPosts.length})
            </div>
          )}
        </div>

        {/* ================= TIMELINE CONTENT ================= */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          {/* TAB: BORAK */}
          {activeTab === 'borak' && (
            userPosts.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '20px' }}>Belum ada borak lagi.</p>
            ) : (
              userPosts.map(post => <PostCard key={post._id} post={post} currentUserId={currentUserId} token={token} />)
            )
          )}

          {/* TAB: RESHARE */}
          {activeTab === 'reshare' && (
            resharedPosts.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '20px' }}>Belum ada borak yang di-reshare.</p>
            ) : (
              resharedPosts.map(post => (
                <div key={post._id} style={{ position: 'relative' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '10px', fontWeight: '500' }}>
                    <span>🔁</span> {isOwnProfile ? 'Anda' : `@${profileUser.username}`} reshare borak ini
                  </div>
                  <PostCard post={post} currentUserId={currentUserId} token={token} />
                </div>
              ))
            )
          )}

          {/* TAB: SAVED (PRIVATE) */}
          {activeTab === 'saved' && isOwnProfile && (
            savedPosts.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '20px' }}>
                <span style={{ fontSize: '40px', display: 'block', marginBottom: '10px' }}>🔖</span>
                <p>Belum ada borak yang disimpan.<br/>Tekan ikon 🔖 pada borak untuk simpan secara peribadi di sini.</p>
              </div>
            ) : (
              savedPosts.map(post => (
                <div key={post._id} style={{ position: 'relative' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '10px', fontWeight: '500' }}>
                    <span>🔒</span> Disimpan secara peribadi
                  </div>
                  <PostCard post={post} currentUserId={currentUserId} token={token} />
                </div>
              ))
            )
          )}
        </div>

      </div>

      {/* ================= EDIT PROFILE MODAL ================= */}
      {showEditModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', width: '100%', maxWidth: '500px', borderRadius: '15px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
            
            <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Kemaskini Profil</h3>
              <span onClick={() => setShowEditModal(false)} style={{ cursor: 'pointer', fontSize: '20px' }}>✕</span>
            </div>

            <form onSubmit={handleSaveProfile}>
              <label style={{ display: 'block', position: 'relative', height: '150px', backgroundColor: 'var(--bg-input)', cursor: 'pointer', backgroundImage: newCoverPic ? `url(${URL.createObjectURL(newCoverPic)})` : (profileUser.coverPic ? `url(${profileUser.coverPic})` : 'none'), backgroundSize: 'cover', backgroundPosition: 'center' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }} onMouseOver={(e) => e.currentTarget.style.opacity = 1} onMouseOut={(e) => e.currentTarget.style.opacity = 0}>
                  📷 Tukar Cover
                </div>
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => setNewCoverPic(e.target.files[0])} />
              </label>

              <div style={{ padding: '0 20px', position: 'relative' }}>
                <label style={{ display: 'block', width: '90px', height: '90px', borderRadius: '50%', backgroundColor: 'var(--bg-input)', border: '4px solid var(--bg-card)', marginTop: '-45px', position: 'relative', cursor: 'pointer', overflow: 'hidden', zIndex: 2 }}>
                  {newProfilePic ? (
                    <img src={URL.createObjectURL(newProfilePic)} alt="New Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : profileUser.profilePic ? (
                    <img src={profileUser.profilePic} alt="Current Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px' }}>{profileUser.username.charAt(0)}</div>
                  )}
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: '#fff', opacity: 0, transition: 'opacity 0.2s' }} onMouseOver={(e) => e.currentTarget.style.opacity = 1} onMouseOut={(e) => e.currentTarget.style.opacity = 0}>📷</div>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => setNewProfilePic(e.target.files[0])} />
                </label>
              </div>

              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-muted)' }}>Username</label>
                  <input 
                    type="text" 
                    value={editData.username} 
                    onChange={(e) => setEditData({...editData, username: e.target.value})}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', boxSizing: 'border-box' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-muted)' }}>Bio</label>
                  <textarea 
                    value={editData.bio} 
                    onChange={(e) => setEditData({...editData, bio: e.target.value})}
                    rows="3"
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', boxSizing: 'border-box', resize: 'none' }}
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={isSaving}
                  style={{ marginTop: '10px', width: '100%', padding: '12px', borderRadius: '30px', border: 'none', backgroundColor: 'var(--text-main)', color: 'var(--bg-main)', fontWeight: 'bold', fontSize: '16px', cursor: isSaving ? 'wait' : 'pointer', opacity: isSaving ? 0.7 : 1 }}
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan Profil'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}

export default Profile;