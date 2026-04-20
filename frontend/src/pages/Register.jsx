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

  const inputStyle = { width: '100%', padding: '13px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '15px', outline: 'none', boxSizing: 'border-box' };

  return (
    <div style={{ maxWidth: '420px', margin: '60px auto' }}>
      <div style={{ background: '#fff', padding: '40px', borderRadius: '20px', boxShadow: '0 8px 30px rgba(0,0,0,0.07)' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '40px', marginBottom: '8px' }}>📝</div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#1a1a1a' }}>Tạo tài khoản</h2>
          <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: '14px' }}>Tham gia cộng đồng DocShare!</p>
        </div>

        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '6px', fontSize: '14px' }}>Họ và tên</label>
            <input type="text" placeholder="Nguyễn Văn A" value={name} onChange={e => setName(e.target.value)} required style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '6px', fontSize: '14px' }}>Email</label>
            <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '6px', fontSize: '14px' }}>Mật khẩu</label>
            <input type="password" placeholder="Ít nhất 6 ký tự" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} />
          </div>
          <button type="submit" disabled={loading} style={{ padding: '14px', background: loading ? '#6ee7b7' : '#10b981', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '15px', marginTop: '8px' }}>
            {loading ? 'Đang tạo tài khoản...' : 'Đăng ký'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '24px', color: '#64748b', fontSize: '14px' }}>
          Đã có tài khoản? <Link to="/login" style={{ color: '#3b82f6', fontWeight: 'bold', textDecoration: 'none' }}>Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
