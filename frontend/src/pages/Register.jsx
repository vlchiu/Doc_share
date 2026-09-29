import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  KeyRound,
  RotateCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import axiosClient from '../api/axiosClient';

const STEPS = [
  { num: 1, label: 'Điền thông tin đăng ký' },
  { num: 2, label: 'Xác thực mã OTP qua email' },
  { num: 3, label: 'Hoàn tất & bắt đầu sử dụng' },
];

function Register() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showPass, setShowPass] = useState(false);
  const inputRefs = useRef([]);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự!');
      return;
    }
    setLoading(true);
    try {
      await axiosClient.post('/auth/register', { name, email, password });
      toast.success('Mã OTP đã được gửi về email của bạn!');
      setStep(2);
      startCooldown();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra!');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length < 6) {
      toast.error('Vui lòng nhập đủ 6 chữ số mã OTP');
      return;
    }
    setLoading(true);
    try {
      await axiosClient.post('/auth/verify-email', { email, otp: otpCode });
      toast.success('Xác thực tài khoản thành công!');
      setTimeout(() => navigate('/login'), 1000);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Mã OTP không đúng hoặc đã hết hạn!');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

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

  const startCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
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
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-6">
      <div className="w-full max-w-5xl rounded-3xl bg-white/80 backdrop-blur-xl border border-slate-200/80 shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-2">
        {/* ── LEFT SHOWCASE BENTO ── */}
        <div className="relative p-10 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col justify-between overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <Link to="/" className="inline-flex items-center gap-2.5 no-underline mb-8">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white shadow-md">
                <Layers className="w-5 h-5" />
              </div>
              <span className="text-xl font-black tracking-tight text-white">
                Doc<span className="text-indigo-400">Share</span>
              </span>
            </Link>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
              Gia nhập cộng đồng <br />
              <span className="gradient-text">chia sẻ tri thức.</span>
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed max-w-sm">
              Đăng ký tài khoản để tải tài liệu không giới hạn, lưu trữ cá nhân và trò chuyện trực tiếp với AI.
            </p>
          </div>

          {/* Stepper info */}
          <div className="relative z-10 mt-8 space-y-4">
            {STEPS.map((s) => (
              <div key={s.num} className="flex items-center gap-3.5 text-xs">
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs transition-all ${
                    step > s.num
                      ? 'bg-emerald-500 text-white'
                      : step === s.num
                      ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/20'
                      : 'bg-white/10 text-slate-400 border border-white/10'
                  }`}
                >
                  {step > s.num ? '✓' : s.num}
                </div>
                <span className={step >= s.num ? 'text-white font-semibold' : 'text-slate-400'}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          <div className="relative z-10 mt-8 pt-4 border-t border-white/10 text-[11px] text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Thông tin được bảo mật và mã hóa an toàn.</span>
          </div>
        </div>

        {/* ── RIGHT FORM (STEP 1 & STEP 2) ── */}
        <div className="p-8 sm:p-12 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Tạo tài khoản mới</h3>
                  <p className="text-xs text-slate-500 mt-1">Chỉ mất 30 giây để hoàn tất đăng ký</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Họ và tên
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="Nguyễn Văn A"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/70 outline-none transition-all font-medium"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Địa chỉ Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/70 outline-none transition-all font-medium"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Mật khẩu (ít nhất 6 ký tự)
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type={showPass ? 'text' : 'password'}
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-2.5 rounded-2xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/70 outline-none transition-all font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-transparent border-0 cursor-pointer p-0"
                      >
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Submit button */}
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-2xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 border-0 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Đang gửi mã xác thực...</span>
                      </>
                    ) : (
                      <>
                        <span>Tiếp tục xác thực OTP</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </motion.button>
                </form>

                {/* OR DIVIDER */}
                <div className="relative my-4 text-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <span className="relative px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-white">
                    hoặc đăng ký bằng
                  </span>
                </div>

                {/* GOOGLE SIGN IN */}
                <a
                  href={`${import.meta.env.VITE_API_URL}/api/auth/google`}
                  className="flex items-center justify-center gap-3 py-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all no-underline shadow-2xs"
                >
                  <svg width="18" height="18" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                  <span>Đăng ký nhanh với Google</span>
                </a>

                <p className="text-center text-xs text-slate-500">
                  Đã có tài khoản?{' '}
                  <Link to="/login" className="font-bold text-indigo-600 hover:text-indigo-700 no-underline">
                    Đăng nhập ngay
                  </Link>
                </p>
              </motion.div>
            ) : (
              /* STEP 2: OTP VERIFICATION */
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6 text-center"
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto shadow-xs">
                  <KeyRound className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Xác thực mã OTP</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    Mã xác thực gồm 6 chữ số đã được gửi tới email <strong className="text-slate-800">{email}</strong>
                  </p>
                </div>

                <form onSubmit={handleVerify} className="space-y-6">
                  {/* OTP INPUTS */}
                  <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => (inputRefs.current[i] = el)}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        className="w-11 h-12 rounded-2xl border border-slate-200 text-center text-lg font-black bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/70 outline-none transition-all shadow-2xs"
                      />
                    ))}
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-2xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 border-0 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Đang xác thực...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Xác nhận & Hoàn tất</span>
                      </>
                    )}
                  </motion.button>
                </form>

                <div className="flex flex-col items-center gap-2 text-xs text-slate-400">
                  <span>Chưa nhận được mã?</span>
                  <button
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || resendLoading}
                    className="font-bold text-indigo-600 hover:text-indigo-700 disabled:text-slate-400 bg-transparent border-0 cursor-pointer flex items-center gap-1"
                  >
                    {resendLoading && <RotateCw className="w-3 h-3 animate-spin" />}
                    {resendCooldown > 0
                      ? `Gửi lại mã sau ${resendCooldown}s`
                      : 'Bấm để gửi lại mã OTP'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default Register;
