import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Zap,
  Flame,
  Crown,
  CheckCircle2,
  QrCode,
  CreditCard,
  Wallet,
  Copy,
  Check,
  RotateCw,
  X,
  ShieldCheck,
  ArrowRight,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import axiosClient from '../api/axiosClient';

const PLAN_META = {
  1: {
    icon: Zap,
    title: 'Gói 1 Tháng',
    badge: 'Cơ bản',
    color: 'from-blue-600 to-indigo-600',
    border: 'border-blue-200',
  },
  3: {
    icon: Flame,
    title: 'Gói 3 Tháng',
    badge: 'Phổ biến nhất',
    popular: true,
    color: 'from-indigo-600 via-purple-600 to-pink-600',
    border: 'border-purple-300 ring-2 ring-purple-500/20',
  },
  12: {
    icon: Crown,
    title: 'Gói 1 Năm',
    badge: 'Tiết kiệm nhất',
    color: 'from-amber-500 to-orange-600',
    border: 'border-amber-200',
  },
};

function VIPUpgrade({ onVIPActivated }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(3);
  const [provider, setProvider] = useState('SEPAY');
  const [user, setUser] = useState(null);

  // SePay QR state
  const [sepayOrder, setSepayOrder] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [copiedContent, setCopiedContent] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => {
    axiosClient.get('/payment/plans').then((res) => {
      setPlans(res.data || []);
      if (res.data?.length > 0 && !selectedPlan) {
        setSelectedPlan(res.data[1]?.key || res.data[0]?.key);
      }
    });
    axiosClient.get('/auth/me').then((res) => setUser(res.data));
    return () => clearInterval(pollRef.current);
  }, []);

  const formatPrice = (amount) => amount.toLocaleString('vi-VN') + 'đ';

  const startPolling = (orderId) => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await axiosClient.get(`/payment/sepay/status/${orderId}`);
        if (res.data.status === 'SUCCESS') {
          clearInterval(pollRef.current);
          toast.success('🎉 Thanh toán thành công! Tài khoản VIP đã được kích hoạt.');
          setSepayOrder(null);
          if (onVIPActivated) onVIPActivated();
          setTimeout(() => window.location.reload(), 1500);
        }
      } catch {}
    }, 5000);
  };

  const handlePayment = async () => {
    if (!selectedPlan) {
      toast.error('Vui lòng chọn gói VIP');
      return;
    }
    setLoading(true);
    try {
      if (provider === 'SEPAY') {
        const res = await axiosClient.post('/payment/sepay/create', { planMonths: selectedPlan });
        setSepayOrder(res.data);
        startPolling(res.data.orderId);
      } else {
        const endpoint = provider === 'MOMO' ? '/payment/momo/create' : '/payment/vnpay/create';
        const res = await axiosClient.post(endpoint, { planMonths: selectedPlan });
        window.location.href = res.data.payUrl;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi tạo thanh toán');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckManually = async () => {
    if (!sepayOrder) return;
    setCheckingStatus(true);
    try {
      const res = await axiosClient.get(`/payment/sepay/status/${sepayOrder.orderId}`);
      if (res.data.status === 'SUCCESS') {
        clearInterval(pollRef.current);
        toast.success('🎉 Thanh toán thành công! Tài khoản VIP đã được kích hoạt.');
        setSepayOrder(null);
        if (onVIPActivated) onVIPActivated();
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast('Hệ thống đang kiểm tra giao dịch, vui lòng chờ trong giây lát...', { icon: '⏳' });
      }
    } catch {
      toast.error('Lỗi khi kiểm tra trạng thái');
    } finally {
      setCheckingStatus(false);
    }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'content') {
      setCopiedContent(true);
      setTimeout(() => setCopiedContent(false), 2000);
    } else {
      setCopiedAccount(true);
      setTimeout(() => setCopiedAccount(false), 2000);
    }
    toast.success('Đã sao chép vào bộ nhớ tạm!');
  };

  // ── Màn hình QR SePay ─────────────────────────────────────────────────────
  if (sepayOrder) {
    return (
      <div className="max-w-md mx-auto py-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-3xl bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-2xl p-6 sm:p-8 text-center space-y-6"
        >
          {/* Header */}
          <div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto mb-3 shadow-xs">
              <QrCode className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-black text-slate-900">Quét mã QR thanh toán</h2>
            <p className="text-xs text-slate-500 mt-1">
              Mở ứng dụng ngân hàng và quét mã để thanh toán tự động
            </p>
          </div>

          {/* QR Container */}
          <div className="inline-block p-4 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-inner">
            <img
              src={sepayOrder.qrUrl}
              alt="QR thanh toán"
              className="w-56 h-56 rounded-xl mx-auto object-contain bg-white p-2 shadow-xs"
            />
          </div>

          {/* Transfer Details Card */}
          <div className="rounded-2xl bg-slate-50/80 border border-slate-200/80 p-4 text-left text-xs space-y-2.5">
            <div className="flex justify-between items-center text-slate-500">
              <span>Ngân hàng thụ hưởng</span>
              <span className="font-bold text-slate-800">Sacombank</span>
            </div>

            <div className="flex justify-between items-center text-slate-500">
              <span>Số tài khoản</span>
              <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900">
                <span>{sepayOrder.accountNumber}</span>
                <button
                  onClick={() => copyToClipboard(sepayOrder.accountNumber, 'account')}
                  className="p-1 rounded text-slate-400 hover:text-indigo-600 bg-transparent border-0 cursor-pointer"
                  title="Sao chép số tài khoản"
                >
                  {copiedAccount ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center text-slate-500">
              <span>Chủ tài khoản</span>
              <span className="font-bold text-slate-800">{sepayOrder.accountName}</span>
            </div>

            <div className="flex justify-between items-center text-slate-500 pt-1 border-t border-slate-200/60">
              <span>Số tiền thanh toán</span>
              <span className="font-black text-sm text-indigo-600">
                {formatPrice(sepayOrder.amount)}
              </span>
            </div>

            {/* Nội dung CK */}
            <div className="pt-2 border-t border-slate-200/60">
              <span className="text-slate-500 block mb-1">Nội dung chuyển khoản chính xác:</span>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-indigo-200 text-indigo-700 font-mono font-bold">
                <span className="truncate">{sepayOrder.transferContent}</span>
                <button
                  onClick={() => copyToClipboard(sepayOrder.transferContent, 'content')}
                  className="p-1 rounded text-indigo-500 hover:text-indigo-700 bg-transparent border-0 cursor-pointer shrink-0"
                  title="Sao chép nội dung"
                >
                  {copiedContent ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-amber-600 font-medium mt-1">
                * Vui lòng giữ nguyên nội dung chuyển khoản để hệ thống kích hoạt tự động.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleCheckManually}
              disabled={checkingStatus}
              className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors cursor-pointer border-0 shadow-md shadow-indigo-500/20 flex items-center justify-center gap-1.5"
            >
              {checkingStatus ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang kiểm tra...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Tôi đã chuyển khoản</span>
                </>
              )}
            </button>
            <button
              onClick={() => {
                clearInterval(pollRef.current);
                setSepayOrder(null);
              }}
              className="px-4 py-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold text-xs transition-colors cursor-pointer"
            >
              Hủy
            </button>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Hệ thống tự động đồng bộ mỗi 5 giây</span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* ── HERO BANNER ── */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 sm:p-10 text-white relative overflow-hidden border border-slate-800 shadow-xl text-center">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-bold border border-white/10">
            <Sparkles className="w-3.5 h-3.5" /> Nâng tầm trải nghiệm học tập
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            Nâng cấp tài khoản <span className="gradient-text-amber">VIP</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Mở khóa tải xuống không giới hạn, ưu tiên phản hồi nhanh từ cộng đồng và tính năng tóm tắt tài liệu với AI không giới hạn.
          </p>
        </div>
      </div>

      {/* ── CURRENT PLAN STATUS ── */}
      {user && (
        <div className="rounded-2xl bg-white/85 backdrop-blur-md border border-slate-200/80 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm ${
              user.plan === 'VIP' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
            }`}>
              {user.plan === 'VIP' ? <Crown className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Gói hiện tại:</span>
                <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                  user.plan === 'VIP'
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-slate-100 text-slate-700'
                }`}>
                  {user.plan === 'VIP' ? '💎 VIP MEMBER' : 'MIỄN PHÍ'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {user.plan === 'VIP' && user.plan_expires_at
                  ? `Thời hạn đến: ${new Date(user.plan_expires_at).toLocaleDateString('vi-VN')}`
                  : `Lượt tải tháng này: ${user.monthly_downloads || 0} / 10 lượt`}
              </p>
            </div>
          </div>

          {user.plan !== 'VIP' && (
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100">
              ⚡ Nâng cấp để bỏ giới hạn 10 lượt tải
            </span>
          )}
        </div>
      )}

      {/* ── PRICING BENTO TIERS ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const meta = PLAN_META[plan.key] || PLAN_META[1];
          const Icon = meta.icon;
          const isSelected = selectedPlan === plan.key;

          return (
            <motion.div
              key={plan.key}
              whileHover={{ y: -4 }}
              onClick={() => setSelectedPlan(plan.key)}
              className={`relative rounded-3xl p-6 cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                isSelected
                  ? 'bg-white shadow-xl ring-2 ring-indigo-600 border border-indigo-200'
                  : 'bg-white/80 hover:bg-white border border-slate-200/80 shadow-sm'
              }`}
            >
              {meta.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[10px] font-extrabold tracking-wider uppercase shadow-sm">
                  {meta.badge}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                    isSelected ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  {!meta.popular && (
                    <span className="text-[11px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
                      {meta.badge}
                    </span>
                  )}
                </div>

                <h3 className="font-extrabold text-slate-900 text-base">{plan.label}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900">
                    {formatPrice(plan.amount)}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Chỉ khoảng {Math.round(plan.amount / plan.months).toLocaleString('vi-VN')}đ / tháng
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                <span className={isSelected ? 'text-indigo-600' : 'text-slate-500'}>
                  {isSelected ? 'Đang chọn gói này' : 'Bấm để chọn'}
                </span>
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                  isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'
                }`}>
                  {isSelected && <Check className="w-3.5 h-3.5" />}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── PAYMENT PROVIDER SELECTOR ── */}
      <div className="rounded-3xl bg-white/85 backdrop-blur-md border border-slate-200/80 p-6 shadow-sm space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Chọn phương thức thanh toán
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              id: 'SEPAY',
              label: 'Chuyển khoản QR (SePay)',
              desc: 'Tự động kích hoạt ngay sau 5s',
              icon: QrCode,
              color: 'text-indigo-600',
            },
            {
              id: 'VNPAY',
              label: 'Cổng VNPay',
              desc: 'Thẻ ATM & Quốc tế',
              icon: CreditCard,
              color: 'text-blue-600',
            },
            {
              id: 'MOMO',
              label: 'Ví MoMo',
              desc: 'Thanh toán qua ví điện tử',
              icon: Wallet,
              color: 'text-pink-600',
            },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = provider === item.id;
            return (
              <div
                key={item.id}
                onClick={() => setProvider(item.id)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center gap-3.5 ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/50 shadow-sm ring-1 ring-indigo-600'
                    : 'border-slate-200/80 bg-white hover:bg-slate-50'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs text-slate-900 truncate">{item.label}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5 truncate">{item.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── VIP PERKS CHECKLIST ── */}
      <div className="rounded-3xl bg-gradient-to-br from-indigo-50/60 to-purple-50/50 border border-indigo-100/80 p-6 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-indigo-600" /> Đặc quyền độc quyền cho tài khoản VIP
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
          {[
            'Tải xuống tài liệu tốc độ cao không giới hạn',
            'Không giới hạn câu hỏi tương tác với trợ lý AI',
            'Huy hiệu PRO VIP phát sáng trên hồ sơ và bài đăng',
            'Ưu tiên duyệt tài liệu đăng tải nhanh hơn',
          ].map((perk, i) => (
            <div key={i} className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{perk}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── SUBMIT / PAY BUTTON ── */}
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={handlePayment}
        disabled={loading || !selectedPlan}
        className="w-full py-4 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 shadow-xl shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 border-0 cursor-pointer"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Đang tạo cổng thanh toán...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            <span>
              {provider === 'SEPAY'
                ? 'Tạo mã QR chuyển khoản tự động'
                : `Thanh toán qua ${provider}`}
            </span>
          </>
        )}
      </motion.button>
    </div>
  );
}

export default VIPUpgrade;
