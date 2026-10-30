import { Link } from "react-router-dom";
import { ArrowUp, BookOpen } from "lucide-react";

const links = [
  ["/documents", "Khám phá tài liệu"],
  ["/upload", "Chia sẻ tài liệu"],
  ["/ai-chat", "Trợ lý AI"],
  ["/web-search", "Tìm kiếm web"],
  ["/help", "Hướng dẫn"],
  ["/support", "Hỗ trợ"],
  ["/terms", "Điều khoản"],
  ["/privacy", "Quyền riêng tư"],
  ["/copyright", "Bản quyền"],
];

export default function Footer() {
  return (
    <footer className="border-t border-blue-100/80 bg-[#f8fbff] px-5 py-6 sm:px-7">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="max-w-sm">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#07166c]"
          >
            <BookOpen size={18} className="text-blue-600" /> DocShare
          </Link>
          <p className="mt-2 text-xs leading-relaxed text-[#7181a8]">
            Chia sẻ tri thức, kết nối cộng đồng. Khám phá tài liệu và học tập
            cùng AI.
          </p>
        </div>
        <nav
          aria-label="Liên kết chân trang"
          className="flex max-w-2xl flex-wrap gap-x-6 gap-y-3 text-xs text-[#53688f]"
        >
          {links.map(([to, label]) => (
            <Link key={to} to={to} className="transition hover:text-blue-600">
              {label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-blue-100/70 pt-4 text-xs text-[#7181a8]">
        <p>
          © {new Date().getFullYear()} DocShare · Chia sẻ tri thức, kiến tạo
          tương lai.
        </p>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-blue-600 hover:bg-blue-50"
          onClick={() => {
            window.scrollTo({ top: 0, behavior: "instant" });
            document
              .getElementById("main-content")
              ?.focus({ preventScroll: true });
          }}
        >
          Về đầu trang <ArrowUp size={14} />
        </button>
      </div>
    </footer>
  );
}
