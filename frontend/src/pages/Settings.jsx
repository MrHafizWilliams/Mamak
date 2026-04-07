import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import Sidebar from '../components/Sidebar';
import TrendingSidebar from '../components/TrendingSidebar';

function Settings() {
  const navigate = useNavigate();
  const currentUsername = localStorage.getItem('username');
  const token = localStorage.getItem('token');

  // State untuk Tukar Kata Laluan
  const [passwords, setPasswords] = useState({ old: '', new: '', confirm: '' });
  const [isChangingPass, setIsChangingPass] = useState(false);

  // State untuk Tema & Penampilan
  const [isLightMode, setIsLightMode] = useState(localStorage.getItem('theme') === 'light');
  const [accentColor, setAccentColor] = useState(localStorage.getItem('accentColor') || '#F5C518');
  const [fontSize, setFontSize] = useState(localStorage.getItem('fontSize') || '16px');

  // ==========================================
  // EFFECT: APPLY THEMES GOBALLY
  // ==========================================
  // 1. Dark/Light Mode
  useEffect(() => {
    if (isLightMode) {
      document.body.classList.add('light-mode');
      localStorage.setItem('theme', 'light');
    } else {
      document.body.classList.remove('light-mode');
      localStorage.setItem('theme', 'dark');
    }
  }, [isLightMode]);

  // 2. Accent Color (Warna Utama)
  useEffect(() => {
    // Kita tukar pembolehubah akar CSS (--roti-canai) secara dinamik
    document.documentElement.style.setProperty('--roti-canai', accentColor);
    localStorage.setItem('accentColor', accentColor);
  }, [accentColor]);

  // 3. Font Size (Saiz Tulisan)
  useEffect(() => {
    document.body.style.fontSize = fontSize;
    localStorage.setItem('fontSize', fontSize);
  }, [fontSize]);


  // ==========================================
  // HANDLERS
  // ==========================================
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      return toast.error("Kata laluan baru tidak sepadan!");
    }

    setIsChangingPass(true);
    try {
      await axios.put('http://localhost:5000/api/users/change-password', 
        { oldPassword: passwords.old, newPassword: passwords.new },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Kata laluan berjaya ditukar! 🔒");
      setPasswords({ old: '', new: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal tukar kata laluan.");
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm("AWAS! Tindakan ini akan memadam akaun anda selama-lamanya. Anda pasti?");
    if (!confirmDelete) return;

    const finalConfirm = window.confirm("Betul-betul pasti? Tiada jalan kembali.");
    if (!finalConfirm) return;

    try {
      await axios.delete('http://localhost:5000/api/users/delete-account', {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Akaun berjaya dipadam. Jumpa lagi!");
      localStorage.clear();
      navigate('/login');
    } catch (err) {
      toast.error("Gagal memadam akaun.");
    }
  };

  // Senarai Warna Tema (Minuman Mamak)
  const themeColors = [
    { name: 'Teh Tarik (Kuning)', hex: '#F5C518' },
    { name: 'Sirap Bandung (Pink)', hex: '#F42A60' },
    { name: 'Epal Asam Boi (Hijau)', hex: '#17BF63' },
    { name: 'Bunga Telang (Biru)', hex: '#1DA1F2' }
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', fontFamily: "'Poppins', sans-serif", maxWidth: '1200px', margin: '0 auto' }}>
      <Sidebar currentUsername={currentUsername} />

      <div className="main-feed-mobile" style={{ flex: 1, maxWidth: '600px', borderRight: '1px solid var(--border-color)', minHeight: '100vh' }}>
        
        {/* HEADER */}
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, backgroundColor: 'rgba(21, 32, 43, 0.85)', backdropFilter: 'blur(10px)', zIndex: 10 }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>Tetapan ⚙️</h2>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* ========================================== */}
          {/* BAHAGIAN 1: PENAMPILAN (DIPERLUAS) */}
          {/* ========================================== */}
          <section>
            <h3 style={{ fontSize: '18px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', color: 'var(--roti-canai)' }}>🎨 Penampilan</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
              
              {/* Dark / Light Mode */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-card)', padding: '15px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <div>
                  <strong style={{ display: 'block', fontSize: '16px' }}>Tema Gelap / Terang</strong>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Pilih gaya yang selesa untuk mata anda.</span>
                </div>
                <button 
                  onClick={() => setIsLightMode(!isLightMode)}
                  style={{ padding: '8px 15px', borderRadius: '20px', border: 'none', backgroundColor: 'var(--text-main)', color: 'var(--bg-main)', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  {isLightMode ? '☀️ Terang' : '🌙 Gelap'}
                </button>
              </div>

              {/* Tema Warna Utama (Accent Colors) */}
              <div style={{ backgroundColor: 'var(--bg-card)', padding: '15px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <strong style={{ display: 'block', fontSize: '16px', marginBottom: '5px' }}>Warna Tema (Menu Minuman)</strong>
                <span style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '15px' }}>Tukar warna butang dan ikon utama.</span>
                
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                  {themeColors.map((color) => (
                    <div 
                      key={color.hex}
                      onClick={() => setAccentColor(color.hex)}
                      style={{ 
                        width: '45px', height: '45px', borderRadius: '50%', backgroundColor: color.hex, 
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: accentColor === color.hex ? '3px solid var(--text-main)' : '3px solid transparent',
                        transition: 'transform 0.2s', transform: accentColor === color.hex ? 'scale(1.1)' : 'scale(1)'
                      }}
                      title={color.name}
                    >
                      {accentColor === color.hex && <span style={{ color: '#fff', fontSize: '20px', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>✓</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Saiz Tulisan (Font Size) */}
              <div style={{ backgroundColor: 'var(--bg-card)', padding: '15px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <strong style={{ display: 'block', fontSize: '16px', marginBottom: '5px' }}>Saiz Tulisan</strong>
                <span style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '15px' }}>Besarkan atau kecilkan tulisan di Mamak.</span>
                
                <div style={{ display: 'flex', backgroundColor: 'var(--bg-input)', borderRadius: '30px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                  <button onClick={() => setFontSize('14px')} style={{ flex: 1, padding: '10px', border: 'none', cursor: 'pointer', fontWeight: 'bold', backgroundColor: fontSize === '14px' ? 'var(--roti-canai)' : 'transparent', color: fontSize === '14px' ? '#000' : 'var(--text-main)' }}>
                    Kecil
                  </button>
                  <button onClick={() => setFontSize('16px')} style={{ flex: 1, padding: '10px', border: 'none', borderLeft: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)', cursor: 'pointer', fontWeight: 'bold', backgroundColor: fontSize === '16px' ? 'var(--roti-canai)' : 'transparent', color: fontSize === '16px' ? '#000' : 'var(--text-main)' }}>
                    Biasa
                  </button>
                  <button onClick={() => setFontSize('18px')} style={{ flex: 1, padding: '10px', border: 'none', cursor: 'pointer', fontWeight: 'bold', backgroundColor: fontSize === '18px' ? 'var(--roti-canai)' : 'transparent', color: fontSize === '18px' ? '#000' : 'var(--text-main)' }}>
                    Besar
                  </button>
                </div>
              </div>

            </div>
          </section>

          {/* ========================================== */}
          {/* BAHAGIAN 2: KATA LALUAN */}
          {/* ========================================== */}
          <section>
            <h3 style={{ fontSize: '18px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', color: 'var(--roti-canai)' }}>🔒 Akaun & Keselamatan</h3>
            <form onSubmit={handleChangePassword} style={{ marginTop: '15px', backgroundColor: 'var(--bg-card)', padding: '20px', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Kata Laluan Lama</label>
                <input type="password" value={passwords.old} onChange={(e) => setPasswords({...passwords, old: e.target.value})} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', boxSizing: 'border-box' }} required />
              </div>
              <div>
                <label style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Kata Laluan Baru</label>
                <input type="password" value={passwords.new} onChange={(e) => setPasswords({...passwords, new: e.target.value})} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', boxSizing: 'border-box' }} required minLength="6" />
              </div>
              <div>
                <label style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Sahkan Kata Laluan Baru</label>
                <input type="password" value={passwords.confirm} onChange={(e) => setPasswords({...passwords, confirm: e.target.value})} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', boxSizing: 'border-box' }} required minLength="6" />
              </div>
              <button type="submit" disabled={isChangingPass} style={{ padding: '10px', borderRadius: '20px', border: 'none', backgroundColor: 'var(--roti-canai)', color: '#000', fontWeight: 'bold', cursor: 'pointer', opacity: isChangingPass ? 0.7 : 1 }}>
                {isChangingPass ? 'Menyimpan...' : 'Kemaskini Kata Laluan'}
              </button>
            </form>
          </section>

          {/* ========================================== */}
          {/* BAHAGIAN 3: ZON BAHAYA */}
          {/* ========================================== */}
          <section>
            <h3 style={{ fontSize: '18px', borderBottom: '1px solid var(--sirap-bandung)', paddingBottom: '10px', color: 'var(--sirap-bandung)' }}>🚨 Zon Bahaya</h3>
            <div style={{ marginTop: '15px', backgroundColor: 'rgba(244, 42, 96, 0.05)', padding: '20px', borderRadius: '10px', border: '1px solid var(--sirap-bandung)' }}>
              <strong style={{ display: 'block', fontSize: '16px', color: 'var(--text-main)' }}>Padam Akaun</strong>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '5px 0 15px 0' }}>
                Perhatian: Tindakan ini tidak boleh dipatahkan balik. Semua data, pengikut, dan borak anda akan hilang secara kekal.
              </p>
              <button onClick={handleDeleteAccount} style={{ padding: '10px 20px', borderRadius: '20px', border: 'none', backgroundColor: 'var(--sirap-bandung)', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>
                Padam Akaun Saya
              </button>
            </div>
          </section>

        </div>
      </div>

      <div className="trending-sidebar-mobile-hide">
        <TrendingSidebar />
      </div>

    </div>
  );
}

export default Settings;