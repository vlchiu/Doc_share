import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import axiosClient from '../api/axiosClient';
import Spinner from '../components/Spinner';
import { FILE_ICONS, FILE_BADGE_COLORS, getFileLabel } from '../utils/fileHelper';

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

  const startEdit = (e, doc) => {
    e.preventDefault(); // ngăn Link navigate
    e.stopPropagation();
    setEditingId(doc.id);
    setEditTitle(doc.title);
  };

  const cancelEdit = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    setEditingId(null);
    setEditTitle('');
  };

  const handleSaveTitle = async (e, docId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editTitle.trim()) return toast.error('Tên không được để trống!');
    try {
      await axiosClient.put(`/documents/${docId}`, { title: editTitle.trim() });
      setMyDocs(myDocs.map(doc => doc.id === docId ? { ...doc, title: editTitle.trim() } : doc));
      toast.success('Đã cập nhật tên!');
      setEditingId(null);
    } catch { toast.error('Lỗi đổi tên!'); }
  };

  const handleDelete = async (e, docId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('⚠️ Chuyển tài liệu vào thùng rác?')) return;
    try {
      await axiosClient.delete(`/documents/${docId}`);
      setMyDocs(myDocs.filter(doc => doc.id !== docId));
      toast.success('Đã chuyển vào thùng rác!');
    } catch { toast.error('Lỗi khi xóa!'); }
  };

  const btnStyle = { padding: '8px 12px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' };

  if (loading) return <Spinner />;

  return (
    <div style={{ color: '#1e293b' }}>
      <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 60%, #06b6d4 100%)', borderRadius: '16px', padding: '24px 32px', marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <h2 style={{ margin: '0 0 4px', fontSize: '22px', color: '#fff', fontWeight: 'bold', position: 'relative' }}>📁 Tài liệu của tôi</h2>
        <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '13px', position: 'relative' }}>{myDocs.length} tài liệu</p>
      </div>

      {myDocs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '56px', marginBottom: '12px' }}>📂</div>
          <p style={{ fontSize: '17px', color: '#64748b', fontWeight: '500' }}>Bạn chưa tải lên tài liệu nào.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {myDocs.map(doc => {
            const fileIcon = FILE_ICONS[doc.file_type] || '📎';
            const fileLabel = getFileLabel(doc.file_type, doc.file_url);
            const bc = FILE_BADGE_COLORS[fileLabel] || { bg: '#f1f5f9', color: '#475569' };
            return (
              <Link key={doc.id} to={`/documents/${doc.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                <div style={{ background: '#fff', padding: '18px', borderRadius: '14px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '10px', border: '1px solid #f1f5f9', transition: '0.2s', cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(59,130,246,0.1)'; e.currentTarget.style.borderColor = '#bfdbfe'; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.05)'; e.currentTarget.style.borderColor = '#f1f5f9'; }}
                >
                  {/* TITLE */}
                  {editingId === doc.id ? (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                      <input autoFocus value={editTitle} onChange={e => setEditTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveTitle(e, doc.id); if (e.key === 'Escape') cancelEdit(e); }}
                        style={{ flex: 1, padding: '7px 10px', borderRadius: '7px', border: '2px solid #3b82f6', outline: 'none', fontSize: '13px', fontWeight: 'bold' }}
                      />
                      <button onClick={e => handleSaveTitle(e, doc.id)} style={{ ...btnStyle, background: '#dcfce7', color: '#16a34a' }}>✓</button>
                      <button onClick={cancelEdit} style={{ ...btnStyle, background: '#f1f5f9', color: '#64748b' }}>✕</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '26px', flexShrink: 0, lineHeight: 1 }}>{fileIcon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#0f172a', lineHeight: 1.4, flex: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{doc.title}</h3>
                          <span style={{ flexShrink: 0, padding: '2px 6px', borderRadius: '5px', fontSize: '10px', fontWeight: 'bold', background: bc.bg, color: bc.color }}>{fileLabel}</span>
                          <button onClick={e => startEdit(e, doc)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '13px', padding: '2px', flexShrink: 0 }} title="Sửa tên">✏️</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* BADGE TRẠNG THÁI */}
                  <span style={{ alignSelf: 'flex-start', padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold',
                    background: doc.status === 'APPROVED' ? '#dcfce7' : doc.status === 'REJECTED' ? '#fee2e2' : '#fef9c3',
                    color: doc.status === 'APPROVED' ? '#16a34a' : doc.status === 'REJECTED' ? '#b91c1c' : '#ca8a04' }}>
                    {doc.status === 'APPROVED' ? '✅ Đã duyệt' : doc.status === 'REJECTED' ? '❌ Bị từ chối' : '⏳ Chờ duyệt'}
                  </span>
                  {doc.status === 'REJECTED' && doc.reject_reason && (
                    <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '7px', padding: '7px 10px', fontSize: '12px', color: '#b91c1c' }}>
                      💬 {doc.reject_reason}
                    </div>
                  )}

                  {/* META */}
                  <div style={{ fontSize: '12px', color: '#64748b', background: '#f8fafc', padding: '8px 10px', borderRadius: '7px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>📁 {doc.category?.name} · 🏷️ {doc.doc_type}</span>
                    <span style={{ fontWeight: 'bold' }}>👁️ {doc.view_count || 0} · ⬇️ {doc.download_count || 0}</span>
                  </div>

                  {/* NÚT XÓA */}
                  <button onClick={e => handleDelete(e, doc.id)}
                    style={{ ...btnStyle, width: '100%', background: '#fee2e2', color: '#ef4444', marginTop: 'auto' }}>
                    🗑️ Chuyển vào thùng rác
                  </button>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MyDocuments;
