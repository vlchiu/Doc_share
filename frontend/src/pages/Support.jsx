import { useState } from "react";
import { Link } from "react-router-dom";
import { Copy, LifeBuoy } from "lucide-react";
import { Hero, Panel } from "../components/docshare/Primitives";
export default function Support() {
  const [topic, setTopic] = useState("Lỗi sử dụng");
  const [detail, setDetail] = useState("");
  const [page, setPage] = useState("");
  const [notice, setNotice] = useState("");
  const report = `DocShare — yêu cầu hỗ trợ bản thử nghiệm\nChủ đề: ${topic}\nTrang gặp vấn đề: ${page || "(bổ sung đường dẫn)"}\nMô tả và các bước thực hiện:\n${detail || "(bổ sung mô tả)"}\nKết quả mong đợi: ...\nThông báo lỗi/thời điểm: ...`;
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Hero
        compact
        title="Hỗ trợ DocShare"
        description="Tìm cách xử lý sự cố hoặc chuẩn bị thông tin để gửi cho người vận hành bản thử nghiệm."
      />
      <Panel
        title={
          <span className="flex items-center gap-2">
            <LifeBuoy className="text-blue-600" />
            Kênh hỗ trợ bản thử nghiệm
          </span>
        }
      >
        <p className="text-sm leading-relaxed text-[#60709b]">
          DocShare hiện chưa công bố email hỗ trợ. Hãy dùng kênh liên hệ mà bạn
          đã nhận lời mời thử nghiệm. Nội dung bên dưới giúp bạn chuẩn bị yêu
          cầu; trang này không tự gửi tin nhắn hay tạo phiếu hỗ trợ.
        </p>
        <Link
          to="/help"
          className="mt-4 inline-block text-sm font-semibold text-blue-600"
        >
          Xem hướng dẫn và câu hỏi thường gặp →
        </Link>
      </Panel>
      <Panel title="Chuẩn bị yêu cầu hỗ trợ">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">
            Chủ đề
            <select
              value={topic}
              onChange={(e) => {
                setTopic(e.target.value);
                setNotice("");
              }}
              className="ds-input mt-2"
            >
              {[
                "Lỗi sử dụng",
                "Tài khoản và dữ liệu",
                "Tài liệu và bản quyền",
                "Giao dịch VIP",
                "Góp ý giao diện",
              ].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Trang gặp vấn đề
            <input
              className="ds-input mt-2"
              value={page}
              onChange={(e) => {
                setPage(e.target.value);
                setNotice("");
              }}
              maxLength={500}
              placeholder="Ví dụ: /web-search"
            />
          </label>
        </div>
        <label className="mt-5 block text-sm font-medium">
          Mô tả sự cố
          <textarea
            className="ds-input mt-2 min-h-32"
            maxLength={3000}
            value={detail}
            onChange={(e) => {
              setDetail(e.target.value);
              setNotice("");
            }}
            placeholder="Bạn đang làm gì, gặp lỗi ở bước nào?"
          />
        </label>
        <p className="mt-2 text-xs text-[#7181a8]">
          Không nhập mật khẩu, OTP, API key hoặc thông tin ngân hàng nhạy cảm.
          Nội dung biểu mẫu chỉ nằm trong trang hiện tại và không được gửi lên
          máy chủ.
        </p>
        <details className="mt-5">
          <summary className="cursor-pointer text-sm font-medium">
            Xem nội dung sẽ sao chép
          </summary>
          <pre className="mt-3 whitespace-pre-wrap break-words rounded-xl bg-blue-50 p-4 text-xs leading-relaxed">
            {report}
          </pre>
        </details>
        <button
          type="button"
          className="ds-button-primary mt-5 text-sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(report);
              setNotice(
                "Đã sao chép. Dán nội dung vào kênh hỗ trợ của bạn để gửi.",
              );
            } catch {
              setNotice(
                "Trình duyệt chưa cho phép sao chép. Mở phần xem nội dung và sao chép thủ công.",
              );
            }
          }}
        >
          <Copy size={16} />
          Sao chép yêu cầu
        </button>
        <p role="status" className="mt-3 text-sm text-blue-600">
          {notice}
        </p>
      </Panel>
    </div>
  );
}
