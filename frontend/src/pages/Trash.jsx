import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trash2, RotateCcw, AlertOctagon, FolderOpen, Calendar, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import axiosClient from '../api/axiosClient';
import Spinner from '../components/Spinner';

function Trash() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosClient
      .get('/documents/trash')
      .then((res) => setDocs(res.data || []))
      .catch(() => toast.error('Lỗi khi tải thùng rác!'))
      .finally(() => setLoading(false));
  }, []);

  const handleRestore = async (id) => {
    try {
      await axiosClient.put(`/documents/${id}/restore`);
      setDocs(docs.filter((d) => d.id !== id));
      toast.success('Đã khôi phục tài liệu thành công!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi khôi phục!');
    }
  };

  const handlePermanentDelete = async (id) => {
    if (!window.confirm('Cảnh báo: Tài liệu sẽ bị xóa vĩnh viễn và không thể khôi phục! Bạn có chắc chắn?'))
      return;
    try {
      await axiosClient.delete(`/documents/${id}/permanent`);
      setDocs(docs.filter((d) => d.id !== id));
      toast.success('Đã xóa vĩnh viễn tài liệu!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi xóa!');
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
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 p-8 text-white relative overflow-hidden border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-rose-300 text-xs font-bold mb-3 border border-white/10">
            <Trash2 className="w-3.5 h-3.5" /> Quản lý tài liệu đã xóa
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Thùng rác</h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            {docs.length > 0
              ? `Hiện có ${docs.length} tài liệu trong thùng rác. Bạn có thể khôi phục hoặc dọn dẹp vĩnh viễn.`
              : 'Thùng rác hiện đang hoàn toàn trống.'}
          </p>
        </div>

        {docs.length > 0 && (
          <span className="relative z-10 px-4 py-2 rounded-2xl bg-white/10 border border-white/15 text-xs font-bold text-white shrink-0">
            {docs.length} mục đã xóa
          </span>
        )}
      </div>

      {/* ── LIST OR EMPTY STATE ── */}
      {docs.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white/60 p-12 text-center backdrop-blur-sm">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-8 h-8 opacity-60" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Thùng rác trống</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Các tài liệu bị xóa gần đây sẽ được tạm lưu tại đây để bạn có thể khôi phục khi cần.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="rounded-3xl p-5 bg-white/85 border border-slate-200/80 shadow-sm flex flex-col justify-between backdrop-blur-sm opacity-90 hover:opacity-100 transition-opacity"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Đã xóa: {new Date(doc.deleted_at).toLocaleDateString('vi-VN')}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {doc.doc_type || 'Chung'}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-slate-500 line-through line-clamp-2 leading-snug my-2">
                  {doc.title}
                </h3>

                <p className="text-xs text-slate-400">
                  {doc.category?.name || 'Tài liệu'} · Tác giả: {doc.user?.name}
                </p>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex gap-2 mt-5 pt-3 border-t border-slate-100">
                <button
                  onClick={() => handleRestore(doc.id)}
                  className="flex-1 py-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Khôi phục
                </button>
                <button
                  onClick={() => handlePermanentDelete(doc.id)}
                  className="flex-1 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/60 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Xóa vĩnh viễn
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Trash;
