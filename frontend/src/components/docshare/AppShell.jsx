import Modal from "./Modal";
import { useEffect, useState, useRef } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  FileText,
  MessageCircle,
  Globe,
  Crown,
  User,
  Settings,
  Menu,
  X,
  Search,
  ChevronDown,
  LogOut,
  Bookmark,
  UploadCloud,
  Download,
  Trash2,
} from "lucide-react";
import Brand from "./Brand";
import Footer from "./Footer";
import NotificationBell from "../NotificationBell";
const items = [
  ["/", "Trang chủ", Home],
  ["/documents", "Tài liệu", FileText],
  ["/ai-chat", "AI Chat", MessageCircle],
  ["/web-search", "Web Search", Globe],
  ["/vip", "VIP", Crown],
  ["/profile", "Hồ sơ", User],
];
export default function AppShell({ user, children }) {
  const menuTrigger = useRef(null);
  const menuPanel = useRef(null);
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const escape = (event) => {
      if (event.key === "Escape") {
        setDrawer(false);
        setMenu(false);
        if (menuPanel.current) menuTrigger.current?.focus();
      }
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, []);
  useEffect(() => {
    if (!menu) return;
    menuPanel.current?.querySelector("a")?.focus();
    const dismiss = (event) => {
      if (
        !menuPanel.current?.contains(event.target) &&
        event.target !== menuTrigger.current
      )
        setMenu(false);
    };
    document.addEventListener("focusin", dismiss);
    return () => document.removeEventListener("focusin", dismiss);
  }, [menu]);
  const authenticated = !!localStorage.getItem("token");
  function close() {
    setDrawer(false);
    setMenu(false);
  }
  const isAdmin = location.pathname === "/admin" && user?.role === "ADMIN";
  const nav = isAdmin
    ? [
        ["/admin", "Tổng quan", Home],
        ["/admin?tab=users", "Người dùng", User],
        ["/admin?tab=pending", "Duyệt tài liệu", FileText],
        ["/admin?tab=categories", "Danh mục", Bookmark],
        ["/admin?tab=reports", "Báo cáo", Globe],
        ["/admin?tab=ai", "AI kiểm duyệt", MessageCircle],
        ["/admin?tab=trash", "Thùng rác", Trash2],
        ["/", "Trang người dùng", LogOut],
      ]
    : [
        ...items,
        ...(user?.role === "ADMIN" ? [["/admin", "Quản trị", Settings]] : []),
      ];
  const sidebarContent = (
    <div className="flex h-full flex-col">
      <nav aria-label="Điều hướng chính" className="space-y-2">
        {nav.map(([to, label, Icon], index) => {
          const NavIcon = Icon;
          return (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={close}
              className={({ isActive }) =>
                `ds-nav-item ${(isAdmin ? location.pathname + location.search === to : isActive || (to === "/documents" && location.pathname.startsWith("/documents/"))) ? "ds-nav-active" : ""} ${index === 5 ? "mt-6 border-t border-blue-50 pt-6" : ""}`
              }
            >
              <NavIcon
                size={21}
                className={to === "/vip" ? "text-amber-500" : ""}
              />
              {label}
            </NavLink>
          );
        })}
      </nav>
      <div className="mt-auto pt-10">
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3">
          <p className="text-xs font-semibold">Không gian tri thức của bạn</p>
          <p className="my-3 text-xs leading-relaxed text-[#7181a8]">
            Lưu và chia sẻ những tài liệu hữu ích cùng DocShare.
          </p>
          <Link
            to="/upload"
            onClick={close}
            className="ds-button-outline w-full text-xs"
          >
            <UploadCloud size={16} />
            Tải tài liệu lên
          </Link>
          <Link
            to="/vip"
            onClick={close}
            className="mt-3 flex justify-center gap-2 text-xs text-blue-600"
          >
            <Crown size={15} className="text-amber-500" />
            Nâng cấp VIP
          </Link>
        </div>
      </div>
    </div>
  );
  return (
    <div className="ds-shell">
      <a href="#main-content" className="ds-skip-link">
        Bỏ qua điều hướng
      </a>
      <header className="ds-header">
        <div className="flex items-center gap-3">
          <button
            className="ds-icon-button lg:hidden"
            aria-label="Mở điều hướng"
            aria-expanded={drawer}
            onClick={() => setDrawer(!drawer)}
          >
            {drawer ? <X size={21} /> : <Menu size={21} />}
          </button>
          <Brand />
        </div>
        <form
          className="ds-header-search"
          onSubmit={(event) => {
            event.preventDefault();
            navigate(`/documents?search=${encodeURIComponent(search.trim())}`);
            close();
          }}
        >
          <Search size={20} />
          <input
            aria-label="Tìm tài liệu toàn trang"
            placeholder="Tìm kiếm tài liệu, chủ đề, tác giả…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </form>
        <div className="relative flex items-center gap-3">
          {authenticated && <NotificationBell />}
          {authenticated ? (
            <>
              <button
                className="flex items-center gap-2 text-sm"
                aria-expanded={menu}
                aria-label="Menu tài khoản"
                ref={menuTrigger}
                aria-controls="account-links"
                onClick={() => setMenu(!menu)}
              >
                <span className="ds-avatar">
                  {user?.avatar_url ? (
                    <img
                      alt=""
                      src={
                        user.avatar_url.startsWith("http")
                          ? user.avatar_url
                          : `${import.meta.env.VITE_API_URL}${user.avatar_url}`
                      }
                    />
                  ) : (
                    user?.name?.[0] || "D"
                  )}
                </span>
                <span className="hidden font-semibold xl:inline">
                  {user?.name || "Tài khoản"}
                </span>
                <ChevronDown size={16} />
              </button>
              {menu && (
                <>
                  <button
                    className="fixed inset-0 z-40 cursor-default"
                    aria-label="Đóng menu tài khoản"
                    tabIndex={-1}
                    onClick={close}
                  />
                  <div
                    ref={menuPanel}
                    id="account-links"
                    className="absolute right-0 top-12 z-50 w-56 rounded-xl border border-blue-100 bg-white p-2 shadow-xl"
                  >
                    {[
                      ["/profile", "Hồ sơ", User],
                      ["/my-documents", "Tài liệu của tôi", FileText],
                      ["/saved-documents", "Tài liệu đã lưu", Bookmark],
                      ["/download-history", "Lịch sử tải xuống", Download],
                      ["/trash", "Thùng rác", Trash2],
                    ].map(([to, label, Icon]) => {
                      const ItemIcon = Icon;
                      return (
                        <Link
                          key={to}
                          to={to}
                          onClick={close}
                          className="flex items-center gap-2 rounded-lg p-2.5 text-sm hover:bg-blue-50"
                        >
                          <ItemIcon size={16} />
                          {label}
                        </Link>
                      );
                    })}
                    <button
                      className="flex w-full items-center gap-2 p-2.5 text-sm text-rose-600"
                      onClick={() => {
                        localStorage.removeItem("token");
                        localStorage.removeItem("userId");
                        window.location.href = "/login";
                      }}
                    >
                      <LogOut size={16} />
                      Đăng xuất
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            <Link className="ds-button-primary text-xs" to="/login">
              Đăng nhập
            </Link>
          )}
        </div>
      </header>
      <div className="ds-shell-body">
        <aside className="ds-sidebar">{sidebarContent}</aside>
        {drawer && (
          <Modal title="Điều hướng DocShare" onClose={close}>
            {sidebarContent}
          </Modal>
        )}
        <main
          id="main-content"
          tabIndex={-1}
          className="ds-main"
          onClick={() => {
            if (menu) setMenu(false);
          }}
        >
          {children}
        </main>
      </div>
      <Footer />
    </div>
  );
}
