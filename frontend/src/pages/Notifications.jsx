import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import TrendingSidebar from '../components/TrendingSidebar';
import toast from 'react-hot-toast';

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const token = localStorage.getItem('token');
  const currentUsername = localStorage.getItem('username');

  // ==========================================
  // FETCH NOTIFICATIONS
  // ==========================================
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/notifications', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setNotifications(res.data);
      } catch (err) {
        console.error("Gagal tarik notifikasi:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, [token]);

  // ==========================================
  // MARK ALL AS READ (Manual Action)
  // ==========================================
  const handleMarkAllRead = async () => {
    try {
      // Panggil backend untuk kemaskini database
      await axios.put('http://localhost:5000/api/notifications/read', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update UI serta-merta tanpa perlu refresh (Optimistic UI)
      setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
      toast.success("Semua notifikasi ditanda baca! 🧹");
    } catch (err) {
      toast.error("Gagal tandakan notifikasi.");
    }
  };

  // ==========================================
  // HELPER: Ikon & Warna (Diambil dari kod anda)
  // ==========================================
  const getIcon = (type) => {
    switch(type) {
      case 'like': return { icon: '❤️', color: 'var(--sirap-bandung)' };
      case 'comment': return { icon: '💬', color: 'var(--roti-canai)' };
      case 'follow': return { icon: '👤', color: 'var(--pandan)' };
      case 'mention': return { icon: '🏷️', color: '#1da1f2' };
      default: return { icon: '🔔', color: 'var(--text-main)' };
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', fontFamily: "'Poppins', sans-serif" }}>
      
      {/* KIRI: Sidebar Navigation */}
      <Sidebar currentUsername={currentUsername} />

      {/* TENGAH: Senarai Notifikasi */}
      <div className="main-feed-mobile" style={{ flex: 1, borderRight: '1px solid var(--border-color)', minHeight: '100vh' }}>
        
        {/* HEADER */}
        <div style={{ position: 'sticky', top: 0, backgroundColor: 'rgba(21, 32, 43, 0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--border-color)', zIndex: 10, padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>Loceng Mamak 🔔</h2>
          
          {/* Tunjuk butang ini hanya jika ada notifikasi yang belum dibaca */}
          {notifications.some(n => !n.read) && (
            <button 
              onClick={handleMarkAllRead}
              style={{ background: 'transparent', color: 'var(--roti-canai)', border: '1px solid var(--roti-canai)', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'var(--roti-canai)'; e.currentTarget.style.color = '#000'; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--roti-canai)'; }}
            >
              Tanda Semua Dibaca ✔️
            </button>
          )}
        </div>

        {/* SENARAI NOTIFIKASI */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Memeriksa loceng anda... ⏳</div>
          ) : notifications.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <span style={{ fontSize: '40px', display: 'block', marginBottom: '10px' }}>🔕</span>
              Tiada notifikasi baru buat masa ni.
            </div>
          ) : (
            notifications.map(notif => {
              const { icon, color } = getIcon(notif.type);
              
              // Tentukan pautan (link) bila diklik
              const linkTo = notif.type === 'follow' ? `/profile/${notif.sender.username}` : (notif.postId ? `/home` : `/profile/${notif.sender.username}`);

              return (
                <Link key={notif._id} to={linkTo} style={{ textDecoration: 'none' }}>
                  <div 
                    style={{ 
                      padding: '20px', 
                      borderBottom: '1px solid var(--border-color)', 
                      backgroundColor: notif.read ? 'transparent' : 'rgba(255, 200, 50, 0.05)', // Kekuningan sikit kalau belum baca
                      display: 'flex', 
                      gap: '15px',
                      transition: 'background-color 0.2s',
                      position: 'relative'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-input)'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = notif.read ? 'transparent' : 'rgba(255, 200, 50, 0.05)'}
                  >
                    {/* Unread Indicator Dot */}
                    {!notif.read && (
                      <div style={{ position: 'absolute', top: '25px', right: '20px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--roti-canai)' }}></div>
                    )}

                    {/* Ikon Tepi (Besar) */}
                    <div style={{ fontSize: '24px', width: '40px', textAlign: 'center' }}>
                      {icon}
                    </div>

                    {/* Kandungan Notifikasi */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <img 
                          src={notif.sender.profilePic || 'https://via.placeholder.com/40'} 
                          alt="user" 
                          style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${color}` }} 
                        />
                        <span style={{ color: 'var(--text-main)', fontWeight: 'bold' }}>{notif.sender.username}</span>
                      </div>
                      
                      <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '15px' }}>
                        {notif.type === 'like' && 'menyukai borak anda.'}
                        {notif.type === 'comment' && 'mengulas borak anda.'}
                        {notif.type === 'follow' && 'mula mengikuti (follow) anda.'}
                        {notif.type === 'mention' && 'memetik nama anda dalam satu borak.'}
                      </p>

                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                         {new Date(notif.createdAt).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                  </div>
                </Link>
              );
            })
          )}
        </div>

      </div>

      {/* KANAN: Trending Sidebar */}
      <div className="trending-sidebar-mobile-hide">
        <TrendingSidebar />
      </div>

    </div>
  );
}

export default Notifications;