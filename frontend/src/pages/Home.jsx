import { useState, useEffect, useCallback } from 'react';
import { useLocation, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import axiosClient from '../api/axiosClient';
import { FILE_ICONS, FILE_BADGE_COLORS, getFileLabel } from '../utils/fileHelper';

// ── Debounce hook ──────────────────────────────────────────────────────────────
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── File type → thumbnail background color ────────────────────────────────────
const FILE_BG = {
  PDF:  'from-red-50 to-red-100',
  DOC:  'from-blue-50 to-blue-100',
  DOCX: 'from-blue-50 to-blue-100',
  XLS:  'from-green-50 to-green-100',
  XLSX: 'from-green-50 to-green-100',
  PPT:  'from-orange-50 to-orange-100',
  PPTX: 'from-orange-50 to-orange-100',
  TXT:  'from-slate-50 to-slate-100',
  JPG:  'from-purple-50 to-purple-100',
  PNG:  'from-purple-50 to-purple-100',
  GIF:  'from-purple-50 to-purple-100',
  ZIP:  'from-yellow-50 to-yellow-100',
  RAR:  'from-yellow-50 to-yellow-100',
  XML:  'from-teal-50 to-teal-100',
};

// ── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonDocCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm animate-pulse">
      <div className="h-44 bg-slate-100" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-slate-100 rounded w-3/4" />
        <div className="h-3 bg-slate-100 rounded w-1/2" />
        <div className="h-3 bg-slate-100 rounded w-1/3" />
      </div>
    </div>
  );
}

// Document card
function DocCard({ doc }) {
  const fileLabel    = getFileLabel(doc.file_type, doc.file_url);
  const fileIcon     = FILE_ICONS[doc.file_type] || '📎';
  const badge        = FILE_BADGE_COLORS[fileLabel] || { bg: '#f1f5f9', color: '#475569' };
  const bgGrad       = FILE_BG[fileLabel] || 'from-slate-50 to-slate-100';


  return (
    <Link to={`/documents/${doc.id}`} className="group no-underline block">
      <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200">

        {/* THUMBNAIL */}
        <div className={`relative h-44 bg-gradient-to-br ${bgGrad} flex items-center justify-center overflow-hidden`}>
          <span className="text-6xl select-none group-hover:scale-110 transition-transform duration-200">
            {fileIcon}
          </span>

          {/* BADGE loại file — góc trên trái */}
          <span
            className="absolute top-3 left-3 text-xs font-bold px-2 py-0.5 rounded-md shadow-sm"
            style={{ background: badge.bg, color: badge.color }}
          >
            {fileLabel}
          </span>

          {/* BADGE doc_type — góc trên phải */}
          <span className="absolute top-3 right-3 text-xs font-semibold px-2 py-0.5 rounded-md bg-white/80 text-slate-600 shadow-sm backdrop-blur-sm">
            {doc.doc_type}
          </span>

          {/* HOVER OVERLAY */}
          <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/5 transition-colors duration-200" />
        </div>

        {/* INFO */}
        <div className="p-4">
          <h3 className="font-bold text-slate-800 text-sm leading-snug line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors">
            {doc.title}
          </h3>

          {doc.description && (
            <p className="text-xs text-slate-400 line-clamp-1 mb-3">{doc.description}</p>
          )}

          <div className="flex items-center justify-between text-xs text-slate-400">
            <Link
              to={`/users/${doc.user?.id}`}
              onClick={e => e.stopPropagation()}
              className="font-semibold text-blue-500 hover:text-blue-700 no-underline truncate max-w-[120px]"
            >
              {doc.user?.name}
            </Link>
            <div className="flex items-center gap-3 shrink-0">
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                {doc.view_count || 0}
              </span>
              <span className="flex items-center gap-1 text-blue-500 font-semibold">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {doc.download_count || 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Main Home page ─────────────────────────────────────────────────────────────
function Home() {
  const [documents, setDocuments]     = useState([]);
  const [categories, setCategories]   = useState([]);
  const [searchTerm, setSearchTerm]   = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy]           = useState('newest');
  const [fileType, setFileType]       = useState('');
  const [dateFrom, setDateFrom]       = useState('');
  const [dateTo, setDateTo]           = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [pendingFileType, setPendingFileType]   = useState('');
  const [pendingDateFrom, setPendingDateFrom]   = useState('');
  const [pendingDateTo, setPendingDateTo]       = useState('');
  const [page, setPage]               = useState(1);
  const [pagination, setPagination]   = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading]         = useState(true);

  const location = useLocation();
  const currentType    = new URLSearchParams(location.search).get('type') || '';
  const debouncedSearch = useDebounce(searchTerm, 400);
  const hasActiveFilter = fileType || dateFrom || dateTo;

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
    <div>
      {/* ── HERO ── */}
      <div className="relative bg-gradient-to-br from-blue-900 via-blue-700 to-cyan-500 rounded-2xl px-8 py-10 mb-8 overflow-hidden">
        <div className="absolute -top-10 right-[10%] w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute -bottom-8 right-[30%] w-28 h-28 rounded-full bg-white/5" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
              {currentType ? `📂 ${currentType}` : '📚 Thư viện Tài liệu'}
            </h1>
            <p className="text-blue-200 text-sm">
              {pagination.total > 0 ? `${pagination.total} tài liệu đang có sẵn` : 'Khám phá và chia sẻ tài liệu'}
            </p>
          </div>
          <div className="bg-white/15 backdrop-blur-sm rounded-xl px-6 py-3 text-center shrink-0">
            <div className="text-2xl font-bold text-white">{pagination.total || '—'}</div>
            <div className="text-xs text-blue-200">Tài liệu</div>
          </div>
        </div>
      </div>

      {/* ── SEARCH + SORT ── */}
      <div className="flex flex-wrap gap-3 justify-center mb-3">
        <div className="relative w-full max-w-sm">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Tìm kiếm tài liệu, tên người đăng..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 rounded-full border border-slate-200 bg-white shadow-sm text-sm outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-transparent border-0 cursor-pointer text-base">✕</button>
          )}
        </div>

        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="px-4 py-2.5 rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-600 outline-none cursor-pointer shadow-sm focus:ring-2 focus:ring-blue-300"
        >
          <option value="newest">🕐 Mới nhất</option>
          <option value="downloads">⬇️ Tải nhiều nhất</option>
          <option value="views">👁️ Xem nhiều nhất</option>
        </select>

        <button
          onClick={() => setShowAdvanced(a => !a)}
          className={`px-4 py-2.5 rounded-full border text-sm font-semibold cursor-pointer transition shadow-sm ${showAdvanced ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}
        >
          🔧 Lọc nâng cao
        </button>
      </div>

      {/* ── ADVANCED FILTER ── */}
      {showAdvanced && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 mb-4 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Loại file</label>
            <select value={pendingFileType} onChange={e => setPendingFileType(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50 outline-none">
              <option value="">Tất cả</option>
              <option value="pdf">PDF</option>
              <option value="word">Word</option>
              <option value="excel">Excel</option>
              <option value="powerpoint">PowerPoint</option>
              <option value="text/plain">TXT</option>
              <option value="image">Ảnh</option>
              <option value="zip">ZIP/RAR</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Từ ngày</label>
            <input type="date" value={pendingDateFrom} onChange={e => setPendingDateFrom(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Đến ngày</label>
            <input type="date" value={pendingDateTo} onChange={e => setPendingDateTo(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50 outline-none" />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setFileType(pendingFileType); setDateFrom(pendingDateFrom); setDateTo(pendingDateTo); setPage(1); }}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold cursor-pointer border-0 hover:bg-blue-700 transition"
            >🔍 Áp dụng</button>
            {hasActiveFilter && (
              <button
                onClick={() => { setFileType(''); setDateFrom(''); setDateTo(''); setPendingFileType(''); setPendingDateFrom(''); setPendingDateTo(''); setPage(1); }}
                className="px-4 py-2 rounded-lg bg-red-50 text-red-600 text-sm font-bold cursor-pointer border-0 hover:bg-red-100 transition"
              >✕ Xóa lọc</button>
            )}
          </div>
          {hasActiveFilter && (
            <div className="w-full flex gap-2 flex-wrap pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-400">Đang lọc:</span>
              {fileType && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{fileType}</span>}
              {dateFrom && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Từ {dateFrom}</span>}
              {dateTo && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Đến {dateTo}</span>}
            </div>
          )}
        </div>
      )}

      {/* ── CATEGORY PILLS ── */}
      <div className="flex flex-wrap gap-2 justify-center mb-8">
        <button
          onClick={() => setSelectedCategory('')}
          className={`px-4 py-1.5 rounded-full text-sm font-bold border-0 cursor-pointer transition ${!selectedCategory ? 'bg-emerald-500 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >🌟 Tất cả</button>
        {categories.map(cat => (
          <button key={cat.id}
            onClick={() => setSelectedCategory(String(cat.id))}
            className={`px-4 py-1.5 rounded-full text-sm font-bold border-0 cursor-pointer transition ${selectedCategory === String(cat.id) ? 'bg-emerald-500 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >{cat.name}</button>
        ))}
      </div>

      {/* ── GRID ── */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {Array.from({ length: 12 }).map((_, i) => <SkeletonDocCard key={i} />)}
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">📭</div>
          <p className="text-slate-500 font-medium text-lg">Không tìm thấy tài liệu nào.</p>
          {debouncedSearch && <p className="text-slate-400 text-sm mt-1">Thử tìm với từ khóa khác.</p>}
        </div>
      ) : (
        <>
          {/* SECTION HEADER */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-700">
              {currentType ? currentType : 'Tất cả tài liệu'}
              <span className="ml-2 text-sm font-normal text-slate-400">({pagination.total})</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {documents.map(doc => <DocCard key={doc.id} doc={doc} />)}
          </div>

          {/* PAGINATION */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-10 flex-wrap">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer transition"
              >← Trước</button>

              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-9 h-9 rounded-lg text-sm font-bold border-0 cursor-pointer transition ${p === page ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
                >{p}</button>
              ))}

              <button
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer transition"
              >Sau →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Home;
