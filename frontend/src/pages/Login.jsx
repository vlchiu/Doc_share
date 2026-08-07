import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import axiosClient from '../api/axiosClient';

const FEATURES = [
  { icon: '📄', text: 'Chia sẻ tài liệu dễ dàng' },
  { icon: '🔒', text: 'Kiểm duyệt nội dung' },
  { icon: '💬', text: 'Bình luận & đánh giá' },
  { icon: '🤖', text: 'Hỏi đáp tài liệu với AI' },
  { icon: '🔔', text: 'Thông báo realtime' },
];

function FloatingOrb({ className }) {
  return (
    <motion.div
      className={`absolute rounded-full bg-white/10 ${className}`}
      animate={{ y: [0, -20, 0], scale: [1, 1.05, 1] }}
      transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [needVerify, setNeedVerify]     = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setNeedVerify(false);
    try {
      const res = await axiosClient.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('userId', res.data.user.id);
      toast.success('Đăng nhập thành công!');
      setTimeout(() => { window.location.href = '/'; }, 800);
    } catch (error) {
      if (error.response?.data?.needVerify) setNeedVerify(true);
      else toast.error(error.response?.data?.message || 'Sai thông tin đăng nhập!');
    } finally { setLoading(false); }
  };

  const handleResendVerify = async () => {
    setResendLoading(true);
    try {
      await axiosClient.post('/auth/resend-verify', { email });
      toast.success('Đã gửi lại email xác thực!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi gửi email');
    } finally { setResendLoading(false); }
  };

  return (
    <div className="min-h-screen flex -mx-5 -my-8">
      {/* ── CỘT TRÁI ── */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-gradient-to-br from-blue-900 via-blue-700 to-cyan-500 flex-col justify-center items-center p-16">
        {/* Animated orbs */}
        <FloatingOrb className="w-72 h-72 -top-20 -right-20" />
        <FloatingOrb className="w-48 h-48 -bottom-12 -left-12" />
        <motion.div
          className="absolute w-32 h-32 rounded-full bg-white/5 top-1/3 left-1/4"
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 4, repeat: Infinity }}
        />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative text-center text-white z-10"
        >
          {/* Logo */}
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="text-7xl mb-6 inline-block"
          >
            📚
          </motion.div>
          <h1 className="text-4xl font-bold mb-3 tracking-tight">
            <span className="text-blue-300">Doc</span>Share
          </h1>
          <p className="text-white/75 text-base leading-relaxed max-w-xs mx-auto mb-10">
            Nền tảng chia sẻ tài liệu nội bộ — nhanh, gọn, bảo mật.
          </p>

          {/* Feature list */}
          <div className="flex flex-col gap-3 text-left">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.text}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="flex items-center gap-3 text-white/85 text-sm"
              >
                <span className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center text-base shrink-0">
                  {f.icon}
                </span>
                {f.text}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── CỘT PHẢI ── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <span className="text-5xl">📚</span>
            <h1 className="text-2xl font-bold mt-2">
              <span className="text-blue-600">Doc</span>Share
            </h1>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Chào mừng trở lại 👋</h2>
            <p className="text-slate-500">Đăng nhập để tiếp tục</p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
              <motion.div whileFocus={{ scale: 1.01 }}>
                <input
                  type="email" placeholder="you@example.com"
                  value={email} onChange={e => setEmail(e.target.value)} required
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-sm outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 bg-white"
                />
              </motion.div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Mật khẩu</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'} placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)} required
                  className="w-full px-4 py-3 pr-12 rounded-xl border-2 border-slate-200 text-sm outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 bg-white"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-transparent border-0 cursor-pointer text-lg">
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Submit */}
            <motion.button
              type="submit" disabled={loading}
              whileHover={!loading ? { scale: 1.02, boxShadow: '0 8px 25px rgba(59,130,246,0.4)' } : {}}
              whileTap={!loading ? { scale: 0.98 } : {}}
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all duration-200 border-0 cursor-pointer"
              style={{ background: loading ? '#93c5fd' : 'linear-gradient(135deg, #3b82f6, #06b6d4)' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="inline-block">⏳</motion.span>
                  Đang đăng nhập...
                </span>
              ) : 'Đăng nhập →'}
            </motion.button>
          </form>

          {/* Need verify */}
          <AnimatePresence>
            {needVerify && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4"
              >
                <p className="text-amber-800 font-bold text-sm mb-1">⚠️ Email chưa được xác thực</p>
                <p className="text-amber-700 text-xs mb-3">Vui lòng kiểm tra hộp thư <strong>{email}</strong></p>
                <button onClick={handleResendVerify} disabled={resendLoading}
                  className="px-4 py-2 bg-amber-400 text-white rounded-lg font-bold text-xs border-0 cursor-pointer hover:bg-amber-500 transition">
                  {resendLoading ? 'Đang gửi...' : '📧 Gửi lại email xác thực'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-end mt-3">
            <Link to="/forgot-password" className="text-blue-500 text-sm font-medium no-underline hover:text-blue-700">
              Quên mật khẩu?
            </Link>
          </div>

          <p className="text-center mt-6 text-slate-500 text-sm">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="text-blue-600 font-bold no-underline hover:text-blue-700">Đăng ký ngay</Link>
          </p>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-slate-400 text-xs font-medium">hoặc</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Google */}
          <motion.a
            href={`${import.meta.env.VITE_API_URL}/api/auth/google`}
            whileHover={{ scale: 1.02, borderColor: '#4285F4' }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center justify-center gap-3 py-3.5 rounded-xl border-2 border-slate-200 bg-white no-underline text-slate-700 font-semibold text-sm transition-all duration-200"
          >
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Đăng nhập với Google
          </motion.a>
        </motion.div>
      </div>
    </div>
  );
}

export default Login;
