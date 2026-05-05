import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
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
import axiosClient from './api/axiosClient';
import ProtectedRoute from './components/ProtectedRoute';
import NotificationBell from './components/NotificationBell';

// component để theo dõi URL và đóng menu khi chuyển trang
function LinkWithCloseMenu({ to, onClick, style, children }) {
  return (
    <Link to={to} onClick={onClick} style={style}>
      {children}
    </Link>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const isAuthenticated = !!localStorage.getItem('token');

  useEffect(() => {
    if (isAuthenticated) {
      axiosClient.get('/auth/me').then(res => setUser(res.data)).catch(() => localStorage.removeItem('token'));
    }
  }, [isAuthenticated]);

  // Đóng menu khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('#user-menu')) setShowMenu(false);
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
    <Router>
      <Toaster position="top-right" toastOptions={{ duration: 3000, style: { borderRadius: '10px', fontWeight: '500' } }} />
      <div style={{ fontFamily: 'Inter, sans-serif', background: 'linear-gradient(180deg, #f0f7ff 0%, #f8fafc 300px)', minHeight: '100vh', color: '#333' }}>
        
        {/* TẦNG 1 */}
        <nav style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)', padding: '0 30px', height: '65px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1000, position: 'relative', boxShadow: '0 2px 20px rgba(30,58,138,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Link to="/" style={{ textDecoration: 'none', color: '#fff', fontSize: '22px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '8px', padding: '4px 8px', fontSize: '20px' }}>📚</span>
              <span><span style={{ color: '#93c5fd' }}>Doc</span>Share</span>
            </Link>
          </div>

          <div>
            {isAuthenticated && user ? (
              <div style={{ position: 'relative' }} id="user-menu">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <NotificationBell />
                  <div onClick={() => setShowMenu(!showMenu)} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '5px 10px', borderRadius: '30px', background: 'rgba(255,255,255,0.1)' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 'bold', fontSize: '16px', border: '2px solid rgba(255,255,255,0.3)' }}>
                      {user.avatar_url
                        ? <img src={user.avatar_url.startsWith('http') ? user.avatar_url : `${import.meta.env.VITE_API_URL}${user.avatar_url}`} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : user.name.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 'bold', color: '#fff' }}>{user.name}</span>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>▼</span>
                  </div>
                </div>

                {showMenu && (
                  // MENU DROPDOWN - Bo góc và đổ bóng nhẹ
                  <div style={{ position: 'absolute', top: '50px', right: '0', width: '250px', background: '#fff', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', overflow: 'hidden', zIndex: 1001 }}>
                    <div style={{ padding: '10px 0' }}>
                      <LinkWithCloseMenu to="/profile" onClick={() => setShowMenu(false)} style={{ display: 'block', padding: '12px 20px', textDecoration: 'none', color: '#333', fontWeight: '500' }}>⚙️ Thông tin tài khoản</LinkWithCloseMenu>
                      <LinkWithCloseMenu to="/my-documents" onClick={() => setShowMenu(false)} style={{ display: 'block', padding: '12px 20px', textDecoration: 'none', color: '#333', fontWeight: '500' }}>📁 Tài liệu của tôi</LinkWithCloseMenu>
                      <LinkWithCloseMenu to="/saved-documents" onClick={() => setShowMenu(false)} style={{ display: 'block', padding: '12px 20px', textDecoration: 'none', color: '#333', fontWeight: '500' }}>🔖 Tài liệu đã lưu</LinkWithCloseMenu>
                      <LinkWithCloseMenu to="/download-history" onClick={() => setShowMenu(false)} style={{ display: 'block', padding: '12px 20px', textDecoration: 'none', color: '#333', fontWeight: '500' }}>📥 Lịch sử tải xuống</LinkWithCloseMenu>
                      <LinkWithCloseMenu to="/trash" onClick={() => setShowMenu(false)} style={{ display: 'block', padding: '12px 20px', textDecoration: 'none', color: '#64748b', fontWeight: '500' }}>🗑️ Thùng rác</LinkWithCloseMenu>
                      {user.role === 'ADMIN' && (
                        <LinkWithCloseMenu to="/admin" onClick={() => setShowMenu(false)} style={{ display: 'block', padding: '12px 20px', textDecoration: 'none', color: '#b91c1c', fontWeight: 'bold', background: '#fee2e2' }}>🛡️ Trang Quản Trị</LinkWithCloseMenu>
                      )}
                    </div>
                    <div style={{ borderTop: '1px solid #f0f0f0' }}>
                      <button onClick={handleLogout} style={{ width: '100%', textAlign: 'left', padding: '15px 20px', background: '#fff', border: 'none', cursor: 'pointer', color: '#e74c3c', fontWeight: 'bold' }}>🚪 Đăng xuất</button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <Link to="/login" style={{ textDecoration: 'none', color: 'rgba(255,255,255,0.85)', fontWeight: 'bold' }}>Đăng nhập</Link>
                <Link to="/register" style={{ textDecoration: 'none', color: '#1d4ed8', background: '#fff', fontWeight: 'bold', padding: '9px 20px', borderRadius: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>Đăng ký</Link>
              </div>
            )}
          </div>
        </nav>

        {/* TẦNG 2 */}
        <div style={{ background: '#fff', padding: '0 30px', height: '50px', display: 'flex', alignItems: 'center', gap: '4px', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 999, boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
          {[
            { to: '/', label: 'Trang chủ' },
            { to: '/?type=Chung', label: 'Chung' },
            { to: '/?type=Hardware', label: 'Hardware' },
            { to: '/?type=Software', label: 'Software' },
            { to: '/?type=Thông báo', label: 'Thông báo' },
          ].map(item => (
            <Link key={item.to} to={item.to} style={{ textDecoration: 'none', color: '#555', fontWeight: '600', fontSize: '14px', padding: '8px 14px', borderRadius: '8px', transition: '0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.color = '#3b82f6'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#555'; }}>
              {item.label}
            </Link>
          ))}
          {isAuthenticated && (
            <Link to="/upload" style={{ marginLeft: 'auto', textDecoration: 'none', color: '#fff', background: 'linear-gradient(135deg, #3b82f6, #06b6d4)', fontWeight: 'bold', padding: '8px 18px', borderRadius: '20px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 10px rgba(59,130,246,0.35)' }}>
              📤 Tải lên
            </Link>
          )}
        </div>

        {/* NỘI DUNG TRANG */}
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px 20px' }}>
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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;