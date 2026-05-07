import { useState, useEffect, useCallback } from 'react';
import { useLocation, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import axiosClient from '../api/axiosClient';
import { SkeletonGrid } from '../components/SkeletonCard';
import { FILE_ICONS, FILE_BADGE_COLORS, getFileLabel } from '../utils/fileHelper';

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
  const [pendingFileType, setPendingFileType] = useState('');
  const [pendingDateFrom, setPendingDateFrom] = useState('');
  const [pendingDateTo, setPendingDateTo] = useState('');
  const hasActiveFilter = fileType || dateFrom || dateTo;
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const location = useLocation();
  const currentType = new URLSearchParams(location.search).get('type') || '';
  const debouncedSearch = useDebounce(searchTerm, 400);

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

  useEffect(() => {
    axiosClient.get('/categories').then(res => setCategories(res.data)).catch(() => {});
  }, []);

  return (
    <div style={{ color: '#1a1a1a' }}>
      {/* HERO BANNER */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 60%, #06b6d4 100%)',
        borderRadius: '20px', padding: '36px 40px', marginBottom: '32px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: '-40px', right: '10%', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', bottom: '-30px', right: '30%', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'relative' }}>
          <h1 style={{ margin: '0 0 8px', fontSize: '26px', fontWeight: 'bold', color: '#fff' }}>
            {currentType ? `📂 ${currentType}` : '📚 Thư viện Tài liệu'}
          </h1>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.75)', fontSize: '14px' }}>
            {pagination.total > 0 ? `${pagination.total} tài liệu đang có sẵn` : 'Khám phá và chia sẻ tài liệu'}
          </p>
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '12px 20px', textAlign: 'center', backdropFilter: 'blur(10px)' }}>
            <div style={{ fontSize: '22px' }}>📄</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff' }}>{pagination.total || '—'}</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>Tài liệu</div>
          </div>
        </div>
      </div>

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
            <button onClick={() => { setFileType(pendingFileType); setDateFrom(pendingDateFrom); setDateTo(pendingDateTo); setPage(1); }}
              style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: '#fff', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>
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
                const fileIcon = FILE_ICONS[doc.file_type] || '📎';
                const fileLabel = getFileLabel(doc.file_type, doc.file_url);
                return (
                  <Link key={doc.id} to={`/documents/${doc.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                    <div style={{ background: '#fff', padding: '18px', borderRadius: '14px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid #f1f5f9', transition: '0.2s', cursor: 'pointer' }}
                      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(59,130,246,0.12)'; e.currentTarget.style.borderColor = '#bfdbfe'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.05)'; e.currentTarget.style.borderColor = '#f1f5f9'; e.currentTarget.style.transform = 'translateY(0)'; }}
                    >
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '30px', flexShrink: 0, lineHeight: 1 }}>{fileIcon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', lineHeight: 1.4, color: '#1a1a1a', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', flex: 1, minWidth: 0 }}>
                              {doc.title}
                            </h3>
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
                        <span>👤 <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>{doc.user?.name}</span> · 🏷️ {doc.doc_type}</span>
                        <div style={{ display: 'flex', gap: '10px', fontWeight: 'bold' }}>
                          <span>👁️ {doc.view_count || 0}</span>
                          <span style={{ color: '#3b82f6' }}>⬇️ {doc.download_count || 0}</span>
                        </div>
                      </div>

                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                        📅 {new Date(doc.created_at).toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

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
