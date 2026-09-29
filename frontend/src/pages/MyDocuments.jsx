import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderClosed,
  UploadCloud,
  CheckCircle2,
  Clock,
  XCircle,
  Pencil,
  Trash2,
  Check,
  X,
  Eye,
  Download,
  AlertTriangle,
  FolderOpen
} from 'lucide-react';
import toast from 'react-hot-toast';
import axiosClient from '../api/axiosClient';
import Spinner from '../components/Spinner';
import { getFileLabel } from '../utils/fileHelper';

function MyDocuments() {
  const [myDocs, setMyDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  useEffect(() => {
    axiosClient
      .get('/documents/mine')
      .then((res) => setMyDocs(res.data || []))
      .catch(() => toast.error('Lỗi khi tải danh sách tài liệu!'))
      .finally(() => setLoading(false));
  }, []);

  const startEdit = (e, doc) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(doc.id);
    setEditTitle(doc.title);
  };

  const cancelEdit = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    setEditingId(null);
    setEditTitle('');
  };

  const handleSaveTitle = async (e, docId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editTitle.trim()) return toast.error('Tên không được để trống!');
    try {
      await axiosClient.put(`/documents/${docId}`, { title: editTitle.trim() });
      setMyDocs(
        myDocs.map((doc) =>
          doc.id === docId ? { ...doc, title: editTitle.trim() } : doc
        )
      );
      toast.success('Đã cập nhật tên tài liệu!');
      setEditingId(null);
    } catch {
      toast.error('Lỗi khi đổi tên!');
    }
  };

  const handleDelete = async (e, docId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Chuyển tài liệu này vào thùng rác?')) return;
    try {
      await axiosClient.delete(`/documents/${docId}`);
      setMyDocs(myDocs.filter((doc) => doc.id !== docId));
      toast.success('Đã chuyển vào thùng rác!');
    } catch {
      toast.error('Lỗi khi xóa!');
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── HEADER BENTO ── */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 text-white relative overflow-hidden border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-indigo-300 text-xs font-bold mb-3 border border-white/10">
            <FolderClosed className="w-3.5 h-3.5" /> Quản lý cá nhân
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Tài liệu của tôi</h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Bạn đã đăng tải <span className="font-bold text-white">{myDocs.length}</span> tài liệu. Quản lý trạng thái duyệt, chỉnh sửa hoặc lưu trữ.
          </p>
        </div>

        <Link
          to="/upload"
          className="relative z-10 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 transition-all no-underline shrink-0"
        >
          <UploadCloud className="w-4 h-4" /> Tải lên tài liệu mới
        </Link>
      </div>

      {/* ── LIST OR EMPTY STATE ── */}
      {myDocs.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white/60 p-12 text-center backdrop-blur-sm">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-8 h-8 opacity-60" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Bạn chưa tải lên tài liệu nào</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Bắt đầu đóng góp tài liệu hữu ích cho cộng đồng ngay hôm nay.
          </p>
          <Link
            to="/upload"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors no-underline"
          >
            <UploadCloud className="w-4 h-4" /> Tải lên tài liệu ngay
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {myDocs.map((doc) => {
            const fileLabel = getFileLabel(doc.file_type, doc.file_url);

            return (
              <Link
                key={doc.id}
                to={`/documents/${doc.id}`}
                className="no-underline block group"
              >
                <div className="rounded-3xl p-5 bg-white/85 hover:bg-white border border-slate-200/80 hover:border-indigo-200/80 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 flex flex-col justify-between h-full backdrop-blur-sm">
                  {/* TOP BAR: BADGE & ACTIONS */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      {/* STATUS BADGE */}
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          doc.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : doc.status === 'REJECTED'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {doc.status === 'APPROVED' ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Đã duyệt
                          </>
                        ) : doc.status === 'REJECTED' ? (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-rose-600" /> Bị từ chối
                          </>
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5 text-amber-600" /> Chờ duyệt
                          </>
                        )}
                      </span>

                      {/* File format */}
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-600">
                        {fileLabel}
                      </span>
                    </div>

                    {/* EDITABLE TITLE */}
                    {editingId === doc.id ? (
                      <div
                        className="flex gap-2 items-center my-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          autoFocus
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveTitle(e, doc.id);
                            if (e.key === 'Escape') cancelEdit(e);
                          }}
                          className="flex-1 px-3 py-1.5 rounded-xl border border-indigo-500 text-xs font-bold outline-none ring-2 ring-indigo-100"
                        />
                        <button
                          onClick={(e) => handleSaveTitle(e, doc.id)}
                          className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-0 cursor-pointer"
                          title="Lưu"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 border-0 cursor-pointer"
                          title="Hủy"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2 my-2">
                        <h3 className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug">
                          {doc.title}
                        </h3>
                        <button
                          onClick={(e) => startEdit(e, doc)}
                          className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 border-0 bg-transparent cursor-pointer shrink-0"
                          title="Chỉnh sửa tên"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* REJECTION REASON (IF ANY) */}
                    {doc.status === 'REJECTED' && doc.reject_reason && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 my-2 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <span className="font-bold">Lý do từ chối:</span> {doc.reject_reason}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* BOTTOM STATS & DELETE */}
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="truncate max-w-[150px]">
                        {doc.category?.name || 'Tài liệu'} · {doc.doc_type}
                      </span>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3 text-slate-400" />
                          {doc.view_count || 0}
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-indigo-600">
                          <Download className="w-3 h-3" />
                          {doc.download_count || 0}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleDelete(e, doc.id)}
                      className="w-full py-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-50/70 hover:bg-rose-100/80 transition-colors cursor-pointer border-0 flex items-center justify-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Chuyển vào thùng rác
                    </button>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MyDocuments;
