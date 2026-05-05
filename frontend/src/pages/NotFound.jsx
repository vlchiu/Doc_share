import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      {/* Gradient circle background */}
      <div style={{ position: 'relative', display: 'inline-block', marginBottom: '24px' }}>
        <div style={{ width: '140px', height: '140px', borderRadius: '50%', background: 'linear-gradient(135deg, #dbeafe, #e0f2fe)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
          <span style={{ fontSize: '64px' }}>🔍</span>
        </div>
      </div>
      <h1 style={{ fontSize: '72px', fontWeight: 'bold', margin: '0 0 8px', background: 'linear-gradient(135deg, #1e3a8a, #3b82f6, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>404</h1>
      <p style={{ fontSize: '20px', color: '#334155', fontWeight: '600', marginBottom: '8px' }}>Trang không tồn tại</p>
      <p style={{ fontSize: '15px', color: '#94a3b8', marginBottom: '36px' }}>Trang bạn đang tìm kiếm đã bị xóa hoặc không tồn tại.</p>
      <Link to="/" style={{ padding: '13px 32px', background: 'linear-gradient(135deg, #3b82f6, #06b6d4)', color: '#fff', borderRadius: '12px', textDecoration: 'none', fontWeight: 'bold', fontSize: '15px', boxShadow: '0 4px 15px rgba(59,130,246,0.4)' }}>
        ← Về trang chủ
      </Link>
    </div>
  );
}

export default NotFound;
