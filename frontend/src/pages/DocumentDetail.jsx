import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Eye,
  Download,
  Bookmark,
  BookmarkCheck,
  Share2,
  Flag,
  Trash2,
  ChevronRight,
  X,
  ExternalLink,
  Calendar,
  User,
  MessageSquare,
  Sparkles,
  FileText,
  ShieldAlert,
  ArrowLeft,
  Check,
  Layers,
  Send,
  HelpCircle,
  TrendingUp,
  FolderOpen
} from 'lucide-react';

import axiosClient from '../api/axiosClient';
import Spinner from '../components/Spinner';
import { openOrDownload, getFileLabel } from '../utils/fileHelper';
import StarRating from '../components/StarRating';
import ChatBox from '../components/ChatBox';

const API_URL = import.meta.env.VITE_API_URL;

function TextPreview({ url }) {
  const [text, setText] = useState('');
  useEffect(() => {
    fetch(url)
      .then((r) => r.text())
      .then(setText)
      .catch(() => setText('Không thể tải nội dung file.'));
  }, [url]);

  return (
    <pre className="m-0 p-6 bg-slate-900 text-slate-200 text-xs font-mono leading-relaxed overflow-x-auto max-h-[600px] overflow-y-auto whitespace-pre-wrap break-words rounded-2xl border border-slate-800">
      {text || 'Đang tải nội dung văn bản...'}
    </pre>
  );
}

function PDFPreview({ url, docId }) {
  const [mode, setMode] = useState('google');
  const token = localStorage.getItem('token');
  const proxyUrl = `${API_URL}/api/documents/proxy-file/${docId}?token=${token}`;
  const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 flex-wrap gap-2">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-800 border border-slate-700/60">
          {[
            { id: 'google', label: 'Google Viewer' },
            { id: 'proxy', label: 'Máy chủ Proxy' },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`px-3 py-1 rounded-lg text-xs font-bold border-0 cursor-pointer transition-all ${
                mode === m.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-transparent text-slate-400 hover:text-white'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-indigo-400 hover:text-indigo-300 no-underline flex items-center gap-1.5 font-semibold px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Mở trong tab mới
        </a>
      </div>
      <iframe
        key={mode}
        src={mode === 'google' ? googleViewerUrl : proxyUrl}
        title="PDF Preview"
        className="w-full border-0 block"
        style={{ height: '720px' }}
      />
    </div>
  );
}

function ActionBtn({ onClick, className, children, disabled }) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border-0 cursor-pointer transition-all shadow-2xs ${className}`}
    >
      {children}
    </motion.button>
  );
}

function DocumentDetail() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [rating, setRating] = useState({ avgScore: null, totalRatings: 0, userScore: null });
  const [related, setRelated] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const isAuthenticated = !!localStorage.getItem('token');
  const PREVIEWABLE = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'text/plain'];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const docRes = await axiosClient.get(`/documents/${id}`);
        setDoc(docRes.data);
        setIsSaved(docRes.data.isSaved || false);
        setRating({
          avgScore: docRes.data.avgScore,
          totalRatings: docRes.data.totalRatings,
          userScore: docRes.data.userScore,
        });

        if (docRes.data.category_id) {
          axiosClient
            .get(`/documents?category=${docRes.data.category_id}&limit=4`)
            .then((r) => setRelated(r.data.documents.filter((d) => d.id !== parseInt(id)).slice(0, 3)))
            .catch(() => {});
        }

        if (isAuthenticated) {
          const userRes = await axiosClient.get('/auth/me');
          setCurrentUser(userRes.data);
        }
      } catch {
        toast.error('Không tìm thấy tài liệu!');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, isAuthenticated]);

  const handleRate = async (score) => {
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để đánh giá!');
      return;
    }
    try {
      const res = await axiosClient.post(`/documents/${id}/rate`, { score });
      setRating({
        avgScore: res.data.avgScore,
        totalRatings: res.data.totalRatings,
        userScore: res.data.userScore,
      });
      toast.success(`Đã đánh giá ${score} sao!`);
    } catch {
      toast.error('Lỗi khi gửi đánh giá!');
    }
  };

  const handleView = async () => {
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để xem tài liệu!');
      return;
    }
    try {
      await axiosClient.post(`/documents/${id}/view`);
      openOrDownload(
        `${API_URL}${doc.file_url}`,
        doc.file_type,
        doc.file_url.split('/').pop(),
        handleDownload
      );
      setDoc((d) => ({ ...d, view_count: (d.view_count || 0) + 1 }));
    } catch {}
  };

  const handleDownload = async () => {
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để tải xuống!');
      return;
    }
    try {
      await axiosClient.post(`/documents/${id}/download`);

      // Ưu tiên tải trực tiếp từ Cloudinary URL nếu có
      const directUrl = doc.file_url?.startsWith('http') ? doc.file_url : null;

      if (directUrl) {
        // Tải trực tiếp từ Cloudinary
        const res = await fetch(directUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        const ext = doc.file_url.split('/').pop().split('?')[0].split('.').pop();
        const safeTitle = doc.title.replace(/[\/\\:*?"<>|]/g, '_').trim();
        a.href = url;
        a.download = `${safeTitle}.${ext}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        // Fallback: dùng proxy cho file local cũ
        const token = localStorage.getItem('token');
        const proxyUrl = `${API_URL}/api/documents/proxy-file/${id}?token=${token}`;
        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        const ext = doc.file_url.split('/').pop().split('?')[0].split('.').pop();
        const safeTitle = doc.title.replace(/[\/\\:*?"<>|]/g, '_').trim();
        a.href = url;
        a.download = `${safeTitle}.${ext}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }

      setDoc((d) => ({ ...d, download_count: (d.download_count || 0) + 1 }));
      toast.success('Bắt đầu tải xuống...');
    } catch (err) {
      if (err.response?.data?.limitReached) {
        toast.error('Đã đạt giới hạn tải tháng này. Nâng cấp VIP để tải không giới hạn!', {
          duration: 4000,
        });
        setTimeout(() => { window.location.href = '/vip'; }, 2000);
      } else {
        toast.error('Lỗi khi tải file!');
      }
    }
  };

  const handleToggleSave = async () => {
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập!');
      return;
    }
    try {
      const res = await axiosClient.post(`/documents/${id}/save`);
      setIsSaved(res.data.isSaved);
      toast.success(res.data.isSaved ? 'Đã lưu vào danh sách yêu thích!' : 'Đã bỏ lưu tài liệu!');
    } catch {
      toast.error('Lỗi khi lưu!');
    }
  };

  const handleAdminDelete = async () => {
    if (!window.confirm('Chuyển tài liệu vào thùng rác?')) return;
    try {
      await axiosClient.delete(`/documents/${id}`);
      toast.success('Đã chuyển tài liệu vào thùng rác!');
      setTimeout(() => {
        window.location.href = '/';
      }, 800);
    } catch {
      toast.error('Lỗi khi xóa!');
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const res = await axiosClient.post(`/documents/${id}/comments`, { content: newComment });
      setDoc((d) => ({ ...d, comments: [res.data.comment, ...(d.comments || [])] }));
      setNewComment('');
      toast.success('Bình luận thành công!');
    } catch {
      toast.error('Bạn cần đăng nhập để bình luận!');
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await axiosClient.delete(`/documents/comments/${commentId}`);
      setDoc((d) => ({ ...d, comments: (d.comments || []).filter((c) => c.id !== commentId) }));
      toast.success('Đã xóa bình luận!');
    } catch {
      toast.error('Lỗi khi xóa!');
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    toast.success('Đã sao chép liên kết tài liệu!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <Spinner />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="text-center py-20 bg-white/70 backdrop-blur-md rounded-3xl border border-slate-200/80 p-8 max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
          <FolderOpen className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">Không tìm thấy tài liệu</h2>
        <p className="text-xs text-slate-400 mt-1 mb-4">
          Tài liệu này có thể đã bị xóa hoặc liên kết không hợp lệ.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold no-underline"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại trang chủ
        </Link>
      </div>
    );
  }

  const fileLabel = getFileLabel(doc.file_type, doc.file_url);
  const fileUrl = doc.file_url?.startsWith('http') ? doc.file_url : `${API_URL}${doc.file_url}`;

  return (
    <>
      <div className="space-y-6">
        {/* ── BREADCRUMB ── */}
        <nav className="flex items-center gap-2 text-xs font-medium text-slate-400 flex-wrap">
          <Link to="/" className="text-slate-500 hover:text-indigo-600 transition-colors no-underline">
            Trang chủ
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          {doc.doc_type && (
            <>
              <Link
                to={`/?type=${doc.doc_type}`}
                className="text-slate-500 hover:text-indigo-600 transition-colors no-underline"
              >
                {doc.doc_type}
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            </>
          )}
          <span className="text-slate-800 font-bold truncate max-w-[260px]">{doc.title}</span>
        </nav>

        {/* ── HERO WORKSPACE CARD ── */}
        <div className="rounded-3xl bg-white/85 backdrop-blur-md border border-slate-200/80 shadow-sm overflow-hidden">
          {/* TOP BANNER */}
          <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col md:flex-row gap-6 justify-between items-start">
            <div className="space-y-4 max-w-3xl">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                  {fileLabel}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200/70">
                  {doc.doc_type || 'Chung'}
                </span>
                {doc.category?.name && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200/70">
                    {doc.category.name}
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                {doc.title}
              </h1>

              {/* Author & Timestamp Bar */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs ring-2 ring-white">
                    {doc.user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <Link
                    to={`/users/${doc.user?.id}`}
                    className="font-bold text-slate-700 hover:text-indigo-600 transition-colors no-underline"
                  >
                    {doc.user?.name}
                  </Link>
                </div>

                <span className="flex items-center gap-1.5 text-slate-400">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(doc.created_at).toLocaleDateString('vi-VN')}
                </span>

                <span className="flex items-center gap-1.5 text-slate-400">
                  <Eye className="w-3.5 h-3.5" />
                  {doc.view_count || 0} lượt xem
                </span>

                <span className="flex items-center gap-1.5 font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                  <Download className="w-3.5 h-3.5" />
                  {doc.download_count || 0} lượt tải
                </span>
              </div>

              {/* Star Rating Bar */}
              <div className="pt-2">
                <StarRating
                  avgScore={rating.avgScore}
                  totalRatings={rating.totalRatings}
                  userScore={rating.userScore}
                  onRate={handleRate}
                  readonly={!isAuthenticated}
                />
                {!isAuthenticated && (
                  <p className="text-[11px] text-slate-400 mt-1">Đăng nhập để đánh giá tài liệu này</p>
                )}
              </div>
            </div>

            {/* ACTION BUTTONS GROUP */}
            <div className="flex flex-wrap sm:flex-col gap-2 shrink-0 w-full sm:w-auto">
              <ActionBtn
                onClick={handleDownload}
                className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md shadow-indigo-500/20"
              >
                <Download className="w-4 h-4" /> Tải về máy
              </ActionBtn>

              {PREVIEWABLE.includes(doc.file_type) ? (
                <ActionBtn
                  onClick={() => {
                    if (!isAuthenticated) {
                      toast.error('Vui lòng đăng nhập!');
                      return;
                    }
                    setShowPreview((p) => !p);
                  }}
                  className={`w-full sm:w-auto ${
                    showPreview
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  {showPreview ? 'Thu gọn xem trước' : 'Xem trực tuyến'}
                </ActionBtn>
              ) : (
                <ActionBtn
                  onClick={handleView}
                  className="w-full sm:w-auto bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  <Eye className="w-4 h-4" /> Xem tài liệu
                </ActionBtn>
              )}

              {isAuthenticated && (
                <ActionBtn
                  onClick={handleToggleSave}
                  className={`w-full sm:w-auto border ${
                    isSaved
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                  {isSaved ? 'Đã lưu' : 'Lưu tài liệu'}
                </ActionBtn>
              )}

              <ActionBtn
                onClick={handleShare}
                className="w-full sm:w-auto bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
                {copiedLink ? 'Đã sao chép' : 'Chia sẻ'}
              </ActionBtn>

              {currentUser?.role === 'ADMIN' && (
                <ActionBtn
                  onClick={handleAdminDelete}
                  className="w-full sm:w-auto bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100"
                >
                  <Trash2 className="w-4 h-4" /> Xóa tài liệu
                </ActionBtn>
              )}
            </div>
          </div>

          {/* ── LIVE PREVIEW CANVAS ── */}
          <AnimatePresence>
            {showPreview && PREVIEWABLE.includes(doc.file_type) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="border-b border-slate-200 bg-slate-900 p-4 sm:p-6"
              >
                <div className="flex items-center justify-between text-white text-xs mb-3">
                  <span className="font-bold flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-400" /> Bản xem trước trực tuyến
                  </span>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white bg-transparent border-0 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {doc.file_type === 'text/plain' ? (
                  <TextPreview url={fileUrl} />
                ) : doc.file_type.startsWith('image/') ? (
                  <div className="p-6 text-center bg-slate-950 rounded-2xl border border-slate-800">
                    <img
                      src={fileUrl}
                      alt={doc.title}
                      className="max-w-full max-h-[600px] object-contain rounded-xl mx-auto shadow-xl"
                    />
                  </div>
                ) : doc.file_type === 'application/pdf' ? (
                  <PDFPreview url={fileUrl} docId={doc.id} />
                ) : (
                  <div className="p-8 text-center text-slate-300">
                    <p className="text-xs mb-3">Không hỗ trợ xem trước định dạng này.</p>
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold no-underline inline-block"
                    >
                      Mở trong tab mới
                    </a>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── DESCRIPTION BLOCK ── */}
          {doc.description && (
            <div className="p-6 sm:p-8 border-b border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Mô tả chi tiết
              </h3>
              <p className="text-sm text-slate-700 leading-relaxed max-w-4xl whitespace-pre-line">
                {doc.description}
              </p>
            </div>
          )}

          {/* ── COMMENTS & DISCUSSION STUDIO ── */}
          <div className="p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <MessageSquare className="w-4 h-4 text-indigo-600" />
                Thảo luận & Bình luận
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                  {doc.comments?.length || 0}
                </span>
              </h3>
            </div>

            {/* Comment Form */}
            {isAuthenticated ? (
              <form onSubmit={handleSubmitComment} className="flex gap-3 mb-8">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                  {currentUser?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    placeholder="Viết nhận xét hoặc đặt câu hỏi về tài liệu này..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-200 text-xs outline-none bg-slate-50/50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/70 transition-all font-medium"
                  />
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-2xl text-xs font-bold border-0 cursor-pointer hover:bg-indigo-700 shadow-md shadow-indigo-500/20 transition-all"
                  >
                    Gửi
                  </motion.button>
                </div>
              </form>
            ) : (
              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-xs text-slate-600 mb-6 flex items-center justify-between">
                <span>Bạn muốn tham gia trao đổi ý kiến về tài liệu này?</span>
                <Link
                  to="/login"
                  className="font-bold text-indigo-600 hover:text-indigo-700 no-underline"
                >
                  Đăng nhập ngay →
                </Link>
              </div>
            )}

            {/* Comment Stream */}
            <div className="space-y-3">
              {doc.comments?.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Chưa có bình luận nào. Hãy là người đầu tiên để lại nhận xét!
                </div>
              ) : (
                doc.comments?.map((cmt) => (
                  <motion.div
                    key={cmt.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3 p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs shrink-0 overflow-hidden">
                      {cmt.user?.avatar_url ? (
                        <img
                          src={
                            cmt.user.avatar_url.startsWith('http')
                              ? cmt.user.avatar_url
                              : `${API_URL}${cmt.user.avatar_url}`
                          }
                          alt="avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        cmt.user?.name?.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-900">{cmt.user?.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400">
                            {new Date(cmt.created_at).toLocaleDateString('vi-VN')}
                          </span>
                          {(currentUser?.id === cmt.user_id || currentUser?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteComment(cmt.id)}
                              className="text-slate-400 hover:text-rose-500 bg-transparent border-0 cursor-pointer p-0.5 transition-colors"
                              title="Xóa bình luận"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed m-0">{cmt.content}</p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── ADMIN NOTICES (IF ANY) ── */}
        {doc.adminNotices?.length > 0 && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50/80 p-5 overflow-hidden">
            <div className="flex items-center gap-2 font-bold text-xs text-amber-800 mb-3">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Thông báo kiểm duyệt từ Quản trị viên</span>
            </div>
            <div className="space-y-2">
              {doc.adminNotices.map((notice) => (
                <div key={notice.id} className="p-3 bg-white rounded-xl border border-amber-200 text-xs">
                  <p className="font-semibold text-amber-900">{notice.admin_note}</p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {new Date(notice.created_at).toLocaleString('vi-VN')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── RELATED DOCUMENTS BENTO ── */}
        {related.length > 0 && (
          <div className="space-y-3 pt-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" /> Tài liệu cùng chuyên mục
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => {
                const rLabel = getFileLabel(r.file_type, r.file_url);
                return (
                  <Link key={r.id} to={`/documents/${r.id}`} className="no-underline block group">
                    <div className="p-4 rounded-2xl bg-white/80 hover:bg-white border border-slate-200/80 hover:border-indigo-200 hover:shadow-lg transition-all duration-200 flex flex-col justify-between h-32">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {rLabel}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {r.view_count || 0} lượt xem
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-2">
                        {r.title}
                      </h4>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                        <span className="truncate max-w-[120px]">{r.user?.name}</span>
                        <span className="font-bold text-indigo-600 flex items-center gap-1">
                          <Download className="w-3 h-3" /> {r.download_count || 0}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── AI COPILOT CHAT BOX ── */}
      <ChatBox documentId={parseInt(id)} documentTitle={doc?.title} isAuthenticated={isAuthenticated} />
    </>
  );
}

export default DocumentDetail;
