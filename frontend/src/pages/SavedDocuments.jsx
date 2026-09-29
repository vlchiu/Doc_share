import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bookmark, BookmarkX, Eye, Download, FolderOpen, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import axiosClient from '../api/axiosClient';
import Spinner from '../components/Spinner';
import { getFileLabel } from '../utils/fileHelper';

function SavedDocuments() {
  const [savedDocs, setSavedDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosClient
      .get('/documents/saved')
      .then((res) => setSavedDocs(res.data || []))
      .catch(() => toast.error('Lỗi khi tải danh sách đã lưu!'))
      .finally(() => setLoading(false));
  }, []);

  const handleUnsave = async (e, docId) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await axiosClient.post(`/documents/${docId}/save`);
      setSavedDocs(savedDocs.filter((doc) => doc.id !== docId));
      toast.success('Đã bỏ lưu tài liệu!');
    } catch {
      toast.error('Lỗi khi bỏ lưu!');
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
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-emerald-300 text-xs font-bold mb-3 border border-white/10">
            <Bookmark className="w-3.5 h-3.5" /> Bộ sưu tập cá nhân
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Tài liệu đã lưu</h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Bạn đang lưu giữ <span className="font-bold text-white">{savedDocs.length}</span> tài liệu quan trọng để xem lại bất cứ lúc nào.
          </p>
        </div>

        <Link
          to="/"
          className="relative z-10 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/15 transition-all no-underline shrink-0"
        >
          Khám phá thêm tài liệu <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* ── LIST OR EMPTY STATE ── */}
      {savedDocs.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white/60 p-12 text-center backdrop-blur-sm">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-8 h-8 opacity-60" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Chưa có tài liệu nào được lưu</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Khi duyệt tài liệu, bấm vào nút "Lưu" để thêm vào danh sách này.
          </p>
          <Link
            to="/"
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors no-underline"
          >
            Duyệt tài liệu ngay
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {savedDocs.map((doc) => {
            const fileLabel = getFileLabel(doc.file_type, doc.file_url);

            return (
              <Link
                key={doc.id}
                to={`/documents/${doc.id}`}
                className="no-underline block group"
              >
                <div className="rounded-3xl p-5 bg-white/85 hover:bg-white border border-slate-200/80 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300 flex flex-col justify-between h-full backdrop-blur-sm">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {fileLabel}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400">
                        {doc.doc_type || 'Chung'}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-2 leading-snug mb-2">
                      {doc.title}
                    </h3>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="truncate max-w-[140px] font-medium text-slate-600">
                        {doc.user?.name || 'Tác giả'}
                      </span>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3 text-slate-400" />
                          {doc.view_count || 0}
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-emerald-600">
                          <Download className="w-3 h-3" />
                          {doc.download_count || 0}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleUnsave(e, doc.id)}
                      className="w-full py-2 rounded-xl text-xs font-bold text-slate-500 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer border-0 flex items-center justify-center gap-1.5"
                    >
                      <BookmarkX className="w-3.5 h-3.5" /> Bỏ lưu tài liệu
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

export default SavedDocuments;
