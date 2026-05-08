import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import axiosClient from '../api/axiosClient';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [needVerify, setNeedVerify] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setNeedVerify(false);
    try {
      const res = await axiosClient.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('userId', res.data.user.id);
      toast.success('Đăng nhập thành công!');
      setTimeout(() => { window.location.href = '/'; }, 800);
    } catch (error) {
      if (error.response?.data?.needVerify) {
        setNeedVerify(true);
      } else {
        toast.error(error.response?.data?.message || 'Sai thông tin đăng nhập!');
      }
    } finally { setLoading(false); }
  };

  const handleResendVerify = async () => {
    setResendLoading(true);
    try {
      await axiosClient.post('/auth/resend-verify', { email });
      toast.success('Đã gửi lại email xác thực!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi gửi email');
    } finally { setResendLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', margin: '-30px -20px', background: '#f8fafc' }}>
      {/* CỘT TRÁI — GRADIENT */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #06b6d4 100%)',
        padding: '60px 40px', position: 'relative', overflow: 'hidden'
      }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', bottom: '-60px', left: '-60px', width: '250px', height: '250px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', top: '40%', left: '10%', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

        <div style={{ position: 'relative', textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>📚</div>
          <h1 style={{ margin: '0 0 12px', fontSize: '32px', fontWeight: 'bold', letterSpacing: '-0.5px' }}>
            <span style={{ color: '#bfdbfe' }}>Doc</span>Share
          </h1>
          <p style={{ margin: 0, fontSize: '16px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, maxWidth: '280px' }}>
            Nền tảng chia sẻ tài liệu nội bộ — nhanh, gọn, bảo mật.
          </p>

          <div style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
            {['📄 Chia sẻ tài liệu dễ dàng', '🔒 Kiểm duyệt nội dung', '💬 Bình luận & đánh giá', '🔔 Thông báo realtime'].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'rgba(255,255,255,0.85)', fontSize: '14px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#93c5fd', flexShrink: 0 }} />
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CỘT PHẢI — FORM */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: '28px', fontWeight: 'bold', color: '#1a1a1a' }}>Chào mừng trở lại 👋</h2>
            <p style={{ margin: 0, color: '#64748b', fontSize: '15px' }}>Đăng nhập để tiếp tục</p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '7px', fontSize: '14px' }}>Email</label>
              <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required
                style={{ width: '100%', padding: '13px 16px', borderRadius: '10px', border: '2px solid #e2e8f0', fontSize: '15px', outline: 'none', boxSizing: 'border-box', transition: '0.2s' }}
                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '7px', fontSize: '14px' }}>Mật khẩu</label>
              <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required
                style={{ width: '100%', padding: '13px 16px', borderRadius: '10px', border: '2px solid #e2e8f0', fontSize: '15px', outline: 'none', boxSizing: 'border-box', transition: '0.2s' }}
                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
            <button type="submit" disabled={loading} style={{
              padding: '14px', marginTop: '4px',
              background: loading ? '#93c5fd' : 'linear-gradient(135deg, #3b82f6, #06b6d4)',
              color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer', fontSize: '15px',
              boxShadow: loading ? 'none' : '0 4px 15px rgba(59,130,246,0.4)',
              transition: '0.2s'
            }}>
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập →'}
            </button>
          </form>

          {/* Thông báo chưa xác thực email */}
          {needVerify && (
            <div style={{ marginTop: '16px', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '10px', padding: '14px 16px' }}>
              <p style={{ margin: '0 0 8px', color: '#92400e', fontWeight: 'bold', fontSize: '14px' }}>
                ⚠️ Email chưa được xác thực
              </p>
              <p style={{ margin: '0 0 10px', color: '#78350f', fontSize: '13px' }}>
                Vui lòng kiểm tra hộp thư <strong>{email}</strong> và nhấn link xác thực.
              </p>
              <button onClick={handleResendVerify} disabled={resendLoading}
                style={{ padding: '7px 16px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>
                {resendLoading ? 'Đang gửi...' : '📧 Gửi lại email xác thực'}
              </button>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <Link to="/forgot-password" style={{ color: '#3b82f6', fontSize: '13px', textDecoration: 'none', fontWeight: '500' }}>
              Quên mật khẩu?
            </Link>
          </div>

          <p style={{ textAlign: 'center', marginTop: '24px', color: '#64748b', fontSize: '14px' }}>
            Chưa có tài khoản?{' '}
            <Link to="/register" style={{ color: '#3b82f6', fontWeight: 'bold', textDecoration: 'none' }}>Đăng ký ngay</Link>
          </p>

          {/* DIVIDER */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0 0' }}>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
            <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '500' }}>hoặc</span>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
          </div>

          {/* GOOGLE LOGIN */}
          <a href={`${import.meta.env.VITE_API_URL}/api/auth/google`}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '13px', marginTop: '16px', background: '#fff', border: '2px solid #e2e8f0', borderRadius: '10px', textDecoration: 'none', color: '#374151', fontWeight: 'bold', fontSize: '15px', transition: '0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#4285F4'; e.currentTarget.style.background = '#f8fafc'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff'; }}>
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              <path fill="none" d="M0 0h48v48H0z"/>
            </svg>
            Đăng nhập với Google
          </a>
        </div>
      </div>
    </div>
  );
}

export default Login;
