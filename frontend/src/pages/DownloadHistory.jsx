import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import axiosClient from '../api/axiosClient';
import Spinner from '../components/Spinner';
import { FILE_ICONS, FILE_BADGE_COLORS, getFileLabel } from '../utils/fileHelper';

const thStyle = { padding: '12px 16px', textAlign: 'left', fontWeight: 'bold', color: '#64748b', fontSize: '12px', textTransform: 'uppercase' };

function DownloadHistory() {
  const [history, setHistory] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const fetchHistory = () => {
    setLoading(true);
    axiosClient.get(`/documents/history?page=${page}`)
      .then(res => { setHistory(res.data.history); setPagination(res.data.pagination); })
      .catch(() => toast.error('Lỗi tải lịch sử!'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchHistory(); }, [page]);

  const handleDelete = async (historyId) => {
    try {
      await axiosClient.delete(`/documents/history/${historyId}`);
      setHistory(h => h.filter(item => item.id !== historyId));
      setPagination(p => ({ ...p, total: p.total - 1 }));
      toast.success('Đã xóa!');
    } catch { toast.error('Lỗi khi xóa!'); }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Xóa toàn bộ lịch sử tải xuống?')) return;
    try {
      await axiosClient.delete('/documents/history/clear');
      setHistory([]);
      setPagination({ total: 0, page: 1, totalPages: 1 });
      toast.success('Đã xóa toàn bộ lịch sử!');
    } catch { toast.error('Lỗi!'); }
  };

  if (loading) return <Spinner />;

  return (
    <div style={{ color: '#1e293b' }}>
      {/* HEADER GRADIENT */}
      <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 60%, #06b6d4 100%)', borderRadius: '16px', padding: '24px 32px', marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: '22px', color: '#fff', fontWeight: 'bold' }}>📥 Lịch sử tải xuống</h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>{pagination.total} lượt tải</p>
          </div>
          {history.length > 0 && (
            <button onClick={handleClearAll}
              style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', backdropFilter: 'blur(4px)' }}>
              🗑️ Xóa tất cả
            </button>
          )}
        </div>
      </div>

      {history.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '14px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '64px', marginBottom: '12px' }}>📭</div>
          <p style={{ fontSize: '17px', color: '#64748b', fontWeight: '500' }}>Bạn chưa tải xuống tài liệu nào.</p>
        </div>
      ) : (
        <>
          <div style={{ background: '#fff', borderRadius: '14px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'linear-gradient(135deg, #f0f7ff, #f8fafc)' }}>
                  <th style={thStyle}>Tài liệu</th>
                  <th style={thStyle}>Danh mục</th>
                  <th style={thStyle}>Loại</th>
                  <th style={thStyle}>Thời gian tải</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {history.map(item => {
                  const doc = item.document;
                  if (!doc) return null;
                  const fileIcon = FILE_ICONS[doc.file_type] || '📎';
                  const fileLabel = getFileLabel(doc.file_type, doc.file_url);
                  const bc = FILE_BADGE_COLORS[fileLabel] || { bg: '#f1f5f9', color: '#475569' };
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', transition: '0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                      <td style={{ padding: '14px 16px' }}>
                        <Link to={`/documents/${doc.id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '22px' }}>{fileIcon}</span>
                          <span style={{ fontWeight: 'bold', color: '#1a1a1a', fontSize: '14px' }}>{doc.title}</span>
                        </Link>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#64748b', fontSize: '13px' }}>📁 {doc.category?.name || '—'}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', background: bc.bg, color: bc.color }}>{fileLabel}</span>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#94a3b8', fontSize: '13px' }}>
                        {new Date(item.created_at).toLocaleString('vi-VN')}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <button onClick={() => handleDelete(item.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '16px', padding: '4px', borderRadius: '6px', transition: '0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}>🗑️</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: page === 1 ? '#f1f5f9' : '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', fontWeight: 'bold', color: '#555' }}>← Trước</button>
              <span style={{ padding: '8px 16px', color: '#64748b', fontSize: '14px' }}>Trang {page} / {pagination.totalPages}</span>
              <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: page === pagination.totalPages ? '#f1f5f9' : '#fff', cursor: page === pagination.totalPages ? 'not-allowed' : 'pointer', fontWeight: 'bold', color: '#555' }}>Sau →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default DownloadHistory;
