import { useEffect, useRef, useState } from "react";
import {
  Globe,
  Search,
  Sparkles,
  ExternalLink,
  Home,
  FileText,
  MessageCircle,
  Crown,
  User,
  Shield,
  LoaderCircle,
} from "lucide-react";
import axiosClient from "../api/axiosClient";
import "./WebSearch.css";
import { DocumentArt } from "../components/docshare/Primitives";

function safeUrl(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
function Summary({ text, sources }) {
  return text.split(/(\[\d+\])/g).map((part, index) => {
    const id = /^\[(\d+)\]$/.exec(part)?.[1];
    const source = id && sources.find((item) => item.id === Number(id));
    return source ? (
      <a
        key={index}
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Nguồn ${id}: ${source.title}`}
      >
        {part}
      </a>
    ) : (
      <span key={index}>{part}</span>
    );
  });
}
export default function WebSearch() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const active = useRef(null);
  useEffect(
    () => () => {
      active.current?.abort();
      active.current = null;
    },
    [],
  );

  function cancel() {
    active.current?.abort();
    active.current = null;
    setLoading(false);
    setNotice("Đã hủy tìm kiếm.");
  }
  async function search(event) {
    event.preventDefault();
    if (!query.trim() || query.length > 500 || loading) return;
    const controller = new AbortController();
    active.current = controller;
    setLoading(true);
    setError("");
    setNotice("");
    setResult(null);
    try {
      const { data } = await axiosClient.post(
        "/web-search",
        { query: query.trim(), category, limit: 10 },
        { signal: controller.signal },
      );
      if (active.current !== controller) return;
      setResult({
        ...data,
        sources: data.sources.filter((source) => safeUrl(source.url)),
      });
    } catch (err) {
      if (active.current === controller && !controller.signal.aborted)
        setError(
          err.response?.data?.message || "Không thể kết nối. Vui lòng thử lại.",
        );
    } finally {
      if (active.current === controller) {
        active.current = null;
        setLoading(false);
      }
    }
  }
  return (
    <div className="web-search-layout">
      <section className="ws-main" aria-labelledby="ws-title">
        <header className="ws-heading">
          <DocumentArt kind="search" />
          <span className="ws-eyebrow">
            <Sparkles size={16} /> DOCSHARE WEB SEARCH
          </span>
          <h1 id="ws-title">Tìm kiếm thông tin trên web với AI</h1>
          <p>
            Từ câu hỏi đến kiến thức — tổng hợp tiếng Việt với nguồn tham khảo
            rõ ràng.
          </p>
        </header>
        <form onSubmit={search} className="ws-search-card">
          <label htmlFor="ws-query">Bạn muốn tìm hiểu điều gì?</label>
          <div className="ws-input-row">
            <Search size={20} aria-hidden="true" />
            <input
              id="ws-query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              maxLength={500}
              required
              disabled={loading}
              placeholder="Ví dụ: Ứng dụng AI trong giáo dục đại học"
              autoComplete="off"
            />
            <button
              className="ws-primary"
              disabled={loading || !query.trim()}
              type="submit"
            >
              {loading ? (
                <>
                  <LoaderCircle className="ws-spin" size={18} />
                  Đang tìm…
                </>
              ) : (
                "Tìm kiếm"
              )}
            </button>
          </div>
          <div className="ws-filters" role="group" aria-label="Loại kết quả">
            {[
              ["all", "Tất cả"],
              ["news", "Tin tức"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={category === value}
                onClick={() => setCategory(value)}
                disabled={loading}
              >
                {label}
              </button>
            ))}
            {loading && (
              <button type="button" onClick={cancel}>
                Hủy tìm kiếm
              </button>
            )}
          </div>
        </form>
        <div role="status" aria-live="polite" className="ws-status">
          {loading ? "Đang tìm nguồn và tổng hợp câu trả lời…" : notice}
        </div>
        {error && (
          <div role="alert" className="ws-error">
            {error}
          </div>
        )}
        {!loading && !error && !result && (
          <div className="ws-welcome">
            <Globe size={42} />
            <h2>Kiến thức bắt đầu từ một câu hỏi</h2>
            <p>
              Nhập từ khóa để tìm bài viết, tin tức và các nguồn thông tin trên
              web.
            </p>
          </div>
        )}
        {result && (
          <div className="ws-result-layout" aria-live="polite">
            <section className="ws-summary" aria-labelledby="ws-summary-title">
              <h2 id="ws-summary-title">
                <Sparkles size={21} /> Tổng hợp AI
              </h2>
              <p className="ws-result-query">{result.query}</p>
              {result.summary ? (
                <>
                  <div className="ws-summary-text">
                    <Summary text={result.summary} sources={result.sources} />
                  </div>
                  <p className="ws-disclaimer">
                    AI tổng hợp từ trích đoạn tìm kiếm. Hãy đối chiếu nguồn gốc
                    để kiểm chứng thông tin.
                  </p>
                </>
              ) : (
                <p>
                  {result.summaryStatus === "insufficient_sources"
                    ? "Chưa có đủ nội dung nguồn để tổng hợp."
                    : "Hiện chưa thể tạo bản tổng hợp AI. Bạn vẫn có thể đọc các nguồn bên dưới."}
                </p>
              )}
            </section>
            <div className="ws-results-column">
              <div className="ws-results-heading">
                <h2>Nguồn tham khảo</h2>
                <span>{result.sources.length} kết quả</span>
              </div>
              {result.sources.length === 0 ? (
                <div className="ws-welcome">
                  <h3>Không tìm thấy kết quả</h3>
                  <p>Thử từ khóa cụ thể hơn hoặc chọn bộ lọc Tất cả.</p>
                </div>
              ) : (
                <ol className="ws-results">
                  {result.sources.map((source) => (
                    <li key={source.id} className="ws-source">
                      <div className="ws-source-meta">
                        <span className="ws-source-number">{source.id}</span>
                        <span>{source.source}</span>
                        {source.publishedAt && (
                          <time dateTime={source.publishedAt}>
                            {new Date(source.publishedAt).toLocaleDateString(
                              "vi-VN",
                            )}
                          </time>
                        )}
                      </div>
                      <h3>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {source.title || source.source}
                        </a>
                      </h3>
                      <p className="ws-url">{source.url}</p>
                      <p className="ws-snippet">
                        {source.snippet || "Nguồn chưa cung cấp mô tả."}
                      </p>
                      <a
                        className="ws-open"
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Mở nguồn gốc <ExternalLink size={14} />
                      </a>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
