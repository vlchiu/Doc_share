import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';

function SavedDocuments() {
  const [savedDocs, setSavedDocs] = useState([]);

  useEffect(() => {
    fetchSavedDocs();
  }, []);

  const fetchSavedDocs = async () => {
    try {
      const res = await axiosClient.get('/documents/saved');
      setSavedDocs(res.data);
    } catch (error) { console.error("Lỗi", error); }
  };

  const handleUnsave = async (docId) => {
    try {
      await axiosClient.post(`/documents/${docId}/save`);
      setSavedDocs(savedDocs.filter(doc => doc.id !== docId));
    } catch (error) { alert("Lỗi khi bỏ lưu"); }
  };

  const handleView = async (doc) => {
    try {
      await axiosClient.post(`/documents/${doc.id}/view`);
      window.open(`http://localhost:5000${doc.file_url}`, '_blank');
      setSavedDocs(savedDocs.map(d => d.id === doc.id ? { ...d, view_count: d.view_count + 1 } : d));
    } catch (error) {}
  };

  const handleDownload = async (doc) => {
    try {
      await axiosClient.post(`/documents/${doc.id}/download`);
      window.open(`http://localhost:5000${doc.file_url}`, '_blank');
      setSavedDocs(savedDocs.map(d => d.id === doc.id ? { ...d, download_count: d.download_count + 1 } : d));
    } catch (error) {}
  };

  return (
    <div style={{ padding: '20px', color: '#333' }}>
      <h2 style={{ color: '#555' }}>🔖 Tài liệu đã lưu</h2>
      <hr style={{ border: '1px solid #eee', marginBottom: '20px' }} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {savedDocs.length === 0 ? (
          <p style={{ color: '#777' }}>Chưa có tài liệu lưu trữ.</p>
        ) : (
          savedDocs.map((doc) => (
            <div key={doc.id} style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', background: '#fff', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#333', fontSize: '18px' }}>{doc.title}</h3>
              
              <div style={{ fontSize: '13px', color: '#555', background: '#f9f9f9', padding: '10px', borderRadius: '6px', marginBottom: '15px' }}>
                <p style={{ margin: '0 0 5px 0' }}>👤 Đăng bởi: <b>{doc.user?.name}</b></p>
                <div style={{ display: 'flex', gap: '15px', borderTop: '1px solid #eee', paddingTop: '5px' }}>
                  <span>👁️ Xem: {doc.view_count || 0}</span>
                  <span>⬇️ Tải: {doc.download_count || 0}</span>
                </div>
              </div>

              <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => handleView(doc)} style={{ flex: 1, padding: '10px', background: '#95a5a6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                    👀 Xem
                  </button>
                  <button onClick={() => handleDownload(doc)} style={{ flex: 1, padding: '10px', background: '#3498db', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                    ⬇️ Tải xuống
                  </button>
                </div>
                
                <button onClick={() => handleUnsave(doc.id)} style={{ width: '100%', padding: '10px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                  ❌ Bỏ lưu
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default SavedDocuments;