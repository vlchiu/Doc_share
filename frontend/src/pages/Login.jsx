import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  FileText,
  ShieldCheck,
  MessageSquare,
  Bot,
  BellRing,
  Eye,
  EyeOff,
  ArrowRight,
  AlertTriangle,
  Mail,
  Lock
} from 'lucide-react';
import toast from 'react-hot-toast';
import axiosClient from '../api/axiosClient';

const FEATURES = [
  { icon: FileText, text: 'Kho tài liệu đa định dạng (PDF, Word, Code)' },
  { icon: ShieldCheck, text: 'Kiểm duyệt nội dung nghiêm ngặt & an toàn' },
  { icon: Bot, text: 'Trợ lý AI phân tích & tóm tắt ngữ cảnh' },
  { icon: MessageSquare, text: 'Cộng đồng trao đổi & đánh giá minh bạch' },
  { icon: BellRing, text: 'Thông báo tương tác thời gian thực' },
];

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [needVerify, setNeedVerify] = useState(false);
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
      setTimeout(() => {
        window.location.href = '/';
      }, 700);
    } catch (error) {
      if (error.response?.data?.needVerify) setNeedVerify(true);
      else toast.error(error.response?.data?.message || 'Sai thông tin đăng nhập!');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerify = async () => {
    setResendLoading(true);
    try {
      await axiosClient.post('/auth/resend-verify', { email });
      toast.success('Đã gửi lại email xác thực!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi gửi email');
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
              Đăng nhập để khám phá & <br />
              <span className="gradient-text">chia sẻ kiến thức.</span>
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed max-w-sm">
              Truy cập hàng ngàn tài liệu chất lượng cao, tích hợp trợ lý AI thông minh ngay trong tầm tay.
            </p>
          </div>

          {/* Feature list */}
          <div className="relative z-10 mt-8 space-y-3">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="flex items-center gap-3 text-xs text-slate-300">
                  <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0 text-indigo-300 border border-white/10">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span>{f.text}</span>
                </div>
              );
            })}
          </div>

          <div className="relative z-10 mt-8 pt-4 border-t border-white/10 text-[11px] text-slate-400">
            © {new Date().getFullYear()} DocShare Hub. Bảo mật chuẩn công nghệ.
          </div>
        </div>

        {/* ── RIGHT LOGIN FORM ── */}
        <div className="p-8 sm:p-12 flex flex-col justify-center">
          <div className="mb-6">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Chào mừng trở lại!</h3>
            <p className="text-xs text-slate-500 mt-1">
              Nhập email và mật khẩu tài khoản của bạn để tiếp tục
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
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
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Mật khẩu
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold no-underline"
                >
                  Quên mật khẩu?
                </Link>
              </div>
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

            {/* SUBMIT BUTTON */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-2xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 border-0 cursor-pointer pt-3"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang đăng nhập...</span>
                </>
              ) : (
                <>
                  <span>Đăng nhập</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </motion.button>
          </form>

          {/* Need verify alert */}
          <AnimatePresence>
            {needVerify && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2"
              >
                <div className="flex items-center gap-2 font-bold text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Tài khoản chưa được kích hoạt email</span>
                </div>
                <p className="text-[11px] text-amber-700">
                  Vui lòng kiểm tra hộp thư của bạn ({email}) để kích hoạt tài khoản.
                </p>
                <button
                  onClick={handleResendVerify}
                  disabled={resendLoading}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs border-0 cursor-pointer transition-colors"
                >
                  {resendLoading ? 'Đang gửi...' : 'Gửi lại email xác thực'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* OR DIVIDER */}
          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <span className="relative px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-white">
              hoặc tiếp tục với
            </span>
          </div>

          {/* GOOGLE SIGN IN */}
          <a
            href={`${import.meta.env.VITE_API_URL}/api/auth/google`}
            className="flex items-center justify-center gap-3 py-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all no-underline shadow-2xs hover:border-slate-300"
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            <span>Đăng nhập qua Google</span>
          </a>

          <p className="text-center text-xs text-slate-500 mt-6">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="font-bold text-indigo-600 hover:text-indigo-700 no-underline">
              Đăng ký miễn phí ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
