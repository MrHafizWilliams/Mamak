import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LegalsModal from './LegalsModal'; 

function Sidebar({ currentUsername }) {
  const navigate = useNavigate();
  
  const [isLightMode, setIsLightMode] = useState(
    localStorage.getItem('theme') === 'light'
  );

  // State untuk mengawal Modal Legals
  const [modalData, setModalData] = useState({ isOpen: false, title: '', content: '' });

  useEffect(() => {
    if (isLightMode) {
      document.body.classList.add('light-mode');
      localStorage.setItem('theme', 'light');
    } else {
      document.body.classList.remove('light-mode');
      localStorage.setItem('theme', 'dark');
    }
  }, [isLightMode]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  // ==========================================
  // LOGIK UNTUK PAPARAN TERMA/PRIVASI
  // ==========================================
  const showLegal = (type) => {
    const data = {
      terma: {
        title: "Terma & Syarat Mamak.com",
        content: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <p>Selamat datang ke <strong>Mamak.com</strong>. Dengan menggunakan platform ini, anda bersetuju:</p>
            <ul style={{ paddingLeft: '20px' }}>
              <li>Tidak memuat naik kandungan yang menghina kaum atau agama (3R).</li>
              <li>Menghormati privasi dan hak pengguna lain.</li>
              <li>Bertanggungjawab sepenuhnya ke atas setiap "Borak" dan media yang anda hantar.</li>
              <li>Tidak melakukan aktiviti spam atau serangan siber ke atas platform ini.</li>
            </ul>
          </div>
        )
      },
      privasi: {
        title: "Dasar Privasi",
        content: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <p>Privasi anda adalah keutamaan kami:</p>
            <ul style={{ paddingLeft: '20px' }}>
              <li><strong>Data Peribadi:</strong> Kami tidak menjual data anda kepada pihak ketiga.</li>
              <li><strong>Gambar:</strong> Semua gambar disimpan selamat melalui Cloudinary.</li>
              <li><strong>Padam Akaun:</strong> Anda berhak memadam akaun pada bila-bila masa.</li>
            </ul>
          </div>
        )
      },
      polisi: {
        title: "Polisi Penggunaan & Komuniti",
        content: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <p>Untuk memastikan Kedai Mamak sentiasa harmoni:</p>
            <ul style={{ paddingLeft: '20px' }}>
              <li>Borak yang mengandungi keganasan melampau tidak dibenarkan.</li>
              <li>Pastikan reshare borak yang bermanfaat sahaja.</li>
              <li>Kekalkan suasana santai dan 'lepak' yang positif!</li>
            </ul>
          </div>
        )
      }
    };
    setModalData({ isOpen: true, ...data[type] });
  };

  const navLinkStyle = {
    fontSize: '18px', color: 'var(--text-main)', textDecoration: 'none', fontWeight: '600',
    display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer',
    fontFamily: "'Poppins', sans-serif", padding: '10px 0', transition: 'color 0.2s ease'
  };

  return (
    <> {/* 👈 Gunakan Fragment supaya Modal berada di luar div lebar 260px */}
      <div className="sidebar-mobile-bottom" style={{ width: '260px', flexShrink: 0, padding: '24px', boxSizing: 'border-box', borderRight: '1px solid var(--border-color)', position: 'sticky', top: 0, height: '100vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* LOGO AREA */}
        <Link to="/home" className="sidebar-hide-mobile" style={{ textDecoration: 'none', marginBottom: '40px', display: 'block' }}>
          <img 
            src={isLightMode ? '/logo-light.png' : '/logo-dark.png'} 
            alt="Mamak.com Logo" 
            style={{ width: '100%', maxWidth: '180px', height: 'auto', display: 'block' }}
          />
        </Link>
        
        {/* NAVIGATION MENU */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
          <Link to="/home" className="nav-link sidebar-item" style={navLinkStyle}>
            <span>🏠</span> <span className="sidebar-text-mobile">Laman Utama</span>
          </Link>
          <Link to="/notifications" className="nav-link sidebar-item" style={navLinkStyle}>
            <span>🔔</span> <span className="sidebar-text-mobile">Notifikasi</span>
          </Link>
          <Link to="/explore" className="nav-link sidebar-item sidebar-hide-mobile" style={navLinkStyle}>
            <span>🔥</span> <span className="sidebar-text-mobile">Topik Panas</span>
          </Link>
          <Link to="/sembang" className="nav-link sidebar-item" style={navLinkStyle}>
            <span>💬</span> <span className="sidebar-text-mobile">Sembang</span>
          </Link>
          <Link to="/groups" className="nav-link sidebar-item" style={navLinkStyle}>
            <span>🏘️</span> <span className="sidebar-text-mobile">Komuniti</span>
          </Link>
          <Link to={`/profile/${currentUsername}`} className="nav-link sidebar-item" style={navLinkStyle}>
            <span>👤</span> <span className="sidebar-text-mobile">Profil</span>
          </Link>
          <Link to="/settings" className="nav-link sidebar-item" style={navLinkStyle}>
            <span>⚙️</span> <span className="sidebar-text-mobile">Tetapan</span>
          </Link>
          
          {/* THEME TOGGLE */}
          <div 
            className="sidebar-hide-mobile"
            onClick={() => setIsLightMode(!isLightMode)}
            style={{
              display: 'flex', alignItems: 'center', width: '100%', height: '46px',
              backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)',
              borderRadius: '30px', cursor: 'pointer', marginTop: '20px', position: 'relative',
              padding: '4px', boxSizing: 'border-box'
            }}
          >
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--roti-canai)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'absolute',
              left: isLightMode ? '4px' : 'calc(100% - 40px)', transition: 'all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',
              boxShadow: '0 2px 5px rgba(0,0,0,0.2)', zIndex: 2
            }}>
              <span style={{ fontSize: '18px', color: '#000' }}>{isLightMode ? '☀️' : '🌙'}</span>
            </div>
            <span style={{ width: '100%', textAlign: 'center', fontSize: '14px', fontWeight: 'bold', color: 'var(--text-main)', paddingLeft: isLightMode ? '36px' : '0', paddingRight: isLightMode ? '0' : '36px', zIndex: 1, userSelect: 'none' }}>
              {isLightMode ? 'Light Mode' : 'Dark Mode'}
            </span>
          </div>
        </nav>

        {/* FOOTER LEGALS */}
        <div className="sidebar-hide-mobile" style={{ padding: '15px 0', fontSize: '12px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', marginBottom: '10px' }}>
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={() => showLegal('terma')} style={{ background: 'none', border: 'none', color: 'inherit', fontSize: 'inherit', cursor: 'pointer', padding: '2px 0' }}>Terma</button>
            <span>·</span>
            <button onClick={() => showLegal('privasi')} style={{ background: 'none', border: 'none', color: 'inherit', fontSize: 'inherit', cursor: 'pointer', padding: '2px 0' }}>Privasi</button>
            <span>·</span>
            <button onClick={() => showLegal('polisi')} style={{ background: 'none', border: 'none', color: 'inherit', fontSize: 'inherit', cursor: 'pointer', padding: '2px 0' }}>Polisi</button>
          </div>
          <p style={{ marginTop: '10px' }}>© 2026 Mamak.com</p>
        </div>

        {/* LOG KELUAR */}
        <button className="sidebar-hide-mobile" onClick={handleLogout} style={{ width: '100%', padding: '14px 20px', backgroundColor: '#F5C518', color: '#ffffff', border: 'none', borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer' }}>
          Log Keluar
        </button>
      </div>

      {/* 👈 MODAL DI LUAR DIV SIDEBAR: Supaya tidak terikat dengan lebar 260px */}
      <LegalsModal 
        isOpen={modalData.isOpen} 
        title={modalData.title} 
        content={modalData.content} 
        onClose={() => setModalData({ ...modalData, isOpen: false })} 
      />
    </>
  );
}

export default Sidebar;