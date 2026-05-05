import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import axiosClient from '../api/axiosClient';
import { openOrDownload, FILE_ICONS, FILE_BADGE_COLORS, getFileLabel } from '../utils/fileHelper';

const API_URL = import.meta.env.VITE_API_URL;

function SavedDocuments() {
  const [savedDocs, setSavedDocs] = useState([]);

  useEffect(() => {
    axiosClient.get('/documents/saved').then(res => setSavedDocs(res.data)).catch(() => toast.error('Lỗi tải dữ liệu!'));
  }, []);

  const handleUnsave = async (docId) => {
    try {
      await axiosClient.post(`/documents/${docId}/save`);
      setSavedDocs(savedDocs.filter(doc => doc.id !== docId));
      toast('Đã bỏ lưu.');
    } catch { toast.error('Lỗi khi bỏ lưu!'); }
  };

  const handleView = async (doc) => {
    try {
      await axiosClient.post(`/documents/${doc.id}/view`);
      openOrDownload(`${API_URL}${doc.file_url}`, doc.file_type, doc.file_url.split('/').pop(), () => handleDownload(doc));
    } catch {}
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
      toast.success('Đang tải xuống...');
    } catch { toast.error('Lỗi khi tải file!'); }
  };

  const btnStyle = { padding: '10px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' };

  return (
    <div style={{ color: '#1e293b' }}>
      {/* HEADER */}
      <div style={{ background: 'linear-gradient(135deg, #065f46 0%, #10b981 60%, #06b6d4 100%)', borderRadius: '16px', padding: '24px 32px', marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <h2 style={{ margin: '0 0 4px', fontSize: '22px', color: '#fff', fontWeight: 'bold', position: 'relative' }}>🔖 Tài liệu đã lưu</h2>
        <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '13px', position: 'relative' }}>{savedDocs.length} tài liệu</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '25px' }}>
        {savedDocs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', gridColumn: '1/-1' }}>
            <div style={{ fontSize: '56px', marginBottom: '12px' }}>🔖</div>
            <p style={{ fontSize: '17px', color: '#64748b', fontWeight: '500' }}>Chưa có tài liệu nào được lưu.</p>
          </div>
        ) : (
          savedDocs.map((doc) => {
            const fileIcon = FILE_ICONS[doc.file_type] || '📎';
            const fileLabel = getFileLabel(doc.file_type, doc.file_url);
            const bc = FILE_BADGE_COLORS[fileLabel] || { bg: '#f1f5f9', color: '#475569' };
            return (
            <div key={doc.id} style={{ background: '#fff', padding: '18px', borderRadius: '14px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '12px' }}>

              {/* HEADER */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '28px', flexShrink: 0, lineHeight: 1 }}>{fileIcon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                    <Link to={`/documents/${doc.id}`} style={{ textDecoration: 'none', color: '#0f172a', flex: 1, minWidth: 0 }}>
                      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{doc.title}</h3>
                    </Link>
                    <span style={{ flexShrink: 0, padding: '2px 7px', borderRadius: '5px', fontSize: '10px', fontWeight: 'bold', background: bc.bg, color: bc.color }}>{fileLabel}</span>
                  </div>
                </div>
              </div>

              {/* META */}
              <div style={{ fontSize: '12px', color: '#64748b', background: '#f8fafc', padding: '9px 12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>👤 <b style={{ color: '#334155' }}>{doc.user?.name}</b> · 📁 {doc.category?.name}</span>
                <div style={{ display: 'flex', gap: '10px', fontWeight: 'bold' }}>
                  <span>👁️ {doc.view_count || 0}</span>
                  <span style={{ color: '#3b82f6' }}>⬇️ {doc.download_count || 0}</span>
                </div>
              </div>

              {/* ACTIONS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => handleView(doc)} style={{ ...btnStyle, flex: 1, background: '#f1f5f9', color: '#334155' }}>👀 Xem</button>
                  <button onClick={() => handleDownload(doc)} style={{ ...btnStyle, flex: 1, background: '#3b82f6', color: '#fff' }}>⬇️ Tải</button>
                  <Link to={`/documents/${doc.id}`} style={{ ...btnStyle, flex: 1, background: '#f0fdf4', color: '#16a34a', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🔍 Chi tiết</Link>
                </div>
                <button onClick={() => handleUnsave(doc.id)} style={{ ...btnStyle, width: '100%', background: '#fee2e2', color: '#ef4444' }}>❌ Bỏ lưu</button>
              </div>
            </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default SavedDocuments;