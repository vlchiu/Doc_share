import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import axiosClient from '../api/axiosClient';
import { FILE_ICONS, FILE_BADGE_COLORS, getFileLabel } from '../utils/fileHelper';

function SavedDocuments() {
  const [savedDocs, setSavedDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosClient.get('/documents/saved')
      .then(res => setSavedDocs(res.data))
      .catch(() => toast.error('Lỗi tải dữ liệu!'))
      .finally(() => setLoading(false));
  }, []);

  const handleUnsave = async (e, docId) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await axiosClient.post(`/documents/${docId}/save`);
      setSavedDocs(savedDocs.filter(doc => doc.id !== docId));
      toast('Đã bỏ lưu.');
    } catch { toast.error('Lỗi khi bỏ lưu!'); }
  };

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '60px' }}>
      <div style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTop: '4px solid #3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ color: '#1e293b' }}>
      <div style={{ background: 'linear-gradient(135deg, #065f46 0%, #10b981 60%, #06b6d4 100%)', borderRadius: '16px', padding: '24px 32px', marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <h2 style={{ margin: '0 0 4px', fontSize: '22px', color: '#fff', fontWeight: 'bold', position: 'relative' }}>🔖 Tài liệu đã lưu</h2>
        <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '13px', position: 'relative' }}>{savedDocs.length} tài liệu</p>
      </div>

      {savedDocs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '56px', marginBottom: '12px' }}>🔖</div>
          <p style={{ fontSize: '17px', color: '#64748b', fontWeight: '500' }}>Chưa có tài liệu nào được lưu.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {savedDocs.map(doc => {
            const fileIcon = FILE_ICONS[doc.file_type] || '📎';
            const fileLabel = getFileLabel(doc.file_type, doc.file_url);
            const bc = FILE_BADGE_COLORS[fileLabel] || { bg: '#f1f5f9', color: '#475569' };
            return (
              <Link key={doc.id} to={`/documents/${doc.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                <div style={{ background: '#fff', padding: '18px', borderRadius: '14px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '10px', border: '1px solid #f1f5f9', transition: '0.2s', cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(16,185,129,0.1)'; e.currentTarget.style.borderColor = '#a7f3d0'; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.05)'; e.currentTarget.style.borderColor = '#f1f5f9'; }}
                >
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '26px', flexShrink: 0, lineHeight: 1 }}>{fileIcon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#0f172a', lineHeight: 1.4, flex: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{doc.title}</h3>
                        <span style={{ flexShrink: 0, padding: '2px 6px', borderRadius: '5px', fontSize: '10px', fontWeight: 'bold', background: bc.bg, color: bc.color }}>{fileLabel}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', color: '#64748b', background: '#f8fafc', padding: '8px 10px', borderRadius: '7px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>👤 {doc.user?.name} · 📁 {doc.category?.name}</span>
                    <span style={{ fontWeight: 'bold' }}>👁️ {doc.view_count || 0} · ⬇️ {doc.download_count || 0}</span>
                  </div>

                  <button onClick={e => handleUnsave(e, doc.id)}
                    style={{ padding: '8px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', width: '100%', background: '#fee2e2', color: '#ef4444', marginTop: 'auto' }}>
                    ❌ Bỏ lưu
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

export default SavedDocuments;
