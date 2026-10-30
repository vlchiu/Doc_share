import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, BookOpen, ArrowRight, LifeBuoy } from "lucide-react";
import { Hero, Panel } from "../components/docshare/Primitives";
import { EmptyState } from "../components/docshare/ResourceState";
import { guides, faqs } from "../content/help";
export default function Help() {
  const [query, setQuery] = useState("");
  const normalized = (value) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .toLowerCase();
  const found = faqs.filter((item) =>
    normalized(item.join(" ")).includes(normalized(query.trim())),
  );
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Hero
        compact
        title="Bắt đầu cùng DocShare"
        description="Hướng dẫn từng bước để tìm tài liệu, chia sẻ tri thức và sử dụng AI."
      />
      <nav aria-label="Chủ đề hướng dẫn" className="flex flex-wrap gap-2">
        {guides.map((guide) => (
          <a
            key={guide.id}
            href={`#guide-${guide.id}`}
            className="ds-button-outline text-xs"
          >
            {guide.title}
          </a>
        ))}
      </nav>
      <div className="grid gap-4 md:grid-cols-2">
        {guides.map((guide) => (
          <Panel
            key={guide.id}
            title={
              <span
                id={`guide-${guide.id}`}
                className="scroll-mt-6 flex items-center gap-2"
              >
                <BookOpen className="shrink-0 text-blue-600" size={20} />
                {guide.title}
              </span>
            }
          >
            <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed text-[#60709b]">
              {guide.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <Link
              to={guide.to}
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-600"
            >
              {guide.action}
              <ArrowRight size={16} />
            </Link>
          </Panel>
        ))}
      </div>
      <Panel title="Câu hỏi thường gặp">
        <label className="mb-2 block text-sm" htmlFor="faq-search">
          Tìm câu trả lời
        </label>
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-blue-100 px-3">
          <Search size={18} className="text-blue-500" />
          <input
            id="faq-search"
            className="min-w-0 flex-1 py-3 text-sm outline-none"
            placeholder="Ví dụ: OTP, tải xuống, AI…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <p role="status" className="mb-3 text-xs text-slate-500">
          {found.length} câu hỏi phù hợp
        </p>
        {found.length ? (
          found.map(([question, answer]) => (
            <details key={question} className="border-t border-blue-100 py-4">
              <summary className="cursor-pointer rounded font-semibold text-sm">
                {question}
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-[#60709b]">
                {answer}
              </p>
            </details>
          ))
        ) : (
          <EmptyState
            title="Chưa có câu trả lời phù hợp"
            description="Thử từ khóa khác hoặc mở trang hỗ trợ."
            to="/support"
            action="Mở hỗ trợ"
          />
        )}
      </Panel>
      <Link to="/support" className="ds-button-outline">
        <LifeBuoy size={18} />
        Tôi cần hỗ trợ thêm
      </Link>
    </div>
  );
}
