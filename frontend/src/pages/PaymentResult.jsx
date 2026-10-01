import { useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, ArrowRight, RotateCcw, Home } from 'lucide-react';

function PaymentResult({ onPaymentSuccess }) {
  const [searchParams] = useSearchParams();
  const status = searchParams.get('status');
  const success = status === 'success';

  useEffect(() => {
    if (success && typeof onPaymentSuccess === 'function') {
      onPaymentSuccess();
    }
  }, [success, onPaymentSuccess]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center py-12 px-4 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full rounded-3xl bg-white/85 backdrop-blur-xl border border-slate-200/80 p-8 sm:p-10 shadow-2xl space-y-6"
      >
        <div
          className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto shadow-md ${
            success
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
              : 'bg-rose-50 text-rose-600 border border-rose-200'
          }`}
        >
          {success ? <CheckCircle2 className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
        </div>

        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            {success ? 'Thanh toán thành công!' : 'Thanh toán thất bại'}
          </h2>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            {success
              ? 'Tài khoản VIP của bạn đã được nâng cấp và kích hoạt tự động. Mọi giới hạn tải về đã được dỡ bỏ.'
              : 'Giao dịch chưa được hoàn tất hoặc đã bị hủy. Bạn có thể thử lại hoặc chọn phương thức khác.'}
          </p>
        </div>

        <div className="flex gap-2 justify-center pt-2">
          <Link
            to="/"
            className="flex-1 py-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors no-underline flex items-center justify-center gap-1.5"
          >
            <Home className="w-4 h-4" /> Về trang chủ
          </Link>
          {!success ? (
            <Link
              to="/vip"
              className="flex-1 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-all no-underline flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" /> Thử lại
            </Link>
          ) : (
            <Link
              to="/profile"
              className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-all no-underline flex items-center justify-center gap-1.5"
            >
              Xem tài khoản <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default PaymentResult;
