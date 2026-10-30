import { Link } from "react-router-dom";
import {
  ArrowRight,
  FileText,
  Search,
  Sparkles,
  ShieldCheck,
  Crown,
  Bot,
} from "lucide-react";
export function Panel({ title, action, children, className = "" }) {
  return (
    <section
      className={`rounded-xl border border-blue-100/80 bg-white p-4 ${className}`}
    >
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-[#101535]">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function MoreLink({ to = "/documents", children = "Xem tất cả" }) {
  return (
    <Link
      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600"
      to={to}
    >
      {children}
      <ArrowRight size={13} />
    </Link>
  );
}
export function DocumentArt({ kind = "document", className = "" }) {
  return (
    <div aria-hidden="true" className={`ds-art ${className}`}>
      <div className="ds-art-orbit" />
      <div className="ds-art-paper">
        <div />
        <div />
        <div />
        <div />
        <div />
      </div>
      <div className="ds-art-small">
        <b>PDF</b>
        <i />
        <i />
        <i />
      </div>
      <div className={`ds-art-badge ${kind === "vip" ? "ds-art-gold" : ""}`}>
        {kind === "vip" ? (
          <Crown size={60} />
        ) : kind === "search" ? (
          <Search size={55} />
        ) : (
          <>
            <Sparkles size={17} />
            <strong>AI</strong>
          </>
        )}
      </div>
      <div className="ds-art-search">
        <Search size={20} />
        <span>Tìm tài liệu, khám phá tri thức…</span>
        <ArrowRight size={24} />
      </div>
      <Sparkles className="ds-art-star" size={32} />
    </div>
  );
}
export function Hero({
  title,
  description,
  children,
  kind = "document",
  compact = false,
}) {
  return (
    <section className={`ds-hero ${compact ? "ds-hero-compact" : ""}`}>
      <div className="relative z-10 max-w-[70%] max-sm:max-w-full">
        <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-[#080c2e] lg:text-[34px]">
          {title}
        </h1>
        {description && (
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#60709b]">
            {description}
          </p>
        )}
        {children}
      </div>
      <DocumentArt kind={kind} />
    </section>
  );
}
export function FeatureList({ horizontal = false }) {
  return (
    <div
      className={`relative z-10 ${horizontal ? "mt-8 grid gap-4 sm:grid-cols-3" : "mt-9 space-y-6"}`}
    >
      {[
        [ShieldCheck, "Lưu trữ an toàn", "Bảo mật, truy cập mọi nơi"],
        [Sparkles, "AI hỗ trợ học tập", "Tóm tắt, phân tích tài liệu"],
        [Search, "Tìm kiếm nhanh chóng", "Khám phá nguồn tri thức mới"],
      ].map(([Icon, title, desc]) => {
        const FeatureIcon = Icon;
        return (
          <div key={title} className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/90 text-blue-600 shadow-sm">
              <FeatureIcon size={25} />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-[#101535]">{title}</h3>
              <p className="mt-1 text-xs text-[#7181a8]">{desc}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
export function VipPromo() {
  return (
    <Panel className="!bg-gradient-to-br from-amber-50 to-orange-50 !border-amber-100">
      <div className="flex gap-3">
        <Crown className="shrink-0 text-amber-500" size={32} />
        <div>
          <h2 className="font-bold text-sm">Nâng cấp DocShare VIP</h2>
          <p className="mt-1 text-xs leading-relaxed text-[#7181a8]">
            Khám phá gói thành viên và tải tài liệu không giới hạn.
          </p>
        </div>
      </div>
      <Link
        to="/vip"
        className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-amber-400 px-4 py-2 text-sm font-bold text-amber-950"
      >
        Khám phá gói VIP <ArrowRight size={16} />
      </Link>
    </Panel>
  );
}
export function QuickAI() {
  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          <Bot className="text-blue-600" />
          Trợ lý AI nhanh
        </span>
      }
    >
      <p className="-mt-2 mb-3 text-xs text-[#7181a8]">
        Hỏi, tóm tắt, phân tích tài liệu của bạn
      </p>
      <div className="space-y-2">
        {[
          "Tóm tắt tài liệu",
          "Giải thích khái niệm",
          "Tìm tài liệu liên quan",
        ].map((text, index) => (
          <Link
            to={index === 2 ? "/documents" : "/ai-chat"}
            key={text}
            className="flex items-center gap-2 rounded-full bg-[#f3f6fc] px-3 py-2.5 text-xs"
          >
            <FileText size={15} />
            {text}
            <ArrowRight size={14} className="ml-auto" />
          </Link>
        ))}
      </div>
    </Panel>
  );
}
