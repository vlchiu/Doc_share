import { useSearchParams, Link } from 'react-router-dom';

function PaymentResult() {
  const [searchParams] = useSearchParams();
  const status = searchParams.get('status');
  const success = status === 'success';

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '48px 40px', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', maxWidth: '420px', width: '100%' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>{success ? '🎉' : '❌'}</div>
        <h2 style={{ color: success ? '#10b981' : '#ef4444', margin: '0 0 12px' }}>
          {success ? 'Thanh toán thành công!' : 'Thanh toán thất bại'}
        </h2>
        <p style={{ color: '#64748b', lineHeight: 1.6 }}>
          {success
            ? 'Tài khoản VIP của bạn đã được kích hoạt. Kiểm tra email để xem chi tiết.'
            : 'Giao dịch không thành công. Vui lòng thử lại hoặc chọn phương thức khác.'}
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px' }}>
          <Link to="/" style={{ padding: '11px 24px', background: '#f1f5f9', color: '#374151', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' }}>
            Trang chủ
          </Link>
          {!success && (
            <Link to="/vip" style={{ padding: '11px 24px', background: 'linear-gradient(135deg,#7c3aed,#db2777)', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' }}>
              Thử lại
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default PaymentResult;
