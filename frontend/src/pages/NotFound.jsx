import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Compass, ArrowLeft } from 'lucide-react';

function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center py-12 px-4 text-center">
      <div className="max-w-md w-full rounded-3xl bg-white/80 backdrop-blur-xl border border-slate-200/80 p-8 sm:p-10 shadow-xl space-y-5">
        <div className="w-20 h-20 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto shadow-sm">
          <Compass className="w-10 h-10 animate-spin-slow" />
        </div>
        <div>
          <h1 className="text-6xl font-black gradient-text tracking-tight mb-2">404</h1>
          <h2 className="text-lg font-bold text-slate-800">Trang không tồn tại</h2>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Đường dẫn bạn đang tìm kiếm có thể đã bị di chuyển, xóa hoặc không có trong hệ thống.
          </p>
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-all no-underline"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại trang chủ
        </Link>
      </div>
    </div>
  );
}

export default NotFound;
