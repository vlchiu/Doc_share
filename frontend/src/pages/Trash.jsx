import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import axiosClient from '../api/axiosClient';
import Spinner from '../components/Spinner';

function Trash() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosClient.get('/documents/trash')
      .then(res => setDocs(res.data))
      .catch(() => toast.error('Lỗi tải thùng rác!'))
      .finally(() => setLoading(false));
  }, []);

  const handleRestore = async (id) => {
    try {
      await axiosClient.put(`/documents/${id}/restore`);
      setDocs(docs.filter(d => d.id !== id));
      toast.success('Đã khôi phục tài liệu!');
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi!'); }
  };

  const handlePermanentDelete = async (id) => {
    if (!window.confirm('⚠️ Xóa vĩnh viễn? Không thể khôi phục!')) return;
    try {
      await axiosClient.delete(`/documents/${id}/permanent`);
      setDocs(docs.filter(d => d.id !== id));
      toast.success('Đã xóa vĩnh viễn!');
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi!'); }
  };

  const btnStyle = { padding: '8px 14px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' };

  if (loading) return <Spinner />;

  return (
    <div style={{ color: '#1e293b' }}>
      {/* HEADER GRADIENT */}
      <div style={{ background: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 60%, #f97316 100%)', borderRadius: '16px', padding: '24px 32px', marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: '22px', color: '#fff', fontWeight: 'bold' }}>🗑️ Thùng rác</h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>
              {docs.length > 0 ? `${docs.length} tài liệu — có thể khôi phục hoặc xóa vĩnh viễn` : 'Thùng rác trống'}
            </p>
          </div>
          {docs.length > 0 && (
            <span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', padding: '4px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold' }}>
              {docs.length} mục
            </span>
          )}
        </div>
      </div>

      {docs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '14px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '64px', marginBottom: '12px' }}>🗑️</div>
          <p style={{ fontSize: '17px', color: '#64748b', fontWeight: '500' }}>Thùng rác trống.</p>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '6px' }}>Các tài liệu bị xóa sẽ xuất hiện ở đây.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {docs.map(doc => (
            <div key={doc.id} style={{ background: '#fff', padding: '18px', borderRadius: '14px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid #fee2e2', opacity: 0.9 }}>
              <div>
                <h3 style={{ margin: '0 0 5px', fontSize: '15px', fontWeight: 'bold', color: '#94a3b8', textDecoration: 'line-through', lineHeight: 1.4 }}>{doc.title}</h3>
                <span style={{ fontSize: '11px', color: '#fca5a5', background: '#fff5f5', padding: '2px 8px', borderRadius: '6px' }}>
                  🗑️ {new Date(doc.deleted_at).toLocaleString('vi-VN')}
                </span>
              </div>

              <div style={{ fontSize: '12px', color: '#64748b', background: '#f8fafc', padding: '9px 12px', borderRadius: '8px' }}>
                👤 {doc.user?.name} · 📁 {doc.category?.name} · 🏷️ {doc.doc_type}
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                <button onClick={() => handleRestore(doc.id)}
                  style={{ ...btnStyle, flex: 1, background: '#dcfce7', color: '#16a34a' }}>♻️ Khôi phục</button>
                <button onClick={() => handlePermanentDelete(doc.id)}
                  style={{ ...btnStyle, flex: 1, background: '#fee2e2', color: '#b91c1c' }}>🗑️ Xóa vĩnh viễn</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Trash;
