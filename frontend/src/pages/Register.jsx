import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import axiosClient from '../api/axiosClient';

function Register() {
  const [step, setStep] = useState(1); // 1: form đăng ký, 2: nhập OTP
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef([]);
  const navigate = useNavigate();

  // Bước 1: Gửi form → nhận OTP
  const handleRegister = async (e) => {
    e.preventDefault();
    if (password.length < 6) { toast.error('Mật khẩu phải có ít nhất 6 ký tự!'); return; }
    setLoading(true);
    try {
      await axiosClient.post('/auth/register', { name, email, password });
      toast.success('Mã OTP đã gửi về email!');
      setStep(2);
      startCooldown();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra!');
    } finally { setLoading(false); }
  };

  // Bước 2: Xác thực OTP
  const handleVerify = async (e) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length < 6) { toast.error('Vui lòng nhập đủ 6 số'); return; }
    setLoading(true);
    try {
      await axiosClient.post('/auth/verify-email', { email, otp: otpCode });
      toast.success('Xác thực thành công! Đang chuyển đến trang đăng nhập...');
      setTimeout(() => navigate('/login'), 1200);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Mã OTP không đúng!');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally { setLoading(false); }
  };

  // Xử lý nhập từng ô OTP
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  // Cooldown gửi lại OTP
  const startCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown(prev => { if (prev <= 1) { clearInterval(interval); return 0; } return prev - 1; });
    }, 1000);
  };

  const handleResend = async () => {
    setResendLoading(true);
    try {
      await axiosClient.post('/auth/resend-verify', { email });
      toast.success('Đã gửi lại mã OTP!');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      startCooldown();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi gửi lại OTP');
    } finally { setResendLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', margin: '-30px -20px', background: '#f8fafc' }}>
      {/* CỘT TRÁI */}
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
          {/* Steps indicator */}
          <div style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { num: 1, label: 'Điền thông tin đăng ký' },
              { num: 2, label: 'Xác thực mã OTP qua email' },
              { num: 3, label: 'Đăng nhập và sử dụng' },
            ].map(s => (
              <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                  background: step > s.num ? '#10b981' : step === s.num ? '#fff' : 'rgba(255,255,255,0.2)',
                  color: step === s.num ? '#065f46' : '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 'bold', fontSize: '13px'
                }}>
                  {step > s.num ? '✓' : s.num}
                </div>
                <span style={{ color: step >= s.num ? '#fff' : 'rgba(255,255,255,0.5)', fontSize: '14px', fontWeight: step === s.num ? 'bold' : 'normal' }}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CỘT PHẢI */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>

          {/* BƯỚC 1: Form đăng ký */}
          {step === 1 && (
            <>
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
                  boxShadow: loading ? 'none' : '0 4px 15px rgba(16,185,129,0.4)', transition: '0.2s'
                }}>
                  {loading ? 'Đang gửi mã...' : 'Tiếp theo →'}
                </button>
              </form>
              <p style={{ textAlign: 'center', marginTop: '24px', color: '#64748b', fontSize: '14px' }}>
                Đã có tài khoản?{' '}
                <Link to="/login" style={{ color: '#10b981', fontWeight: 'bold', textDecoration: 'none' }}>Đăng nhập</Link>
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0 0' }}>
                <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                <span style={{ color: '#94a3b8', fontSize: '13px' }}>hoặc</span>
                <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
              </div>
              <a href={`${import.meta.env.VITE_API_URL}/api/auth/google`}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '13px', marginTop: '16px', background: '#fff', border: '2px solid #e2e8f0', borderRadius: '10px', textDecoration: 'none', color: '#374151', fontWeight: 'bold', fontSize: '15px' }}
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
            </>
          )}

          {/* BƯỚC 2: Nhập OTP */}
          {step === 2 && (
            <>
              <div style={{ marginBottom: '32px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>📧</div>
                <h2 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 'bold', color: '#1a1a1a' }}>Nhập mã xác thực</h2>
                <p style={{ margin: 0, color: '#64748b', fontSize: '14px', lineHeight: 1.6 }}>
                  Mã OTP 6 số đã được gửi đến<br />
                  <strong style={{ color: '#1a1a1a' }}>{email}</strong>
                </p>
              </div>

              <form onSubmit={handleVerify}>
                {/* 6 ô nhập OTP */}
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '24px' }} onPaste={handleOtpPaste}>
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={el => inputRefs.current[index] = el}
                      type="text" inputMode="numeric" maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(index, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(index, e)}
                      style={{
                        width: '48px', height: '56px', textAlign: 'center', fontSize: '22px', fontWeight: 'bold',
                        borderRadius: '10px', border: `2px solid ${digit ? '#10b981' : '#e2e8f0'}`,
                        outline: 'none', transition: '0.2s', background: digit ? '#f0fdf4' : '#fff'
                      }}
                      onFocus={e => e.target.style.borderColor = '#10b981'}
                      onBlur={e => e.target.style.borderColor = digit ? '#10b981' : '#e2e8f0'}
                    />
                  ))}
                </div>

                <button type="submit" disabled={loading || otp.join('').length < 6} style={{
                  width: '100%', padding: '14px',
                  background: otp.join('').length < 6 ? '#e2e8f0' : 'linear-gradient(135deg, #10b981, #06b6d4)',
                  color: otp.join('').length < 6 ? '#94a3b8' : '#fff',
                  border: 'none', borderRadius: '10px', fontWeight: 'bold',
                  cursor: otp.join('').length < 6 ? 'not-allowed' : 'pointer', fontSize: '15px', transition: '0.2s'
                }}>
                  {loading ? 'Đang xác thực...' : '✅ Xác thực'}
                </button>
              </form>

              {/* Gửi lại OTP */}
              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                {resendCooldown > 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '14px' }}>Gửi lại sau <strong>{resendCooldown}s</strong></p>
                ) : (
                  <button onClick={handleResend} disabled={resendLoading}
                    style={{ background: 'none', border: 'none', color: '#10b981', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}>
                    {resendLoading ? 'Đang gửi...' : '🔄 Gửi lại mã OTP'}
                  </button>
                )}
              </div>

              <button onClick={() => { setStep(1); setOtp(['', '', '', '', '', '']); }}
                style={{ display: 'block', margin: '12px auto 0', background: 'none', border: 'none', color: '#64748b', fontSize: '14px', cursor: 'pointer' }}>
                ← Quay lại
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Register;
