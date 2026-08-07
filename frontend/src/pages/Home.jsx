import { useState, useEffect, useCallback } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal, ArrowUpDown, X, BookOpen, Download, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import axiosClient from '../api/axiosClient';
import { FILE_ICONS, FILE_BADGE_COLORS, getFileLabel } from '../utils/fileHelper';

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── Color palette per file type ───────────────────────────────────────────────
const FILE_COLORS = {
  PDF:  { bg: 'bg-rose-50',   text: 'text-rose-400',   border: 'border-rose-100' },
  DOC:  { bg: 'bg-blue-50',   text: 'text-blue-400',   border: 'border-blue-100' },
  DOCX: { bg: 'bg-blue-50',   text: 'text-blue-400',   border: 'border-blue-100' },
  XLS:  { bg: 'bg-green-50',  text: 'text-green-400',  border: 'border-green-100' },
  XLSX: { bg: 'bg-green-50',  text: 'text-green-400',  border: 'border-green-100' },
  PPT:  { bg: 'bg-orange-50', text: 'text-orange-400', border: 'border-orange-100' },
  PPTX: { bg: 'bg-orange-50', text: 'text-orange-400', border: 'border-orange-100' },
  TXT:  { bg: 'bg-slate-50',  text: 'text-slate-400',  border: 'border-slate-100' },
  JPG:  { bg: 'bg-purple-50', text: 'text-purple-400', border: 'border-purple-100' },
  PNG:  { bg: 'bg-purple-50', text: 'text-purple-400', border: 'border-purple-100' },
  ZIP:  { bg: 'bg-yellow-50', text: 'text-yellow-500', border: 'border-yellow-100' },
  RAR:  { bg: 'bg-yellow-50', text: 'text-yellow-500', border: 'border-yellow-100' },
};

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden animate-pulse">
      <div className="h-40 bg-slate-100" />
      <div className="p-5 space-y-3">
        <div className="h-3 bg-slate-100 rounded w-1/4" />
        <div className="h-4 bg-slate-100 rounded w-3/4" />
        <div className="h-3 bg-slate-100 rounded w-1/2" />
        <div className="flex justify-between pt-2">
          <div className="h-3 bg-slate-100 rounded w-1/4" />
          <div className="h-3 bg-slate-100 rounded w-1/4" />
        </div>
      </div>
    </div>
  );
}

// ── Document card ─────────────────────────────────────────────────────────────
function DocCard({ doc, index }) {
  const fileLabel = getFileLabel(doc.file_type, doc.file_url);
  const fileIcon  = FILE_ICONS[doc.file_type] || '📎';
  const badge     = FILE_BADGE_COLORS[fileLabel] || { bg: '#f1f5f9', color: '#475569' };
  const colors    = FILE_COLORS[fileLabel] || FILE_COLORS.TXT;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Link to={`/documents/${doc.id}`} className="group no-underline block">
        <article className="flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl">

          {/* THUMBNAIL */}
          <div className={`relative flex h-40 items-center justify-center overflow-hidden ${colors.bg}`}>
            {/* Grid pattern */}
            <div className="absolute inset-0 opacity-30"
              style={{ backgroundImage: 'linear-gradient(135deg, transparent 0 45%, currentColor 45% 46%, transparent 46% 100%)', backgroundSize: '18px 18px', color: 'rgba(148,163,184,0.3)' }} />

            {/* Mock doc */}
            <div className={`relative flex h-24 w-20 flex-col justify-between rounded-sm border-2 ${colors.border} bg-white/90 p-3 shadow-lg transition-transform duration-300 group-hover:rotate-3 group-hover:scale-105`}>
              <div className={`flex items-center justify-between text-[9px] font-bold ${colors.text}`}>
                <span>{fileLabel}</span>
                <span className="text-base">{fileIcon}</span>
              </div>
              <div className="space-y-1.5">
                <div className={`h-1 w-10 rounded-full ${colors.text} opacity-50 bg-current`} />
                <div className={`h-1 w-7 rounded-full ${colors.text} opacity-30 bg-current`} />
                <div className={`h-1 w-8 rounded-full ${colors.text} opacity-30 bg-current`} />
              </div>
            </div>

            {/* Badges */}
            <span className="absolute left-3 top-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 shadow-sm backdrop-blur-sm"
              style={{ color: badge.color }}>
              {fileLabel}
            </span>
            <span className="absolute right-3 top-3 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/80 text-slate-500 shadow-sm backdrop-blur-sm">
              {doc.doc_type}
            </span>
          </div>

          {/* INFO */}
          <div className="flex flex-1 flex-col p-5">
            <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <span>{doc.category?.name || 'Tài liệu'}</span>
              <span>{fileLabel}</span>
            </div>

            <h3 className="text-sm font-bold leading-snug tracking-tight text-slate-800 line-clamp-2 group-hover:text-blue-600 transition-colors">
              {doc.title}
            </h3>

            {doc.description && (
              <p className="mt-1.5 text-xs leading-relaxed text-slate-400 line-clamp-2">{doc.description}</p>
            )}

            <div className="mt-auto flex items-center justify-between pt-4 text-xs text-slate-400">
              <Link to={`/users/${doc.user?.id}`} onClick={e => e.stopPropagation()}
                className="font-semibold text-blue-500 hover:text-blue-700 no-underline truncate max-w-[100px]">
                {doc.user?.name}
              </Link>
              <div className="flex items-center gap-3 shrink-0">
                <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{doc.view_count || 0}</span>
                <span className="flex items-center gap-1 text-blue-500 font-semibold"><Download className="w-3 h-3" />{doc.download_count || 0}</span>
              </div>
            </div>
          </div>
        </article>
      </Link>
    </motion.div>
  );
}

// ── Home page ─────────────────────────────────────────────────────────────────
function Home() {
  const [documents, setDocuments]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy]         = useState('newest');
  const [fileType, setFileType]     = useState('');
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo, setDateTo]         = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [pendingFileType, setPendingFileType] = useState('');
  const [pendingDateFrom, setPendingDateFrom] = useState('');
  const [pendingDateTo, setPendingDateTo]     = useState('');
  const [page, setPage]             = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading]       = useState(true);

  const location = useLocation();
  const currentType     = new URLSearchParams(location.search).get('type') || '';
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
      <div className="relative overflow-hidden rounded-2xl bg-slate-900 px-8 py-14 mb-10">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex items-center gap-2 text-sm font-semibold text-blue-400"
          >
            <BookOpen className="w-4 h-4" />
            {pagination.total > 0 ? `${pagination.total} tài liệu đang có sẵn` : 'Kho tài liệu nội bộ'}
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="max-w-2xl text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl"
          >
            {currentType ? (
              <><span className="text-blue-400">📂</span> {currentType}</>
            ) : (
              <>Tài liệu tốt xứng đáng<br /><span className="text-blue-400">được chia sẻ.</span></>
            )}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-4 max-w-xl text-base leading-relaxed text-slate-400"
          >
            Khám phá tài liệu, hướng dẫn và kiến thức từ cộng đồng.
          </motion.p>

          {/* Search bar */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 flex max-w-xl items-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 p-1.5"
          >
            <Search className="ml-3 w-4 h-4 shrink-0 text-slate-400" />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Tìm tài liệu, chủ đề, tác giả..."
              className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-white placeholder:text-slate-400 outline-none"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')}
                className="p-1.5 text-slate-400 hover:text-white bg-transparent border-0 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            )}
            <button className="hidden sm:block rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 transition border-0 cursor-pointer">
              Tìm kiếm
            </button>
          </motion.div>
        </div>
      </div>

      {/* ── FILTER BAR ── */}
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 mb-6 lg:flex-row lg:items-center lg:justify-between">
        {/* Category pills */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setSelectedCategory('')}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all border-0 cursor-pointer ${!selectedCategory ? 'bg-slate-900 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-800'}`}
          >Tất cả</button>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setSelectedCategory(String(cat.id))}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all cursor-pointer ${selectedCategory === String(cat.id) ? 'bg-slate-900 text-white shadow-sm border-0' : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-800'}`}
            >{cat.name}</button>
          ))}
        </div>

        {/* Sort + Filter */}
        <div className="flex items-center gap-2 shrink-0">
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-600 outline-none cursor-pointer">
            <option value="newest">Mới nhất</option>
            <option value="downloads">Tải nhiều nhất</option>
            <option value="views">Xem nhiều nhất</option>
          </select>

          <button onClick={() => setShowAdvanced(a => !a)}
            className={`flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-all cursor-pointer ${showAdvanced ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'}`}>
            <SlidersHorizontal className="w-3.5 h-3.5" /> Lọc
            {hasActiveFilter && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
          </button>
        </div>
      </div>

      {/* ── ADVANCED FILTER ── */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 mb-6 flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Loại file</label>
                <select value={pendingFileType} onChange={e => setPendingFileType(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white outline-none">
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
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Từ ngày</label>
                <input type="date" value={pendingDateFrom} onChange={e => setPendingDateFrom(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Đến ngày</label>
                <input type="date" value={pendingDateTo} onChange={e => setPendingDateTo(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white outline-none" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setFileType(pendingFileType); setDateFrom(pendingDateFrom); setDateTo(pendingDateTo); setPage(1); }}
                  className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-bold cursor-pointer border-0 hover:bg-slate-700 transition">
                  Áp dụng
                </button>
                {hasActiveFilter && (
                  <button onClick={() => { setFileType(''); setDateFrom(''); setDateTo(''); setPendingFileType(''); setPendingDateFrom(''); setPendingDateTo(''); setPage(1); }}
                    className="px-4 py-2 rounded-lg bg-red-50 text-red-600 text-sm font-bold cursor-pointer border-0 hover:bg-red-100 transition">
                    Xóa lọc
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── COUNT ── */}
      {!loading && (
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-slate-400">
            Hiển thị <span className="font-semibold text-slate-700">{documents.length}</span> / {pagination.total} tài liệu
          </p>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <ArrowUpDown className="w-3 h-3" />
            {sortBy === 'newest' ? 'Mới nhất' : sortBy === 'downloads' ? 'Tải nhiều nhất' : 'Xem nhiều nhất'}
          </div>
        </div>
      )}

      {/* ── GRID ── */}
      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : documents.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="mt-6 rounded-2xl border border-dashed border-slate-200 py-20 text-center">
          <div className="text-5xl mb-4">📭</div>
          <p className="font-semibold text-slate-700">Không tìm thấy tài liệu nào</p>
          <p className="mt-1 text-sm text-slate-400">Thử tìm với từ khóa khác hoặc bỏ bộ lọc.</p>
        </motion.div>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {documents.map((doc, i) => <DocCard key={doc.id} doc={doc} index={i} />)}
          </div>

          {/* CTA */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 grid gap-6 rounded-2xl bg-slate-50 border border-slate-100 p-8 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center"
          >
            <div>
              <div className="mb-3 flex w-10 h-10 items-center justify-center rounded-xl bg-blue-600 text-white">
                <BookOpen className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Có tài liệu muốn chia sẻ?</h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">
                Thêm tài liệu của bạn vào thư viện và giúp mọi người tiến bộ hơn mỗi ngày.
              </p>
            </div>
            <Link to="/upload"
              className="no-underline w-fit rounded-full bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-700 transition-all hover:scale-105 inline-block">
              Tải lên tài liệu →
            </Link>
          </motion.section>

          {/* PAGINATION */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8 flex-wrap">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer transition">
                ← Trước
              </button>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-9 h-9 rounded-lg text-sm font-bold cursor-pointer transition border-0 ${p === page ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer transition">
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
