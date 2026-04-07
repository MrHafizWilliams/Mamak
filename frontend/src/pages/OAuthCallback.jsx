import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

function OAuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state'); // <-- This will say 'github', 'discord', or 'facebook'

    if (code && state) {
      // It dynamically calls /api/auth/github OR /api/auth/discord OR /api/auth/facebook
      axios.post(`http://localhost:5000/api/auth/${state}`, { code })
        .then((response) => {
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('userId', response.data.user.id);
          localStorage.setItem('username', response.data.user.username);
          navigate('/home');
        })
        .catch((err) => {
          console.error(`${state} OAuth Error:`, err);
          navigate('/login');
        });
    } else {
      navigate('/login');
    }
  }, [location, navigate]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg-main)', color: 'var(--roti-canai)' }}>
      <h2>Tengah verify dengan platform... ⏳</h2>
    </div>
  );
}

export default OAuthCallback;