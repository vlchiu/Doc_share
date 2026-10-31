import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Search,
  UploadCloud,
  Sparkles,
  ArrowRight,
  Laptop,
  Code,
  BookOpen,
  ChartColumn,
  Palette,
  SlidersHorizontal,
  Grid2X2,
  List,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import axiosClient from "../api/axiosClient";
import useRemoteData from "../hooks/useRemoteData";
import { ErrorState } from "../components/docshare/ResourceState";
import {
  Hero,
  Panel,
  FeatureList,
  MoreLink,
  QuickAI,
  VipPromo,
} from "../components/docshare/Primitives";
import DocumentCard, { DocumentRow } from "../components/docshare/DocumentCard";
const categoryStyles = [
  "bg-violet-50 text-violet-600",
  "bg-emerald-50 text-emerald-600",
  "bg-blue-50 text-blue-600",
  "bg-orange-50 text-orange-600",
  "bg-pink-50 text-pink-600",
];
const categoryIcons = [Laptop, Code, BookOpen, ChartColumn, Palette];
export default function Home({ catalog = false }) {
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const [search, setSearch] = useState(query.get("search") || "");
  const [debounced, setDebounced] = useState(search);
  const [category, setCategory] = useState(query.get("category") || "");
  const [fileType, setFileType] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [list, setList] = useState(false);
  const [documents, setDocuments] = useState([]);
  const categoryResource = useRemoteData("/categories");
  const categories = categoryResource.data || [];
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const currentType = query.get("type") || "";
  const isCatalog = catalog || !!location.search;
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    const controller = new AbortController();
    // A new external request must hide results from the previous filter.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      page,
      limit: isCatalog ? 12 : 4,
      sortBy,
      ...(debounced && { search: debounced }),
      ...(category && { category }),
      ...(fileType && {
        fileType: {
          PDF: "pdf",
          PPT: "powerpoint",
          DOC: "word",
          XLS: "excel",
          TXT: "text/plain",
        }[fileType],
      }),
      ...(dateFrom && { dateFrom }),
      ...(dateTo && { dateTo }),
      ...(currentType && { docType: currentType }),
    });
    axiosClient
      .get(`/documents?${params}`, { signal: controller.signal })
      .then((res) => {
        setDocuments(res.data.documents || []);
        setPagination(res.data.pagination || { total: 0, totalPages: 1 });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError("Chưa thể tải tài liệu. Vui lòng thử lại.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [
    page,
    debounced,
    category,
    fileType,
    sortBy,
    dateFrom,
    dateTo,
    currentType,
    isCatalog,
    retry,
  ]);
  const filters = (
    <>
      <div
        className="my-4 flex flex-wrap gap-2"
        role="group"
        aria-label="Định dạng tài liệu"
      >
        {["", "PDF", "PPT", "DOC", "XLS", "TXT"].map((type) => (
          <button
            key={type}
            aria-pressed={fileType === type}
            onClick={() => {
              setFileType(type);
              setPage(1);
            }}
            className={
              fileType === type
                ? "ds-button-primary text-xs"
                : "ds-button-outline text-xs"
            }
          >
            {type || "Tất cả"}
          </button>
        ))}
        <select
          aria-label="Sắp xếp tài liệu"
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value);
            setPage(1);
          }}
          className="ds-input ml-auto !w-auto text-xs"
        >
          <option value="newest">Mới nhất</option>
          <option value="views">Xem nhiều nhất</option>
          <option value="downloads">Tải nhiều nhất</option>
        </select>
      </div>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <select
          className="ds-input !w-auto max-w-full text-xs"
          aria-label="Danh mục tài liệu"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả danh mục</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        {categories.slice(0, 4).map((cat) => (
          <button
            key={cat.id}
            onClick={() => {
              setCategory(String(cat.id));
              setPage(1);
            }}
            className="rounded-lg bg-slate-50 px-3 py-2 text-xs"
          >
            {cat.name}
          </button>
        ))}
        <button
          onClick={() => setAdvanced(!advanced)}
          aria-expanded={advanced}
          className="ds-button-outline ml-auto text-xs"
        >
          <SlidersHorizontal size={15} />
          Bộ lọc khác
        </button>
      </div>
      {advanced && (
        <Panel className="mb-5">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs">
              Từ ngày
              <input
                className="ds-input mt-1"
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
              />
            </label>
            <label className="text-xs">
              Đến ngày
              <input
                className="ds-input mt-1"
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
              />
            </label>
            <button
              className="ds-button-outline text-xs"
              onClick={() => {
                setDateFrom("");
                setDateTo("");
                setFileType("");
                setCategory("");
                setPage(1);
              }}
            >
              Xóa bộ lọc
            </button>
          </div>
        </Panel>
      )}
    </>
  );
  return (
    <div className={isCatalog ? "" : "ds-columns"}>
      <div className="min-w-0">
        <Hero
          compact={isCatalog}
          title={
            isCatalog ? (
              "Tìm kiếm tài liệu"
            ) : (
              <>
                Khám phá tài liệu thông minh cùng{" "}
                <span className="text-blue-600">DocShare</span>
              </>
            )
          }
          description={
            isCatalog
              ? "Khám phá tài liệu từ cộng đồng DocShare"
              : "Tài liệu chất lượng, hỗ trợ bởi AI, tìm kiếm web và nhiều tính năng hữu ích."
          }
        >
          {!isCatalog && (
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/upload" className="ds-button-primary text-sm">
                <UploadCloud size={18} />
                Tải tài liệu
              </Link>
              <Link
                to="/ai-chat"
                className="ds-button-outline bg-white text-sm"
              >
                <Sparkles size={18} />
                Dùng AI Chat
              </Link>
            </div>
          )}
        </Hero>
        {!isCatalog && (
          <div className="ds-home-features">
            <FeatureList horizontal />
          </div>
        )}
        {isCatalog ? (
          <>
            <form
              className="relative -mt-3 mb-5 flex gap-2 rounded-xl border border-blue-100 bg-white p-2"
              onSubmit={(e) => {
                e.preventDefault();
                setDebounced(search);
                setPage(1);
              }}
            >
              <Search size={20} className="ml-2 self-center text-[#7181a8]" />
              <input
                className="min-w-0 flex-1 outline-none text-sm"
                aria-label="Tìm kiếm tài liệu"
                placeholder="Nhập từ khóa tìm kiếm…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button className="ds-button-primary text-sm">Tìm kiếm</button>
            </form>
            {filters}
          </>
        ) : (
          <section className="my-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">Khám phá theo danh mục</h2>
              <MoreLink />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
              {categories.slice(0, 5).map((cat, index) => {
                const Icon = categoryIcons[index % 5];
                return (
                  <Link
                    to={`/documents?category=${cat.id}`}
                    key={cat.id}
                    className={`relative rounded-xl p-4 ${categoryStyles[index % 5]}`}
                  >
                    <Icon
                      className="mb-3 rounded-lg bg-white/70 p-2"
                      size={42}
                    />
                    <h3 className="text-sm font-semibold text-[#111633]">
                      {cat.name}
                    </h3>
                    <p className="mt-1 text-[11px]">
                      Khám phá <ArrowRight size={12} className="inline" />
                    </p>
                  </Link>
                );
              })}
            </div>
            {categoryResource.loading && <p role="status">Đang tải danh mục…</p>}
            {categoryResource.error && (
              <ErrorState title="Chưa thể tải danh mục" error={categoryResource.error} onRetry={categoryResource.retry} />
            )}
            {!categoryResource.loading && !categoryResource.error && !categories.length && (
              <p className="text-sm text-slate-500">
                Danh mục sẽ xuất hiện khi có dữ liệu.
              </p>
            )}
          </section>
        )}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">
              {isCatalog
                ? debounced
                  ? `Kết quả tìm kiếm cho “${debounced}”`
                  : "Khám phá tài liệu"
                : "Tài liệu mới nhất"}
            </h2>
            {isCatalog && !loading && !error && (
              <p className="mt-1 text-xs text-[#7181a8]">
                Tìm thấy {pagination.total.toLocaleString("vi-VN")} tài liệu phù
                hợp
              </p>
            )}
          </div>
          {isCatalog ? (
            <div className="flex rounded-lg border border-blue-100 p-1">
              <button
                className={`rounded p-2 ${!list ? "bg-blue-50 text-blue-600" : ""}`}
                aria-label="Dạng lưới"
                aria-pressed={!list}
                onClick={() => setList(false)}
              >
                <Grid2X2 size={17} />
              </button>
              <button
                className={`rounded p-2 ${list ? "bg-blue-50 text-blue-600" : ""}`}
                aria-label="Dạng danh sách"
                aria-pressed={list}
                onClick={() => setList(true)}
              >
                <List size={17} />
              </button>
            </div>
          ) : (
            <MoreLink />
          )}
        </div>
        {error ? (
          <Panel>
            <p role="alert">{error}</p>
            <button
              className="ds-button-outline mt-3"
              onClick={() => setRetry(retry + 1)}
            >
              Thử lại
            </button>
          </Panel>
        ) : loading ? (
          <div
            className="grid grid-cols-2 gap-3 xl:grid-cols-4"
            aria-label="Đang tải tài liệu"
          >
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-64 animate-pulse rounded-xl bg-blue-50"
              />
            ))}
          </div>
        ) : documents.length ? (
          <div
            className={
              list
                ? "grid gap-3"
                : "grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-4"
            }
          >
            {documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                list={list}
                compact={!isCatalog}
              />
            ))}
          </div>
        ) : (
          <Panel>
            <p className="py-8 text-center text-sm text-[#7181a8]">
              Không tìm thấy tài liệu phù hợp.
            </p>
          </Panel>
        )}
        {isCatalog && pagination.totalPages > 1 && (
          <nav
            className="mt-5 flex items-center justify-center gap-4"
            aria-label="Phân trang"
          >
            <button
              className="ds-button-outline"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              aria-label="Trang trước"
            >
              <ChevronLeft size={17} />
            </button>
            <span className="text-sm">
              {page} / {pagination.totalPages}
            </span>
            <button
              className="ds-button-outline"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(page + 1)}
              aria-label="Trang sau"
            >
              <ChevronRight size={17} />
            </button>
          </nav>
        )}
      </div>
      {!isCatalog && (
        <aside className="space-y-3">
          <QuickAI />
          <Panel title="Tài liệu gần đây" action={<MoreLink />}>
            {documents.length ? (
              documents.map((doc) => <DocumentRow key={doc.id} doc={doc} />)
            ) : (
              <p className="text-xs text-slate-500">
                Chưa có tài liệu để hiển thị.
              </p>
            )}
          </Panel>
          <Panel title="Khám phá thêm">
            <Link
              to="/web-search"
              className="flex items-center gap-2 text-sm text-blue-600"
            >
              <Search size={18} />
              Tìm thông tin trên web
              <ArrowRight size={16} />
            </Link>
          </Panel>
          <VipPromo />
        </aside>
      )}
    </div>
  );
}
