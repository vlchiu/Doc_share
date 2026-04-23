import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import axiosClient from '../api/axiosClient';
import Spinner from '../components/Spinner';

const API_URL = import.meta.env.VITE_API_URL;

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
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '26px', color: '#334155' }}>🗑️ Thùng rác</h2>
        <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '3px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold' }}>
          {docs.length} tài liệu
        </span>
      </div>

      {docs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '56px', marginBottom: '12px' }}>🗑️</div>
          <p style={{ fontSize: '17px', color: '#64748b', fontWeight: '500' }}>Thùng rác trống.</p>
        </div>
      ) : (
        <>
          <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '20px' }}>
            Tài liệu trong thùng rác có thể được khôi phục hoặc xóa vĩnh viễn.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {docs.map(doc => (
              <div key={doc.id} style={{ background: '#fff', padding: '18px', borderRadius: '14px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '12px', opacity: 0.85 }}>
                <div>
                  <h3 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 'bold', color: '#475569', textDecoration: 'line-through' }}>{doc.title}</h3>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                    🗑️ Xóa lúc: {new Date(doc.deleted_at).toLocaleString('vi-VN')}
                  </span>
                </div>

                <div style={{ fontSize: '12px', color: '#64748b', background: '#f8fafc', padding: '9px 12px', borderRadius: '8px' }}>
                  <span>👤 {doc.user?.name} · 📁 {doc.category?.name} · 🏷️ {doc.doc_type}</span>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                  <button onClick={() => handleRestore(doc.id)}
                    style={{ ...btnStyle, flex: 1, background: '#dcfce7', color: '#16a34a' }}>
                    ♻️ Khôi phục
                  </button>
                  <button onClick={() => handlePermanentDelete(doc.id)}
                    style={{ ...btnStyle, flex: 1, background: '#fee2e2', color: '#b91c1c' }}>
                    🗑️ Xóa vĩnh viễn
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default Trash;
