import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

function TrendingSidebar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [trends, setTrends] = useState([]);
  const navigate = useNavigate();

  // Tarik hashtag paling popular dari backend
  useEffect(() => {
    const fetchTrends = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/posts/trending');
        setTrends(res.data);
      } catch (err) {
        console.error("Gagal tarik trends:", err);
      }
    };
    fetchTrends();
  }, []);

  // Apabila pengguna tekan butang Enter pada kotak carian
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Bawa pengguna ke halaman carian bersama kata kunci
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery(''); // Kosongkan kotak selepas cari
    }
  };

  return (
    <div style={{ width: '300px', padding: '20px', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto', borderLeft: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '20px', boxSizing: 'border-box' }}>
      
      {/* 1. KOTAK CARIAN */}
      <form onSubmit={handleSearch}>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>🔍</span>
          <input
            type="text"
            placeholder="Cari di Mamak..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ 
              width: '100%', padding: '12px 15px 12px 45px', borderRadius: '30px', 
              border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', 
              color: 'var(--text-main)', boxSizing: 'border-box', outline: 'none',
              fontFamily: 'inherit', fontSize: '14px'
            }}
          />
        </div>
      </form>

      {/* 2. KOTAK TOPIK HANGAT (TRENDING HASHTAGS) */}
      <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '15px', padding: '20px', border: '1px solid var(--border-color)' }}>
        <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 'bold' }}>Topik Hangat 🔥</h3>
        
        {trends.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>Belum ada topik panas minggu ini.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {trends.map((trend, index) => (
              <Link 
                key={index} 
                to={`/search?q=${encodeURIComponent(trend.name)}`} 
                style={{ textDecoration: 'none', color: 'inherit', display: 'block', padding: '5px 0', transition: 'opacity 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.opacity = 0.7}
                onMouseOut={(e) => e.currentTarget.style.opacity = 1}
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Trending di Malaysia</span>
                  <span style={{ fontWeight: 'bold', fontSize: '15px', color: 'var(--text-main)', marginTop: '2px' }}>{trend.name}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' }}>{trend.count} borak</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default TrendingSidebar;