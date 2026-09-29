import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DownloadCloud, Trash2, Calendar, FileText, ChevronLeft, ChevronRight, FolderOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import axiosClient from '../api/axiosClient';
import Spinner from '../components/Spinner';
import { getFileLabel } from '../utils/fileHelper';

function DownloadHistory() {
  const [history, setHistory] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const fetchHistory = () => {
    setLoading(true);
    axiosClient
      .get(`/documents/history?page=${page}`)
      .then((res) => {
        setHistory(res.data.history || []);
        setPagination(res.data.pagination || { total: 0, page: 1, totalPages: 1 });
      })
      .catch(() => toast.error('Lỗi khi tải lịch sử tải xuống!'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchHistory();
  }, [page]);

  const handleDelete = async (historyId) => {
    try {
      await axiosClient.delete(`/documents/history/${historyId}`);
      setHistory((h) => h.filter((item) => item.id !== historyId));
      setPagination((p) => ({ ...p, total: Math.max(0, p.total - 1) }));
      toast.success('Đã xóa khỏi lịch sử!');
    } catch {
      toast.error('Lỗi khi xóa!');
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Bạn có chắc muốn xóa toàn bộ lịch sử tải xuống?')) return;
    try {
      await axiosClient.delete('/documents/history/clear');
      setHistory([]);
      setPagination({ total: 0, page: 1, totalPages: 1 });
      toast.success('Đã dọn sạch toàn bộ lịch sử!');
    } catch {
      toast.error('Lỗi!');
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
            <DownloadCloud className="w-3.5 h-3.5" /> Nhật ký tải về
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Lịch sử tải xuống</h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Tổng cộng <span className="font-bold text-white">{pagination.total}</span> lượt tải đã được ghi nhận.
          </p>
        </div>

        {history.length > 0 && (
          <button
            onClick={handleClearAll}
            className="relative z-10 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-rose-500/20 text-white hover:text-rose-200 border border-white/15 hover:border-rose-400/40 text-xs font-bold transition-all cursor-pointer shrink-0"
          >
            <Trash2 className="w-4 h-4" /> Xóa tất cả lịch sử
          </button>
        )}
      </div>

      {/* ── LIST / TABLE CONTAINER ── */}
      {history.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white/60 p-12 text-center backdrop-blur-sm">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
            <DownloadCloud className="w-8 h-8 opacity-60" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Chưa có lượt tải nào</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Khi bạn tải xuống bất kỳ tài liệu nào trên hệ thống, lịch sử sẽ được hiển thị ở đây.
          </p>
        </div>
      ) : (
        <div className="rounded-3xl bg-white/85 backdrop-blur-md border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 uppercase tracking-wider font-bold text-[11px]">
                  <th className="py-4 px-6">Tài liệu</th>
                  <th className="py-4 px-4">Danh mục</th>
                  <th className="py-4 px-4">Định dạng</th>
                  <th className="py-4 px-4">Thời gian</th>
                  <th className="py-4 px-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((item) => {
                  const doc = item.document;
                  if (!doc) return null;
                  const fileLabel = getFileLabel(doc.file_type, doc.file_url);

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-indigo-50/30 transition-colors group"
                    >
                      <td className="py-4 px-6">
                        <Link
                          to={`/documents/${doc.id}`}
                          className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors no-underline flex items-center gap-2 max-w-md"
                        >
                          <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                          <span className="truncate">{doc.title}</span>
                        </Link>
                      </td>
                      <td className="py-4 px-4 text-slate-500 font-medium">
                        {doc.category?.name || 'Chung'}
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-100 text-slate-700">
                          {fileLabel}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-slate-400">
                        {new Date(item.created_at).toLocaleString('vi-VN')}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer border-0 bg-transparent"
                          title="Xóa mục này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          {pagination.totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Trang {page} / {pagination.totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                  className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DownloadHistory;
