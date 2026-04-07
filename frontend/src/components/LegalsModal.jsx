import React from 'react';

function LegalsModal({ title, content, isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(5px)'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-card)', width: '90%', maxWidth: '600px',
        maxHeight: '80vh', borderRadius: '15px', border: '1px solid var(--border-color)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px', borderBottom: '1px solid var(--border-color)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, color: 'var(--roti-canai)' }}>{title}</h3>
          <span onClick={onClose} style={{ cursor: 'pointer', fontSize: '20px', color: 'var(--text-muted)' }}>✕</span>
        </div>

        {/* Content */}
        <div style={{ padding: '25px', overflowY: 'auto', lineHeight: '1.6', fontSize: '14px', color: 'var(--text-main)' }}>
          {content}
        </div>

        {/* Footer */}
        <div style={{ padding: '15px', borderTop: '1px solid var(--border-color)', textAlign: 'right' }}>
          <button 
            onClick={onClose}
            style={{
              padding: '8px 25px', borderRadius: '20px', border: 'none',
              backgroundColor: 'var(--roti-canai)', color: '#000', fontWeight: 'bold', cursor: 'pointer'
            }}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

export default LegalsModal;