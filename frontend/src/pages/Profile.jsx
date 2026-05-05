import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import axiosClient from '../api/axiosClient';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API_URL = import.meta.env.VITE_API_URL;

function Profile() {
  const [user, setUser] = useState(null);
  const [newName, setNewName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [docStats, setDocStats] = useState({ total: 0, approved: 0, pending: 0 });
  const [topDocs, setTopDocs] = useState([]);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwMsg, setPwMsg] = useState(null);

  const getMe = async () => {
    const res = await axiosClient.get('/auth/me');
    setUser(res.data);
    setNewName(res.data.name);
  };

  const getStats = async () => {
    try {
      const res = await axiosClient.get('/documents/mine');
      const docs = Array.isArray(res.data) ? res.data : [];
      const approved = docs.filter(d => d.status === 'APPROVED');
      const pending = docs.filter(d => d.status === 'PENDING').length;
      setDocStats({ total: docs.length, approved: approved.length, pending });
      const sorted = [...approved].sort((a, b) => b.download_count - a.download_count).slice(0, 5);
      setTopDocs(sorted.map(d => ({ name: d.title.length > 20 ? d.title.slice(0, 20) + '…' : d.title, tải: d.download_count, xem: d.view_count })));
    } catch {}
  };

  useEffect(() => {
    getMe();
    getStats();
  }, []);

  const onFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name', newName);
    if (selectedFile) formData.append('avatar', selectedFile);
    try {
      await axiosClient.put('/auth/update-profile', formData);
      toast.success('Cập nhật thông tin thành công!');
      window.location.reload();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi cập nhật!');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwMsg(null);
    if (newPassword !== confirmPassword) return setPwMsg({ type: 'error', text: 'Mật khẩu xác nhận không khớp!' });
    try {
      await axiosClient.put('/auth/change-password', { currentPassword, newPassword });
      setPwMsg({ type: 'success', text: '✅ Đổi mật khẩu thành công!' });
      toast.success('Đổi mật khẩu thành công!');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (error) {
      setPwMsg({ type: 'error', text: '❌ ' + (error.response?.data?.message || 'Lỗi server') });
      toast.error(error.response?.data?.message || 'Lỗi server!');
    }
  };

  const inputStyle = { padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', width: '100%' };
  const labelStyle = { fontWeight: 'bold', color: '#555', marginBottom: '5px', display: 'block' };

  if (!user) return <p>Đang tải...</p>;

  return (
    <div style={{ maxWidth: '620px', margin: '30px auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* THÔNG TIN CÁ NHÂN */}
      <div style={{ borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}>
        {/* Header gradient */}
        <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 60%, #06b6d4 100%)', padding: '28px 32px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
          <h2 style={{ margin: 0, color: '#fff', fontSize: '20px', fontWeight: 'bold', position: 'relative' }}>⚙️ Thiết lập tài khoản</h2>
          <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.7)', fontSize: '13px', position: 'relative' }}>Quản lý thông tin cá nhân của bạn</p>
        </div>

        <div style={{ background: '#fff', padding: '28px 32px' }}>
        <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <div style={{ position: 'relative', width: '110px', height: '110px' }}>
              <img src={preview || (user.avatar_url ? (user.avatar_url.startsWith('http') ? user.avatar_url : `${API_URL}${user.avatar_url}`) : `https://ui-avatars.com/api/?name=${user.name}&background=random`)} alt="avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '4px solid #e2e8f0' }} />
              <label htmlFor="avatar-input" style={{ position: 'absolute', bottom: '4px', right: '4px', background: '#3b82f6', color: '#fff', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '13px' }}>📷</label>
              <input id="avatar-input" type="file" hidden onChange={onFileChange} accept="image/*" />
            </div>
            <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>Bấm icon camera để đổi ảnh</p>
          </div>

          <div><label style={labelStyle}>Email (không thể sửa):</label><input type="text" value={user.email} disabled style={{ ...inputStyle, background: '#f8fafc', color: '#888' }} /></div>
          <div><label style={labelStyle}>Tên hiển thị:</label><input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Ngày tham gia:</label><p style={{ margin: 0, color: '#666' }}>📅 {new Date(user.created_at).toLocaleDateString('vi-VN')}</p></div>

          {/* STATS */}
          <div style={{ display: 'flex', gap: '10px' }}>
            {[
              { label: 'Tổng tài liệu', value: docStats.total, color: '#dbeafe', text: '#1d4ed8' },
              { label: 'Đã duyệt', value: docStats.approved, color: '#dcfce7', text: '#15803d' },
              { label: 'Chờ duyệt', value: docStats.pending, color: '#fef9c3', text: '#a16207' },
            ].map(s => (
              <div key={s.label} style={{ flex: 1, background: s.color, borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: 'bold', color: s.text }}>{s.value}</div>
                <div style={{ fontSize: '11px', color: s.text, marginTop: '2px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          <button type="submit" style={{ padding: '14px', background: 'linear-gradient(135deg, #10b981, #06b6d4)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px', boxShadow: '0 4px 14px rgba(16,185,129,0.35)' }}>Lưu thay đổi</button>
        </form>
        </div>
      </div>

      {/* BIỂU ĐỒ TÀI LIỆU */}
      {topDocs.length > 0 && (
        <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 'bold', color: '#1a1a1a' }}>📊 Top tài liệu của bạn</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topDocs} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
              <Bar dataKey="tải" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="xem" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ĐỔI MẬT KHẨU */}
      <div style={{ borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}>
        <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #7c3aed 100%)', padding: '20px 32px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
          <h3 style={{ margin: 0, color: '#fff', fontSize: '17px', fontWeight: 'bold', position: 'relative' }}>🔒 Đổi mật khẩu</h3>
        </div>
        <div style={{ background: '#fff', padding: '28px 32px' }}>
        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div><label style={labelStyle}>Mật khẩu hiện tại:</label><input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} style={inputStyle} required /></div>
          <div><label style={labelStyle}>Mật khẩu mới:</label><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={inputStyle} required /></div>
          <div><label style={labelStyle}>Xác nhận mật khẩu mới:</label><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={inputStyle} required /></div>
          {pwMsg && <p style={{ margin: 0, color: pwMsg.type === 'error' ? '#ef4444' : '#10b981', fontWeight: 'bold', fontSize: '14px' }}>{pwMsg.text}</p>}
          <button type="submit" style={{ padding: '14px', background: 'linear-gradient(135deg, #3b82f6, #7c3aed)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px', boxShadow: '0 4px 14px rgba(59,130,246,0.35)' }}>Đổi mật khẩu</button>
        </form>
        </div>
      </div>
    </div>
  );
}

export default Profile;