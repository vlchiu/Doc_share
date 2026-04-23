function SkeletonCard() {
  return (
    <div style={{ background: '#fff', padding: '18px', borderRadius: '14px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .skeleton {
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 800px 100%;
          animation: shimmer 1.4s infinite;
          border-radius: 6px;
        }
      `}</style>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <div className="skeleton" style={{ width: '32px', height: '32px', borderRadius: '6px', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div className="skeleton" style={{ height: '16px', width: '80%' }} />
          <div className="skeleton" style={{ height: '12px', width: '55%' }} />
        </div>
      </div>
      <div className="skeleton" style={{ height: '48px', borderRadius: '8px' }} />
      <div style={{ display: 'flex', gap: '8px' }}>
        <div className="skeleton" style={{ flex: 1, height: '36px' }} />
        <div className="skeleton" style={{ flex: 1, height: '36px' }} />
        <div className="skeleton" style={{ flex: 1, height: '36px' }} />
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 12 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}

export default SkeletonCard;
