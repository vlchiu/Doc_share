import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';

function AdminDashboard() {
  const [pendingDocs, setPendingDocs] = useState([]);

  useEffect(() => {
    fetchPendingDocs();
  }, []);

  const fetchPendingDocs = async () => {
    try {
      const res = await axiosClient.get('/documents/pending');
      setPendingDocs(res.data);
    } catch (error) {
      console.error("Lỗi lấy danh sách", error);
    }
  };

  const handleApprove = async (docId) => {
    try {
      await axiosClient.put(`/documents/${docId}/approve`);
      alert("✅ Đã duyệt tài liệu thành công!");
      // Xóa tài liệu khỏi danh sách chờ
      setPendingDocs(pendingDocs.filter(doc => doc.id !== docId));
    } catch (error) {
      alert("❌ Lỗi khi duyệt!");
    }
  };

  const handleDelete = async (docId) => {
    if (window.confirm("⚠️ Xóa từ chối tài liệu này?")) {
      try {
        await axiosClient.delete(`/documents/${docId}`);
        setPendingDocs(pendingDocs.filter(doc => doc.id !== docId));
      } catch (error) { alert("Lỗi khi xóa!"); }
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ textAlign: 'center', color: '#c0392b' }}>🛡️ Khu vực Quản trị (Admin)</h2>
      <h3>Tài liệu chờ kiểm duyệt ({pendingDocs.length})</h3>
      <hr style={{ marginBottom: '20px' }} />

      {pendingDocs.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#27ae60', fontWeight: 'bold' }}>🎉 Không có tài liệu nào đang chờ duyệt. Mọi thứ đều ổn!</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', boxShadow: '0 4px 8px rgba(0,0,0,0.05)' }}>
          <thead>
            <tr style={{ background: '#34495e', color: 'white', textAlign: 'left' }}>
              <th style={{ padding: '15px' }}>Tên tài liệu</th>
              <th style={{ padding: '15px' }}>Người đăng</th>
              <th style={{ padding: '15px' }}>Ngày tải lên</th>
              <th style={{ padding: '15px', textAlign: 'center' }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {pendingDocs.map(doc => (
              <tr key={doc.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '15px', fontWeight: 'bold' }}>
                  <a href={`http://localhost:5000${doc.file_url}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: '#2980b9' }}>
                    {doc.title}
                  </a>
                </td>
                <td style={{ padding: '15px' }}>{doc.user?.name}</td>
                <td style={{ padding: '15px' }}>{new Date(doc.created_at).toLocaleDateString('vi-VN')}</td>
                <td style={{ padding: '15px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <button onClick={() => handleApprove(doc.id)} style={{ padding: '8px 15px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>✅ Duyệt</button>
                  <button onClick={() => handleDelete(doc.id)} style={{ padding: '8px 15px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>❌ Xóa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default AdminDashboard;