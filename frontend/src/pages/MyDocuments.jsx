import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';

function MyDocuments() {
  const [myDocs, setMyDocs] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userRes, docsRes] = await Promise.all([
          axiosClient.get('/auth/me'),
          axiosClient.get('/documents')
        ]);
        const currentUser = userRes.data;
        const filteredDocs = docsRes.data.filter(doc => doc.user_id === currentUser.id);
        setMyDocs(filteredDocs);
      } catch (error) { console.error('Lỗi tải dữ liệu', error); }
    };
    fetchData();
  }, []);

  const handleUpdateTitle = async (docId, oldTitle) => {
    const newTitle = prompt("Nhập tên mới:", oldTitle);
    if (newTitle && newTitle !== oldTitle) {
      try {
        await axiosClient.put(`/documents/${docId}`, { title: newTitle });
        setMyDocs(myDocs.map(doc => doc.id === docId ? { ...doc, title: newTitle } : doc));
      } catch (error) { alert("Lỗi đổi tên!"); }
    }
  };

  const handleDelete = async (docId) => {
    if (window.confirm("⚠️ Bạn có chắc chắn muốn xóa tài liệu này?")) {
      try {
        await axiosClient.delete(`/documents/${docId}`);
        setMyDocs(myDocs.filter(doc => doc.id !== docId));
      } catch (error) { alert("Lỗi khi xóa!"); }
    }
  };

  const handleUpdateFile = async (e, docId) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!window.confirm("🔄 Thay thế nội dung bằng file mới?")) {
      e.target.value = null; 
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    try {
      await axiosClient.put(`/documents/${docId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      alert("✅ Đã cập nhật file mới!");
    } catch (error) { alert("❌ Lỗi tải file!"); }
  };

  return (
    <div style={{ padding: '20px', color: '#333' }}>
      <h2 style={{ color: '#555' }}>📁 Quản lý Tài liệu cá nhân</h2>
      <hr style={{ border: '1px solid #eee', marginBottom: '20px' }} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {myDocs.length === 0 ? (
          <p style={{ color: '#777' }}>Chưa có tài liệu nào.</p>
        ) : (
          myDocs.map((doc) => (
            <div key={doc.id} style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', background: '#fff', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#333', fontSize: '18px' }}>{doc.title}</h3>
              
              <div style={{ fontSize: '13px', color: '#555', background: '#f9f9f9', padding: '10px', borderRadius: '6px', marginBottom: '15px' }}>
                <p style={{ margin: '0 0 5px 0' }}>📁 Danh mục: {doc.category?.name}</p>
                <div style={{ display: 'flex', gap: '15px', borderTop: '1px solid #eee', paddingTop: '5px' }}>
                  <span>👁️ Xem: {doc.view_count || 0}</span>
                  <span>⬇️ Tải: {doc.download_count || 0}</span>
                </div>
              </div>

              <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => handleUpdateTitle(doc.id, doc.title)} style={{ flex: 1, padding: '10px', background: '#95a5a6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                    ✏️ Sửa tên
                  </button>
                  <input type="file" id={`fileInput-${doc.id}`} style={{ display: 'none' }} onChange={(e) => handleUpdateFile(e, doc.id)} />
                  <button onClick={() => document.getElementById(`fileInput-${doc.id}`).click()} style={{ flex: 1, padding: '10px', background: '#7f8c8d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                    🔄 Đổi file
                  </button>
                </div>
                
                <button onClick={() => handleDelete(doc.id)} style={{ padding: '10px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                  🗑️ Xóa tài liệu
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default MyDocuments;