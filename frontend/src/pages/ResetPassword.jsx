import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import axiosClient from '../api/axiosClient';

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) { toast.error('Mật khẩu phải có ít nhất 6 ký tự'); return; }
    if (newPassword !== confirm) { toast.error('Mật khẩu xác nhận không khớp'); return; }
    setLoading(true);
    try {
      await axiosClient.post('/auth/reset-password', { token, newPassword });
      toast.success('Đặt lại mật khẩu thành công!');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Link không hợp lệ hoặc đã hết hạn.');
    } finally { setLoading(false); }
  };

  if (!token) return (
    <div style={{ textAlign: 'center', padding: '60px' }}>
      <p style={{ color: '#ef4444' }}>Link không hợp lệ.</p>
      <Link to="/forgot-password" style={{ color: '#3b82f6' }}>Yêu cầu link mới</Link>
    </div>
  );

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '48px 40px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', maxWidth: '420px', width: '100%' }}>
        <h2 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 'bold', color: '#1a1a1a' }}>🔐 Đặt lại mật khẩu</h2>
        <p style={{ margin: '0 0 28px', color: '#64748b', fontSize: '14px' }}>Nhập mật khẩu mới cho tài khoản của bạn.</p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[
            { label: 'Mật khẩu mới', value: newPassword, onChange: e => setNewPassword(e.target.value) },
            { label: 'Xác nhận mật khẩu', value: confirm, onChange: e => setConfirm(e.target.value) },
          ].map(field => (
            <div key={field.label}>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '7px', fontSize: '14px' }}>{field.label}</label>
              <input type="password" placeholder="••••••••" value={field.value} onChange={field.onChange} required
                style={{ width: '100%', padding: '13px 16px', borderRadius: '10px', border: '2px solid #e2e8f0', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
          ))}
          <button type="submit" disabled={loading} style={{
            padding: '13px', background: loading ? '#93c5fd' : 'linear-gradient(135deg,#3b82f6,#06b6d4)',
            color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer', fontSize: '15px'
          }}>
            {loading ? 'Đang lưu...' : 'Đặt lại mật khẩu →'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ResetPassword;
