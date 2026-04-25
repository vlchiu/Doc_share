import { useState } from 'react';

function StarRating({ avgScore, totalRatings, userScore, onRate, readonly = false }) {
  const [hovered, setHovered] = useState(0);

  const display = hovered || userScore || 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ display: 'flex', gap: '2px' }}>
        {[1, 2, 3, 4, 5].map(star => (
          <span
            key={star}
            onClick={() => !readonly && onRate && onRate(star)}
            onMouseEnter={() => !readonly && setHovered(star)}
            onMouseLeave={() => !readonly && setHovered(0)}
            style={{
              fontSize: '22px',
              cursor: readonly ? 'default' : 'pointer',
              color: star <= (readonly ? Math.round(avgScore || 0) : display) ? '#f59e0b' : '#e2e8f0',
              transition: '0.1s',
              lineHeight: 1
            }}
          >★</span>
        ))}
      </div>
      <span style={{ fontSize: '13px', color: '#64748b' }}>
        {avgScore ? `${avgScore.toFixed(1)} (${totalRatings} đánh giá)` : 'Chưa có đánh giá'}
      </span>
      {!readonly && userScore && (
        <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 'bold' }}>✓ Bạn đã đánh giá {userScore}★</span>
      )}
    </div>
  );
}

export default StarRating;
