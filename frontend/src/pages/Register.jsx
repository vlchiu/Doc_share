import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import axiosClient from '../api/axiosClient';

function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    if (password.length < 6) { toast.error('Mật khẩu phải có ít nhất 6 ký tự!'); return; }
    setLoading(true);
    try {
      await axiosClient.post('/auth/register', { name, email, password });
      toast.success('Đăng ký thành công! Hãy đăng nhập.');
      setTimeout(() => navigate('/login'), 1000);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra!');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', margin: '-30px -20px', background: '#f8fafc' }}>
      {/* CỘT TRÁI — GRADIENT */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        background: 'linear-gradient(135deg, #065f46 0%, #10b981 50%, #06b6d4 100%)',
        padding: '60px 40px', position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', bottom: '-60px', left: '-60px', width: '250px', height: '250px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />

        <div style={{ position: 'relative', textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>📚</div>
          <h1 style={{ margin: '0 0 12px', fontSize: '32px', fontWeight: 'bold' }}>
            <span style={{ color: '#a7f3d0' }}>Doc</span>Share
          </h1>
          <p style={{ margin: 0, fontSize: '16px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, maxWidth: '280px' }}>
            Tham gia cộng đồng chia sẻ tài liệu ngay hôm nay.
          </p>

          <div style={{ marginTop: '40px', background: 'rgba(255,255,255,0.1)', borderRadius: '16px', padding: '20px 24px', backdropFilter: 'blur(10px)' }}>
            <p style={{ margin: '0 0 8px', fontWeight: 'bold', fontSize: '15px' }}>Tại sao chọn DocShare?</p>
            {['Miễn phí hoàn toàn', 'Duyệt nội dung chặt chẽ', 'Tìm kiếm thông minh', 'Thông báo tức thì'].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.85)', fontSize: '13px', marginTop: '8px' }}>
                <span style={{ color: '#6ee7b7' }}>✓</span> {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CỘT PHẢI — FORM */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: '28px', fontWeight: 'bold', color: '#1a1a1a' }}>Tạo tài khoản mới ✨</h2>
            <p style={{ margin: 0, color: '#64748b', fontSize: '15px' }}>Chỉ mất 30 giây để bắt đầu</p>
          </div>

          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { label: 'Họ và tên', type: 'text', placeholder: 'Nguyễn Văn A', value: name, onChange: e => setName(e.target.value) },
              { label: 'Email', type: 'email', placeholder: 'you@example.com', value: email, onChange: e => setEmail(e.target.value) },
              { label: 'Mật khẩu', type: 'password', placeholder: 'Ít nhất 6 ký tự', value: password, onChange: e => setPassword(e.target.value) },
            ].map(field => (
              <div key={field.label}>
                <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '7px', fontSize: '14px' }}>{field.label}</label>
                <input type={field.type} placeholder={field.placeholder} value={field.value} onChange={field.onChange} required
                  style={{ width: '100%', padding: '13px 16px', borderRadius: '10px', border: '2px solid #e2e8f0', fontSize: '15px', outline: 'none', boxSizing: 'border-box', transition: '0.2s' }}
                  onFocus={e => e.target.style.borderColor = '#10b981'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>
            ))}
            <button type="submit" disabled={loading} style={{
              padding: '14px', marginTop: '4px',
              background: loading ? '#6ee7b7' : 'linear-gradient(135deg, #10b981, #06b6d4)',
              color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer', fontSize: '15px',
              boxShadow: loading ? 'none' : '0 4px 15px rgba(16,185,129,0.4)',
              transition: '0.2s'
            }}>
              {loading ? 'Đang tạo tài khoản...' : 'Đăng ký ngay →'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '24px', color: '#64748b', fontSize: '14px' }}>
            Đã có tài khoản?{' '}
            <Link to="/login" style={{ color: '#10b981', fontWeight: 'bold', textDecoration: 'none' }}>Đăng nhập</Link>
          </p>

          {/* DIVIDER */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0 0' }}>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
            <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '500' }}>hoặc</span>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
          </div>

          {/* GOOGLE REGISTER */}
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
            Đăng ký với Google
          </a>
        </div>
      </div>
    </div>
  );
}

export default Register;
