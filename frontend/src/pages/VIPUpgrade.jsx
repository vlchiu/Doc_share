import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import axiosClient from '../api/axiosClient';

const PLAN_ICONS = { 1: '⚡', 3: '🔥', 12: '👑' };

function VIPUpgrade() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [provider, setProvider] = useState('MOMO');
  const [user, setUser] = useState(null);

  useEffect(() => {
    axiosClient.get('/payment/plans').then(res => setPlans(res.data));
    axiosClient.get('/auth/me').then(res => setUser(res.data));
  }, []);

  const handlePayment = async () => {
    if (!selectedPlan) { toast.error('Vui lòng chọn gói VIP'); return; }
    setLoading(true);
    try {
      const endpoint = provider === 'MOMO' ? '/payment/momo/create' : '/payment/vnpay/create';
      const res = await axiosClient.post(endpoint, { planMonths: selectedPlan });
      window.location.href = res.data.payUrl;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi tạo thanh toán');
    } finally { setLoading(false); }
  };

  const formatPrice = (amount) => amount.toLocaleString('vi-VN') + 'đ';

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
        <div style={{ display: 'flex', gap: '12px' }}>
          {[
            { id: 'MOMO', label: 'MoMo', color: '#ae2070', bg: '#fdf2f8' },
            { id: 'VNPAY', label: 'VNPay', color: '#0066cc', bg: '#eff6ff' },
          ].map(p => (
            <div key={p.id} onClick={() => setProvider(p.id)}
              style={{
                flex: 1, padding: '14px', borderRadius: '10px', textAlign: 'center', cursor: 'pointer',
                border: `2px solid ${provider === p.id ? p.color : '#e2e8f0'}`,
                background: provider === p.id ? p.bg : '#fff',
                fontWeight: 'bold', color: p.color, transition: '0.2s'
              }}>
              {p.label}
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
        {loading ? 'Đang xử lý...' : `💳 Thanh toán qua ${provider}`}
      </button>
    </div>
  );
}

export default VIPUpgrade;
