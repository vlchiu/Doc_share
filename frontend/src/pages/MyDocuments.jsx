import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import axiosClient from '../api/axiosClient';
import Spinner from '../components/Spinner';
import { openOrDownload, FILE_ICONS, FILE_BADGE_COLORS, getFileLabel } from '../utils/fileHelper';

const API_URL = import.meta.env.VITE_API_URL;

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
    if (!window.confirm('⚠️ Chuyển tài liệu vào thùng rác?')) return;
    try {
      await axiosClient.delete(`/documents/${docId}`);
      setMyDocs(myDocs.filter(doc => doc.id !== docId));
      toast.success('Đã chuyển vào thùng rác!');
    } catch { toast.error('Lỗi khi xóa!'); }
  };

  const handleView = (doc) => {
    axiosClient.post(`/documents/${doc.id}/view`).catch(() => {});
    openOrDownload(`${API_URL}${doc.file_url}`, doc.file_type, doc.file_url.split('/').pop(), () => handleDownload(doc));
  };

  const handleDownload = async (doc) => {
    try {
      await axiosClient.post(`/documents/${doc.id}/download`);
      const res = await fetch(`${API_URL}${doc.file_url}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = doc.file_url.split('/').pop() || doc.title;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
      setMyDocs(myDocs.map(d => d.id === doc.id ? { ...d, download_count: (d.download_count || 0) + 1 } : d));
      toast.success('Đang tải xuống...');
    } catch { toast.error('Lỗi khi tải file!'); }
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
          {myDocs.map(doc => {
            const fileIcon = FILE_ICONS[doc.file_type] || '📎';
            const fileLabel = getFileLabel(doc.file_type, doc.file_url);
            const bc = FILE_BADGE_COLORS[fileLabel] || { bg: '#f1f5f9', color: '#475569' };
            return (
            <div key={doc.id} style={{ background: '#fff', padding: '20px', borderRadius: '14px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '12px' }}>

              {/* TITLE + FILE ICON — inline edit */}
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
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '28px', flexShrink: 0, lineHeight: 1 }}>{fileIcon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: '#0f172a', lineHeight: 1.4, flex: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{doc.title}</h3>
                      <span style={{ flexShrink: 0, padding: '2px 7px', borderRadius: '5px', fontSize: '10px', fontWeight: 'bold', background: bc.bg, color: bc.color }}>{fileLabel}</span>
                      <button onClick={() => startEdit(doc)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '14px', padding: '2px', flexShrink: 0 }} title="Sửa tên">✏️</button>
                    </div>
                  </div>
                </div>
              )}

              {/* BADGE TRẠNG THÁI */}
              <span style={{ alignSelf: 'flex-start', padding: '3px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold',
                background: doc.status === 'APPROVED' ? '#dcfce7' : doc.status === 'REJECTED' ? '#fee2e2' : '#fef9c3',
                color: doc.status === 'APPROVED' ? '#16a34a' : doc.status === 'REJECTED' ? '#b91c1c' : '#ca8a04' }}>
                {doc.status === 'APPROVED' ? '✅ Đã duyệt' : doc.status === 'REJECTED' ? '❌ Bị từ chối' : '⏳ Chờ duyệt'}
              </span>
              {doc.status === 'REJECTED' && doc.reject_reason && (
                <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: '#b91c1c' }}>
                  💬 Lý do: {doc.reject_reason}
                </div>
              )}

              {/* META */}
              <div style={{ fontSize: '13px', color: '#475569', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px' }}>
                <div style={{ marginBottom: '6px' }}>📁 <b style={{ color: '#0f172a' }}>{doc.category?.name}</b> · 🏷️ {doc.doc_type}</div>
                <div style={{ display: 'flex', gap: '16px', fontWeight: 'bold', borderTop: '1px solid #e2e8f0', paddingTop: '7px' }}>
                  <span style={{ color: '#64748b' }}>👁️ {doc.view_count || 0}</span>
                  <span style={{ color: '#3b82f6' }}>⬇️ {doc.download_count || 0}</span>
                </div>
              </div>

              {/* ACTIONS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
                {/* Nút xem/tải/chi tiết — chỉ hiện khi đã duyệt */}
                {doc.status === 'APPROVED' && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => handleView(doc)} style={{ ...btnStyle, flex: 1, background: '#f1f5f9', color: '#334155' }}>👀 Xem</button>
                    <button onClick={() => handleDownload(doc)} style={{ ...btnStyle, flex: 1, background: '#3b82f6', color: '#fff' }}>⬇️ Tải</button>
                    <Link to={`/documents/${doc.id}`} style={{ ...btnStyle, flex: 1, background: '#f0fdf4', color: '#16a34a', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🔍 Chi tiết</Link>
                  </div>
                )}
                <button onClick={() => handleDelete(doc.id)}
                  style={{ ...btnStyle, width: '100%', background: '#fee2e2', color: '#ef4444' }}>🗑️ Thùng rác</button>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MyDocuments;
