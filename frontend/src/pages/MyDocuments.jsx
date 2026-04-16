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

  const btnStyle = { padding: '10px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' };

  return (
    <div style={{ padding: '30px 20px', color: '#1e293b' }}>
      <h2 style={{ color: '#334155', fontSize: '28px', marginBottom: '20px' }}>📁 Tài liệu cá nhân</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '25px' }}>
        {myDocs.length === 0 ? (
          <p style={{ color: '#64748b' }}>Bạn chưa tải lên tài liệu nào.</p>
        ) : (
          myDocs.map((doc) => (
            <div key={doc.id} style={{ background: '#fff', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#0f172a', fontSize: '18px', lineHeight: '1.4' }}>{doc.title}</h3>
              
              <div style={{ fontSize: '13px', color: '#475569', background: '#f8fafc', padding: '12px 15px', borderRadius: '12px', marginBottom: '20px' }}>
                <p style={{ margin: '0 0 8px 0' }}>📁 Danh mục: <b style={{ color: '#0f172a' }}>{doc.category?.name}</b></p>
                <div style={{ display: 'flex', gap: '15px', borderTop: '1px solid #e2e8f0', paddingTop: '8px', fontWeight: 'bold' }}>
                  <span style={{ color: '#64748b' }}>👁️ Xem: {doc.view_count || 0}</span>
                  <span style={{ color: '#3b82f6' }}>⬇️ Tải: {doc.download_count || 0}</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 'auto' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => handleUpdateTitle(doc.id, doc.title)} style={{ ...btnStyle, flex: 1, background: '#fef3c7', color: '#d97706' }}>
                    ✏️ Sửa tên
                  </button>
                  <input type="file" id={`fileInput-${doc.id}`} style={{ display: 'none' }} onChange={(e) => handleUpdateFile(e, doc.id)} />
                  <button onClick={() => document.getElementById(`fileInput-${doc.id}`).click()} style={{ ...btnStyle, flex: 1, background: '#e0e7ff', color: '#4f46e5' }}>
                    🔄 Đổi file
                  </button>
                </div>
                
                <button onClick={() => handleDelete(doc.id)} style={{ ...btnStyle, width: '100%', background: '#fee2e2', color: '#ef4444' }}>
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