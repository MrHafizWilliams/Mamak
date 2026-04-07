function PostSkeleton() {
  return (
    <div className="post-card" style={{ display: 'flex', gap: '15px' }}>
      {/* Fake Avatar */}
      <div className="skeleton-box skeleton-avatar" style={{ flexShrink: 0 }}></div>
      
      {/* Fake Content */}
      <div style={{ flex: 1 }}>
        
        {/* Fake Name & Username */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <div className="skeleton-box" style={{ width: '120px', height: '16px' }}></div>
          <div className="skeleton-box" style={{ width: '80px', height: '16px' }}></div>
        </div>
        
        {/* Fake Paragraph (3 lines) */}
        <div className="skeleton-box" style={{ width: '100%', height: '16px', marginBottom: '10px' }}></div>
        <div className="skeleton-box" style={{ width: '85%', height: '16px', marginBottom: '10px' }}></div>
        <div className="skeleton-box" style={{ width: '60%', height: '16px', marginBottom: '20px' }}></div>
        
        {/* Fake Action Buttons Row */}
        <div style={{ display: 'flex', gap: '20px' }}>
          <div className="skeleton-box" style={{ width: '40px', height: '18px', borderRadius: '20px' }}></div>
          <div className="skeleton-box" style={{ width: '40px', height: '18px', borderRadius: '20px' }}></div>
          <div className="skeleton-box" style={{ width: '40px', height: '18px', borderRadius: '20px' }}></div>
        </div>

      </div>
    </div>
  );
}

export default PostSkeleton;