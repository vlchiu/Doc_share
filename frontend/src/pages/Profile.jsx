import useRemoteData from "../hooks/useRemoteData";
import { LoadingState, ErrorState } from "../components/docshare/ResourceState";
import { Link } from "react-router-dom";
import { Panel, VipPromo } from "../components/docshare/Primitives";
import FormField from "../components/docshare/FormField";
import { useState, useEffect } from "react";
import {
  User,
  Camera,
  Calendar,
  KeyRound,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Shield,
  Save,
  Lock,
} from "lucide-react";
import toast from "react-hot-toast";
import axiosClient from "../api/axiosClient";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const API_URL = import.meta.env.VITE_API_URL;

function Profile() {
  const {
    data: user,
    loading: userLoading,
    error: userError,
    retry: retryUser,
  } = useRemoteData("/auth/me");
  const {
    data: ownDocs = [],
    loading: statsLoading,
    error: statsError,
    retry: retryStats,
  } = useRemoteData("/documents/mine");
  const [newName, setNewName] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const approved = ownDocs.filter((doc) => doc.status === "APPROVED");
  const docStats = {
    total: ownDocs.length,
    approved: approved.length,
    pending: ownDocs.filter((doc) => doc.status === "PENDING").length,
  };
  const topDocs = [...approved]
    .sort((a, b) => b.download_count - a.download_count)
    .slice(0, 5)
    .map((doc) => ({
      name: doc.title.length > 18 ? doc.title.slice(0, 18) + "…" : doc.title,
      tải: doc.download_count,
      xem: doc.view_count,
    }));

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwMsg, setPwMsg] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const onFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    const formData = new FormData();
    formData.append("name", newName ?? user.name);
    if (selectedFile) formData.append("avatar", selectedFile);
    try {
      await axiosClient.put("/auth/update-profile", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Cập nhật thông tin thành công!");
      window.location.reload();
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi cập nhật!");
    } finally {
      setUpdating(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwMsg(null);
    if (newPassword !== confirmPassword) {
      setPwMsg({ type: "error", text: "Mật khẩu xác nhận không khớp!" });
      return;
    }
    setChangingPw(true);
    try {
      await axiosClient.put("/auth/change-password", {
        currentPassword,
        newPassword,
      });
      setPwMsg({ type: "success", text: "Đổi mật khẩu thành công!" });
      toast.success("Đổi mật khẩu thành công!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setPwMsg({
        type: "error",
        text: error.response?.data?.message || "Lỗi khi đổi mật khẩu!",
      });
      toast.error(error.response?.data?.message || "Lỗi khi đổi mật khẩu!");
    } finally {
      setChangingPw(false);
    }
  };

  if (userError)
    return (
      <ErrorState
        error={userError}
        onRetry={retryUser}
        title="Không tải được hồ sơ"
      />
    );
  if (userLoading || !user) return <LoadingState label="Đang tải hồ sơ…" />;

  return (
    <div className="ds-columns ds-legacy-page">
      <div className="min-w-0 space-y-5">
        <section className="ds-profile-hero">
          <div className="flex flex-wrap items-center gap-5">
            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-blue-100 text-3xl font-bold text-blue-600">
                {preview || user.avatar_url ? (
                  <img
                    src={
                      preview ||
                      (user.avatar_url.startsWith("http")
                        ? user.avatar_url
                        : `${API_URL}${user.avatar_url}`)
                    }
                    alt="Ảnh đại diện"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  user.name?.[0]
                )}
              </div>
              <label
                htmlFor="avatar-input"
                className="absolute bottom-0 right-0 cursor-pointer rounded-full border-4 border-white bg-blue-600 p-2 text-white"
              >
                <Camera size={17} />
                <span className="sr-only">Thay đổi ảnh đại diện</span>
              </label>
              <input
                id="avatar-input"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={onFileChange}
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold">
                {user.name}{" "}
                {user.plan === "VIP" && (
                  <span className="rounded-lg bg-amber-100 px-3 py-1 align-middle text-xs text-amber-600">
                    VIP
                  </span>
                )}
              </h1>
              <p className="mt-2 break-all text-sm text-[#60709b]">
                {user.email}
              </p>
              <p className="mt-3 flex items-center gap-2 text-xs text-[#7181a8]">
                <Calendar size={16} />
                Thành viên từ{" "}
                {new Date(user.created_at).toLocaleDateString("vi-VN")}
              </p>
            </div>
          </div>
          <p className="mt-5 text-sm text-[#60709b]">
            Quản lý hồ sơ và chia sẻ tri thức cùng cộng đồng DocShare.
          </p>
        </section>
        <nav
          className="flex flex-wrap gap-3 border-b border-blue-100 pb-3 text-sm"
          aria-label="Các mục hồ sơ"
        >
          <a
            href="#personal-info"
            className="rounded-lg bg-blue-50 px-4 py-2 font-semibold text-blue-600"
          >
            Thông tin cá nhân
          </a>
          <Link to="/saved-documents" className="px-3 py-2">
            Tài liệu đã lưu
          </Link>
          <Link to="/download-history" className="px-3 py-2">
            Lịch sử tải xuống
          </Link>
          <a href="#password-settings" className="px-3 py-2">
            Bảo mật
          </a>
        </nav>
        <Panel title="Thông tin cá nhân">
          <form
            id="personal-info"
            onSubmit={handleUpdate}
            className="space-y-5"
          >
            <p className="text-sm text-[#7181a8]">
              Cập nhật thông tin để hoàn thiện hồ sơ của bạn.
            </p>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                label="Họ và tên"
                id="profile-name"
                required
                value={newName ?? user.name}
                onChange={(e) => setNewName(e.target.value)}
              />
              <FormField
                label="Email"
                id="profile-email"
                value={user.email}
                disabled
              />
            </div>
            {selectedFile && (
              <p className="text-xs text-blue-600">
                Ảnh mới sẽ được lưu cùng thay đổi hồ sơ.
              </p>
            )}
            <button disabled={updating} className="ds-button-primary text-sm">
              <Save size={17} />
              {updating ? "Đang lưu…" : "Lưu thay đổi"}
            </button>
          </form>
        </Panel>
        <Panel title="Bảo mật tài khoản">
          <form
            id="password-settings"
            onSubmit={handleChangePassword}
            className="space-y-4"
          >
            <FormField
              label="Mật khẩu hiện tại"
              id="current-password"
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Mật khẩu mới"
                id="new-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <FormField
                label="Xác nhận mật khẩu mới"
                id="confirm-password"
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            {pwMsg && (
              <p
                role="status"
                className={
                  pwMsg.type === "error"
                    ? "text-sm text-rose-600"
                    : "text-sm text-emerald-600"
                }
              >
                {pwMsg.text}
              </p>
            )}
            <button className="ds-button-primary text-sm" disabled={changingPw}>
              <Lock size={17} />
              {changingPw ? "Đang cập nhật…" : "Đổi mật khẩu"}
            </button>
          </form>
        </Panel>
        {topDocs.length > 0 && (
          <Panel title="Thống kê tài liệu của bạn">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topDocs}>
                  <CartesianGrid stroke="#edf2fc" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="tải" fill="#1761ff" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="xem" fill="#80bdff" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        )}
      </div>
      <aside className="space-y-4">
        <Panel title="Tài khoản của bạn">
          <div className="rounded-xl bg-amber-50 p-4">
            <h3 className="font-bold">
              {user.plan === "VIP" ? "DocShare VIP" : "DocShare miễn phí"}
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-[#7181a8]">
              {user.plan === "VIP" && user.plan_expires_at
                ? `Thời hạn đến ${new Date(user.plan_expires_at).toLocaleDateString("vi-VN")}`
                : "Khám phá và chia sẻ tài liệu cùng cộng đồng."}
            </p>
            <Link to="/vip" className="ds-button-outline mt-4 w-full text-xs">
              Quản lý gói VIP →
            </Link>
          </div>
        </Panel>
        <Panel title="Thống kê tài khoản">
          {statsError ? (
            <ErrorState error={statsError} onRetry={retryStats} />
          ) : statsLoading ? (
            <LoadingState label="Đang tải thống kê…" />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Tài liệu tải lên", docStats.total],
                  ["Đã phê duyệt", docStats.approved],
                  ["Đang chờ duyệt", docStats.pending],
                  ["Lượt tải tháng này", user.monthly_downloads || 0],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-lg border border-blue-100 p-3"
                  >
                    <strong className="text-xl">{value}</strong>
                    <p className="mt-1 text-xs text-[#7181a8]">{label}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </Panel>
        <VipPromo />
      </aside>
    </div>
  );
}
export default Profile;
