import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import toast, { Toaster } from 'react-hot-toast';

// Import Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Profile from './pages/Profile';
import SetupProfile from './pages/SetupProfile';
import OAuthCallback from './pages/OAuthCallback';
import Sembang from './pages/Sembang';
import Groups from './pages/Groups';
import GroupTimeline from './pages/GroupTimeline';
import Notifications from './pages/Notifications';
import Search from './pages/Search';
import Explore from './pages/Explore';
import Settings from './pages/Settings';

// Import the Security Bouncer
import ProtectedRoute from './components/ProtectedRoute';

// Initialize Socket connection outside or inside component
const socket = io("http://localhost:5000");

function App() {
  const userId = localStorage.getItem('userId');

  useEffect(() => {
    if (userId) {
      // 1. Tell the server we are online and listening for our specific ID
      socket.emit('join_notifications', userId);

      // 2. Listen for the 'new_notification' event
      socket.on('new_notification', (notif) => {
        const message = 
          notif.type === 'like' ? `${notif.sender.username} menyukai borak anda! 🔥` :
          notif.type === 'comment' ? `${notif.sender.username} mengulas borak anda! 💬` :
          notif.type === 'mention' ? `${notif.sender.username} memetik nama anda! 🏷️` :
          `${notif.sender.username} menghantar notifikasi baru!`;

        // Notifikasi Socket kekal warna biru khas
        toast(message, {
          duration: 4000,
          position: 'top-right',
          style: {
            background: '#1DA1F2', 
            color: '#fff',
            borderRadius: '10px',
            fontWeight: 'bold'
          },
          icon: '🔔',
        });
      });
    }

    // Cleanup on logout/unmount
    return () => {
      socket.off('new_notification');
    };
  }, [userId]);

  return (
    <Router>
      {/* KONFIGURASI GLOBAL TOAST (TEMA MAMAK) */}
      <Toaster 
        position="top-center"
        toastOptions={{
          style: {
            background: 'var(--bg-card)',
            color: 'var(--text-main)',
            border: '1px solid var(--border-color)',
            fontFamily: "'Poppins', sans-serif",
            borderRadius: '30px',
            padding: '12px 20px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
          },
          success: {
            iconTheme: { primary: 'var(--pandan)', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: 'var(--sirap-bandung)', secondary: '#fff' },
          },
        }}
      /> 
      
      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/oauth/callback" element={<OAuthCallback />} />
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* PRIVATE ROUTES */}
        <Route 
          path="/home" 
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/profile/:username" 
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/setup-profile" 
          element={
            <ProtectedRoute>
              <SetupProfile />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/sembang" 
          element={
            <ProtectedRoute>
              <Sembang />
            </ProtectedRoute>
          } 
        /> 

        <Route 
          path="/groups" 
          element={
            <ProtectedRoute>
              <Groups />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/groups/:id" 
          element={
            <ProtectedRoute>
              <GroupTimeline />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/notifications" 
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/search" 
          element={
            <ProtectedRoute>
              <Search />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/explore" 
          element={
            <ProtectedRoute>
              <Explore />
            </ProtectedRoute>
          } 
        />

        {/* Catch-all route */}
        <Route path="*" element={<Navigate to="/home" replace />} />

        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}

export default App;
