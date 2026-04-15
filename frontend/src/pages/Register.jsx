import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';

function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate(); // Dùng để chuyển trang sau khi đăng ký xong

  const handleRegister = async (e) => {
    e.preventDefault(); // Ngăn form tự động reload trang
    try {
      await axiosClient.post('/auth/register', { name, email, password });
      alert('🎉 Đăng ký thành công! Hãy đăng nhập nhé.');
      navigate('/login'); // Chuyển thẳng sang trang Đăng nhập
    } catch (error) {
      alert('❌ Lỗi: ' + (error.response?.data?.message || 'Có lỗi xảy ra!'));
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>📝 Đăng ký tài khoản</h2>
      <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input type="text" placeholder="Họ và Tên" value={name} onChange={(e) => setName(e.target.value)} required style={{ padding: '10px' }} />
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ padding: '10px' }} />
        <input type="password" placeholder="Mật khẩu" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ padding: '10px' }} />
        <button type="submit" style={{ padding: '10px', background: '#4CAF50', color: 'white', border: 'none', cursor: 'pointer' }}>Đăng Ký</button>
      </form>
      <p style={{ textAlign: 'center' }}>Đã có tài khoản? <a href="/login">Đăng nhập</a></p>
    </div>
  );
}

export default Register;