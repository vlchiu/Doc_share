import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Upload from './pages/Upload';
import Home from './pages/Home';
import Profile from './pages/Profile';
import MyDocuments from './pages/MyDocuments';
import AdminDashboard from './pages/AdminDashboard';
import SavedDocuments from './pages/SavedDocuments';
import axiosClient from './api/axiosClient';

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

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  // STYLE CHO NAVLINK TẦNG 2 - Bo góc mềm mại hơn
  const navLinkStyle = { textDecoration: 'none', color: '#555', fontWeight: 'bold', fontSize: '15px', padding: '10px 15px', borderRadius: '30px', transition: '0.2s' };

  return (
    <Router>
      {/* THAY ĐỔI: Phông nền toàn trang màu xám cực nhạt */}
      <div style={{ fontFamily: 'Inter, sans-serif', background: '#f8fafc', minHeight: '100vh', color: '#333' }}>
        
        {/* TẦNG 1 */}
        <nav style={{ background: '#fff', padding: '0 30px', height: '65px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', zIndex: 1000, position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Link to="/" style={{ textDecoration: 'none', color: '#1a1a1a', fontSize: '22px', fontWeight: 'bold' }}>
              📚 <span style={{ color: '#3b82f6' }}>Doc</span>Share
            </Link>
          </div>

          <div>
            {isAuthenticated && user ? (
              <div style={{ position: 'relative' }}>
                <div onClick={() => setShowMenu(!showMenu)} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '5px 10px', borderRadius: '30px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#cbd5e1', color: '#fff', fontWeight: 'bold', fontSize: '16px' }}>
                    {user.avatar_url ? <img src={`http://localhost:5000${user.avatar_url}`} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : user.name.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontWeight: 'bold', color: '#1a1a1a' }}>{user.name}</span>
                  <span style={{ fontSize: '12px', color: '#888' }}>▼</span>
                </div>

                {showMenu && (
                  // MENU DROPDOWN - Bo góc và đổ bóng nhẹ
                  <div style={{ position: 'absolute', top: '50px', right: '0', width: '250px', background: '#fff', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', overflow: 'hidden', zIndex: 1001 }}>
                    <div style={{ padding: '10px 0' }}>
                      <LinkWithCloseMenu to="/profile" onClick={() => setShowMenu(false)} style={{ display: 'block', padding: '12px 20px', textDecoration: 'none', color: '#333', fontWeight: '500' }}>⚙️ Thông tin tài khoản</LinkWithCloseMenu>
                      <LinkWithCloseMenu to="/my-documents" onClick={() => setShowMenu(false)} style={{ display: 'block', padding: '12px 20px', textDecoration: 'none', color: '#333', fontWeight: '500' }}>📁 Tài liệu của tôi</LinkWithCloseMenu>
                      <LinkWithCloseMenu to="/saved-documents" onClick={() => setShowMenu(false)} style={{ display: 'block', padding: '12px 20px', textDecoration: 'none', color: '#333', fontWeight: '500' }}>🔖 Tài liệu đã lưu</LinkWithCloseMenu>
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
                <Link to="/login" style={{ textDecoration: 'none', color: '#555', fontWeight: 'bold' }}>Đăng nhập</Link>
                <Link to="/register" style={{ textDecoration: 'none', color: '#fff', background: '#3b82f6', fontWeight: 'bold', padding: '10px 20px', borderRadius: '20px' }}>Đăng ký</Link>
              </div>
            )}
          </div>
        </nav>

        {/* TẦNG 2 - Nút Tải lên nổi bật */}
        <div style={{ background: '#fff', padding: '0 30px', height: '55px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #ddd', position: 'sticky', top: 0, zIndex: 999 }}>
          <Link to="/" style={navLinkStyle}>Trang chủ</Link>
          <Link to="/?type=Chung" style={navLinkStyle}>Chung</Link>
          <Link to="/?type=Hardware" style={navLinkStyle}>Hardware</Link>
          <Link to="/?type=Software" style={navLinkStyle}>Software</Link>
          <Link to="/?type=Thông báo" style={navLinkStyle}>Thông báo</Link>
          
          {isAuthenticated && (
            // Nút Tải lên nổi bật duy nhất trên thanh điều hướng
            <Link to="/upload" style={{ ...navLinkStyle, background: '#e0f2fe', color: '#0369a1', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '5px' }}>
              📤 Tải lên
            </Link>
          )}
        </div>

        {/* NỘI DUNG TRANG */}
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px 20px' }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/my-documents" element={<MyDocuments />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/saved-documents" element={<SavedDocuments />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;