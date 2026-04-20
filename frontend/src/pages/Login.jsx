import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import axiosClient from '../api/axiosClient';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axiosClient.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      toast.success('Đăng nhập thành công!');
      setTimeout(() => { window.location.href = '/'; }, 800);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Sai thông tin đăng nhập!');
    } finally { setLoading(false); }
  };

  const inputStyle = { width: '100%', padding: '13px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '15px', outline: 'none', boxSizing: 'border-box' };

  return (
    <div style={{ maxWidth: '420px', margin: '60px auto' }}>
      <div style={{ background: '#fff', padding: '40px', borderRadius: '20px', boxShadow: '0 8px 30px rgba(0,0,0,0.07)' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '40px', marginBottom: '8px' }}>🔑</div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#1a1a1a' }}>Đăng nhập</h2>
          <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: '14px' }}>Chào mừng trở lại!</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '6px', fontSize: '14px' }}>Email</label>
            <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '6px', fontSize: '14px' }}>Mật khẩu</label>
            <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} />
          </div>
          <button type="submit" disabled={loading} style={{ padding: '14px', background: loading ? '#93c5fd' : '#3b82f6', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '15px', marginTop: '8px' }}>
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '24px', color: '#64748b', fontSize: '14px' }}>
          Chưa có tài khoản? <Link to="/register" style={{ color: '#3b82f6', fontWeight: 'bold', textDecoration: 'none' }}>Đăng ký ngay</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
