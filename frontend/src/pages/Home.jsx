import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import axiosClient from '../api/axiosClient';
import Spinner from '../components/Spinner';
import { openOrDownload, FILE_ICONS, FILE_BADGE_COLORS, getFileLabel } from '../utils/fileHelper';

const API_URL = import.meta.env.VITE_API_URL;

function Home() {
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [currentUser, setCurrentUser] = useState(null);
  const [savedDocIds, setSavedDocIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const isAuthenticated = !!localStorage.getItem('token');

  const location = useLocation();
  const currentType = new URLSearchParams(location.search).get('type') || 'All';

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [docsRes, catsRes] = await Promise.all([
          axiosClient.get(`/documents?page=${page}&limit=12`),
          axiosClient.get('/categories'),
        ]);
        setDocuments(docsRes.data.documents);
        setPagination(docsRes.data.pagination);
        setCategories(catsRes.data);
        if (isAuthenticated) {
          const [userRes, savedRes] = await Promise.all([
            axiosClient.get('/auth/me'),
            axiosClient.get('/documents/saved'),
          ]);
          setCurrentUser(userRes.data);
          setSavedDocIds(savedRes.data.map(d => d.id));
        }
      } catch { toast.error('Lỗi khi tải dữ liệu!'); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [isAuthenticated, page]);

  useEffect(() => { setPage(1); }, [currentType, selectedCategory]);

  const handleDownload = async (doc) => {
    if (!isAuthenticated) { toast.error('Vui lòng đăng nhập để tải xuống!'); return; }
    try {
      await axiosClient.post(`/documents/${doc.id}/download`);
      const res = await fetch(`${API_URL}${doc.file_url}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_url.split('/').pop() || doc.title;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
      setDocuments(docs => docs.map(d => d.id === doc.id ? { ...d, download_count: d.download_count + 1 } : d));
      toast.success('Đang tải xuống...');
    } catch { toast.error('Lỗi khi tải file!'); }
  };

  const handleView = async (doc) => {
    try {
      await axiosClient.post(`/documents/${doc.id}/view`);
      const fileUrl = `${API_URL}${doc.file_url}`;
      const fileName = doc.file_url.split('/').pop();
      openOrDownload(fileUrl, doc.file_type, fileName, () => handleDownload(doc));
      setDocuments(docs => docs.map(d => d.id === doc.id ? { ...d, view_count: d.view_count + 1 } : d));
    } catch {}
  };

  const handleToggleSave = async (docId) => {
    try {
      const res = await axiosClient.post(`/documents/${docId}/save`);
      if (res.data.isSaved) { setSavedDocIds(ids => [...ids, docId]); toast.success('Đã lưu tài liệu!'); }
      else { setSavedDocIds(ids => ids.filter(id => id !== docId)); toast('Đã bỏ lưu.'); }
    } catch { toast.error('Lỗi khi lưu!'); }
  };

  const handleDeleteAdmin = async (docId) => {
    if (!window.confirm('⚠️ Xóa vĩnh viễn tài liệu này?')) return;
    try {
      await axiosClient.delete(`/documents/${docId}`);
      setDocuments(docs => docs.filter(d => d.id !== docId));
      toast.success('Đã xóa tài liệu!');
    } catch { toast.error('Lỗi khi xóa!'); }
  };

  const filtered = documents
    .filter(doc => {
      const matchSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = selectedCategory === 'All' || doc.category_id === selectedCategory;
      const matchType = currentType === 'All' || doc.doc_type === currentType;
      return matchSearch && matchCat && matchType;
    })
    .sort((a, b) => {
      if (sortBy === 'downloads') return b.download_count - a.download_count;
      if (sortBy === 'views') return b.view_count - a.view_count;
      return new Date(b.created_at) - new Date(a.created_at);
    });

  const btnStyle = { padding: '9px 0', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' };

  return (
    <div style={{ color: '#1a1a1a' }}>
      <h2 style={{ textAlign: 'center', fontSize: '26px', marginBottom: '8px' }}>
        {currentType === 'All' ? '📚 Thư viện Tài liệu' : `📂 ${currentType}`}
      </h2>

      {/* SEARCH + SORT */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', margin: '18px 0 22px', flexWrap: 'wrap' }}>
        <input
          type="text" placeholder="🔍 Tìm kiếm tài liệu..."
          value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          style={{ width: '100%', maxWidth: '360px', padding: '11px 20px', borderRadius: '30px', border: 'none', boxShadow: '0 4px 10px rgba(0,0,0,0.06)', outline: 'none', fontSize: '14px' }}
        />
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          style={{ padding: '11px 16px', borderRadius: '30px', border: '1px solid #e2e8f0', background: '#fff', fontSize: '14px', fontWeight: 'bold', color: '#555', cursor: 'pointer', outline: 'none' }}>
          <option value="newest">🕐 Mới nhất</option>
          <option value="downloads">⬇️ Tải nhiều nhất</option>
          <option value="views">👁️ Xem nhiều nhất</option>
        </select>
      </div>

      {/* CATEGORY FILTER */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '32px' }}>
        <button onClick={() => setSelectedCategory('All')}
          style={{ padding: '7px 18px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', background: selectedCategory === 'All' ? '#10b981' : '#e2e8f0', color: selectedCategory === 'All' ? '#fff' : '#555' }}>
          🌟 Tất cả
        </button>
        {categories.map(cat => (
          <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
            style={{ padding: '7px 18px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', background: selectedCategory === cat.id ? '#10b981' : '#e2e8f0', color: selectedCategory === cat.id ? '#fff' : '#555' }}>
            {cat.name}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : (
        <>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: '56px', marginBottom: '12px' }}>📭</div>
              <p style={{ fontSize: '17px', color: '#64748b', fontWeight: '500' }}>Không tìm thấy tài liệu nào.</p>
              {searchTerm && <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '6px' }}>Thử tìm với từ khóa khác.</p>}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
              {filtered.map(doc => {
                const isSaved = savedDocIds.includes(doc.id);
                const fileIcon = FILE_ICONS[doc.file_type] || '📎';
                const fileLabel = getFileLabel(doc.file_type, doc.file_url);
                return (
                  <div key={doc.id} style={{ background: '#fff', padding: '18px', borderRadius: '14px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '12px' }}>

                    {/* HEADER: icon + title + description */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '30px', flexShrink: 0, lineHeight: 1 }}>{fileIcon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <Link to={`/documents/${doc.id}`} style={{ textDecoration: 'none', color: '#1a1a1a', flex: 1, minWidth: 0 }}>
                            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', lineHeight: 1.4,
                              overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                              {doc.title}
                            </h3>
                          </Link>
                          <span style={{ flexShrink: 0, padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold',
                            background: (FILE_BADGE_COLORS[fileLabel] || { bg: '#f1f5f9' }).bg,
                            color: (FILE_BADGE_COLORS[fileLabel] || { color: '#475569' }).color }}>
                            {fileLabel}
                          </span>
                        </div>
                        {doc.description && (
                          <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: 1.4,
                            overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            {doc.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* META */}
                    <div style={{ fontSize: '12px', color: '#64748b', background: '#f8fafc', padding: '9px 12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>👤 <b style={{ color: '#334155' }}>{doc.user?.name}</b> · 🏷️ {doc.doc_type}</span>
                      <div style={{ display: 'flex', gap: '10px', fontWeight: 'bold' }}>
                        <span>👁️ {doc.view_count || 0}</span>
                        <span style={{ color: '#3b82f6' }}>⬇️ {doc.download_count || 0}</span>
                      </div>
                    </div>

                    {/* ACTIONS */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                      <button onClick={() => handleView(doc)}
                        style={{ ...btnStyle, flex: 1, background: '#f1f5f9', color: '#334155' }}>👀 Xem</button>
                      <button onClick={() => handleDownload(doc)}
                        style={{ ...btnStyle, flex: 1, background: '#3b82f6', color: '#fff' }}>⬇️ Tải</button>
                      <Link to={`/documents/${doc.id}`}
                        style={{ ...btnStyle, flex: 1, background: '#f0fdf4', color: '#16a34a', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        🔍 Chi tiết
                      </Link>
                    </div>

                    {/* SAVE + ADMIN DELETE */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {isAuthenticated && (
                        <button onClick={() => handleToggleSave(doc.id)}
                          style={{ ...btnStyle, flex: 1, background: isSaved ? '#fee2e2' : '#fef3c7', color: isSaved ? '#b91c1c' : '#d97706' }}>
                          {isSaved ? '❌ Bỏ lưu' : '🔖 Lưu'}
                        </button>
                      )}
                      {currentUser?.role === 'ADMIN' && (
                        <button onClick={() => handleDeleteAdmin(doc.id)}
                          style={{ ...btnStyle, flex: isAuthenticated ? 'none' : 1, padding: '9px 14px', background: '#fee2e2', color: '#b91c1c' }}>
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* PAGINATION */}
          {pagination.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '40px' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: page === 1 ? '#f1f5f9' : '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', color: '#555', fontWeight: 'bold' }}>
                ← Trước
              </button>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: p === page ? '#3b82f6' : '#e2e8f0', color: p === page ? '#fff' : '#555', fontWeight: 'bold', cursor: 'pointer' }}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: page === pagination.totalPages ? '#f1f5f9' : '#fff', cursor: page === pagination.totalPages ? 'not-allowed' : 'pointer', color: '#555', fontWeight: 'bold' }}>
                Sau →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Home;
