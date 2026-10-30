import { createSequentialPoller } from "../utils/sequentialPoller";
import useRemoteData from "../hooks/useRemoteData";
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from "../components/docshare/ResourceState";
import { Hero, Panel } from "../components/docshare/Primitives";
import { useState, useEffect, useRef } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
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
  Clock,
} from "lucide-react";
import toast from "react-hot-toast";
import axiosClient from "../api/axiosClient";

const PLAN_META = {
  1: {
    icon: Zap,
    title: "Gói 1 Tháng",
    badge: "Cơ bản",
    color: "from-blue-600 to-indigo-600",
    border: "border-blue-200",
  },
  3: {
    icon: Flame,
    title: "Gói 3 Tháng",
    badge: "Phổ biến nhất",
    popular: true,
    color: "from-indigo-600 via-purple-600 to-pink-600",
    border: "border-purple-300 ring-2 ring-purple-500/20",
  },
  12: {
    icon: Crown,
    title: "Gói 1 Năm",
    badge: "Tiết kiệm nhất",
    color: "from-amber-500 to-orange-600",
    border: "border-amber-200",
  },
};

function VIPUpgrade({ onVIPActivated }) {
  const {
    data: plans = [],
    loading: plansLoading,
    error: plansError,
    retry: retryPlans,
  } = useRemoteData("/payment/plans");
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(3);
  const { data: user, retry: refreshUser } = useRemoteData("/auth/me");

  // SePay QR state
  const [sepayOrder, setSepayOrder] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [copiedContent, setCopiedContent] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);
  const pollRef = useRef(null);

  const [statusError, setStatusError] = useState("");
  const activation = useRef(onVIPActivated);
  useEffect(() => {
    activation.current = onVIPActivated;
  }, [onVIPActivated]);
  const createRequest = useRef(null);
  useEffect(() => () => createRequest.current?.abort(), []);
  useEffect(() => {
    if (!sepayOrder) return;
    const poller = createSequentialPoller({
      task: (signal) =>
        axiosClient.get(`/payment/sepay/status/${sepayOrder.orderId}`, {
          signal,
          timeout: 15000,
        }),
      onResult: ({ data }) => {
        setStatusError("");
        if (data.status === "SUCCESS") {
          toast.success(
            "Thanh toán thành công! Tài khoản VIP đã được kích hoạt.",
          );
          setSepayOrder(null);
          refreshUser();
          activation.current?.();
          return false;
        }
        if (["FAILED", "CANCELLED", "EXPIRED"].includes(data.status)) {
          setStatusError(
            "Đơn thanh toán đã kết thúc và chưa được xác nhận thành công. Vui lòng liên hệ hỗ trợ nếu bạn đã chuyển tiền.",
          );
          return false;
        }
      },
      onError: () =>
        setStatusError(
          "Chưa kiểm tra được giao dịch. Hệ thống sẽ thử lại; không cần chuyển khoản thêm.",
        ),
    });
    pollRef.current = poller;
    return () => {
      poller.stop();
      if (pollRef.current === poller) pollRef.current = null;
    };
  }, [sepayOrder, refreshUser]);
  const formatPrice = (amount) => amount.toLocaleString("vi-VN") + "đ";

  const handlePayment = async () => {
    if (!selectedPlan) {
      toast.error("Vui lòng chọn gói VIP");
      return;
    }
    if (createRequest.current) return;
    const controller = new AbortController();
    createRequest.current = controller;
    setLoading(true);
    try {
      const res = await axiosClient.post(
        "/payment/sepay/create",
        {
          planMonths: selectedPlan,
        },
        { signal: controller.signal },
      );
      if (controller.signal.aborted) return;
      setCheckingStatus(false);
      setCopiedContent(false);
      setCopiedAccount(false);
      setSepayOrder(res.data);
      setStatusError("");
    } catch (err) {
      if (!controller.signal.aborted)
        toast.error(err.response?.data?.message || "Lỗi tạo thanh toán");
    } finally {
      createRequest.current = null;
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  const handleCheckManually = async () => {
    const poller = pollRef.current;
    if (!poller) return;
    setCheckingStatus(true);
    await poller.check();
    if (pollRef.current === poller) setCheckingStatus(false);
  };
  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "content") setCopiedContent(true);
      else setCopiedAccount(true);
      toast.success("Đã sao chép vào bộ nhớ tạm!");
    } catch {
      toast.error("Không thể sao chép. Vui lòng chọn và sao chép thủ công.");
    }
  };

  // ── Màn hình QR SePay ─────────────────────────────────────────────────────
  if (sepayOrder) {
    return (
      <div className="max-w-md mx-auto py-6">
        <Motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-3xl bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-2xl p-6 sm:p-8 text-center space-y-6"
        >
          {statusError && (
            <p
              role="status"
              className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800"
            >
              {statusError}
            </p>
          )}
          {/* Header */}
          <div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto mb-3 shadow-xs">
              <QrCode className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-black text-slate-900">
              Quét mã QR thanh toán
            </h2>
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
              <span className="font-bold text-slate-800">
                {sepayOrder.bankCode}
              </span>
            </div>

            <div className="flex justify-between items-center text-slate-500">
              <span>Số tài khoản</span>
              <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900">
                <span>{sepayOrder.accountNumber}</span>
                <button
                  onClick={() =>
                    copyToClipboard(sepayOrder.accountNumber, "account")
                  }
                  className="p-1 rounded text-slate-400 hover:text-indigo-600 bg-transparent border-0 cursor-pointer"
                  title="Sao chép số tài khoản"
                >
                  {copiedAccount ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center text-slate-500">
              <span>Chủ tài khoản</span>
              <span className="font-bold text-slate-800">
                {sepayOrder.accountName}
              </span>
            </div>

            <div className="flex justify-between items-center text-slate-500 pt-1 border-t border-slate-200/60">
              <span>Số tiền thanh toán</span>
              <span className="font-black text-sm text-indigo-600">
                {formatPrice(sepayOrder.amount)}
              </span>
            </div>

            {/* Nội dung CK */}
            <div className="pt-2 border-t border-slate-200/60">
              <span className="text-slate-500 block mb-1">
                Nội dung chuyển khoản chính xác:
              </span>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-indigo-200 text-indigo-700 font-mono font-bold">
                <span className="truncate">{sepayOrder.transferContent}</span>
                <button
                  onClick={() =>
                    copyToClipboard(sepayOrder.transferContent, "content")
                  }
                  className="p-1 rounded text-indigo-500 hover:text-indigo-700 bg-transparent border-0 cursor-pointer shrink-0"
                  title="Sao chép nội dung"
                >
                  {copiedContent ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-[10px] text-amber-600 font-medium mt-1">
                * Vui lòng giữ nguyên nội dung chuyển khoản để hệ thống kích
                hoạt tự động.
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
                pollRef.current?.stop();
                setSepayOrder(null);
              }}
              className="px-4 py-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold text-xs transition-colors cursor-pointer"
            >
              Hủy
            </button>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Hệ thống tự động kiểm tra trạng thái thanh toán</span>
          </div>
        </Motion.div>
      </div>
    );
  }

  if (plansError)
    return (
      <ErrorState
        error={plansError}
        onRetry={retryPlans}
        title="Không tải được các gói VIP"
      />
    );
  if (plansLoading) return <LoadingState label="Đang tải các gói VIP…" />;
  if (!plans.length)
    return (
      <EmptyState
        title="Chưa có gói VIP khả dụng"
        description="Bạn vẫn có thể khám phá tài liệu và quay lại sau."
        to="/documents"
        action="Khám phá tài liệu"
      />
    );

  const chosen = plans.find((plan) => plan.key === selectedPlan);
  return (
    <div className="ds-columns ds-legacy-page">
      <div className="min-w-0 space-y-6">
        <Hero
          title={
            <>
              Nâng cấp <span className="text-blue-600">tài khoản VIP</span>
            </>
          }
          description="Khám phá gói thành viên DocShare, tải tài liệu và học tập hiệu quả hơn."
          kind="vip"
          compact
        >
          <p className="mt-4 text-xs text-[#60709b]">
            Gói hiện tại:{" "}
            <strong>{user?.plan === "VIP" ? "VIP" : "Miễn phí"}</strong>
            {user?.plan_expires_at &&
              ` · Hết hạn ${new Date(user.plan_expires_at).toLocaleDateString("vi-VN")}`}
          </p>
        </Hero>
        <h2 className="text-xl font-bold">Chọn gói VIP phù hợp với bạn</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <section
              key={plan.key}
              className={`relative flex flex-col rounded-xl border p-5 ${selectedPlan === plan.key ? "border-blue-600 bg-blue-50/50 ring-1 ring-blue-600" : "border-blue-100 bg-white"}`}
            >
              {plan.key === 3 && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-blue-600 px-4 py-1 text-xs font-semibold text-white">
                  Phổ biến nhất
                </span>
              )}
              <div className="mt-2 flex items-center gap-3">
                <span className="rounded-xl bg-blue-100/60 p-3 text-blue-600">
                  <Clock size={23} />
                </span>
                <h3 className="font-bold">{plan.label}</h3>
              </div>
              <p className="mt-6 text-2xl font-extrabold tracking-tight">
                {formatPrice(plan.amount)}
              </p>
              <p className="mt-2 text-xs text-[#7181a8]">
                Khoảng{" "}
                {Math.round(plan.amount / plan.months).toLocaleString("vi-VN")}đ
                / tháng
              </p>
              <ul className="my-7 space-y-4 text-xs text-[#60709b]">
                {[
                  "Tải tài liệu không giới hạn",
                  "Huy hiệu thành viên VIP",
                  "Thời hạn theo gói đã chọn",
                ].map((text) => (
                  <li key={text} className="flex items-center gap-2">
                    <CheckCircle2
                      size={17}
                      className="shrink-0 text-emerald-500"
                    />
                    {text}
                  </li>
                ))}
              </ul>
              <button
                className={`${selectedPlan === plan.key ? "ds-button-primary" : "ds-button-outline"} mt-auto w-full text-xs`}
                aria-pressed={selectedPlan === plan.key}
                onClick={() => setSelectedPlan(plan.key)}
              >
                {selectedPlan === plan.key
                  ? "Đang chọn gói này"
                  : "Chọn gói này"}
              </button>
            </section>
          ))}
        </div>
        {!plans.length && (
          <p className="text-sm text-[#7181a8]">
            Chưa tải được danh sách gói. Vui lòng tải lại trang.
          </p>
        )}
        <Panel title="Phương thức thanh toán">
          <div className="flex items-center gap-4 rounded-xl border border-blue-500 bg-blue-50/50 p-5">
            <QrCode className="text-blue-600" size={35} />
            <div>
              <h3 className="text-sm font-bold">QR chuyển khoản (SePay)</h3>
              <p className="mt-1 text-xs text-[#7181a8]">
                Quét mã QR từ ứng dụng ngân hàng. Kích hoạt sau khi xác nhận
                giao dịch.
              </p>
            </div>
            <CheckCircle2 className="ml-auto shrink-0 text-blue-600" />
          </div>
        </Panel>
      </div>
      <aside className="space-y-4">
        <Panel title="Thông tin đơn hàng">
          <div className="rounded-xl border border-blue-100 p-4">
            <div className="flex items-center gap-3">
              <Crown className="text-amber-500" size={32} />
              <div>
                <h3 className="text-sm font-bold">Gói DocShare VIP</h3>
                <p className="mt-1 text-xs text-[#7181a8]">
                  {chosen?.label || "Chọn gói thành viên"}
                </p>
              </div>
            </div>
            <div className="my-6 flex flex-wrap items-center justify-between gap-2 border-t border-blue-100 pt-5">
              <span className="text-sm font-bold">Tổng thanh toán</span>
              <strong className="text-2xl text-blue-600">
                {chosen ? formatPrice(chosen.amount) : "—"}
              </strong>
            </div>
            <button
              disabled={loading || !chosen}
              onClick={handlePayment}
              className="ds-button-primary w-full text-sm"
            >
              {loading ? "Đang tạo mã QR…" : "Tiếp tục thanh toán"}
              <ArrowRight size={18} />
            </button>
            <p className="mt-4 text-center text-xs text-[#7181a8]">
              Kiểm tra thông tin trước khi chuyển khoản.
            </p>
          </div>
        </Panel>
        <Panel title="Bạn sẽ nhận được">
          <div className="space-y-5">
            {[
              [
                "Tải tài liệu không giới hạn",
                "Mở rộng quyền tải xuống trong thời hạn VIP.",
              ],
              [
                "Quản lý tài khoản dễ dàng",
                "Theo dõi gói và thời hạn ngay trong hồ sơ.",
              ],
              [
                "Xác nhận thanh toán tự động",
                "Gói được kích hoạt khi hệ thống xác nhận giao dịch.",
              ],
            ].map(([title, desc]) => (
              <div key={title} className="flex gap-3">
                <CheckCircle2 className="shrink-0 text-emerald-500" size={23} />
                <div>
                  <h3 className="text-sm font-semibold">{title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#7181a8]">
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </aside>
    </div>
  );
}
export default VIPUpgrade;
