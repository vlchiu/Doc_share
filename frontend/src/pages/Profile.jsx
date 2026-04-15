import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';

function Profile() {
  const [user, setUser] = useState(null);
  const [newName, setNewName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null); // Để xem trước ảnh khi chọn

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    const res = await axiosClient.get('/auth/me');
    setUser(res.data);
    setNewName(res.data.name);
  };

  // Xử lý khi chọn ảnh
  const onFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file)); // Tạo link tạm để hiện ảnh lên màn hình
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name', newName);
    if (selectedFile) formData.append('avatar', selectedFile);

    try {
      await axiosClient.put('/auth/update-profile', formData);
      alert("✅ Cập nhật thông tin thành công!");
      window.location.reload(); // Load lại để menu trên Navbar cũng cập nhật theo
    } catch (error) {
      alert("❌ Lỗi: " + error.response?.data?.message);
    }
  };

  if (!user) return <p>Đang tải...</p>;

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', background: '#fff', padding: '30px', borderRadius: '15px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>⚙️ Thiết lập tài khoản</h2>
      
      <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* KHU VỰC AVATAR */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
          <div style={{ position: 'relative', width: '120px', height: '120px' }}>
            <img 
              src={preview || (user.avatar_url ? `http://localhost:5000${user.avatar_url}` : `https://ui-avatars.com/api/?name=${user.name}&background=random`)} 
              alt="avatar" 
              style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '4px solid #f0f2f5' }}
            />
            <label htmlFor="avatar-input" style={{ position: 'absolute', bottom: '5px', right: '5px', background: '#3498db', color: '#fff', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '14px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
              📷
            </label>
            <input id="avatar-input" type="file" hidden onChange={onFileChange} accept="image/*" />
          </div>
          <p style={{ fontSize: '13px', color: '#888' }}>Bấm vào icon camera để thay đổi ảnh đại diện</p>
        </div>

        {/* THÔNG TIN CHI TIẾT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <label style={{ fontWeight: 'bold', color: '#555' }}>Email đăng ký (Không thể sửa):</label>
          <input type="text" value={user.email} disabled style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd', background: '#f9f9f9', color: '#888' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <label style={{ fontWeight: 'bold', color: '#555' }}>Tên hiển thị:</label>
          <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #3498db', outline: 'none' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <label style={{ fontWeight: 'bold', color: '#555' }}>Ngày tham gia:</label>
          <p style={{ margin: 0, color: '#666' }}>📅 {new Date(user.created_at).toLocaleDateString('vi-VN')}</p>
        </div>

        <button type="submit" style={{ marginTop: '10px', padding: '15px', background: '#2ecc71', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>
          Lưu thay đổi
        </button>

      </form>
    </div>
  );
}

export default Profile;