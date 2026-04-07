import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();

  // Theme State
  const [isLightMode, setIsLightMode] = useState(
    localStorage.getItem('theme') === 'light'
  );

  // Apply Theme to Body
  useEffect(() => {
    if (isLightMode) {
      document.body.classList.add('light-mode');
      localStorage.setItem('theme', 'light');
    } else {
      document.body.classList.remove('light-mode');
      localStorage.setItem('theme', 'dark');
    }
  }, [isLightMode]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email,
        password,
        rememberMe
      });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('userId', response.data.user.id);
      localStorage.setItem('username', response.data.user.username);
      navigate('/home');
    } catch (err) {
      setError(err.response?.data?.message || 'Alamak, login gagal. Check balik email/password boss.');
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const response = await axios.post('http://localhost:5000/api/auth/google', {
        token: credentialResponse.credential
      });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('userId', response.data.user.id);
      localStorage.setItem('username', response.data.user.username);
      navigate('/home');
    } catch (err) {
      console.error(err);
      setError('Gagal log masuk dengan Google.');
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', fontFamily: "'Poppins', sans-serif" }}>
      
      {/* ── LEFT SIDE: LOGIN FORM ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', borderRight: '1px solid var(--border-color)', position: 'relative' }}>
        
        {/* THEME TOGGLE (Positioned relative to the left half) */}
        <button 
          type="button" 
          onClick={() => setIsLightMode(!isLightMode)}
          style={{ position: 'absolute', top: '30px', left: '30px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '50%', width: '45px', height: '45px', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }}
          title="Tukar Tema"
        >
          {isLightMode ? '🌙' : '☀️'}
        </button>

        <div style={{ width: '100%', maxWidth: '420px' }}>
          
          {/* MAMAK LOGO */}
          <div style={{ textAlign: 'left', marginBottom: '30px' }}>
            <img 
              src={isLightMode ? '/mamak-register-light.png' : '/mamak-register-dark.png'} 
              alt="Mamak.com Logo" 
              style={{ 
                width: '400px', // Increased from 180px
                height: 'auto', 
                display: 'block',
                marginLeft: '-10px' // Optional: nudges it left to align with the form edge
              }}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            <h1 style={{ display: 'none', color: 'var(--roti-canai)', margin: 0, fontSize: '32px' }}>☕ Mamak.com</h1>
          </div>

          {/* LOGIN BOX */}
          <form onSubmit={handleLogin} style={{ backgroundColor: 'var(--bg-card)', padding: '35px', borderRadius: '15px', border: '1px solid var(--border-color)', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', boxSizing: 'border-box' }}>
            
            <h2 style={{ color: 'var(--text-main)', marginBottom: '10px', fontSize: '24px', fontWeight: 'bold' }}>Selamat Kembali ke Mamak!</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '25px' }}>Sila masuk ke meja anda untuk mula berborak.</p>
            
            {error && <div style={{ backgroundColor: 'rgba(214, 40, 40, 0.1)', color: 'var(--sirap-bandung)', padding: '12px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center', border: '1px solid var(--sirap-bandung)', fontSize: '13px', fontWeight: '500' }}>{error}</div>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
              <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
              <input type="checkbox" id="rememberMe" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--roti-canai)' }} />
              <label htmlFor="rememberMe" style={{ fontSize: '14px', color: 'var(--text-muted)', cursor: 'pointer' }}>Kekal Log Masuk</label>
            </div>

            <button type="submit" style={buttonStyle}>Masuk Meja</button>

            <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0' }}>
              <hr style={{ flex: 1, borderColor: 'var(--border-color)', opacity: 0.3 }} />
              <span style={{ padding: '0 12px', color: 'var(--text-muted)', fontSize: '11px', fontWeight: 'bold' }}>ATAU</span>
              <hr style={{ flex: 1, borderColor: 'var(--border-color)', opacity: 0.3 }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
              <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setError('Google Login Gagal')} theme={isLightMode ? 'outline' : 'filled_black'} shape="rectangular" text="continue_with" width="420px" />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={() => window.location.href = `https://github.com/...`} style={githubBtnStyle}>🐙 GitHub</button>
              <button type="button" onClick={() => window.location.href = `https://discord.com/...`} style={discordBtnStyle}>🎮 Discord</button>
              <button type="button" onClick={() => window.location.href = `https://www.facebook.com/...`} style={facebookBtnStyle}>📘 FB</button>
            </div>
            
            <p style={{ textAlign: 'center', marginTop: '25px', fontSize: '14px', color: 'var(--text-muted)' }}>
              Belum ada meja? <Link to="/register" style={{ color: 'var(--roti-canai)', textDecoration: 'none', fontWeight: 'bold' }}>Daftar Akaun</Link>
            </p>
          </form>
        </div>
      </div>

      {/* ── RIGHT SIDE: HERO IMAGE ── */}
      <div style={{ 
        flex: 1.4, 
        backgroundImage: 'url("/login-hero.png")', 
        backgroundSize: 'cover', 
        backgroundPosition: 'center', 
        display: 'flex', 
        alignItems: 'flex-end', 
        position: 'relative' 
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(to right, var(--bg-main), transparent 50%)', opacity: 0.8 }}></div>
        <div style={{ padding: '60px', position: 'relative', zIndex: 2 }}>
          <h1 style={{ fontSize: '42px', fontWeight: '900', color: '#fff', textShadow: '0 4px 12px rgba(0,0,0,0.5)', lineHeight: '1.1' }}>
            Sembang Santai,<br />Connection yang Padu.
          </h1>
          <p style={{ color: '#fff', fontSize: '18px', marginTop: '15px', opacity: 0.9, maxWidth: '450px', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
            Sertai komuniti Mamak.com untuk borak topik hangat, kongsi idea, dan lepak online 24/7.
          </p>
        </div>
      </div>
    </div>
  );
}

// STYLES
const inputStyle = { width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', outline: 'none', fontSize: '14px', transition: 'border-color 0.2s', boxSizing: 'border-box' };
const buttonStyle = { width: '100%', padding: '14px', backgroundColor: 'var(--roti-canai)', color: '#000', border: 'none', borderRadius: '30px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', transition: 'all 0.2s', boxSizing: 'border-box' };
const githubBtnStyle = { flex: 1, padding: '12px', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', boxSizing: 'border-box' };
const discordBtnStyle = { flex: 1, padding: '12px', backgroundColor: '#5865F2', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', boxSizing: 'border-box' };
const facebookBtnStyle = { flex: 1, padding: '12px', backgroundColor: '#1877F2', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', boxSizing: 'border-box' };

export default Login;