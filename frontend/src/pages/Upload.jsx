import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
  Cpu,
  Code2,
  BellRing,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import axiosClient from '../api/axiosClient';

const DOC_TYPES = [
  { value: 'Chung', label: 'Chung', icon: FileSpreadsheet, desc: 'Tài liệu hành chính, thông dụng' },
  { value: 'Hardware', label: 'Hardware', icon: Cpu, desc: 'Phần cứng, vi mạch, kỹ thuật' },
  { value: 'Software', label: 'Software', icon: Code2, desc: 'Mã nguồn, phần mềm, dev docs' },
  { value: 'Thông báo', label: 'Thông báo', icon: BellRing, desc: 'Thông tri, thông điệp chung' },
];

function Upload() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [docType, setDocType] = useState('Chung');
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    axiosClient
      .get('/categories')
      .then((res) => {
        setCategories(res.data || []);
        if (res.data?.length > 0) setCategoryId(res.data[0].id);
      })
      .catch(() => toast.error('Lỗi khi tải danh mục!'));
  }, []);

  const ALLOWED_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/zip',
    'application/x-rar-compressed',
    'application/xml',
    'text/xml',
  ];
  const MAX_SIZE = 20 * 1024 * 1024;

  const validateAndSetFile = (f) => {
    if (!f) return;
    if (f.size > MAX_SIZE) {
      toast.error('File quá lớn! Kích thước tối đa là 20MB.');
      return;
    }
    if (!ALLOWED_TYPES.includes(f.type)) {
      toast.error('Định dạng file không được hỗ trợ!');
      return;
    }
    setFile(f);
    if (!title.trim()) {
      setTitle(f.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    validateAndSetFile(f);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return toast.error('Vui lòng chọn file cần tải lên!');
    setLoading(true);

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('category_id', categoryId);
    formData.append('doc_type', docType);
    formData.append('file', file);

    try {
      await axiosClient.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Tải lên thành công! Tài liệu đang chờ duyệt.');
      setTimeout(() => {
        window.location.href = '/my-documents';
      }, 1000);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi tải lên!');
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ── HEADER BENTO ── */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 text-white relative overflow-hidden border border-slate-800 shadow-xl">
        <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-indigo-300 text-xs font-bold mb-3 border border-white/10">
            <UploadCloud className="w-3.5 h-3.5" /> Studio Tải lên
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Đăng tải tài liệu mới
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
            Chia sẻ tài liệu của bạn vào kho lưu trữ. Định dạng hỗ trợ: PDF, Word, Excel, Slide, Code, TXT, ảnh và file nén (tối đa 20MB).
          </p>
        </div>
      </div>

      {/* ── FORM CONTAINER ── */}
      <form onSubmit={handleUpload} className="space-y-6">
        {/* DRAG & DROP ZONE */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative rounded-3xl border-2 border-dashed p-8 transition-all text-center ${
            isDragging
              ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]'
              : file
              ? 'border-emerald-300 bg-emerald-50/30'
              : 'border-slate-300/80 bg-white/70 hover:border-indigo-400 hover:bg-white/90'
          }`}
        >
          <input
            id="file-upload"
            type="file"
            onChange={handleFileChange}
            className="hidden"
          />

          {file ? (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-emerald-200 shadow-sm max-w-2xl mx-auto">
              <div className="flex items-center gap-3.5 text-left">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-slate-900 truncate max-w-sm sm:max-w-md">
                    {file.name}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Kích thước: <span className="font-semibold text-slate-600">{formatSize(file.size)}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label
                  htmlFor="file-upload"
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer transition-colors"
                >
                  Đổi file
                </label>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors border-0 bg-transparent cursor-pointer"
                  title="Xóa file"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          ) : (
            <label htmlFor="file-upload" className="cursor-pointer block">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto mb-3 shadow-xs">
                <UploadCloud className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                Kéo thả file vào đây hoặc <span className="text-indigo-600 hover:underline">bấm để duyệt</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Hỗ trợ PDF, DOCX, XLSX, PPTX, TXT, ZIP, RAR, hình ảnh... (Tối đa 20MB)
              </p>
            </label>
          )}
        </div>

        {/* METADATA FIELDS */}
        <div className="rounded-3xl bg-white/85 backdrop-blur-md border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
          {/* Document Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Tiêu đề tài liệu <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Giáo trình Cấu trúc Dữ liệu & Giải thuật 2026..."
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs font-semibold bg-slate-50/50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/70 transition-all outline-none"
            />
          </div>

          {/* Document Type Selection Cards */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Phân loại chuyên mục
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {DOC_TYPES.map((t) => {
                const Icon = t.icon;
                const isSelected = docType === t.value;
                return (
                  <div
                    key={t.value}
                    onClick={() => setDocType(t.value)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/60 shadow-sm ring-1 ring-indigo-600'
                        : 'border-slate-200/80 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${
                      isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="font-bold text-xs text-slate-900">{t.label}</div>
                    <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{t.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Category Select */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Danh mục chủ đề
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs font-semibold bg-slate-50/50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/70 transition-all outline-none cursor-pointer"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Mô tả tóm tắt (không bắt buộc)
            </label>
            <textarea
              rows="4"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Cung cấp thêm chi tiết về nội dung tài liệu, đối tượng học tập hoặc mục lục..."
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/70 transition-all outline-none leading-relaxed resize-y font-normal"
            />
          </div>

          {/* Verification Notice */}
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex items-start gap-3 text-xs text-amber-900">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">Lưu ý kiểm duyệt:</span> Để bảo đảm an toàn dữ liệu, tài liệu sau khi đăng tải sẽ qua quy trình duyệt tự động và kiểm duyệt viên trước khi hiển thị công khai trên trang chủ.
            </div>
          </div>

          {/* Submit Button */}
          <motion.button
            whileHover={!loading ? { scale: 1.01 } : {}}
            whileTap={!loading ? { scale: 0.99 } : {}}
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl font-bold text-xs text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-md shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 border-0 cursor-pointer"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Đang xử lý tải lên...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4" />
                <span>Hoàn tất & Tải lên tài liệu</span>
              </>
            )}
          </motion.button>
        </div>
      </form>
    </div>
  );
}

export default Upload;
