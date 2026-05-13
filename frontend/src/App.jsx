import { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
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

const NAV_TYPES = [
  { to: '/', label: 'Tất cả' },
  { to: '/?type=Chung', label: 'Chung' },
  { to: '/?type=Hardware', label: 'Hardware' },
  { to: '/?type=Software', label: 'Software' },
  { to: '/?type=Thông báo', label: 'Thông báo' },
];

function NavLink({ to, label }) {
  const location = useLocation();
  const search = new URLSearchParams(location.search).get('type') || '';
  const isActive =
    (to === '/' && location.pathname === '/' && !search) ||
    (to !== '/' && location.pathname + location.search === to);

  return (
    <Link
      to={to}
      className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-150 ${
        isActive
          ? 'bg-blue-600 text-white shadow-sm'
          : 'text-slate-600 hover:bg-blue-50 hover:text-blue-600'
      }`}
    >
      {label}
    </Link>
  );
}

function AppLayout({ user, setUser }) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  const isAuthenticated = !!localStorage.getItem('token');

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* TOP NAVBAR */}
      <header className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* LOGO */}
          <Link to="/" className="flex items-center gap-2 text-white no-underline shrink-0">
            <span className="bg-white/15 rounded-lg px-2 py-1 text-xl">📚</span>
            <span className="text-xl font-bold tracking-tight">
              <span className="text-blue-300">Doc</span>Share
            </span>
          </Link>

          {/* RIGHT SIDE */}
          <div className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2" ref={menuRef}>
                <NotificationBell />

                {/* UPLOAD BUTTON */}
                <Link
                  to="/upload"
                  className="hidden sm:flex items-center gap-1.5 bg-white text-blue-700 font-bold text-sm px-4 py-2 rounded-full shadow hover:bg-blue-50 transition no-underline"
                >
                  <span>📤</span> Tải lên
                </Link>

                {/* AVATAR DROPDOWN */}
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-full px-3 py-1.5 transition cursor-pointer border-0"
                  >
                    {/* AVATAR + VIP BADGE */}
                    <div className="relative shrink-0">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-white/20 flex items-center justify-center text-white font-bold text-sm border-2 border-white/30">
                        {user.avatar_url
                          ? <img src={user.avatar_url.startsWith('http') ? user.avatar_url : `${import.meta.env.VITE_API_URL}${user.avatar_url}`} alt="avatar" className="w-full h-full object-cover" />
                          : user.name.charAt(0).toUpperCase()}
                      </div>
                      {/* VIP BADGE — góc dưới phải avatar */}
                      {user.plan === 'VIP' && (
                        <span className="absolute -bottom-1 -right-1 text-xs leading-none">💎</span>
                      )}
                      {/* ADMIN BADGE */}
                      {user.role === 'ADMIN' && (
                        <span className="absolute -bottom-1 -right-1 text-xs leading-none">🛡️</span>
                      )}
                    </div>
                    <span className="text-white font-semibold text-sm hidden sm:block max-w-[120px] truncate">{user.name}</span>
                    {/* VIP label kế tên */}
                    {user.plan === 'VIP' && (
                      <span className="hidden sm:block text-xs font-bold text-yellow-300 bg-yellow-400/20 px-1.5 py-0.5 rounded-full">VIP</span>
                    )}
                    <svg className="w-3 h-3 text-white/60" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>

                  {showMenu && (
                    <div className="absolute right-0 top-12 w-60 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50">
                      {/* User info */}
                      <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                        <p className="font-bold text-slate-800 text-sm truncate">{user.name}</p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                        {user.plan === 'VIP' && (
                          <span className="inline-block mt-1 text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">💎 VIP</span>
                        )}
                      </div>

                      <div className="py-1">
                        {[
                          { to: '/profile', icon: '⚙️', label: 'Thông tin tài khoản' },
                          { to: '/my-documents', icon: '📁', label: 'Tài liệu của tôi' },
                          { to: '/saved-documents', icon: '🔖', label: 'Tài liệu đã lưu' },
                          { to: '/download-history', icon: '📥', label: 'Lịch sử tải xuống' },
                          { to: '/trash', icon: '🗑️', label: 'Thùng rác' },
                        ].map(item => (
                          <Link key={item.to} to={item.to} onClick={() => setShowMenu(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 no-underline transition">
                            <span>{item.icon}</span>{item.label}
                          </Link>
                        ))}

                        <Link to="/vip" onClick={() => setShowMenu(false)}
                          className={`flex items-center gap-3 px-4 py-2.5 text-sm font-bold no-underline transition ${user.plan === 'VIP' ? 'text-purple-700 bg-purple-50' : 'text-purple-600 hover:bg-purple-50'}`}>
                          <span>{user.plan === 'VIP' ? '💎' : '⚡'}</span>
                          {user.plan === 'VIP' ? 'Tài khoản VIP' : 'Nâng cấp VIP'}
                        </Link>

                        {user.role === 'ADMIN' && (
                          <Link to="/admin" onClick={() => setShowMenu(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 no-underline transition">
                            <span>🛡️</span> Trang Quản Trị
                          </Link>
                        )}
                      </div>

                      <div className="border-t border-slate-100">
                        <button onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition bg-white border-0 cursor-pointer">
                          <span>🚪</span> Đăng xuất
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="text-white/85 font-semibold text-sm hover:text-white no-underline transition">Đăng nhập</Link>
                <Link to="/register" className="bg-white text-blue-700 font-bold text-sm px-4 py-2 rounded-full shadow hover:bg-blue-50 transition no-underline">Đăng ký</Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* SUB NAV — TYPE FILTER */}
      <nav className="bg-white border-b border-slate-200 shadow-sm sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-12 flex items-center gap-1 overflow-x-auto">
          {NAV_TYPES.map(item => (
            <NavLink key={item.to} to={item.to} label={item.label} />
          ))}
          {isAuthenticated && (
            <Link
              to="/upload"
              className="sm:hidden ml-auto flex items-center gap-1 bg-blue-600 text-white font-bold text-sm px-4 py-1.5 rounded-full no-underline shrink-0"
            >
              📤 Tải lên
            </Link>
          )}
        </div>
      </nav>

      {/* PAGE CONTENT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
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
          <Route path="/vip" element={<ProtectedRoute user={user}><VIPUpgrade /></ProtectedRoute>} />
          <Route path="/payment/result" element={<PaymentResult />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const isAuthenticated = !!localStorage.getItem('token');

  useEffect(() => {
    if (isAuthenticated) {
      axiosClient.get('/auth/me').then(res => setUser(res.data)).catch(() => localStorage.removeItem('token'));
    }
  }, [isAuthenticated]);

  return (
    <Router>
      <Toaster position="top-right" toastOptions={{ duration: 3000, style: { borderRadius: '10px', fontWeight: '500' } }} />
      <AppLayout user={user} setUser={setUser} />
    </Router>
  );
}

export default App;
