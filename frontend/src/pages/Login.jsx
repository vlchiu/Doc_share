import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axiosClient.post('/auth/login', { email, password });
      alert('✅ Đăng nhập thành công!');
      
      localStorage.setItem('token', response.data.token);
      
      // SỬA DÒNG NÀY: Xóa navigate('/'), thay bằng:
      window.location.href = '/'; 
      
    } catch (error) {
      alert('❌ Lỗi: ' + (error.response?.data?.message || 'Sai thông tin đăng nhập!'));
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>🔑 Đăng nhập</h2>
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ padding: '10px' }} />
        <input type="password" placeholder="Mật khẩu" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ padding: '10px' }} />
        <button type="submit" style={{ padding: '10px', background: '#008CBA', color: 'white', border: 'none', cursor: 'pointer' }}>Đăng Nhập</button>
      </form>
      <p style={{ textAlign: 'center' }}>Chưa có tài khoản? <a href="/register">Đăng ký ngay</a></p>
    </div>
  );
}

export default Login;