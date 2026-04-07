import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function SetupProfile() {
  const [bio, setBio] = useState('');
  const [birthday, setBirthday] = useState('');
  const [age, setAge] = useState(null);
  const [interests, setInterests] = useState('');
  
  // Image States
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [previewAvatar, setPreviewAvatar] = useState(null);
  
  const [selectedCover, setSelectedCover] = useState(null);
  const [previewCover, setPreviewCover] = useState(null);
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const currentUsername = localStorage.getItem('username');
  const currentUserId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');

  // Prevent unauthenticated access
  useEffect(() => {
    if (!token) { navigate('/login'); }
  }, [token, navigate]);

  // Auto-Calculate Age whenever Birthday changes
  useEffect(() => {
    if (birthday) {
      const birthDate = new Date(birthday);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      // Subtract 1 year if the birthday hasn't happened yet this year
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
      setAge(calculatedAge);
    } else {
      setAge(null);
    }
  }, [birthday]);

  // Handle Avatar Selection
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedAvatar(file);
      setPreviewAvatar(URL.createObjectURL(file));
    }
  };

  // Handle Cover Photo Selection
  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedCover(file);
      setPreviewCover(URL.createObjectURL(file));
    }
  };

  // ==========================================
  // CLOUDINARY UPLOAD HELPER (USING FETCH)
  // ==========================================
  const uploadImageToCloudinary = async (file) => {
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
      formData.append('folder', 'Mamak_Posts'); // Must match backend exactly!

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error.message);

      return data.secure_url;
    } catch (err) {
      console.error("Cloudinary Error:", err.message);
      throw err;
    }
  };

  // ==========================================
  // SAVE PROFILE LOGIC
  // ==========================================
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      let finalAvatarUrl = '';
      let finalCoverUrl = '';

      // 1. Upload Avatar if selected
      if (selectedAvatar) {
        finalAvatarUrl = await uploadImageToCloudinary(selectedAvatar);
        localStorage.setItem('profilePic', finalAvatarUrl); // Update local memory!
      }

      // 2. Upload Cover if selected
      if (selectedCover) {
        finalCoverUrl = await uploadImageToCloudinary(selectedCover);
      }

      // 3. Format interests into a clean array
      const interestsArray = interests
        .split(',')
        .map(item => item.trim())
        .filter(item => item !== '');

      // 4. Send update request to backend
      await axios.put(`http://localhost:5000/api/users/${currentUserId}`, {
        bio,
        birthday,
        interests: interestsArray,
        profilePic: finalAvatarUrl,
        coverPic: finalCoverUrl
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // 5. Redirect to Home to start the Mamak experience!
      navigate('/home');

    } catch (err) {
      console.error(err);
      setError('Gagal simpan profil. Sila pastikan gambar tidak terlalu besar.');
    } finally {
      setIsSaving(false);
    }
  };

  const skipSetup = () => {
    navigate('/home');
  };

  // Shared input styling
  const inputStyle = { 
    width: '100%', 
    padding: '12px', 
    borderRadius: '8px', 
    border: '1px solid var(--border-color)', 
    backgroundColor: 'var(--bg-input)', 
    color: 'var(--text-main)', 
    outline: 'none', 
    fontSize: '14px', 
    boxSizing: 'border-box', 
    fontFamily: "'Poppins', sans-serif" 
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-main)', fontFamily: "'Poppins', sans-serif", padding: '40px 20px' }}>
      
      <div style={{ backgroundColor: 'var(--bg-card)', width: '100%', maxWidth: '550px', borderRadius: '15px', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
        
        {/* Header */}
        <div style={{ padding: '25px', textAlign: 'center', borderBottom: '1px solid var(--border-color)' }}>
          <h2 style={{ color: 'var(--text-main)', margin: '0 0 5px 0', fontSize: '24px' }}>Selamat Datang, {currentUsername}! 🎉</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>Mari hiaskan meja anda sebelum mula berborak.</p>
        </div>

        {error && <div style={{ backgroundColor: 'rgba(214, 40, 40, 0.1)', color: 'var(--sambal)', padding: '10px', textAlign: 'center', fontSize: '13px', fontWeight: 'bold' }}>⚠️ {error}</div>}

        <form onSubmit={handleSaveProfile}>
          
          {/* PROFILE PREVIEW AREA */}
          <div style={{ position: 'relative', width: '100%', height: '250px', backgroundColor: 'var(--bg-main)' }}>
            
            {/* Cover Photo Area */}
            <div style={{ width: '100%', height: '160px', backgroundColor: 'var(--bg-input)', position: 'relative', overflow: 'hidden' }}>
              {previewCover ? (
                <img src={previewCover} alt="Cover Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                  Tiada Cover Photo
                </div>
              )}
              {/* Cover Upload Button */}
              <label htmlFor="coverUpload" style={{ position: 'absolute', bottom: '10px', right: '10px', backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', padding: '6px 12px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', backdropFilter: 'blur(4px)', transition: 'background 0.2s' }}>
                📷 Tukar Cover
              </label>
              <input type="file" id="coverUpload" accept="image/*" onChange={handleCoverChange} style={{ display: 'none' }} />
            </div>

            {/* Avatar Photo Area (Overlapping) */}
            <div style={{ position: 'absolute', bottom: '20px', left: '30px' }}>
              <div style={{ width: '110px', height: '110px', borderRadius: '50%', border: '4px solid var(--bg-card)', backgroundColor: 'var(--bg-input)', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {previewAvatar ? (
                  <img src={previewAvatar} alt="Avatar Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '40px' }}>👤</span>
                )}
                {/* Avatar Upload Overlay */}
                <label htmlFor="avatarUpload" style={{ position: 'absolute', bottom: 0, width: '100%', height: '35%', backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '18px', transition: 'background 0.2s' }}>
                  📷
                </label>
                <input type="file" id="avatarUpload" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
              </div>
            </div>
          </div>

          {/* FORM FIELDS CONTAINER */}
          <div style={{ padding: '0 30px 20px 30px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            
            {/* BIO INPUT */}
            <div>
              <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '6px', fontSize: '13px', fontWeight: 'bold' }}>Bio Anda</label>
              <textarea 
                value={bio} 
                onChange={(e) => setBio(e.target.value)} 
                placeholder="Ceritakan sedikit tentang diri anda... cth: Suka lepak mamak sampai pagi."
                style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
              />
            </div>

            {/* TWO-COLUMN LAYOUT (Birthday & Age) */}
            <div style={{ display: 'flex', gap: '15px' }}>
              {/* Birthday Input */}
              <div style={{ flex: 2 }}>
                <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '6px', fontSize: '13px', fontWeight: 'bold' }}>Tarikh Lahir</label>
                <input 
                  type="date" 
                  value={birthday} 
                  onChange={(e) => setBirthday(e.target.value)} 
                  style={inputStyle}
                />
              </div>

              {/* Dynamic Age Display */}
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '6px', fontSize: '13px', fontWeight: 'bold' }}>Umur</label>
                <div style={{ ...inputStyle, backgroundColor: 'transparent', border: '1px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: age !== null ? 'var(--text-main)' : 'var(--text-muted)' }}>
                  {age !== null ? <span style={{ fontWeight: 'bold', color: 'var(--roti-canai)' }}>{age} Tahun</span> : '-'}
                </div>
              </div>
            </div>

            {/* INTERESTS INPUT */}
            <div>
              <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '6px', fontSize: '13px', fontWeight: 'bold' }}>Topik Minat <span style={{ fontSize: '11px', fontWeight: 'normal' }}>(Pisahkan dengan koma)</span></label>
              <input 
                type="text" 
                value={interests} 
                onChange={(e) => setInterests(e.target.value)} 
                placeholder="cth: Coding, Kucing, Roti Canai"
                style={inputStyle}
              />
            </div>

          </div>

          {/* ACTIONS */}
          <div style={{ padding: '20px 30px 30px 30px', display: 'flex', gap: '15px', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)' }}>
            <button type="button" onClick={skipSetup} style={{ flex: 1, padding: '12px', backgroundColor: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s' }}>
              Langkau (Skip)
            </button>
            <button type="submit" disabled={isSaving} style={{ flex: 2, padding: '12px', backgroundColor: isSaving ? 'var(--text-muted)' : 'var(--roti-canai)', color: '#000', border: 'none', borderRadius: '30px', fontWeight: 'bold', cursor: isSaving ? 'wait' : 'pointer', transition: 'transform 0.1s' }}>
              {isSaving ? 'Menyiapkan Meja... ⏳' : 'Mula Berborak!'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

export default SetupProfile;