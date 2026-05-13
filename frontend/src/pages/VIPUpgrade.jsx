import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import axiosClient from '../api/axiosClient';

const PLAN_ICONS = { 1: '⚡', 3: '🔥', 12: '👑' };

function VIPUpgrade() {
  const [plans, setPlans]               = useState([]);
  const [loading, setLoading]           = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [provider, setProvider]         = useState('SEPAY');
  const [user, setUser]                 = useState(null);

  // SePay QR state
  const [sepayOrder, setSepayOrder]     = useState(null); // { orderId, qrUrl, amount, transferContent, ... }
  const [checkingStatus, setCheckingStatus] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => {
    axiosClient.get('/payment/plans').then(res => setPlans(res.data));
    axiosClient.get('/auth/me').then(res => setUser(res.data));
    return () => clearInterval(pollRef.current);
  }, []);

  const formatPrice = (amount) => amount.toLocaleString('vi-VN') + 'đ';

  // ── Polling kiểm tra trạng thái thanh toán SePay ──────────────────────────
  const startPolling = (orderId) => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await axiosClient.get(`/payment/sepay/status/${orderId}`);
        if (res.data.status === 'SUCCESS') {
          clearInterval(pollRef.current);
          toast.success('🎉 Thanh toán thành công! Tài khoản VIP đã được kích hoạt.');
          setSepayOrder(null);
          // Reload user info
          axiosClient.get('/auth/me').then(r => setUser(r.data));
        }
      } catch {}
    }, 5000); // kiểm tra mỗi 5 giây
  };

  const handlePayment = async () => {
    if (!selectedPlan) { toast.error('Vui lòng chọn gói VIP'); return; }
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
    } finally { setLoading(false); }
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
        axiosClient.get('/auth/me').then(r => setUser(r.data));
      } else {
        toast('⏳ Chưa nhận được thanh toán, vui lòng thử lại sau.', { icon: '⏳' });
      }
    } catch {
      toast.error('Lỗi kiểm tra trạng thái');
    } finally { setCheckingStatus(false); }
  };

  // ── Màn hình QR SePay ─────────────────────────────────────────────────────
  if (sepayOrder) {
    return (
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>
        <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📱</div>
          <h2 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: 'bold', color: '#1a1a1a' }}>Quét QR để thanh toán</h2>
          <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: '14px' }}>Dùng app ngân hàng quét mã QR bên dưới</p>

          {/* QR Code */}
          <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px', marginBottom: '20px', display: 'inline-block' }}>
            <img
              src={sepayOrder.qrUrl}
              alt="QR thanh toán"
              style={{ width: '220px', height: '220px', borderRadius: '8px' }}
            />
          </div>

          {/* Thông tin chuyển khoản */}
          <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px', marginBottom: '20px', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#64748b', fontSize: '13px' }}>Ngân hàng</span>
              <span style={{ fontWeight: 'bold', fontSize: '13px' }}>Sacombank</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#64748b', fontSize: '13px' }}>Số tài khoản</span>
              <span style={{ fontWeight: 'bold', fontSize: '13px' }}>{sepayOrder.accountNumber}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#64748b', fontSize: '13px' }}>Chủ tài khoản</span>
              <span style={{ fontWeight: 'bold', fontSize: '13px' }}>{sepayOrder.accountName}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#64748b', fontSize: '13px' }}>Số tiền</span>
              <span style={{ fontWeight: 'bold', fontSize: '15px', color: '#7c3aed' }}>{formatPrice(sepayOrder.amount)}</span>
            </div>
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px', marginTop: '4px' }}>
              <span style={{ color: '#64748b', fontSize: '13px' }}>Nội dung CK</span>
              <div style={{ background: '#fff', border: '1px dashed #7c3aed', borderRadius: '8px', padding: '8px 12px', marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', color: '#7c3aed', fontSize: '13px', wordBreak: 'break-all' }}>{sepayOrder.transferContent}</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(sepayOrder.transferContent); toast.success('Đã copy!'); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '16px', flexShrink: 0, marginLeft: '8px' }}
                >📋</button>
              </div>
              <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#ef4444', fontWeight: '500' }}>
                ⚠️ Nhập đúng nội dung chuyển khoản để hệ thống tự động kích hoạt VIP
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleCheckManually}
              disabled={checkingStatus}
              style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#7c3aed,#db2777)', color: '#fff', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}
            >
              {checkingStatus ? '⏳ Đang kiểm tra...' : '✅ Tôi đã chuyển khoản'}
            </button>
            <button
              onClick={() => { clearInterval(pollRef.current); setSepayOrder(null); }}
              style={{ padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}
            >Hủy</button>
          </div>

          <p style={{ margin: '12px 0 0', fontSize: '12px', color: '#94a3b8' }}>
            Hệ thống tự động kiểm tra mỗi 5 giây. VIP sẽ được kích hoạt ngay sau khi nhận được thanh toán.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#7c3aed,#db2777)', borderRadius: '16px', padding: '32px', textAlign: 'center', marginBottom: '28px', color: '#fff' }}>
        <div style={{ fontSize: '48px', marginBottom: '8px' }}>💎</div>
        <h1 style={{ margin: '0 0 8px', fontSize: '26px', fontWeight: 'bold' }}>Nâng cấp VIP</h1>
        <p style={{ margin: 0, opacity: 0.85 }}>Tải xuống không giới hạn, ưu tiên hỗ trợ</p>
      </div>

      {/* Trạng thái hiện tại */}
      {user && (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontWeight: 'bold', color: '#374151' }}>Gói hiện tại: </span>
            <span style={{ padding: '3px 12px', borderRadius: '20px', fontWeight: 'bold', fontSize: '13px', background: user.plan === 'VIP' ? '#faf5ff' : '#f1f5f9', color: user.plan === 'VIP' ? '#7c3aed' : '#64748b' }}>
              {user.plan === 'VIP' ? '💎 VIP' : '🆓 FREE'}
            </span>
          </div>
          {user.plan === 'VIP' && user.plan_expires_at && (
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              Hết hạn: <strong>{new Date(user.plan_expires_at).toLocaleDateString('vi-VN')}</strong>
            </span>
          )}
          {user.plan === 'FREE' && (
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              Đã tải tháng này: <strong>{user.monthly_downloads || 0}/10</strong>
            </span>
          )}
        </div>
      )}

      {/* Chọn gói */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '24px' }}>
        {plans.map(plan => (
          <div key={plan.key} onClick={() => setSelectedPlan(plan.key)}
            style={{
              background: '#fff', borderRadius: '12px', padding: '20px 16px', textAlign: 'center', cursor: 'pointer',
              border: `2px solid ${selectedPlan === plan.key ? '#7c3aed' : '#e2e8f0'}`,
              boxShadow: selectedPlan === plan.key ? '0 0 0 3px rgba(124,58,237,0.15)' : 'none',
              transition: '0.2s', position: 'relative'
            }}>
            {plan.key === 3 && (
              <div style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: '#f59e0b', color: '#fff', fontSize: '11px', fontWeight: 'bold', padding: '2px 10px', borderRadius: '20px' }}>
                PHỔ BIẾN
              </div>
            )}
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>{PLAN_ICONS[plan.key]}</div>
            <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#1a1a1a', marginBottom: '4px' }}>{plan.label}</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#7c3aed' }}>{formatPrice(plan.amount)}</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
              {Math.round(plan.amount / plan.months).toLocaleString('vi-VN')}đ/tháng
            </div>
          </div>
        ))}
      </div>

      {/* Chọn cổng thanh toán */}
      <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
        <p style={{ margin: '0 0 14px', fontWeight: 'bold', color: '#374151' }}>Phương thức thanh toán:</p>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {[
            { id: 'SEPAY', label: '🏦 Chuyển khoản QR', color: '#0ea5e9', bg: '#f0f9ff', desc: 'Sacombank · Tự động kích hoạt' },
            { id: 'VNPAY', label: '💳 VNPay', color: '#0066cc', bg: '#eff6ff', desc: 'ATM / Thẻ quốc tế' },
            { id: 'MOMO', label: '💜 MoMo', color: '#ae2070', bg: '#fdf2f8', desc: 'Ví MoMo' },
          ].map(p => (
            <div key={p.id} onClick={() => setProvider(p.id)}
              style={{
                flex: 1, minWidth: '140px', padding: '14px', borderRadius: '10px', textAlign: 'center', cursor: 'pointer',
                border: `2px solid ${provider === p.id ? p.color : '#e2e8f0'}`,
                background: provider === p.id ? p.bg : '#fff',
                transition: '0.2s'
              }}>
              <div style={{ fontWeight: 'bold', color: p.color, fontSize: '14px' }}>{p.label}</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>{p.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quyền lợi VIP */}
      <div style={{ background: '#faf5ff', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px', border: '1px solid #e9d5ff' }}>
        <p style={{ margin: '0 0 10px', fontWeight: 'bold', color: '#7c3aed' }}>✨ Quyền lợi VIP:</p>
        {['Tải xuống không giới hạn', 'Không quảng cáo', 'Ưu tiên hỗ trợ', 'Badge VIP trên hồ sơ'].map(item => (
          <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#374151', fontSize: '14px', marginBottom: '6px' }}>
            <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span> {item}
          </div>
        ))}
      </div>

      <button onClick={handlePayment} disabled={loading || !selectedPlan}
        style={{
          width: '100%', padding: '15px', borderRadius: '12px', border: 'none', fontWeight: 'bold', fontSize: '16px',
          background: !selectedPlan ? '#e2e8f0' : 'linear-gradient(135deg,#7c3aed,#db2777)',
          color: !selectedPlan ? '#94a3b8' : '#fff',
          cursor: !selectedPlan ? 'not-allowed' : 'pointer',
          boxShadow: selectedPlan ? '0 4px 15px rgba(124,58,237,0.35)' : 'none',
          transition: '0.2s'
        }}>
        {loading ? 'Đang xử lý...' : provider === 'SEPAY' ? '📱 Tạo QR chuyển khoản' : `💳 Thanh toán qua ${provider}`}
      </button>
    </div>
  );
}

export default VIPUpgrade;
