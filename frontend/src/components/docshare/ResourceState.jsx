import { Link } from "react-router-dom";
import { AlertCircle, FolderOpen, LoaderCircle, RotateCcw } from "lucide-react";

export function LoadingState({ label = "Đang tải dữ liệu…" }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border border-blue-100 bg-blue-50/30 p-6 text-center"
    >
      <LoaderCircle
        className="animate-spin text-blue-600 motion-reduce:animate-none"
        size={28}
      />
      <p className="text-sm text-[#60709b]">{label}</p>
    </div>
  );
}
export function ErrorState({ error, onRetry, title, description }) {
  const status = error?.status;
  const unavailable = status === 403 || status === 404;
  const heading =
    title ||
    (status === 403
      ? "Bạn chưa có quyền truy cập"
      : status === 404
        ? "Không tìm thấy nội dung"
        : "Chưa thể tải dữ liệu");
  const detail =
    description ||
    (status === 403
      ? "Nội dung này không được cấp quyền cho tài khoản của bạn."
      : status === 404
        ? "Nội dung có thể đã bị xóa hoặc đường dẫn không còn hợp lệ."
        : status === 429
          ? "Bạn thao tác quá nhanh. Hãy chờ một lúc rồi thử lại."
          : "Kiểm tra kết nối mạng và thử tải lại. Dữ liệu của bạn không bị thay đổi.");
  return (
    <section
      role="alert"
      className="rounded-xl border border-rose-100 bg-rose-50/40 p-6 text-center"
    >
      <AlertCircle size={28} className="mx-auto mb-3 text-rose-500" />
      <h2 className="text-base font-bold">{heading}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-[#60709b]">
        {detail}
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="ds-button-outline text-sm"
          >
            <RotateCcw size={16} />
            Thử lại
          </button>
        )}
        {unavailable && (
          <Link className="ds-button-outline text-sm" to="/documents">
            Khám phá tài liệu
          </Link>
        )}
      </div>
    </section>
  );
}
export function EmptyState({
  title = "Chưa có dữ liệu",
  description,
  to,
  action,
}) {
  return (
    <section className="rounded-xl border border-dashed border-blue-200 bg-blue-50/20 px-5 py-10 text-center">
      <FolderOpen size={32} className="mx-auto mb-3 text-blue-400" />
      <h2 className="text-base font-bold">{title}</h2>
      {description && (
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#7181a8]">
          {description}
        </p>
      )}
      {to && action && (
        <Link to={to} className="ds-button-primary mt-5 text-sm">
          {action}
        </Link>
      )}
    </section>
  );
}
