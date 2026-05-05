import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

function GoogleAuthSuccess() {
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const userId = params.get('userId');
    const error = params.get('error');

    if (error || !token) {
      toast.error('Đăng nhập Google thất bại. Vui lòng thử lại!');
      navigate('/login');
      return;
    }

    localStorage.setItem('token', token);
    if (userId) localStorage.setItem('userId', userId);
    toast.success('Đăng nhập Google thành công!');
    window.location.href = '/'; // reload để App.jsx fetch lại user
  }, []);

  return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
      <div style={{ width: '48px', height: '48px', border: '4px solid #e2e8f0', borderTop: '4px solid #3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: '#64748b', fontSize: '16px', fontWeight: '500' }}>Đang xử lý đăng nhập...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default GoogleAuthSuccess;
