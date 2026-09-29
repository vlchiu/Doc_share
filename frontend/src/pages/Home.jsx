import { useState, useEffect, useCallback } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  X,
  BookOpen,
  Download,
  Eye,
  FileText,
  FileSpreadsheet,
  FileCode,
  Layers,
  Sparkles,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  FolderOpen,
  Calendar,
  Filter,
  Check,
  ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import axiosClient from '../api/axiosClient';
import { getFileLabel } from '../utils/fileHelper';

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── Color styles per file type ───────────────────────────────────────────────
const FILE_TYPE_STYLES = {
  PDF: {
    bg: 'from-rose-500/10 to-red-500/5',
    border: 'border-rose-200/80',
    badge: 'bg-rose-50 text-rose-600 border-rose-200',
    iconColor: 'text-rose-500',
    accent: '#f43f5e',
  },
  DOC: {
    bg: 'from-blue-500/10 to-indigo-500/5',
    border: 'border-blue-200/80',
    badge: 'bg-blue-50 text-blue-600 border-blue-200',
    iconColor: 'text-blue-500',
    accent: '#3b82f6',
  },
  DOCX: {
    bg: 'from-blue-500/10 to-indigo-500/5',
    border: 'border-blue-200/80',
    badge: 'bg-blue-50 text-blue-600 border-blue-200',
    iconColor: 'text-blue-500',
    accent: '#3b82f6',
  },
  XLS: {
    bg: 'from-emerald-500/10 to-teal-500/5',
    border: 'border-emerald-200/80',
    badge: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    iconColor: 'text-emerald-500',
    accent: '#10b981',
  },
  XLSX: {
    bg: 'from-emerald-500/10 to-teal-500/5',
    border: 'border-emerald-200/80',
    badge: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    iconColor: 'text-emerald-500',
    accent: '#10b981',
  },
  PPT: {
    bg: 'from-orange-500/10 to-amber-500/5',
    border: 'border-orange-200/80',
    badge: 'bg-orange-50 text-orange-600 border-orange-200',
    iconColor: 'text-orange-500',
    accent: '#f97316',
  },
  PPTX: {
    bg: 'from-orange-500/10 to-amber-500/5',
    border: 'border-orange-200/80',
    badge: 'bg-orange-50 text-orange-600 border-orange-200',
    iconColor: 'text-orange-500',
    accent: '#f97316',
  },
  TXT: {
    bg: 'from-slate-500/10 to-zinc-500/5',
    border: 'border-slate-200/80',
    badge: 'bg-slate-50 text-slate-600 border-slate-200',
    iconColor: 'text-slate-500',
    accent: '#64748b',
  },
  ZIP: {
    bg: 'from-amber-500/10 to-yellow-500/5',
    border: 'border-amber-200/80',
    badge: 'bg-amber-50 text-amber-600 border-amber-200',
    iconColor: 'text-amber-500',
    accent: '#eab308',
  },
  RAR: {
    bg: 'from-amber-500/10 to-yellow-500/5',
    border: 'border-amber-200/80',
    badge: 'bg-amber-50 text-amber-600 border-amber-200',
    iconColor: 'text-amber-500',
    accent: '#eab308',
  },
};

function getStyleForFile(label) {
  return FILE_TYPE_STYLES[label] || FILE_TYPE_STYLES.TXT;
}

// ── Skeleton Card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 shadow-sm animate-pulse flex flex-col justify-between h-72">
      <div className="h-32 rounded-xl bg-slate-100" />
      <div className="space-y-2 mt-4">
        <div className="h-3 w-1/3 bg-slate-100 rounded" />
        <div className="h-4 w-4/5 bg-slate-100 rounded" />
        <div className="h-3 w-2/3 bg-slate-100 rounded" />
      </div>
      <div className="flex justify-between items-center pt-4 border-t border-slate-100">
        <div className="h-3 w-1/4 bg-slate-100 rounded" />
        <div className="h-3 w-1/4 bg-slate-100 rounded" />
      </div>
    </div>
  );
}

// ── Document Card ─────────────────────────────────────────────────────────────
function DocCard({ doc, index }) {
  const fileLabel = getFileLabel(doc.file_type, doc.file_url);
  const style = getStyleForFile(fileLabel);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.4) }}
    >
      <Link to={`/documents/${doc.id}`} className="group block no-underline h-full">
        <article className="h-full flex flex-col rounded-2xl border border-slate-200/70 bg-white/80 hover:bg-white shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-200/80 transition-all duration-300 hover:-translate-y-1 overflow-hidden backdrop-blur-sm">
          {/* TOP PREVIEW AREA */}
          <div className={`relative h-40 bg-gradient-to-br ${style.bg} p-4 flex flex-col justify-between border-b border-slate-100 overflow-hidden`}>
            {/* Subtle background grid pattern */}
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(circle at 1px 1px, #64748b 1px, transparent 0)',
                backgroundSize: '16px 16px',
              }}
            />

            {/* Badges bar */}
            <div className="relative z-10 flex items-center justify-between">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase border shadow-2xs backdrop-blur-md ${style.badge}`}>
                {fileLabel}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-slate-600 bg-white/90 border border-slate-200/60 shadow-2xs backdrop-blur-md">
                {doc.doc_type || 'Chung'}
              </span>
            </div>

            {/* Document sheet representation */}
            <div className="relative z-10 flex items-center justify-center my-auto">
              <div className="w-20 h-24 rounded-lg bg-white shadow-md border border-slate-100 flex flex-col justify-between p-2.5 group-hover:scale-105 group-hover:-rotate-2 transition-transform duration-300">
                <div className="flex items-center justify-between">
                  <div className={`w-3.5 h-3.5 rounded flex items-center justify-center ${style.iconColor}`}>
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[8px] font-bold text-slate-400">{fileLabel}</span>
                </div>
                <div className="space-y-1.5">
                  <div className="h-1 w-full bg-slate-200 rounded-full" />
                  <div className="h-1 w-4/5 bg-slate-100 rounded-full" />
                  <div className="h-1 w-3/5 bg-slate-100 rounded-full" />
                </div>
                <div className="h-0.5 w-1/2 bg-indigo-200 rounded-full" />
              </div>
            </div>

            {/* Category tag */}
            <div className="relative z-10">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-indigo-600 transition-colors">
                {doc.category?.name || 'Tài liệu chung'}
              </span>
            </div>
          </div>

          {/* CONTENT INFO */}
          <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug">
                {doc.title}
              </h3>
              {doc.description && (
                <p className="mt-1.5 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {doc.description}
                </p>
              )}
            </div>

            {/* FOOTER STATS & AUTHOR */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span
                onClick={(e) => {
                  e.stopPropagation();
                }}
                className="font-semibold text-slate-600 hover:text-indigo-600 transition-colors truncate max-w-[110px]"
              >
                {doc.user?.name || 'Thành viên'}
              </span>

              <div className="flex items-center gap-3 shrink-0">
                <span className="flex items-center gap-1 hover:text-slate-600 transition-colors">
                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                  {doc.view_count || 0}
                </span>
                <span className="flex items-center gap-1 font-semibold text-indigo-600">
                  <Download className="w-3.5 h-3.5" />
                  {doc.download_count || 0}
                </span>
              </div>
            </div>
          </div>
        </article>
      </Link>
    </motion.div>
  );
}

// ── Home Page Main ────────────────────────────────────────────────────────────
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
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const location = useLocation();
  const currentType = new URLSearchParams(location.search).get('type') || '';
  const debouncedSearch = useDebounce(searchTerm, 350);
  const hasActiveFilter = fileType || dateFrom || dateTo;

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedCategory, currentType, sortBy, fileType, dateFrom, dateTo]);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: 12,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(selectedCategory && { category: selectedCategory }),
        ...(currentType && { docType: currentType }),
        sortBy,
        ...(fileType && { fileType }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
      });
      const res = await axiosClient.get(`/documents?${params}`);
      setDocuments(res.data.documents || []);
      setPagination(res.data.pagination || { total: 0, totalPages: 1 });
    } catch {
      toast.error('Lỗi khi tải danh sách tài liệu!');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, selectedCategory, currentType, sortBy, fileType, dateFrom, dateTo]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    axiosClient
      .get('/categories')
      .then((res) => setCategories(res.data || []))
      .catch(() => {});
  }, []);

  const handleApplyFilter = () => {
    setFileType(pendingFileType);
    setDateFrom(pendingDateFrom);
    setDateTo(pendingDateTo);
    setPage(1);
    setShowAdvanced(false);
  };

  const handleClearFilter = () => {
    setFileType('');
    setDateFrom('');
    setDateTo('');
    setPendingFileType('');
    setPendingDateFrom('');
    setPendingDateTo('');
    setPage(1);
    setShowAdvanced(false);
  };

  return (
    <div className="space-y-8">
      {/* ── NEO-BENTO HERO SHOWCASE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* HERO MAIN BENTO (Span 2) */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-10 text-white shadow-xl flex flex-col justify-between border border-slate-800">
          {/* Ambient lighting glows */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10">
            {/* Pill tag */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs font-semibold text-indigo-300 mb-4">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Nền tảng chia sẻ tài liệu thế hệ mới</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              {currentType ? (
                <>
                  Chuyên mục <span className="gradient-text">{currentType}</span>
                </>
              ) : (
                <>
                  Kho tri thức số <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-cyan-300">
                    Mở rộng & Kết nối.
                  </span>
                </>
              )}
            </h1>

            <p className="mt-3 text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
              Tìm kiếm, xem trước tài liệu trực tiếp và trao đổi cùng trợ lý AI thông minh một cách dễ dàng và an toàn.
            </p>
          </div>

          {/* Interactive Search Bar in Hero */}
          <div className="relative z-10 mt-8">
            <div className="flex items-center rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-1.5 shadow-2xl focus-within:ring-2 focus-within:ring-indigo-400/80 transition-all">
              <Search className="ml-3 w-5 h-5 text-indigo-300 shrink-0" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm tài liệu, chủ đề, mã môn học, tác giả..."
                className="w-full bg-transparent px-3 py-2.5 text-sm text-white placeholder:text-slate-400 outline-none"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="p-1.5 text-slate-400 hover:text-white transition-colors bg-transparent border-0 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => fetchDocuments()}
                className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-500 shadow-md transition-all shrink-0 border-0 cursor-pointer hidden sm:block"
              >
                Tìm kiếm
              </button>
            </div>

            {/* Quick search tags */}
            <div className="flex items-center gap-2 mt-3 flex-wrap text-xs text-slate-400">
              <span className="font-semibold text-slate-300 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-indigo-400" /> Gợi ý:
              </span>
              {['Báo cáo', 'Giáo trình', 'Đồ án', 'Software', 'Hardware'].map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSearchTerm(tag)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-colors border border-white/10 cursor-pointer"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* HERO SIDE BENTO STATS (Col 1) */}
        <div className="flex flex-col gap-4">
          {/* Card 1: Total Docs */}
          <div className="flex-1 rounded-3xl bg-white/80 backdrop-blur-md p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                Live Data
              </span>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-black text-slate-900">
                {pagination.total > 0 ? `${pagination.total}+` : '0'}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Tài liệu đã được chia sẻ và lưu trữ</p>
            </div>
          </div>

          {/* Card 2: Security & Formats */}
          <div className="flex-1 rounded-3xl bg-gradient-to-br from-indigo-50/70 to-purple-50/60 p-6 border border-indigo-100/80 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-purple-100/80 text-purple-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100/70 px-2.5 py-0.5 rounded-full">
                Kiểm duyệt an toàn
              </span>
            </div>
            <div className="mt-4">
              <div className="text-sm font-bold text-slate-800">
                Hỗ trợ đọc PDF, Word, Excel, Slide
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Xem trực tiếp không cần cài đặt phần mềm bên ngoài.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── FILTER & CATEGORY STUDIO ── */}
      <div className="rounded-3xl bg-white/80 backdrop-blur-md border border-slate-200/80 p-4 sm:p-5 shadow-sm space-y-4">
        {/* TOP: Category chips & Action buttons */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Category Chips Scroll */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer border ${
                !selectedCategory
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              Tất cả danh mục
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(String(cat.id))}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer border ${
                  selectedCategory === String(cat.id)
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Right controls: Sort & Advanced Filter */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Sort Select */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-2xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent border-0 outline-none text-xs font-semibold text-slate-700 cursor-pointer pr-1"
              >
                <option value="newest">Mới nhất</option>
                <option value="downloads">Tải nhiều nhất</option>
                <option value="views">Xem nhiều nhất</option>
              </select>
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowAdvanced((a) => !a)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
                showAdvanced || hasActiveFilter
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Bộ lọc</span>
              {hasActiveFilter && <span className="w-1.5 h-1.5 rounded-full bg-amber-300 ring-2 ring-indigo-600" />}
            </button>
          </div>
        </div>

        {/* ADVANCED FILTER DRAWER */}
        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden pt-3 border-t border-slate-100"
            >
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/60 flex flex-wrap gap-4 items-end">
                {/* File Type */}
                <div className="min-w-[140px]">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Định dạng file
                  </label>
                  <select
                    value={pendingFileType}
                    onChange={(e) => setPendingFileType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white outline-none font-medium focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">Tất cả định dạng</option>
                    <option value="pdf">PDF</option>
                    <option value="word">Word (DOC / DOCX)</option>
                    <option value="excel">Excel (XLS / XLSX)</option>
                    <option value="powerpoint">PowerPoint (PPT / PPTX)</option>
                    <option value="text/plain">Text (TXT)</option>
                    <option value="image">Hình ảnh (JPG, PNG)</option>
                    <option value="zip">Nén (ZIP, RAR)</option>
                  </select>
                </div>

                {/* From Date */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Từ ngày
                  </label>
                  <input
                    type="date"
                    value={pendingDateFrom}
                    onChange={(e) => setPendingDateFrom(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white outline-none font-medium focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                {/* To Date */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Đến ngày
                  </label>
                  <input
                    type="date"
                    value={pendingDateTo}
                    onChange={(e) => setPendingDateTo(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white outline-none font-medium focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                {/* Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleApplyFilter}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer border-0 shadow-sm"
                  >
                    Áp dụng
                  </button>
                  {hasActiveFilter && (
                    <button
                      onClick={handleClearFilter}
                      className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition-colors cursor-pointer border-0"
                    >
                      Xóa lọc
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── DOCUMENTS COUNT & STATUS HEADER ── */}
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-bold text-slate-500">
          Hiển thị{' '}
          <span className="text-slate-900 font-extrabold">{documents.length}</span> / {pagination.total} tài liệu
        </p>
        {debouncedSearch && (
          <span className="text-xs text-indigo-600 font-semibold bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
            Kết quả cho "{debouncedSearch}"
          </span>
        )}
      </div>

      {/* ── DOCUMENTS GRID ── */}
      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-3xl border border-dashed border-slate-200 bg-white/60 p-12 text-center backdrop-blur-sm"
        >
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-8 h-8 opacity-60" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Không tìm thấy tài liệu phù hợp</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Thử thay đổi từ khóa tìm kiếm, chọn lại danh mục hoặc đặt lại bộ lọc nâng cao.
          </p>
          {(hasActiveFilter || searchTerm) && (
            <button
              onClick={() => {
                setSearchTerm('');
                handleClearFilter();
              }}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors border-0 cursor-pointer"
            >
              Đặt lại tất cả bộ lọc
            </button>
          )}
        </motion.div>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {documents.map((doc, i) => (
              <DocCard key={doc.id} doc={doc} index={i} />
            ))}
          </div>

          {/* ── COMMUNITY CALL-TO-ACTION BENTO ── */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 sm:p-10 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 max-w-xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-indigo-300 text-xs font-bold mb-3 border border-white/10">
                <Sparkles className="w-3.5 h-3.5" /> Chia sẻ & Phát triển
              </span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                Bạn sở hữu tài liệu hữu ích cho cộng đồng?
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
                Đăng tải tài liệu của bạn ngay hôm nay để nhận thêm điểm tương tác, huy hiệu tác giả và đóng góp cho kho tri thức.
              </p>
            </div>
            <Link
              to="/upload"
              className="relative z-10 inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-slate-950 font-bold text-xs hover:bg-slate-100 transition-all hover:scale-105 shadow-xl shrink-0 no-underline"
            >
              Tải lên tài liệu ngay <ArrowRight className="w-4 h-4 text-indigo-600" />
            </Link>
          </motion.section>

          {/* ── MODERN PAGINATION ── */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-10">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
              >
                <ChevronLeft className="w-4 h-4" /> Trước
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => {
                  // Keep pagination compact if many pages
                  if (
                    p === 1 ||
                    p === pagination.totalPages ||
                    (p >= page - 1 && p <= page + 1)
                  ) {
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                          p === page
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  }
                  if (p === page - 2 || p === page + 2) {
                    return (
                      <span key={p} className="px-1 text-slate-400 text-xs font-bold">
                        ...
                      </span>
                    );
                  }
                  return null;
                })}
              </div>

              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="flex items-center gap-1 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
              >
                Sau <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Home;
