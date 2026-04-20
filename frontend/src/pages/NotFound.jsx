import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <div style={{ fontSize: '80px', marginBottom: '16px' }}>🔍</div>
      <h1 style={{ fontSize: '48px', fontWeight: 'bold', color: '#1a1a1a', margin: '0 0 8px' }}>404</h1>
      <p style={{ fontSize: '18px', color: '#64748b', marginBottom: '32px' }}>Trang bạn tìm không tồn tại.</p>
      <Link to="/" style={{ padding: '12px 28px', background: '#3b82f6', color: '#fff', borderRadius: '10px', textDecoration: 'none', fontWeight: 'bold', fontSize: '15px' }}>
        ← Về trang chủ
      </Link>
    </div>
  );
}

export default NotFound;
