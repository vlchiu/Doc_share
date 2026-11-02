import useRemoteData from '../../hooks/useRemoteData';
export default function UsagePanel() {
  const { data, loading, error, retry } = useRemoteData('/auth/usage');
  return <section className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 text-sm" aria-label="Hạn mức tài khoản">
    <div className="flex justify-between gap-3"><strong>Hạn mức tài khoản</strong><button type="button" onClick={retry} className="text-blue-600">Làm mới</button></div>
    {loading ? <p role="status">Đang tải hạn mức…</p> : error ? <p role="alert">Chưa thể tải hạn mức. Hãy thử lại.</p> : !data?.enabled ? <p>Hạn mức tài khoản chưa được bật.</p> : <div className="mt-2 space-y-2">
      <p>Gói hiện tại: {data.plan}</p>
      <p>AI Chat: {data.ai.used} lượt đã dùng/đang xử lý · {data.ai.limit == null ? 'Chưa giới hạn' : `${Math.max(0, data.ai.limit - data.ai.used)} lượt còn lại / ${data.ai.limit}`}</p>
      <p className="text-xs">Đặt lại: {new Date(data.resetAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} (giờ Việt Nam).</p>
      <p>Tài liệu: {(data.storage.used / 1048576).toFixed(1)} MB / {data.storage.limit == null ? 'Chưa giới hạn' : `${(data.storage.limit / 1048576).toFixed(0)} MB`}</p>
      {data.storage.reserved > 0 && <p>Đang giữ trước {(data.storage.reserved / 1048576).toFixed(1)} MB cho upload.</p>}
      {data.storage.unknownFiles > 0 && <p role="status">{data.storage.unknownFiles} tài liệu cũ chưa xác định kích thước. Số MB hiện tại chưa bao gồm các tệp này.</p>}
      <p className="text-xs">Dung lượng gồm tài liệu trong thùng rác; xóa vĩnh viễn để giải phóng hạn mức.</p>
    </div>}
  </section>;
}
