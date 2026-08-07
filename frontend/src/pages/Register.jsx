import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import axiosClient from '../api/axiosClient';

const STEPS = [
  { num: 1, label: 'Điền thông tin đăng ký' },
  { num: 2, label: 'Xác thực mã OTP qua email' },
  { num: 3, label: 'Đăng nhập và sử dụng' },
];

function Register() {
  const [step, setStep]         = useState(1);
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [otp, setOtp]           = useState(['', '', '', '', '', '']);
  const [resendLoading, setResendLoading]   = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showPass, setShowPass] = useState(false);
  const inputRefs = useRef([]);
  const navigate  = useNavigate();

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

  const handleVerify = async (e) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length < 6) { toast.error('Vui lòng nhập đủ 6 số'); return; }
    setLoading(true);
    try {
      await axiosClient.post('/auth/verify-email', { email, otp: otpCode });
      toast.success('Xác thực thành công!');
      setTimeout(() => navigate('/login'), 1200);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Mã OTP không đúng!');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally { setLoading(false); }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) inputRefs.current[index - 1]?.focus();
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) { setOtp(pasted.split('')); inputRefs.current[5]?.focus(); }
  };

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
    <div className="min-h-screen flex -mx-5 -my-8">
      {/* ── CỘT TRÁI ── */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-600 to-cyan-500 flex-col justify-center items-center p-16">
        <motion.div className="absolute w-72 h-72 rounded-full bg-white/10 -top-20 -right-20"
          animate={{ y: [0, -15, 0] }} transition={{ duration: 5, repeat: Infinity }} />
        <motion.div className="absolute w-48 h-48 rounded-full bg-white/10 -bottom-12 -left-12"
          animate={{ y: [0, 15, 0] }} transition={{ duration: 7, repeat: Infinity }} />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative text-center text-white z-10"
        >
          <motion.div className="text-7xl mb-6 inline-block"
            animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 4, repeat: Infinity }}>
            📚
          </motion.div>
          <h1 className="text-4xl font-bold mb-3">
            <span className="text-emerald-300">Doc</span>Share
          </h1>
          <p className="text-white/75 text-base leading-relaxed max-w-xs mx-auto mb-10">
            Tham gia cộng đồng chia sẻ tài liệu ngay hôm nay.
          </p>

          {/* Steps */}
          <div className="flex flex-col gap-4">
            {STEPS.map((s, i) => (
              <motion.div key={s.num}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.15 }}
                className="flex items-center gap-4"
              >
                <motion.div
                  className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-all duration-500"
                  style={{
                    background: step > s.num ? '#10b981' : step === s.num ? '#fff' : 'rgba(255,255,255,0.2)',
                    color: step === s.num ? '#065f46' : '#fff',
                  }}
                  animate={step === s.num ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  {step > s.num ? '✓' : s.num}
                </motion.div>
                <span className={`text-sm font-medium transition-all ${step >= s.num ? 'text-white' : 'text-white/40'}`}>
                  {s.label}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── CỘT PHẢI ── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <span className="text-5xl">📚</span>
            <h1 className="text-2xl font-bold mt-2">
              <span className="text-emerald-600">Doc</span>Share
            </h1>
          </div>

          <AnimatePresence mode="wait">
            {/* ── BƯỚC 1 ── */}
            {step === 1 && (
              <motion.div key="step1"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-slate-800 mb-2">Tạo tài khoản mới ✨</h2>
                  <p className="text-slate-500">Chỉ mất 30 giây để bắt đầu</p>
                </div>

                <form onSubmit={handleRegister} className="flex flex-col gap-5">
                  {[
                    { label: 'Họ và tên', type: 'text', placeholder: 'Nguyễn Văn A', value: name, onChange: e => setName(e.target.value) },
                    { label: 'Email', type: 'email', placeholder: 'you@example.com', value: email, onChange: e => setEmail(e.target.value) },
                  ].map(field => (
                    <div key={field.label}>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">{field.label}</label>
                      <input type={field.type} placeholder={field.placeholder}
                        value={field.value} onChange={field.onChange} required
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 bg-white"
                      />
                    </div>
                  ))}

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Mật khẩu</label>
                    <div className="relative">
                      <input type={showPass ? 'text' : 'password'} placeholder="Ít nhất 6 ký tự"
                        value={password} onChange={e => setPassword(e.target.value)} required
                        className="w-full px-4 py-3 pr-12 rounded-xl border-2 border-slate-200 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 bg-white"
                      />
                      <button type="button" onClick={() => setShowPass(!showPass)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-transparent border-0 cursor-pointer text-lg">
                        {showPass ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>

                  <motion.button type="submit" disabled={loading}
                    whileHover={!loading ? { scale: 1.02 } : {}}
                    whileTap={!loading ? { scale: 0.98 } : {}}
                    className="w-full py-3.5 rounded-xl font-bold text-white text-sm border-0 cursor-pointer"
                    style={{ background: loading ? '#6ee7b7' : 'linear-gradient(135deg, #10b981, #06b6d4)' }}
                  >
                    {loading ? 'Đang gửi mã...' : 'Tiếp theo →'}
                  </motion.button>
                </form>

                <p className="text-center mt-6 text-slate-500 text-sm">
                  Đã có tài khoản?{' '}
                  <Link to="/login" className="text-emerald-600 font-bold no-underline">Đăng nhập</Link>
                </p>

                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-slate-400 text-xs">hoặc</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>

                <motion.a href={`${import.meta.env.VITE_API_URL}/api/auth/google`}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="flex items-center justify-center gap-3 py-3.5 rounded-xl border-2 border-slate-200 bg-white no-underline text-slate-700 font-semibold text-sm"
                >
                  <svg width="20" height="20" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                  Đăng ký với Google
                </motion.a>
              </motion.div>
            )}

            {/* ── BƯỚC 2 — OTP ── */}
            {step === 2 && (
              <motion.div key="step2"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-center mb-8">
                  <motion.div className="text-6xl mb-4" animate={{ y: [0, -8, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                    📧
                  </motion.div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Nhập mã xác thực</h2>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    Mã OTP 6 số đã được gửi đến<br />
                    <strong className="text-slate-800">{email}</strong>
                  </p>
                </div>

                <form onSubmit={handleVerify}>
                  <div className="flex gap-3 justify-center mb-8" onPaste={handleOtpPaste}>
                    {otp.map((digit, index) => (
                      <motion.input
                        key={index}
                        ref={el => inputRefs.current[index] = el}
                        type="text" inputMode="numeric" maxLength={1}
                        value={digit}
                        onChange={e => handleOtpChange(index, e.target.value)}
                        onKeyDown={e => handleOtpKeyDown(index, e)}
                        whileFocus={{ scale: 1.1 }}
                        className="w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 outline-none transition-all duration-200"
                        style={{
                          borderColor: digit ? '#10b981' : '#e2e8f0',
                          background: digit ? '#f0fdf4' : '#fff',
                          color: '#1a1a1a'
                        }}
                      />
                    ))}
                  </div>

                  <motion.button type="submit"
                    disabled={loading || otp.join('').length < 6}
                    whileHover={otp.join('').length === 6 ? { scale: 1.02 } : {}}
                    whileTap={otp.join('').length === 6 ? { scale: 0.98 } : {}}
                    className="w-full py-3.5 rounded-xl font-bold text-sm border-0 cursor-pointer transition-all"
                    style={{
                      background: otp.join('').length < 6 ? '#e2e8f0' : 'linear-gradient(135deg, #10b981, #06b6d4)',
                      color: otp.join('').length < 6 ? '#94a3b8' : '#fff',
                      cursor: otp.join('').length < 6 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {loading ? '⏳ Đang xác thực...' : '✅ Xác thực'}
                  </motion.button>
                </form>

                <div className="text-center mt-5">
                  {resendCooldown > 0 ? (
                    <p className="text-slate-400 text-sm">Gửi lại sau <strong className="text-slate-600">{resendCooldown}s</strong></p>
                  ) : (
                    <button onClick={handleResend} disabled={resendLoading}
                      className="bg-transparent border-0 text-emerald-600 font-bold text-sm cursor-pointer hover:text-emerald-700">
                      {resendLoading ? 'Đang gửi...' : '🔄 Gửi lại mã OTP'}
                    </button>
                  )}
                </div>

                <button onClick={() => { setStep(1); setOtp(['', '', '', '', '', '']); }}
                  className="block mx-auto mt-3 bg-transparent border-0 text-slate-400 text-sm cursor-pointer hover:text-slate-600">
                  ← Quay lại
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default Register;
