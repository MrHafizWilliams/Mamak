import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import ReCAPTCHA from 'react-google-recaptcha';
import toast from 'react-hot-toast'; //Toast

function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeToS, setAgreeToS] = useState(false);
  const [isHuman, setIsHuman] = useState(false);
  const [error, setError] = useState('');
  
  // Modal States
  const [showTos, setShowTos] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const navigate = useNavigate();

  // Theme State
  const [isLightMode, setIsLightMode] = useState(
    localStorage.getItem('theme') === 'light'
  );

  useEffect(() => {
    if (isLightMode) {
      document.body.classList.add('light-mode');
      localStorage.setItem('theme', 'light');
    } else {
      document.body.classList.remove('light-mode');
      localStorage.setItem('theme', 'dark');
    }
  }, [isLightMode]);

  // Password Logic
  const getPasswordStrength = () => {
    if (!password) return { text: '', color: 'transparent', width: '0%' };
    if (password.length < 6) return { text: 'Lemah', color: 'var(--sambal)', width: '33%' };
    if (password.length < 10) return { text: 'Boleh tahan', color: 'var(--roti-canai)', width: '66%' };
    return { text: 'Padu boss! 🔥', color: 'var(--pandan)', width: '100%' };
  };

  const getMatchStatus = () => {
    if (!confirmPassword) return null;
    if (password === confirmPassword) return { text: 'Ngam! Password sama', color: 'var(--pandan)', icon: '✅' };
    return { text: 'Alamak, password tak sama', color: 'var(--sambal)', icon: '❌' };
  };

  const strength = getPasswordStrength();
  const matchStatus = getMatchStatus();

  // Handle reCAPTCHA success
  const handleRecaptcha = (value) => {
    if (value) {
      setIsHuman(true);
    } else {
      setIsHuman(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) return setError('Sila pastikan kedua-dua password adalah sama.');
    if (!agreeToS) return setError('Sila tanda setuju pada Terma & Syarat.');
    if (!isHuman) return setError('Sila sahkan anda bukan robot (reCAPTCHA).');

    try {
      const response = await axios.post('http://localhost:5000/api/auth/register', {
        username,
        email,
        password,
      });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('userId', response.data.user.id);
      localStorage.setItem('username', response.data.user.username);
      navigate('/setup-profile');
    } catch (err) {
      setError(err.response?.data?.message || 'Alamak, pendaftaran gagal!');
    }
  };

  const handleSocialLogin = (platform) => {
  toast.error(`Sabar boss! Feature ${platform} ni tengah repair kat dapur ☕`);
};

  return (
    <>
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', fontFamily: "'Poppins', sans-serif" }}>
        
        {/* ── LEFT SIDE: REGISTER FORM ── */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', borderRight: '1px solid var(--border-color)', position: 'relative' }}>
          
          {/* THEME TOGGLE (Top Left) */}
          <button 
            type="button" 
            onClick={() => setIsLightMode(!isLightMode)}
            style={{ position: 'absolute', top: '20px', left: '20px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '50%', width: '40px', height: '40px', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }}
            title="Tukar Tema"
          >
            {isLightMode ? '🌙' : '☀️'}
          </button>

          <div style={{ width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            
            {/* BIG MAMAK LOGO */}
            <div style={{ textAlign: 'left', marginBottom: '15px', width: '100%' }}>
              <img 
                src={isLightMode ? '/mamak-register-light.png' : '/mamak-register-dark.png'} 
                alt="Mamak.com Logo" 
                style={{ width: '400px', height: 'auto', display: 'block', marginLeft: '-10px' }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <h1 style={{ display: 'none', color: 'var(--roti-canai)', margin: 0, fontSize: '28px' }}>☕ Mamak.com</h1>
            </div>

            {/* REGISTER BOX */}
            <form onSubmit={handleRegister} style={{ backgroundColor: 'var(--bg-card)', padding: '25px 35px', borderRadius: '15px', border: '1px solid var(--border-color)', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', boxSizing: 'border-box', width: '100%' }}>
              
              <h2 style={{ color: 'var(--text-main)', margin: '0 0 5px 0', fontSize: '22px', fontWeight: 'bold' }}>Daftar Akaun Anda</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '0 0 15px 0' }}>Sertai komuniti Mamak.com hari ini.</p>
              
              {error && <div style={{ backgroundColor: 'rgba(214, 40, 40, 0.1)', color: 'var(--sambal)', padding: '10px', borderRadius: '8px', marginBottom: '15px', textAlign: 'center', border: '1px solid var(--sambal)', fontSize: '12px', fontWeight: '500' }}>{error}</div>}

              {/* INPUT FIELDS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '15px' }}>
                <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required style={inputStyle} />
                <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
                
                {/* Password with Strength Indicator */}
                <div>
                  <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ ...inputStyle, marginBottom: password ? '6px' : '0' }} />
                  {password && (
                    <div style={{ padding: '0 4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Kekuatan:</span>
                        <span style={{ color: strength.color }}>{strength.text}</span>
                      </div>
                      <div style={{ height: '4px', width: '100%', backgroundColor: 'var(--bg-input)', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                        <div style={{ height: '100%', width: strength.width, backgroundColor: strength.color, transition: 'width 0.4s ease-in-out, background-color 0.4s ease' }}></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password with Match Indicator */}
                <div>
                  <input type="password" placeholder="Sahkan Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required style={{ ...inputStyle, marginBottom: confirmPassword ? '6px' : '0' }} />
                  {confirmPassword && (
                    <div style={{ padding: '0 4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '12px' }}>{matchStatus.icon}</span>
                      <span style={{ color: matchStatus.color, fontSize: '11px', fontWeight: 'bold', marginTop: '2px' }}>{matchStatus.text}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* REAL Google reCAPTCHA - Slightly scaled down to save space */}
              <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'center', transform: 'scale(0.9)', transformOrigin: 'center' }}>
                <ReCAPTCHA
                  sitekey="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"
                  onChange={handleRecaptcha}
                  theme={isLightMode ? 'light' : 'dark'}
                />
              </div>

              {/* Terms Checkbox */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '15px' }}>
                <input type="checkbox" id="tos" checked={agreeToS} onChange={(e) => setAgreeToS(e.target.checked)} style={{ cursor: 'pointer', width: '14px', height: '14px', accentColor: 'var(--roti-canai)', marginTop: '2px' }} />
                <label htmlFor="tos" style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  Saya bersetuju dengan <span onClick={() => setShowTos(true)} style={{ color: 'var(--roti-canai)', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}>Terma Perkhidmatan</span> dan <span onClick={() => setShowPrivacy(true)} style={{ color: 'var(--roti-canai)', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}>Dasar Privasi</span>.
                </label>
              </div>

              <button type="submit" style={buttonStyle}>Daftar Sekarang</button>
              
              <div style={{ display: 'flex', alignItems: 'center', margin: '15px 0' }}>
                <hr style={{ flex: 1, borderColor: 'var(--border-color)', opacity: 0.3 }} />
                <span style={{ padding: '0 12px', color: 'var(--text-muted)', fontSize: '10px', fontWeight: 'bold' }}>ATAU</span>
                <hr style={{ flex: 1, borderColor: 'var(--border-color)', opacity: 0.3 }} />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => handleSocialLogin('Google')} style={googleBtnStyle}>🌐 Google</button>
                <button type="button" onClick={() => handleSocialLogin('GitHub')} style={githubBtnStyle}>🐙 GitHub</button>
              </div>

              <p style={{ textAlign: 'center', marginTop: '15px', fontSize: '13px', color: 'var(--text-muted)' }}>
                Dah ada meja? <Link to="/login" style={{ color: 'var(--roti-canai)', fontWeight: 'bold', marginLeft: '4px', textDecoration: 'none' }}>Log Masuk</Link>
              </p>
            </form>
          </div>
        </div>

        {/* ── RIGHT SIDE: HERO IMAGE ── */}
        <div style={{ 
          flex: 1.4, 
          backgroundImage: 'url("/register-hero.png")', 
          backgroundSize: 'cover', 
          backgroundPosition: 'center', 
          display: 'flex', 
          alignItems: 'flex-end', 
          position: 'relative' 
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(to right, var(--bg-main), transparent 50%)', opacity: 0.8 }}></div>
          <div style={{ padding: '60px', position: 'relative', zIndex: 2 }}>
            <h1 style={{ fontSize: '42px', fontWeight: '900', color: '#fff', textShadow: '0 4px 12px rgba(0,0,0,0.5)', lineHeight: '1.1' }}>
              Komuniti Mamak.com<br />Terbuka Untuk Anda.
            </h1>
            <p style={{ color: '#fff', fontSize: '18px', marginTop: '15px', opacity: 0.9, maxWidth: '450px', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
              Daftar hari ini dan mula bina connection yang padu dengan member baru di seluruh negara. We connect connections.
            </p>
          </div>
        </div>
      </div>

      {/* ======================= MODAL POPUPS ======================= */}
      {showTos && (
        <div style={modalOverlayStyle}>
          <div style={modalCardStyle}>
            <h3 style={{ color: 'var(--text-main)', marginTop: 0 }}>Terma Perkhidmatan</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.6', overflowY: 'auto', maxHeight: '60vh' }}>
              1. Jangan buat hal dalam Mamak.com.<br/><br/>
              2. Semua borak adalah tanggungjawab sendiri.<br/><br/>
              3. Kami berhak 'kick' mana-mana user yang melanggar peraturan tanpa notis.<br/><br/>
              4. Dilarang spam meja bulat.<br/><br/>
              (Ini adalah contoh teks terma perkhidmatan untuk app anda.)
            </p>
            <button onClick={() => setShowTos(false)} style={modalCloseBtnStyle}>Tutup</button>
          </div>
        </div>
      )}

      {showPrivacy && (
        <div style={modalOverlayStyle}>
          <div style={modalCardStyle}>
            <h3 style={{ color: 'var(--text-main)', marginTop: 0 }}>Dasar Privasi</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.6', overflowY: 'auto', maxHeight: '60vh' }}>
              1. Kami menyimpan nama, email, dan password anda dengan selamat.<br/><br/>
              2. Kami tidak akan menjual data anda kepada pihak ketiga (sebab tak reti nak jual kat mana).<br/><br/>
              3. Kuki (Cookies) digunakan untuk simpan sesi login anda.<br/><br/>
              (Ini adalah contoh teks dasar privasi untuk app anda.)
            </p>
            <button onClick={() => setShowPrivacy(false)} style={modalCloseBtnStyle}>Tutup</button>
          </div>
        </div>
      )}
    </>
  );
}

// ---------------- STYLES ---------------- //
// Padding dikurangkan dari 14px ke 12px
const inputStyle = { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', outline: 'none', fontSize: '13px', transition: 'border-color 0.2s, background-color 0.3s, color 0.3s', boxSizing: 'border-box' };
// Padding button dikurangkan dari 14px ke 12px
const buttonStyle = { width: '100%', padding: '12px', backgroundColor: 'var(--roti-canai)', color: '#000', border: 'none', borderRadius: '30px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', transition: 'all 0.2s', boxSizing: 'border-box' };
const googleBtnStyle = { flex: 1, padding: '10px', backgroundColor: 'var(--text-main)', color: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', transition: 'all 0.3s', boxSizing: 'border-box' };
const githubBtnStyle = { flex: 1, padding: '10px', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', transition: 'all 0.3s', boxSizing: 'border-box' };

// Modal Styles
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(3px)' };
const modalCardStyle = { backgroundColor: 'var(--bg-card)', padding: '30px', borderRadius: '15px', width: '90%', maxWidth: '500px', border: '1px solid var(--border-color)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' };
const modalCloseBtnStyle = { marginTop: '20px', width: '100%', padding: '12px', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '30px', cursor: 'pointer', fontWeight: 'bold', transition: 'background-color 0.2s' };

export default Register;