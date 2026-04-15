import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Upload from './pages/Upload';
import Home from './pages/Home';
import Profile from './pages/Profile';
import MyDocuments from './pages/MyDocuments';
import AdminDashboard from './pages/AdminDashboard';
import SavedDocuments from './pages/SavedDocuments';
import axiosClient from './api/axiosClient';

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

  const navLinkStyle = { textDecoration: 'none', color: '#555', fontWeight: 'bold', fontSize: '15px', padding: '10px 0' };

  return (
    <Router>
      <div style={{ fontFamily: 'Arial, sans-serif', background: '#f5f7fa', minHeight: '100vh' }}>
        
        {/* THANH TẦNG 1: Logo và Avatar */}
        <nav style={{ background: '#fff', padding: '0 30px', height: '65px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eaeaea' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Link to="/" style={{ textDecoration: 'none', color: '#2c3e50', fontSize: '22px', fontWeight: 'bold' }}>
              📚 <span style={{ color: '#3498db' }}>Doc</span>Share
            </Link>
          </div>

          <div>
            {isAuthenticated && user ? (
              <div style={{ position: 'relative' }}>
                <div onClick={() => setShowMenu(!showMenu)} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '5px 10px', borderRadius: '30px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#95a5a6', color: '#fff', fontWeight: 'bold', fontSize: '16px' }}>
                    {user.avatar_url ? <img src={`http://localhost:5000${user.avatar_url}`} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : user.name.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontWeight: 'bold', color: '#333' }}>{user.name}</span>
                  <span style={{ fontSize: '12px', color: '#888' }}>▼</span>
                </div>

                {showMenu && (
                  <div style={{ position: 'absolute', top: '50px', right: '0', width: '250px', background: '#fff', borderRadius: '8px', boxShadow: '0 5px 15px rgba(0,0,0,0.1)', border: '1px solid #eaeaea', overflow: 'hidden', zIndex: 200 }}>
                    <div style={{ padding: '10px 0' }}>
                      <Link to="/profile" onClick={() => setShowMenu(false)} style={{ display: 'block', padding: '12px 20px', textDecoration: 'none', color: '#333', fontWeight: '500' }}>⚙️ Thông tin tài khoản</Link>
                      <Link to="/my-documents" onClick={() => setShowMenu(false)} style={{ display: 'block', padding: '12px 20px', textDecoration: 'none', color: '#333', fontWeight: '500' }}>📁 Tài liệu của tôi</Link>
                      <Link to="/saved-documents" onClick={() => setShowMenu(false)} style={{ display: 'block', padding: '12px 20px', textDecoration: 'none', color: '#333', fontWeight: '500' }}>🔖 Tài liệu đã lưu</Link>
                      {user.role === 'ADMIN' && (
                        <Link to="/admin" onClick={() => setShowMenu(false)} style={{ display: 'block', padding: '12px 20px', textDecoration: 'none', color: '#c0392b', fontWeight: 'bold', background: '#fadbd8' }}>🛡️ Trang Quản Trị</Link>
                      )}
                    </div>
                    <div style={{ borderTop: '1px solid #f0f0f0' }}>
                      <button onClick={handleLogout} style={{ width: '100%', textAlign: 'left', padding: '15px 20px', background: '#fff', border: 'none', cursor: 'pointer', color: '#e74c3c', fontWeight: 'bold' }}>🚪 Đăng xuất</button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '15px' }}>
                <Link to="/login" style={{ textDecoration: 'none', color: '#555', fontWeight: 'bold' }}>Đăng nhập</Link>
              </div>
            )}
          </div>
        </nav>

        {/* THANH TẦNG 2: Menu Phân loại */}
        <div style={{ background: '#f8f9fa', padding: '0 30px', height: '50px', display: 'flex', alignItems: 'center', gap: '30px', borderBottom: '1px solid #ddd', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', position: 'sticky', top: 0, zIndex: 100 }}>
          <Link to="/" style={navLinkStyle}>Trang chủ</Link>
          <Link to="/?type=Chung" style={navLinkStyle}>Chung</Link>
          <Link to="/?type=Hardware" style={navLinkStyle}>Hardware</Link>
          <Link to="/?type=Software" style={navLinkStyle}>Software</Link>
          <Link to="/?type=Thông báo" style={navLinkStyle}>Thông báo</Link>
          
          {isAuthenticated && (
            <Link to="/upload" style={{ ...navLinkStyle, color: '#3498db', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '5px' }}>
              📤 Tải lên
            </Link>
          )}
        </div>

        {/* NỘI DUNG TRANG */}
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
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