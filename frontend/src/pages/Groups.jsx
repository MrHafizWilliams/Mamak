import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

function Groups() {
  const [groups, setGroups] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');

  const token = localStorage.getItem('token');
  const currentUsername = localStorage.getItem('username');

  // Fetch all groups when page loads
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/groups');
        setGroups(response.data);
      } catch (error) {
        console.error("Gagal tarik senarai komuniti:", error);
      }
    };
    fetchGroups();
  }, []);

  // Handle creating a new group
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    try {
      const response = await axios.post('http://localhost:5000/api/groups', {
        name: newGroupName,
        description: newGroupDesc
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Add new group to the list and hide the form
      setGroups([response.data, ...groups]);
      setShowCreateForm(false);
      setNewGroupName('');
      setNewGroupDesc('');
    } catch (error) {
      console.error(error);
      alert("Gagal cipta komuniti. Nama mungkin sudah wujud.");
    }
  };

  return (
    <div style={{ display: 'flex', maxWidth: '1200px', margin: '0 auto', minHeight: '100vh', boxSizing: 'border-box' }}>
      
      <Sidebar currentUsername={currentUsername} />

      <div style={{ flex: 1, padding: '30px', borderRight: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)' }}>
        
        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <div>
            <h1 style={{ margin: '0 0 10px 0', color: 'var(--text-main)' }}>🏘️ Komuniti Mamak</h1>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>Cari geng anda atau cipta meja lepak baru!</p>
          </div>
          <button 
            onClick={() => setShowCreateForm(!showCreateForm)}
            style={{ padding: '10px 20px', borderRadius: '30px', border: 'none', backgroundColor: 'var(--roti-canai)', color: '#000', fontWeight: 'bold', cursor: 'pointer' }}
          >
            {showCreateForm ? 'Batal' : '+ Cipta Komuniti'}
          </button>
        </div>

        {/* Create Group Form (Hidden by default) */}
        {showCreateForm && (
          <form onSubmit={handleCreateGroup} style={{ backgroundColor: 'var(--bg-card)', padding: '20px', borderRadius: '15px', border: '1px solid var(--border-color)', marginBottom: '30px' }}>
            <h3 style={{ marginTop: 0, color: 'var(--text-main)' }}>Cipta Meja Baru</h3>
            <input 
              type="text" 
              placeholder="Nama Komuniti (Cth: Penang Foodies)" 
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', marginBottom: '15px', boxSizing: 'border-box' }}
              required
            />
            <textarea 
              placeholder="Deskripsi (Tentang apa komuniti ni?)" 
              value={newGroupDesc}
              onChange={(e) => setNewGroupDesc(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', marginBottom: '15px', boxSizing: 'border-box', minHeight: '80px', resize: 'none' }}
            />
            <button type="submit" style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', backgroundColor: 'var(--roti-canai)', color: '#000', fontWeight: 'bold', cursor: 'pointer' }}>
              Cipta Sekarang
            </button>
          </form>
        )}

        {/* Groups Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {groups.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>Belum ada komuniti. Jadilah yang pertama!</p>
          ) : (
            groups.map(group => (
              <div key={group._id} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '15px', overflow: 'hidden', transition: 'transform 0.2s' }}>
                {/* Group Cover (Placeholder colored box for now) */}
                <div style={{ height: '100px', backgroundColor: 'var(--border-color)' }}></div>
                
                <div style={{ padding: '20px' }}>
                  <h3 style={{ margin: '0 0 10px 0', color: 'var(--text-main)' }}>{group.name}</h3>
                  <p style={{ margin: '0 0 15px 0', color: 'var(--text-muted)', fontSize: '14px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {group.description || 'Tiada deskripsi.'}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>👥 {group.members?.length || 0} Ahli</span>
                    
                    {/* We will build this specific group page next! */}
                    <Link to={`/groups/${group._id}`} style={{ padding: '8px 15px', borderRadius: '20px', border: '1px solid var(--roti-canai)', backgroundColor: 'transparent', color: 'var(--roti-canai)', textDecoration: 'none', fontSize: '14px', fontWeight: 'bold' }}>
                      Masuk
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}

export default Groups;