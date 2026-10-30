import { ErrorState } from "../components/docshare/ResourceState";
import { Panel } from "../components/docshare/Primitives";
import { DocumentRow } from "../components/docshare/DocumentCard";
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion as Motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
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
  FolderOpen,
} from "lucide-react";

import axiosClient from "../api/axiosClient";
import Spinner from "../components/Spinner";
import { getFileLabel } from "../utils/fileHelper";
import StarRating from "../components/StarRating";
import ChatBox from "../components/ChatBox";
import SecureDocumentPreview from "../components/SecureDocumentPreview";

const API_URL = import.meta.env.VITE_API_URL;

function ActionBtn({ onClick, className, children, disabled }) {
  return (
    <Motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border-0 cursor-pointer transition-all shadow-2xs ${className}`}
    >
      {children}
    </Motion.button>
  );
}

function DocumentDetail() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [relatedError, setRelatedError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [newComment, setNewComment] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [rating, setRating] = useState({
    avgScore: null,
    totalRatings: 0,
    userScore: null,
  });
  const [related, setRelated] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const isAuthenticated = !!localStorage.getItem("token");
  const PREVIEWABLE = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "text/plain",
  ];

  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async () => {
      setLoading(true);
      setDoc(null);
      setShowPreview(false);
      setLoadError(null);
      setRelated([]);
      setRelatedError(false);
      setCurrentUser(null);
      try {
        const docRes = await axiosClient.get(`/documents/${id}`, {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setDoc(docRes.data);
        setIsSaved(docRes.data.isSaved || false);
        setRating({
          avgScore: docRes.data.avgScore,
          totalRatings: docRes.data.totalRatings,
          userScore: docRes.data.userScore,
        });
        if (docRes.data.category_id) {
          axiosClient
            .get(`/documents?category=${docRes.data.category_id}&limit=4`, {
              signal: controller.signal,
            })
            .then(({ data }) => {
              if (!controller.signal.aborted)
                setRelated(
                  data.documents
                    .filter((item) => item.id !== parseInt(id))
                    .slice(0, 3),
                );
            })
            .catch(() => {
              if (!controller.signal.aborted) setRelatedError(true);
            });
        }
        if (isAuthenticated) {
          const userRes = await axiosClient.get("/auth/me", {
            signal: controller.signal,
          });
          if (!controller.signal.aborted) setCurrentUser(userRes.data);
        }
      } catch (error) {
        if (!controller.signal.aborted)
          setLoadError({ status: error.response?.status || 0 });
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetchData();
    return () => controller.abort();
  }, [id, isAuthenticated, attempt]);

  const handleRate = async (score) => {
    if (!isAuthenticated) {
      toast.error("Vui lòng đăng nhập để đánh giá!");
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
      toast.error("Lỗi khi gửi đánh giá!");
    }
  };

  const handleView = async () => {
    if (!isAuthenticated) {
      toast.error("Vui lòng đăng nhập để xem tài liệu!");
      return;
    }
    try {
      await axiosClient.post(`/documents/${id}/view`);
      setDoc((d) => ({ ...d, view_count: (d.view_count || 0) + 1 }));
      toast(
        'Định dạng này không hỗ trợ xem trực tuyến. Vui lòng bấm "Tải về máy"!',
        {
          icon: "ℹ️",
        },
      );
    } catch {
      /* Preserve the existing fallback behavior. */
    }
  };

  const handleDownload = async () => {
    if (!isAuthenticated) {
      toast.error("Vui lòng đăng nhập để tải xuống!");
      return;
    }
    try {
      const response = await axiosClient.post(
        `/documents/${id}/download`,
        {},
        {
          responseType: "blob",
          headers: { "X-Delivery-ID": crypto.randomUUID() },
        },
      );
      const url = URL.createObjectURL(response.data);
      const a = document.createElement("a");
      const extension = getFileLabel(doc.file_type).toLowerCase();
      a.href = url;
      a.download = `${doc.title.replace(/[\\/:*?"<>|]/g, "_").trim()}.${extension}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      setDoc((d) => ({
        ...d,
        download_count:
          Number(response.headers["x-download-count"]) || d.download_count,
      }));
      toast.success("Bắt đầu tải xuống...");
    } catch (err) {
      if (err.response?.data?.limitReached) {
        toast.error(
          "Đã đạt giới hạn tải tháng này. Nâng cấp VIP để tải không giới hạn!",
          {
            duration: 4000,
          },
        );
        setTimeout(() => {
          window.location.href = "/vip";
        }, 2000);
      } else {
        toast.error("Lỗi khi tải file!");
      }
    }
  };

  const handleToggleSave = async () => {
    if (!isAuthenticated) {
      toast.error("Vui lòng đăng nhập!");
      return;
    }
    try {
      const res = await axiosClient.post(`/documents/${id}/save`);
      setIsSaved(res.data.isSaved);
      toast.success(
        res.data.isSaved
          ? "Đã lưu vào danh sách yêu thích!"
          : "Đã bỏ lưu tài liệu!",
      );
    } catch {
      toast.error("Lỗi khi lưu!");
    }
  };

  const handleAdminDelete = async () => {
    if (!window.confirm("Chuyển tài liệu vào thùng rác?")) return;
    try {
      await axiosClient.delete(`/documents/${id}`);
      toast.success("Đã chuyển tài liệu vào thùng rác!");
      setTimeout(() => {
        window.location.href = "/";
      }, 800);
    } catch {
      toast.error("Lỗi khi xóa!");
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const res = await axiosClient.post(`/documents/${id}/comments`, {
        content: newComment,
      });
      setDoc((d) => ({
        ...d,
        comments: [res.data.comment, ...(d.comments || [])],
      }));
      setNewComment("");
      toast.success("Bình luận thành công!");
    } catch {
      toast.error("Bạn cần đăng nhập để bình luận!");
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await axiosClient.delete(`/documents/comments/${commentId}`);
      setDoc((d) => ({
        ...d,
        comments: (d.comments || []).filter((c) => c.id !== commentId),
      }));
      toast.success("Đã xóa bình luận!");
    } catch {
      toast.error("Lỗi khi xóa!");
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    toast.success("Đã sao chép liên kết tài liệu!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <Spinner />
      </div>
    );
  }

  if (loadError)
    return (
      <ErrorState
        error={loadError}
        onRetry={() => setAttempt((value) => value + 1)}
      />
    );
  if (!doc) {
    return (
      <div className="text-center py-20 bg-white/70 backdrop-blur-md rounded-3xl border border-slate-200/80 p-8 max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
          <FolderOpen className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">
          Không tìm thấy tài liệu
        </h2>
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

  return (
    <>
      <div className="space-y-5 ds-legacy-page">
        {/* ── BREADCRUMB ── */}
        <nav className="flex items-center gap-2 text-xs font-medium text-slate-400 flex-wrap">
          <Link
            to="/"
            className="text-slate-500 hover:text-indigo-600 transition-colors no-underline"
          >
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
          <span className="text-slate-800 font-bold truncate max-w-[260px]">
            {doc.title}
          </span>
        </nav>

        <div className="ds-detail-grid">
          <div className="min-w-0">
            {/* ── HERO WORKSPACE CARD ── */}
            <div className="rounded-3xl bg-white/85 backdrop-blur-md border border-slate-200/80 shadow-sm overflow-hidden">
              {/* TOP BANNER */}
              <div className="p-4 sm:p-5 border-b border-blue-100 flex flex-col gap-5">
                <div className="space-y-4 max-w-3xl">
                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                      {fileLabel}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200/70">
                      {doc.doc_type || "Chung"}
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
                      {new Date(doc.created_at).toLocaleDateString("vi-VN")}
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
                      <p className="text-[11px] text-slate-400 mt-1">
                        Đăng nhập để đánh giá tài liệu này
                      </p>
                    )}
                  </div>
                </div>

                {/* ACTION BUTTONS GROUP */}
                <div className="flex flex-wrap gap-2 w-full">
                  <Link
                    to={`/ai-chat?document=${id}`}
                    className="ds-button-outline text-xs"
                  >
                    ✦ Hỏi AI về tài liệu này
                  </Link>
                  <ActionBtn
                    onClick={handleDownload}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-indigo-500/20"
                  >
                    <Download className="w-4 h-4" /> Tải về máy
                  </ActionBtn>

                  {PREVIEWABLE.includes(doc.file_type) ? (
                    <ActionBtn
                      onClick={() => {
                        if (!isAuthenticated) {
                          toast.error("Vui lòng đăng nhập!");
                          return;
                        }
                        setShowPreview((p) => !p);
                      }}
                      className={`w-full sm:w-auto ${
                        showPreview
                          ? "bg-slate-900 text-white"
                          : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <Eye className="w-4 h-4" />
                      {showPreview
                        ? "Thu gọn xem trước"
                        : currentUser?.id === doc.user_id ||
                            currentUser?.role === "ADMIN"
                          ? "Xem trực tuyến"
                          : "Xem trực tuyến (1 lượt tải)"}
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
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {isSaved ? (
                        <BookmarkCheck className="w-4 h-4" />
                      ) : (
                        <Bookmark className="w-4 h-4" />
                      )}
                      {isSaved ? "Đã lưu" : "Lưu tài liệu"}
                    </ActionBtn>
                  )}

                  <ActionBtn
                    onClick={handleShare}
                    className="w-full sm:w-auto bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                  >
                    {copiedLink ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Share2 className="w-4 h-4" />
                    )}
                    {copiedLink ? "Đã sao chép" : "Chia sẻ"}
                  </ActionBtn>

                  {currentUser?.role === "ADMIN" && (
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
              {!showPreview && (
                <div className="flex min-h-80 flex-col items-center justify-center bg-[#f1f5fc] p-8 text-center">
                  <FileText className="mb-5 text-blue-400" size={64} />
                  <h2 className="max-w-md text-xl font-bold">{doc.title}</h2>
                  <p className="mt-3 text-sm text-[#7181a8]">
                    Chọn xem trực tuyến để mở nội dung tài liệu.
                  </p>
                  <p className="mt-2 text-xs text-[#7181a8]">
                    Quyền truy cập và lượt tải áp dụng theo tài khoản của bạn.
                  </p>
                </div>
              )}
              <AnimatePresence>
                {showPreview && PREVIEWABLE.includes(doc.file_type) && (
                  <Motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="border-b border-slate-200 bg-slate-900 p-4 sm:p-6"
                  >
                    <div className="flex items-center justify-between text-white text-xs mb-3">
                      <span className="font-bold flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-400" /> Bản xem
                        trước trực tuyến
                      </span>
                      <button
                        onClick={() => setShowPreview(false)}
                        className="p-1 rounded-lg text-slate-400 hover:text-white bg-transparent border-0 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <SecureDocumentPreview
                      key={`${id}:${doc.content_version}`}
                      documentId={doc.id}
                      fileType={doc.file_type}
                      title={doc.title}
                    />
                  </Motion.div>
                )}
              </AnimatePresence>

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
                  <form
                    onSubmit={handleSubmitComment}
                    className="flex gap-3 mb-8"
                  >
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
                      <Motion.button
                        type="submit"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className="px-5 py-2.5 bg-indigo-600 text-white rounded-2xl text-xs font-bold border-0 cursor-pointer hover:bg-indigo-700 shadow-md shadow-indigo-500/20 transition-all"
                      >
                        Gửi
                      </Motion.button>
                    </div>
                  </form>
                ) : (
                  <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-xs text-slate-600 mb-6 flex items-center justify-between">
                    <span>
                      Bạn muốn tham gia trao đổi ý kiến về tài liệu này?
                    </span>
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
                      Chưa có bình luận nào. Hãy là người đầu tiên để lại nhận
                      xét!
                    </div>
                  ) : (
                    doc.comments?.map((cmt) => (
                      <Motion.div
                        key={cmt.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex gap-3 p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100"
                      >
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs shrink-0 overflow-hidden">
                          {cmt.user?.avatar_url ? (
                            <img
                              src={
                                cmt.user.avatar_url.startsWith("http")
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
                            <span className="text-xs font-bold text-slate-900">
                              {cmt.user?.name}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-400">
                                {new Date(cmt.created_at).toLocaleDateString(
                                  "vi-VN",
                                )}
                              </span>
                              {(currentUser?.id === cmt.user_id ||
                                currentUser?.role === "ADMIN") && (
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
                          <p className="text-xs text-slate-600 leading-relaxed m-0">
                            {cmt.content}
                          </p>
                        </div>
                      </Motion.div>
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
                    <div
                      key={notice.id}
                      className="p-3 bg-white rounded-xl border border-amber-200 text-xs"
                    >
                      <p className="font-semibold text-amber-900">
                        {notice.admin_note}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {new Date(notice.created_at).toLocaleString("vi-VN")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <aside className="space-y-4">
            <Panel title="Thông tin tài liệu">
              <dl className="space-y-4 text-xs">
                {[
                  ["Định dạng", fileLabel],
                  [
                    "Kích thước",
                    doc.file_size
                      ? `${(doc.file_size / 1024 / 1024).toFixed(2)} MB`
                      : null,
                  ],
                  [
                    "Ngày đăng",
                    new Date(doc.created_at).toLocaleDateString("vi-VN"),
                  ],
                  ["Danh mục", doc.category?.name || doc.doc_type || "Chung"],
                  ["Lượt xem", doc.view_count || 0],
                  ["Lượt tải", doc.download_count || 0],
                ]
                  .filter(([, value]) => value !== null)
                  .map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4">
                      <dt className="text-[#7181a8]">{label}</dt>
                      <dd className="text-right font-medium">{value}</dd>
                    </div>
                  ))}
              </dl>
            </Panel>
            {doc.description && (
              <Panel title="Mô tả tài liệu">
                <p className="whitespace-pre-line text-sm leading-relaxed text-[#60709b]">
                  {doc.description}
                </p>
              </Panel>
            )}
            <Panel title="Tài liệu liên quan">
              {relatedError && (
                <p role="status" className="mb-3 text-xs text-rose-600">
                  Chưa tải được tài liệu liên quan.{" "}
                  <button
                    className="underline"
                    onClick={() => setAttempt((value) => value + 1)}
                  >
                    Thử lại
                  </button>
                </p>
              )}
              {relatedError ? null : related.length ? (
                related.map((item) => <DocumentRow key={item.id} doc={item} />)
              ) : (
                <p className="text-xs text-[#7181a8]">
                  Chưa có tài liệu liên quan.
                </p>
              )}
            </Panel>
          </aside>
        </div>
      </div>

      {/* ── AI COPILOT CHAT BOX ── */}
      <ChatBox
        key={id}
        documentId={parseInt(id)}
        documentTitle={doc?.title}
        isAuthenticated={isAuthenticated}
      />
    </>
  );
}

export default DocumentDetail;
