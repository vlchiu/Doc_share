import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import axiosClient from '../api/axiosClient';
import Spinner from '../components/Spinner';

function MyDocuments() {
  const [myDocs, setMyDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  useEffect(() => {
    axiosClient.get('/documents/mine')
      .then(res => setMyDocs(res.data))
      .catch(() => toast.error('Lỗi tải dữ liệu!'))
      .finally(() => setLoading(false));
  }, []);

  const startEdit = (doc) => {
    setEditingId(doc.id);
    setEditTitle(doc.title);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const handleSaveTitle = async (docId) => {
    if (!editTitle.trim()) return toast.error('Tên không được để trống!');
    try {
      await axiosClient.put(`/documents/${docId}`, { title: editTitle.trim() });
      setMyDocs(myDocs.map(doc => doc.id === docId ? { ...doc, title: editTitle.trim() } : doc));
      toast.success('Đã cập nhật tên!');
      cancelEdit();
    } catch { toast.error('Lỗi đổi tên!'); }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('⚠️ Bạn có chắc chắn muốn xóa tài liệu này?')) return;
    try {
      await axiosClient.delete(`/documents/${docId}`);
      setMyDocs(myDocs.filter(doc => doc.id !== docId));
      toast.success('Đã xóa tài liệu!');
    } catch { toast.error('Lỗi khi xóa!'); }
  };

  const handleUpdateFile = async (e, docId) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!window.confirm('🔄 Thay thế nội dung bằng file mới?')) { e.target.value = null; return; }
    const formData = new FormData();
    formData.append('file', file);
    try {
      await axiosClient.put(`/documents/${docId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Đã cập nhật file mới!');
    } catch { toast.error('Lỗi tải file!'); }
  };

  const btnStyle = { padding: '9px 14px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' };

  if (loading) return <Spinner />;

  return (
    <div style={{ color: '#1e293b' }}>
      <h2 style={{ color: '#334155', fontSize: '26px', marginBottom: '24px' }}>📁 Tài liệu của tôi</h2>

      {myDocs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '56px', marginBottom: '12px' }}>📂</div>
          <p style={{ fontSize: '17px', color: '#64748b', fontWeight: '500' }}>Bạn chưa tải lên tài liệu nào.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {myDocs.map(doc => (
            <div key={doc.id} style={{ background: '#fff', padding: '20px', borderRadius: '14px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '12px' }}>

              {/* TITLE — inline edit */}
              {editingId === doc.id ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    autoFocus
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveTitle(doc.id); if (e.key === 'Escape') cancelEdit(); }}
                    style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '2px solid #3b82f6', outline: 'none', fontSize: '14px', fontWeight: 'bold' }}
                  />
                  <button onClick={() => handleSaveTitle(doc.id)} style={{ ...btnStyle, background: '#dcfce7', color: '#16a34a', padding: '8px 10px' }}>✓</button>
                  <button onClick={cancelEdit} style={{ ...btnStyle, background: '#f1f5f9', color: '#64748b', padding: '8px 10px' }}>✕</button>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: '#0f172a', lineHeight: 1.4, flex: 1 }}>{doc.title}</h3>
                  <button onClick={() => startEdit(doc)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '16px', padding: '2px', flexShrink: 0 }} title="Sửa tên">✏️</button>
                </div>
              )}

              {/* BADGE TRẠNG THÁI */}
              <span style={{ alignSelf: 'flex-start', padding: '3px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold',
                background: doc.status === 'APPROVED' ? '#dcfce7' : '#fef9c3',
                color: doc.status === 'APPROVED' ? '#16a34a' : '#ca8a04' }}>
                {doc.status === 'APPROVED' ? '✅ Đã duyệt' : '⏳ Chờ duyệt'}
              </span>

              {/* META */}
              <div style={{ fontSize: '13px', color: '#475569', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px' }}>
                <div style={{ marginBottom: '6px' }}>📁 <b style={{ color: '#0f172a' }}>{doc.category?.name}</b> · 🏷️ {doc.doc_type}</div>
                <div style={{ display: 'flex', gap: '16px', fontWeight: 'bold', borderTop: '1px solid #e2e8f0', paddingTop: '7px' }}>
                  <span style={{ color: '#64748b' }}>👁️ {doc.view_count || 0}</span>
                  <span style={{ color: '#3b82f6' }}>⬇️ {doc.download_count || 0}</span>
                </div>
              </div>

              {/* ACTIONS */}
              <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                <input type="file" id={`fileInput-${doc.id}`} style={{ display: 'none' }} onChange={e => handleUpdateFile(e, doc.id)} />
                <button onClick={() => document.getElementById(`fileInput-${doc.id}`).click()}
                  style={{ ...btnStyle, flex: 1, background: '#e0e7ff', color: '#4f46e5' }}>🔄 Đổi file</button>
                <button onClick={() => handleDelete(doc.id)}
                  style={{ ...btnStyle, flex: 1, background: '#fee2e2', color: '#ef4444' }}>🗑️ Xóa</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyDocuments;
