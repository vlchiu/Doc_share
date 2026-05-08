import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) { setStatus('error'); setMessage('Link không hợp lệ.'); return; }

    axiosClient.get(`/auth/verify-email?token=${token}`)
      .then(res => { setStatus('success'); setMessage(res.data.message); })
      .catch(err => { setStatus('error'); setMessage(err.response?.data?.message || 'Xác thực thất bại.'); });
  }, [searchParams]);

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '48px 40px', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', maxWidth: '420px', width: '100%' }}>
        {status === 'loading' && <><div style={{ fontSize: '48px' }}>⏳</div><p style={{ color: '#64748b', marginTop: '16px' }}>Đang xác thực...</p></>}
        {status === 'success' && (
          <>
            <div style={{ fontSize: '56px' }}>✅</div>
            <h2 style={{ color: '#10b981', margin: '16px 0 8px' }}>Xác thực thành công!</h2>
            <p style={{ color: '#64748b' }}>{message}</p>
            <Link to="/login" style={{ display: 'inline-block', marginTop: '20px', padding: '12px 28px', background: 'linear-gradient(135deg,#3b82f6,#06b6d4)', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' }}>
              Đăng nhập ngay →
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <div style={{ fontSize: '56px' }}>❌</div>
            <h2 style={{ color: '#ef4444', margin: '16px 0 8px' }}>Xác thực thất bại</h2>
            <p style={{ color: '#64748b' }}>{message}</p>
            <Link to="/login" style={{ display: 'inline-block', marginTop: '20px', padding: '12px 28px', background: '#f1f5f9', color: '#374151', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' }}>
              Quay lại đăng nhập
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default VerifyEmail;
