import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import axiosClient from '../api/axiosClient';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axiosClient.post('/auth/forgot-password', { email });
      setSent(true);
    } catch {
      toast.error('Có lỗi xảy ra, vui lòng thử lại.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '48px 40px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', maxWidth: '420px', width: '100%' }}>
        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '56px' }}>📧</div>
            <h2 style={{ color: '#1a1a1a', margin: '16px 0 8px' }}>Kiểm tra email!</h2>
            <p style={{ color: '#64748b', lineHeight: 1.6 }}>
              Nếu email <strong>{email}</strong> tồn tại trong hệ thống, chúng tôi đã gửi link đặt lại mật khẩu. Link có hiệu lực trong <strong>1 giờ</strong>.
            </p>
            <Link to="/login" style={{ display: 'inline-block', marginTop: '20px', color: '#3b82f6', fontWeight: 'bold', textDecoration: 'none' }}>
              ← Quay lại đăng nhập
            </Link>
          </div>
        ) : (
          <>
            <h2 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 'bold', color: '#1a1a1a' }}>🔑 Quên mật khẩu</h2>
            <p style={{ margin: '0 0 28px', color: '#64748b', fontSize: '14px' }}>Nhập email đã đăng ký, chúng tôi sẽ gửi link đặt lại mật khẩu.</p>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '7px', fontSize: '14px' }}>Email</label>
                <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required
                  style={{ width: '100%', padding: '13px 16px', borderRadius: '10px', border: '2px solid #e2e8f0', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = '#3b82f6'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>
              <button type="submit" disabled={loading} style={{
                padding: '13px', background: loading ? '#93c5fd' : 'linear-gradient(135deg,#3b82f6,#06b6d4)',
                color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer', fontSize: '15px'
              }}>
                {loading ? 'Đang gửi...' : 'Gửi link đặt lại →'}
              </button>
            </form>
            <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px' }}>
              <Link to="/login" style={{ color: '#3b82f6', fontWeight: 'bold', textDecoration: 'none' }}>← Quay lại đăng nhập</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default ForgotPassword;
