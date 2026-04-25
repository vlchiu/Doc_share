import { useState, useEffect, useCallback } from 'react';
import { useLocation, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import axiosClient from '../api/axiosClient';
import Spinner from '../components/Spinner';
import { SkeletonGrid } from '../components/SkeletonCard';
import { openOrDownload, FILE_ICONS, FILE_BADGE_COLORS, getFileLabel } from '../utils/fileHelper';

const API_URL = import.meta.env.VITE_API_URL;

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function Home() {
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [fileType, setFileType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  // Pending = đang chọn chưa áp dụng, Applied = đã áp dụng vào query
  const [pendingFileType, setPendingFileType] = useState('');
  const [pendingDateFrom, setPendingDateFrom] = useState('');
  const [pendingDateTo, setPendingDateTo] = useState('');
  const hasActiveFilter = fileType || dateFrom || dateTo;
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [currentUser, setCurrentUser] = useState(null);
  const [savedDocIds, setSavedDocIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const isAuthenticated = !!localStorage.getItem('token');

  const location = useLocation();
  const currentType = new URLSearchParams(location.search).get('type') || '';

  const debouncedSearch = useDebounce(searchTerm, 400);

  // Reset page khi filter thay đổi
  useEffect(() => { setPage(1); }, [debouncedSearch, selectedCategory, currentType, sortBy, fileType, dateFrom, dateTo]);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page, limit: 12,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(selectedCategory && { category: selectedCategory }),
        ...(currentType && { docType: currentType }),
        sortBy,
        ...(fileType && { fileType }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
      });
      const res = await axiosClient.get(`/documents?${params}`);
      setDocuments(res.data.documents);
      setPagination(res.data.pagination);
    } catch { toast.error('Lỗi khi tải dữ liệu!'); }
    finally { setLoading(false); }
  }, [page, debouncedSearch, selectedCategory, currentType, sortBy, fileType, dateFrom, dateTo]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  // Load categories + user info 1 lần
  useEffect(() => {
    axiosClient.get('/categories').then(res => setCategories(res.data));
    if (isAuthenticated) {
      Promise.all([axiosClient.get('/auth/me'), axiosClient.get('/documents/saved')])
        .then(([userRes, savedRes]) => {
          setCurrentUser(userRes.data);
          setSavedDocIds(Array.isArray(savedRes.data) ? savedRes.data.map(d => d.id) : []);
        }).catch(() => {});
    }
  }, [isAuthenticated]);

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
      openOrDownload(`${API_URL}${doc.file_url}`, doc.file_type, doc.file_url.split('/').pop(), () => handleDownload(doc));
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
    if (!window.confirm('⚠️ Chuyển tài liệu vào thùng rác?')) return;
    try {
      await axiosClient.delete(`/documents/${docId}`);
      setDocuments(docs => docs.filter(d => d.id !== docId));
      toast.success('Đã chuyển vào thùng rác!');
    } catch { toast.error('Lỗi khi xóa!'); }
  };

  const btnStyle = { padding: '9px 0', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' };

  return (
    <div style={{ color: '#1a1a1a' }}>
      <h2 style={{ textAlign: 'center', fontSize: '26px', marginBottom: '8px' }}>
        {currentType ? `📂 ${currentType}` : '📚 Thư viện Tài liệu'}
      </h2>
      <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', marginBottom: '18px' }}>
        {pagination.total > 0 ? `${pagination.total} tài liệu` : ''}
      </p>

      {/* SEARCH + SORT */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
          <input
            type="text" placeholder="🔍 Tìm kiếm tài liệu, tên người đăng..."
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '11px 40px 11px 20px', borderRadius: '30px', border: 'none', boxShadow: '0 4px 10px rgba(0,0,0,0.06)', outline: 'none', fontSize: '14px', boxSizing: 'border-box' }}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')}
              style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '16px' }}>✕</button>
          )}
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          style={{ padding: '11px 16px', borderRadius: '30px', border: '1px solid #e2e8f0', background: '#fff', fontSize: '14px', fontWeight: 'bold', color: '#555', cursor: 'pointer', outline: 'none' }}>
          <option value="newest">🕐 Mới nhất</option>
          <option value="downloads">⬇️ Tải nhiều nhất</option>
          <option value="views">👁️ Xem nhiều nhất</option>
        </select>
        <button onClick={() => setShowAdvanced(a => !a)}
          style={{ padding: '11px 16px', borderRadius: '30px', border: '1px solid #e2e8f0', background: showAdvanced ? '#3b82f6' : '#fff', color: showAdvanced ? '#fff' : '#555', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', outline: 'none' }}>
          🔧 Lọc nâng cao
        </button>
      </div>

      {/* BỘ LỌC NÂNG CAO */}
      {showAdvanced && (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '16px 20px', marginBottom: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>Loại file</label>
            <select value={pendingFileType} onChange={e => setPendingFileType(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', outline: 'none', background: '#f8fafc' }}>
              <option value="">Tất cả</option>
              <option value="pdf">PDF</option>
              <option value="word">Word (DOC/DOCX)</option>
              <option value="excel">Excel (XLS/XLSX)</option>
              <option value="powerpoint">PowerPoint</option>
              <option value="text/plain">TXT</option>
              <option value="image">Ảnh</option>
              <option value="zip">ZIP/RAR</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>Từ ngày</label>
            <input type="date" value={pendingDateFrom} onChange={e => setPendingDateFrom(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', outline: 'none', background: '#f8fafc' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>Đến ngày</label>
            <input type="date" value={pendingDateTo} onChange={e => setPendingDateTo(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', outline: 'none', background: '#f8fafc' }} />
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <button
              onClick={() => { setFileType(pendingFileType); setDateFrom(pendingDateFrom); setDateTo(pendingDateTo); setPage(1); }}
              style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: '#fff', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🔍 Áp dụng
            </button>
            {hasActiveFilter && (
              <button onClick={() => { setFileType(''); setDateFrom(''); setDateTo(''); setPendingFileType(''); setPendingDateFrom(''); setPendingDateTo(''); setPage(1); }}
                style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: '#fee2e2', color: '#b91c1c', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>
                ✕ Xóa lọc
              </button>
            )}
          </div>
          {hasActiveFilter && (
            <div style={{ width: '100%', display: 'flex', gap: '6px', flexWrap: 'wrap', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Đang lọc:</span>
              {fileType && <span style={{ padding: '2px 10px', borderRadius: '20px', background: '#dbeafe', color: '#1d4ed8', fontSize: '12px', fontWeight: 'bold' }}>{fileType}</span>}
              {dateFrom && <span style={{ padding: '2px 10px', borderRadius: '20px', background: '#dcfce7', color: '#15803d', fontSize: '12px', fontWeight: 'bold' }}>Từ {dateFrom}</span>}
              {dateTo && <span style={{ padding: '2px 10px', borderRadius: '20px', background: '#dcfce7', color: '#15803d', fontSize: '12px', fontWeight: 'bold' }}>Đến {dateTo}</span>}
            </div>
          )}
        </div>
      )}

      {/* CATEGORY FILTER */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '32px' }}>
        <button onClick={() => setSelectedCategory('')}
          style={{ padding: '7px 18px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', background: !selectedCategory ? '#10b981' : '#e2e8f0', color: !selectedCategory ? '#fff' : '#555' }}>
          🌟 Tất cả
        </button>
        {categories.map(cat => (
          <button key={cat.id} onClick={() => setSelectedCategory(String(cat.id))}
            style={{ padding: '7px 18px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', background: selectedCategory === String(cat.id) ? '#10b981' : '#e2e8f0', color: selectedCategory === String(cat.id) ? '#fff' : '#555' }}>
            {cat.name}
          </button>
        ))}
      </div>

      {loading ? <SkeletonGrid count={12} /> : (
        <>
          {documents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: '56px', marginBottom: '12px' }}>📭</div>
              <p style={{ fontSize: '17px', color: '#64748b', fontWeight: '500' }}>Không tìm thấy tài liệu nào.</p>
              {debouncedSearch && <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '6px' }}>Thử tìm với từ khóa khác.</p>}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
              {documents.map(doc => {
                const isSaved = savedDocIds.includes(doc.id);
                const fileIcon = FILE_ICONS[doc.file_type] || '📎';
                const fileLabel = getFileLabel(doc.file_type, doc.file_url);
                return (
                  <div key={doc.id} style={{ background: '#fff', padding: '18px', borderRadius: '14px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '30px', flexShrink: 0, lineHeight: 1 }}>{fileIcon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <Link to={`/documents/${doc.id}`} style={{ textDecoration: 'none', color: '#1a1a1a', flex: 1, minWidth: 0 }}>
                            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                              {doc.title}
                            </h3>
                          </Link>
                          <span style={{ flexShrink: 0, padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', background: (FILE_BADGE_COLORS[fileLabel] || { bg: '#f1f5f9' }).bg, color: (FILE_BADGE_COLORS[fileLabel] || { color: '#475569' }).color }}>
                            {fileLabel}
                          </span>
                        </div>
                        {doc.description && (
                          <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            {doc.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div style={{ fontSize: '12px', color: '#64748b', background: '#f8fafc', padding: '9px 12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>👤 <Link to={`/users/${doc.user?.id}`} style={{ color: '#3b82f6', fontWeight: 'bold', textDecoration: 'none' }}>{doc.user?.name}</Link> · 🏷️ {doc.doc_type}</span>
                      <div style={{ display: 'flex', gap: '10px', fontWeight: 'bold' }}>
                        <span>👁️ {doc.view_count || 0}</span>
                        <span style={{ color: '#3b82f6' }}>⬇️ {doc.download_count || 0}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      📅 {new Date(doc.created_at).toLocaleDateString('vi-VN')}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                      <button onClick={() => handleView(doc)} style={{ ...btnStyle, flex: 1, background: '#f1f5f9', color: '#334155' }}>👀 Xem</button>
                      <button onClick={() => handleDownload(doc)} style={{ ...btnStyle, flex: 1, background: '#3b82f6', color: '#fff' }}>⬇️ Tải</button>
                      <Link to={`/documents/${doc.id}`} style={{ ...btnStyle, flex: 1, background: '#f0fdf4', color: '#16a34a', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🔍 Chi tiết</Link>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      {isAuthenticated && (
                        <button onClick={() => handleToggleSave(doc.id)} style={{ ...btnStyle, flex: 1, background: isSaved ? '#fee2e2' : '#fef3c7', color: isSaved ? '#b91c1c' : '#d97706' }}>
                          {isSaved ? '❌ Bỏ lưu' : '🔖 Lưu'}
                        </button>
                      )}
                      {currentUser?.role === 'ADMIN' && (
                        <button onClick={() => handleDeleteAdmin(doc.id)} style={{ ...btnStyle, flex: isAuthenticated ? 'none' : 1, padding: '9px 14px', background: '#fee2e2', color: '#b91c1c' }}>🗑️</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* PAGINATION */}
          {pagination.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '40px', flexWrap: 'wrap' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: page === 1 ? '#f1f5f9' : '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', color: '#555', fontWeight: 'bold' }}>← Trước</button>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: p === page ? '#3b82f6' : '#e2e8f0', color: p === page ? '#fff' : '#555', fontWeight: 'bold', cursor: 'pointer' }}>{p}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: page === pagination.totalPages ? '#f1f5f9' : '#fff', cursor: page === pagination.totalPages ? 'not-allowed' : 'pointer', color: '#555', fontWeight: 'bold' }}>Sau →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Home;
