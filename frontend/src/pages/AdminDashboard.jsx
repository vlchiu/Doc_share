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
    } catch (error) { console.error("Lỗi", error); }
  };

  const handleApprove = async (docId) => {
    try {
      await axiosClient.put(`/documents/${docId}/approve`);
      alert("✅ Đã duyệt tài liệu thành công!");
      setPendingDocs(pendingDocs.filter(doc => doc.id !== docId));
    } catch (error) { alert("❌ Lỗi khi duyệt!"); }
  };

  const handleDelete = async (docId) => {
    if (window.confirm("⚠️ QUYỀN ADMIN: Bạn có chắc chắn muốn xóa vĩnh viễn tài liệu này?")) {
      try {
        await axiosClient.delete(`/documents/${docId}`);
        setPendingDocs(pendingDocs.filter(doc => doc.id !== docId));
      } catch (error) { alert("❌ Lỗi khi xóa!"); }
    }
  };

  const thStyle = { padding: '15px', textAlign: 'left', fontWeight: 'bold', color: '#64748b', fontSize: '13px', textTransform: 'uppercase' };
  const tdStyle = { padding: '15px', borderBottom: '1px solid #e2e8f0' };

  return (
    <div style={{ padding: '30px 20px' }}>
      <h2 style={{ textAlign: 'center', color: '#b91c1c', fontSize: '28px', marginBottom: '30px' }}>🛡️ Khu vực Quản trị (Admin)</h2>
      
      {/* THIẾT KẾ ISLAND BẢNG - Bo góc, đổ bóng, trên nền xám */}
      <div style={{ background: '#fff', padding: '30px', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.06)' }}>
        <h3 style={{ marginBottom: '20px', color: '#1a1a1a' }}>Tài liệu chờ kiểm duyệt ({pendingDocs.length})</h3>
        
        {pendingDocs.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#10b981', fontWeight: 'bold', padding: '30px 0' }}>🎉 Không có tài liệu nào đang chờ duyệt. Mọi thứ đều ổn!</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ ...thStyle, borderTopLeftRadius: '8px', borderBottomLeftRadius: '8px' }}>Tên tài liệu</th>
                <th style={thStyle}>Người đăng</th>
                <th style={thStyle}>Ngày tải lên</th>
                <th style={{ ...thStyle, textAlign: 'center', borderTopRightRadius: '8px', borderBottomRightRadius: '8px' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {pendingDocs.map(doc => (
                <tr key={doc.id} style={{ transition: '0.2s' }}>
                  <td style={{ ...tdStyle, fontWeight: 'bold' }}>
                    <a href={`http://localhost:5000${doc.file_url}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: '#3b82f6' }}>
                      {doc.title}
                    </a>
                  </td>
                  <td style={tdStyle}>{doc.user?.name}</td>
                  <td style={tdStyle}>{new Date(doc.created_at).toLocaleDateString('vi-VN')}</td>
                  <td style={{ ...tdStyle, display: 'flex', gap: '8px', justifyContent: 'center', borderBottom: 'none' }}>
                    <button onClick={() => handleApprove(doc.id)} style={{ padding: '8px 15px', background: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>✅ Duyệt</button>
                    <button onClick={() => handleDelete(doc.id)} style={{ padding: '8px 15px', background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>🗑️ Xóa</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;