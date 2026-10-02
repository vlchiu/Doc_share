import { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import {
  UploadCloud,
  Search,
  Menu,
  X,
  ChevronDown,
  User,
  FolderClosed,
  Bookmark,
  DownloadCloud,
  Trash2,
  Shield,
  LogOut,
  Sparkles,
  Layers,
  Cpu,
  Code2,
  BellRing,
  FileSpreadsheet,
  CheckCircle2,
  Activity,
  ArrowRight
} from 'lucide-react';

import Login from './pages/Login';
import Register from './pages/Register';
import Upload from './pages/Upload';
import Home from './pages/Home';
import Profile from './pages/Profile';
import MyDocuments from './pages/MyDocuments';
import AdminDashboard from './pages/AdminDashboard';
import SavedDocuments from './pages/SavedDocuments';
import NotFound from './pages/NotFound';
import DocumentDetail from './pages/DocumentDetail';
import Trash from './pages/Trash';
import UserProfile from './pages/UserProfile';
import DownloadHistory from './pages/DownloadHistory';
import GoogleAuthSuccess from './pages/GoogleAuthSuccess';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VIPUpgrade from './pages/VIPUpgrade';
import PaymentResult from './pages/PaymentResult';
import axiosClient from './api/axiosClient';
import ProtectedRoute from './components/ProtectedRoute';
import NotificationBell from './components/NotificationBell';
import GlobalChatBox from './components/GlobalChatBox';

const NAV_TYPES = [
  { to: '/', label: 'Tất cả', icon: Layers },
  { to: '/?type=Chung', label: 'Chung', icon: FileSpreadsheet },
  { to: '/?type=Hardware', label: 'Hardware', icon: Cpu },
  { to: '/?type=Software', label: 'Software', icon: Code2 },
  { to: '/?type=Thông báo', label: 'Thông báo', icon: BellRing },
];

function BrandLogo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 no-underline group shrink-0">
      <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-500 shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200">
        <Layers className="w-5 h-5 text-white" />
        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-white" />
      </div>
      <div className="flex flex-col">
        <span className="text-lg font-black tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
          Doc<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Share</span>
        </span>
        <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 -mt-1">
          Knowledge Hub
        </span>
      </div>
    </Link>
  );
}

function NavPill({ to, label, icon: Icon }) {
  const location = useLocation();
  const search = new URLSearchParams(location.search).get('type') || '';
  const isActive =
    (to === '/' && location.pathname === '/' && !search) ||
    (to !== '/' && location.pathname + location.search === to);

  return (
    <Link
      to={to}
      className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold no-underline transition-all duration-200 ${
        isActive
          ? 'text-white'
          : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-100/80'
      }`}
    >
      {isActive && (
        <motion.div
          layoutId="activeNavPill"
          className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 shadow-sm shadow-indigo-500/25"
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        />
      )}
      <span className="relative z-10 flex items-center gap-1.5">
        <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
        {label}
      </span>
    </Link>
  );
}

function AppLayout({ user, setUser, refreshUser }) {
  const [showMenu, setShowMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef(null);
  const location = useLocation();
  const isAuthenticated = !!localStorage.getItem('token');

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setShowMenu(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 15);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen mesh-gradient-bg font-sans text-slate-800 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* ── FLOATING GLASS HEADER ── */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'glass shadow-md shadow-slate-200/50 py-2.5'
            : 'bg-white/80 backdrop-blur-md border-b border-slate-200/60 py-3.5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">
          {/* LEFT: BRAND */}
          <div className="flex items-center gap-6">
            <BrandLogo />

            {/* DESKTOP NAV PILLS (Integrated, no stacked second bar!) */}
            <nav className="hidden lg:flex items-center gap-1 p-1 rounded-full bg-slate-100/90 border border-slate-200/70">
              {NAV_TYPES.map((item) => (
                <NavPill key={item.to} to={item.to} label={item.label} icon={item.icon} />
              ))}
            </nav>
          </div>

          {/* RIGHT: ACTIONS & USER PROFILE */}
          <div className="flex items-center gap-3">
            {/* UPLOAD BUTTON */}
            {isAuthenticated && (
              <Link
                to="/upload"
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/35 transition-all no-underline hover:-translate-y-0.5"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Tải lên</span>
              </Link>
            )}

            {isAuthenticated && user ? (
              <div className="flex items-center gap-2" ref={menuRef}>
                <NotificationBell />

                {/* USER AVATAR BUTTON */}
                <div className="relative">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowMenu(!showMenu)}
                    className="flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-full border border-slate-200/80 bg-white/80 hover:bg-white shadow-sm transition-all cursor-pointer"
                  >
                    {/* AVATAR + BADGE */}
                    <div className="relative shrink-0">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs ring-2 ring-white">
                        {user.avatar_url ? (
                          <img
                            src={
                              user.avatar_url.startsWith('http')
                                ? user.avatar_url
                                : `${import.meta.env.VITE_API_URL}${user.avatar_url}`
                            }
                            alt="avatar"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          user.name?.charAt(0).toUpperCase()
                        )}
                      </div>
                      {user.plan === 'VIP' && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[10px] text-white ring-1 ring-white shadow-sm">
                          💎
                        </span>
                      )}
                    </div>

                    <div className="hidden sm:flex flex-col text-left">
                      <span className="text-xs font-bold text-slate-800 max-w-[110px] truncate leading-tight">
                        {user.name}
                      </span>
                      {user.plan === 'VIP' ? (
                        <span className="text-[10px] font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-purple-600">
                          PRO VIP
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 leading-tight">Thành viên</span>
                      )}
                    </div>

                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                        showMenu ? 'rotate-180 text-indigo-600' : ''
                      }`}
                    />
                  </motion.button>

                  {/* USER DROPDOWN POPOVER */}
                  <AnimatePresence>
                    {showMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        className="absolute right-0 top-12 w-64 rounded-2xl border border-slate-200/90 bg-white/95 shadow-2xl backdrop-blur-xl z-50 overflow-hidden"
                      >
                        {/* User Card */}
                        <div className="px-4 py-3.5 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-indigo-50/30">
                          <p className="font-bold text-slate-900 text-sm truncate">{user.name}</p>
                          <p className="text-xs text-slate-500 truncate mt-0.5">{user.email}</p>
                          <div className="flex items-center gap-2 mt-2">
                            {user.plan === 'VIP' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full">
                                <Sparkles className="w-3 h-3 text-amber-500" /> Tài khoản VIP
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-200/70 px-2 py-0.5 rounded-full">
                                Gói Miễn phí
                              </span>
                            )}
                            {user.role === 'ADMIN' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-full">
                                <Shield className="w-3 h-3 text-rose-500" /> Quản trị viên
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Menu Links */}
                        <div className="p-1.5 space-y-0.5">
                          {[
                            { to: '/profile', icon: User, label: 'Thông tin tài khoản' },
                            { to: '/my-documents', icon: FolderClosed, label: 'Tài liệu của tôi' },
                            { to: '/saved-documents', icon: Bookmark, label: 'Tài liệu đã lưu' },
                            { to: '/download-history', icon: DownloadCloud, label: 'Lịch sử tải xuống' },
                            { to: '/trash', icon: Trash2, label: 'Thùng rác' },
                          ].map((item) => (
                            <Link
                              key={item.to}
                              to={item.to}
                              onClick={() => setShowMenu(false)}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:bg-slate-50 no-underline transition-colors"
                            >
                              <item.icon className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                              <span>{item.label}</span>
                            </Link>
                          ))}

                          <div className="my-1 border-t border-slate-100" />

                          <Link
                            to="/vip"
                            onClick={() => setShowMenu(false)}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold no-underline transition-colors ${
                              user.plan === 'VIP'
                                ? 'text-purple-700 bg-purple-50/70 hover:bg-purple-100/60'
                                : 'text-indigo-600 bg-indigo-50/60 hover:bg-indigo-100/60'
                            }`}
                          >
                            <Sparkles className="w-4 h-4 text-purple-600" />
                            <span>{user.plan === 'VIP' ? 'Đặc quyền VIP' : 'Nâng cấp VIP'}</span>
                          </Link>

                          {user.role === 'ADMIN' && (
                            <Link
                              to="/admin"
                              onClick={() => setShowMenu(false)}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50/70 no-underline transition-colors"
                            >
                              <Shield className="w-4 h-4 text-rose-500" />
                              <span>Trang Quản trị</span>
                            </Link>
                          )}
                        </div>

                        {/* Logout */}
                        <div className="p-1.5 border-t border-slate-100 bg-slate-50/40">
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border-0 bg-transparent text-left"
                          >
                            <LogOut className="w-4 h-4 text-rose-500" />
                            <span>Đăng xuất</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-full text-xs font-bold text-slate-700 hover:text-indigo-600 hover:bg-slate-100 transition-colors no-underline"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-full text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all no-underline"
                >
                  Đăng ký
                </Link>
              </div>
            )}

            {/* MOBILE HAMBURGER BUTTON */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition-colors border-0 bg-transparent cursor-pointer"
              aria-label="Mở menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* MOBILE DRAWER / MENU */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden border-t border-slate-200/80 bg-white/95 backdrop-blur-xl px-4 py-4 space-y-3 overflow-hidden"
            >
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Phân loại tài liệu
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {NAV_TYPES.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 no-underline"
                    >
                      <Icon className="w-4 h-4 text-indigo-500" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>

              {isAuthenticated && (
                <div className="pt-2 border-t border-slate-100">
                  <Link
                    to="/upload"
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 no-underline"
                  >
                    <UploadCloud className="w-4 h-4" /> Tải lên tài liệu
                  </Link>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── PAGE CONTENT SHELL ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/documents/:id" element={<DocumentDetail />} />
          <Route path="/users/:userId" element={<UserProfile />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/upload" element={<ProtectedRoute user={user}><Upload /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute user={user}><Profile /></ProtectedRoute>} />
          <Route path="/my-documents" element={<ProtectedRoute user={user}><MyDocuments /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute user={user} adminOnly><AdminDashboard /></ProtectedRoute>} />
          <Route path="/saved-documents" element={<ProtectedRoute user={user}><SavedDocuments /></ProtectedRoute>} />
          <Route path="/trash" element={<ProtectedRoute user={user}><Trash /></ProtectedRoute>} />
          <Route path="/download-history" element={<ProtectedRoute user={user}><DownloadHistory /></ProtectedRoute>} />
          <Route path="/auth/google/success" element={<GoogleAuthSuccess />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/vip" element={<ProtectedRoute user={user}><VIPUpgrade onVIPActivated={refreshUser} /></ProtectedRoute>} />
          <Route path="/payment/result" element={<PaymentResult onPaymentSuccess={refreshUser} />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      {/* ── NEO-BENTO MODERN FOOTER ── */}
      <footer className="mt-auto border-t border-slate-200/80 bg-white/70 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            {/* Col 1: Brand & Status */}
            <div className="space-y-4 md:col-span-1">
              <BrandLogo />
              <p className="text-xs text-slate-500 leading-relaxed">
                Nền tảng chia sẻ và lưu trữ tài liệu thế hệ mới. Đem lại trải nghiệm tìm kiếm thông minh, xem trước mượt mà và tương tác AI hiện đại.
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-[11px] font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Hệ thống hoạt động ổn định
              </div>
            </div>

            {/* Col 2: Phân loại */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3.5">
                Chuyên mục
              </h4>
              <ul className="space-y-2 text-xs font-medium text-slate-600 list-none p-0 m-0">
                {NAV_TYPES.map((t) => (
                  <li key={t.to}>
                    <Link to={t.to} className="hover:text-indigo-600 transition-colors no-underline">
                      {t.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 3: Tính năng nổi bật */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3.5">
                Tính năng
              </h4>
              <ul className="space-y-2 text-xs font-medium text-slate-600 list-none p-0 m-0">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" /> Tương tác trợ lý AI
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" /> Đọc trực tuyến đa định dạng
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" /> Kiểm duyệt nội dung bảo mật
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" /> Gói thành viên VIP không giới hạn
                </li>
              </ul>
            </div>

            {/* Col 4: Tham gia ngay */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/5 to-purple-500/10 border border-indigo-100">
              <h4 className="text-xs font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Nâng cấp tài khoản
              </h4>
              <p className="text-[11px] text-slate-500 mb-3">
                Mở khóa tốc độ tải không giới hạn và tính năng phân tích chuyên sâu.
              </p>
              <Link
                to="/vip"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold no-underline transition-colors shadow-sm"
              >
                Khám phá ngay <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Bottom sub-footer */}
          <div className="pt-6 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <p>© {new Date().getFullYear()} DocShare Hub. Bản quyền thuộc về hệ thống chia sẻ tài liệu.</p>
            <p className="flex items-center gap-1.5">
              <span>Được xây dựng với kiến trúc hiện đại & hiệu năng cao</span>
            </p>
          </div>
        </div>
      </footer>

      {/* GLOBAL AI CHATBOX — hiện ở mọi trang khi đã đăng nhập, ẩn khi đang ở trang tài liệu cụ thể */}
      {isAuthenticated && !location.pathname.startsWith('/documents/') && (
        <GlobalChatBox />
      )}
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const isAuthenticated = !!localStorage.getItem('token');

  const fetchUser = () => {
    if (isAuthenticated) {
      axiosClient
        .get('/auth/me')
        .then((res) => setUser(res.data))
        .catch(() => localStorage.removeItem('token'));
    }
  };

  useEffect(() => {
    fetchUser();

    const handleFocus = () => {
      if (localStorage.getItem('token')) {
        fetchUser();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isAuthenticated]); // eslint-disable-line

  return (
    <Router>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#0f172a',
            color: '#fff',
            borderRadius: '14px',
            fontSize: '13px',
            fontWeight: '600',
            boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
          },
        }}
      />
      <AppLayout user={user} setUser={setUser} refreshUser={fetchUser} />
    </Router>
  );
}

export default App;