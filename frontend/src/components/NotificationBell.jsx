import { ErrorState, LoadingState } from "./docshare/ResourceState";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { Bell, CheckCheck, Clock, ExternalLink } from "lucide-react";
import axiosClient from "../api/axiosClient";

function NotificationBell() {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    if (!localStorage.getItem("token")) return;
    setError(null);
    try {
      const res = await axiosClient.get("/notifications");
      setNotifications(res.data.notifications || []);
      setUnread(res.data.unreadCount || 0);
    } catch (err) {
      setError({ status: err.response?.status || 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleOpen = async () => {
    setOpen((o) => !o);
    if (!open && unread > 0) {
      try {
        await axiosClient.put("/notifications/read-all");
        setUnread(0);
        setNotifications((n) => n.map((x) => ({ ...x, is_read: true })));
      } catch { /* Keep unread indicators when the server cannot mark them read. */ }
    }
  };

  const handleClickNotification = (n) => {
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <div
      ref={ref}
      className="relative"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setOpen(false);
          ref.current?.querySelector("button")?.focus();
        }
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <Motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleOpen}
        className="relative flex items-center justify-center w-10 h-10 rounded-full border border-slate-200/80 bg-white/80 hover:bg-white text-slate-700 hover:text-indigo-600 shadow-sm backdrop-blur-md transition-colors cursor-pointer"
        aria-label="Thông báo"
        aria-expanded={open}
        aria-controls="notification-list"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white animate-pulse">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Motion.button>

      <AnimatePresence>
        {open && (
          <Motion.div
            id="notification-list"
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute right-0 top-12 w-[min(80vw,320px)] sm:w-96 rounded-2xl border border-slate-200/80 bg-white/95 shadow-2xl backdrop-blur-xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg bg-indigo-50 text-indigo-600">
                  <Bell className="w-4 h-4" />
                </div>
                <span className="font-bold text-sm text-slate-800">
                  Thông báo
                </span>
              </div>
              {unread === 0 && notifications.length > 0 && (
                <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                  <CheckCheck className="w-3.5 h-3.5" /> Đã đọc hết
                </span>
              )}
            </div>

            {/* Notification List */}
            <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100/80">
              {error ? (
                <ErrorState error={error} onRetry={fetchNotifications} />
              ) : loading ? (
                <LoadingState />
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                    <Bell className="w-5 h-5 opacity-50" />
                  </div>
                  <p className="text-sm font-semibold text-slate-600">
                    Chưa có thông báo mới
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Các thông báo mới sẽ xuất hiện tại đây.
                  </p>
                </div>
              ) : (
                notifications.map((n) => (
                  <button
                    type="button"
                    key={n.id}
                    onClick={() => handleClickNotification(n)}
                    className={`w-full group p-3.5 transition-colors text-left flex gap-3 items-start ${
                      n.link
                        ? "cursor-pointer hover:bg-indigo-50/50"
                        : "cursor-default"
                    } ${n.is_read ? "bg-transparent" : "bg-indigo-50/30"}`}
                  >
                    <div className="mt-1 shrink-0">
                      {!n.is_read ? (
                        <span className="block w-2 h-2 rounded-full bg-indigo-600 ring-4 ring-indigo-100" />
                      ) : (
                        <span className="block w-2 h-2 rounded-full bg-slate-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs leading-relaxed ${n.is_read ? "text-slate-600" : "text-slate-900 font-medium"}`}
                      >
                        {n.content}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-slate-400">
                        <Clock className="w-3 h-3" />
                        <span>
                          {new Date(n.created_at).toLocaleString("vi-VN")}
                        </span>
                        {n.link && (
                          <span className="ml-auto inline-flex items-center gap-0.5 text-indigo-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                            Xem <ExternalLink className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default NotificationBell;
