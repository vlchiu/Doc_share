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
      const fileUrl = `http://localhost:5000${doc.file_url}`;
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const fileName = doc.file_url.split('/').pop() || doc.title;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      setSavedDocs(savedDocs.map(d => d.id === doc.id ? { ...d, download_count: d.download_count + 1 } : d));
    } catch (error) { alert("❌ Lỗi khi tải file. Vui lòng thử lại!"); }
  };

  const btnStyle = { padding: '10px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' };

  return (
    <div style={{ padding: '30px 20px', color: '#1e293b' }}>
      <h2 style={{ color: '#334155', fontSize: '28px', marginBottom: '20px' }}>🔖 Tài liệu đã lưu</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '25px' }}>
        {savedDocs.length === 0 ? (
          <p style={{ color: '#64748b' }}>Chưa có tài liệu lưu trữ.</p>
        ) : (
          savedDocs.map((doc) => (
            <div key={doc.id} style={{ background: '#fff', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#0f172a', fontSize: '18px', lineHeight: '1.4' }}>{doc.title}</h3>
              
              <div style={{ fontSize: '13px', color: '#475569', background: '#f8fafc', padding: '12px 15px', borderRadius: '12px', marginBottom: '20px' }}>
                <p style={{ margin: '0 0 8px 0' }}>👤 Đăng bởi: <b style={{ color: '#0f172a' }}>{doc.user?.name}</b></p>
                <div style={{ display: 'flex', gap: '15px', borderTop: '1px solid #e2e8f0', paddingTop: '8px', fontWeight: 'bold' }}>
                  <span style={{ color: '#64748b' }}>👁️ Xem: {doc.view_count || 0}</span>
                  <span style={{ color: '#3b82f6' }}>⬇️ Tải: {doc.download_count || 0}</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 'auto' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => handleView(doc)} style={{ ...btnStyle, flex: 1, background: '#e2e8f0', color: '#334155' }}>
                    👀 Xem
                  </button>
                  <button onClick={() => handleDownload(doc)} style={{ ...btnStyle, flex: 1, background: '#3b82f6', color: '#fff', boxShadow: '0 4px 10px rgba(59, 130, 246, 0.3)' }}>
                    ⬇️ Tải xuống
                  </button>
                </div>
                
                <button onClick={() => handleUnsave(doc.id)} style={{ ...btnStyle, width: '100%', background: '#fee2e2', color: '#ef4444' }}>
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