import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { GoogleOAuthProvider } from '@react-oauth/google';
import axios from 'axios'; // <-- NEW IMPORT

// --- GLOBAL AXIOS INTERCEPTOR ---
// This acts as a global security net for expired tokens.
axios.interceptors.response.use(
  (response) => response, // If the response is good, let it pass
  (error) => {
    // If the backend says "401 Unauthorized" (Token invalid or expired)
    if (error.response && error.response.status === 401) {
      console.warn("Token tamat tempoh. Kena log masuk balik.");
      localStorage.clear(); // Destroy the old token
      window.location.href = '/login'; // Force them to the login page
    }
    return Promise.reject(error);
  }
);
// --------------------------------

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>,
)