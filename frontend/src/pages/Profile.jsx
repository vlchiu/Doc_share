import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  Lock
} from 'lucide-react';
import toast from 'react-hot-toast';
import axiosClient from '../api/axiosClient';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const API_URL = import.meta.env.VITE_API_URL;

function Profile() {
  const [user, setUser] = useState(null);
  const [newName, setNewName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [docStats, setDocStats] = useState({ total: 0, approved: 0, pending: 0 });
  const [topDocs, setTopDocs] = useState([]);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwMsg, setPwMsg] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  const getMe = async () => {
    const res = await axiosClient.get('/auth/me');
    setUser(res.data);
    setNewName(res.data.name);
  };

  const getStats = async () => {
    try {
      const res = await axiosClient.get('/documents/mine');
      const docs = Array.isArray(res.data) ? res.data : [];
      const approved = docs.filter((d) => d.status === 'APPROVED');
      const pending = docs.filter((d) => d.status === 'PENDING').length;
      setDocStats({ total: docs.length, approved: approved.length, pending });
      const sorted = [...approved]
        .sort((a, b) => b.download_count - a.download_count)
        .slice(0, 5);
      setTopDocs(
        sorted.map((d) => ({
          name: d.title.length > 18 ? d.title.slice(0, 18) + '…' : d.title,
          tải: d.download_count,
          xem: d.view_count,
        }))
      );
    } catch {}
  };

  useEffect(() => {
    getMe();
    getStats();
  }, []);

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
    formData.append('name', newName);
    if (selectedFile) formData.append('avatar', selectedFile);
    try {
      await axiosClient.put('/auth/update-profile', formData);
      toast.success('Cập nhật thông tin thành công!');
      window.location.reload();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi cập nhật!');
    } finally {
      setUpdating(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwMsg(null);
    if (newPassword !== confirmPassword) {
      setPwMsg({ type: 'error', text: 'Mật khẩu xác nhận không khớp!' });
      return;
    }
    setChangingPw(true);
    try {
      await axiosClient.put('/auth/change-password', { currentPassword, newPassword });
      setPwMsg({ type: 'success', text: 'Đổi mật khẩu thành công!' });
      toast.success('Đổi mật khẩu thành công!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setPwMsg({
        type: 'error',
        text: error.response?.data?.message || 'Lỗi khi đổi mật khẩu!',
      });
      toast.error(error.response?.data?.message || 'Lỗi khi đổi mật khẩu!');
    } finally {
      setChangingPw(false);
    }
  };

  if (!user) {
    return (
      <div className="py-20 text-center text-slate-400 text-xs">
        Đang tải thông tin tài khoản...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* ── HEADER BENTO ── */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 text-white relative overflow-hidden border border-slate-800 shadow-xl flex items-center justify-between">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-indigo-300 text-xs font-bold mb-3 border border-white/10">
            <User className="w-3.5 h-3.5" /> Hồ sơ cá nhân
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Thiết lập tài khoản</h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Quản lý định danh, bảo mật và theo dõi thống kê hiệu suất tài liệu của bạn.
          </p>
        </div>
      </div>

      {/* ── PROFILE INFO CARD ── */}
      <div className="rounded-3xl bg-white/85 backdrop-blur-md border border-slate-200/80 p-6 sm:p-8 shadow-sm">
        <form onSubmit={handleUpdate} className="space-y-6">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-xl ring-2 ring-indigo-500/30">
                <img
                  src={
                    preview ||
                    (user.avatar_url
                      ? user.avatar_url.startsWith('http')
                        ? user.avatar_url
                        : `${API_URL}${user.avatar_url}`
                      : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`)
                  }
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <label
                htmlFor="avatar-input"
                className="absolute bottom-0 right-0 p-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 shadow-md cursor-pointer transition-transform hover:scale-110"
                title="Thay đổi ảnh đại diện"
              >
                <Camera className="w-4 h-4" />
              </label>
              <input
                id="avatar-input"
                type="file"
                hidden
                onChange={onFileChange}
                accept="image/*"
              />
            </div>
            <p className="text-[11px] text-slate-400">Bấm biểu tượng máy ảnh để tải ảnh mới</p>
          </div>

          {/* Form fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Địa chỉ Email
              </label>
              <input
                type="text"
                value={user.email}
                disabled
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs bg-slate-100/80 text-slate-500 cursor-not-allowed font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Tên hiển thị
              </label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/70 outline-none transition-all font-semibold"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Thành viên từ ngày:{' '}
                <strong className="text-slate-700">
                  {new Date(user.created_at).toLocaleDateString('vi-VN')}
                </strong>
              </span>
            </div>
          </div>

          {/* METRIC PILLS */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              {
                label: 'Tổng tài liệu',
                value: docStats.total,
                bg: 'bg-indigo-50/70 border-indigo-100',
                text: 'text-indigo-600',
              },
              {
                label: 'Đã phê duyệt',
                value: docStats.approved,
                bg: 'bg-emerald-50/70 border-emerald-100',
                text: 'text-emerald-600',
              },
              {
                label: 'Đang chờ duyệt',
                value: docStats.pending,
                bg: 'bg-amber-50/70 border-amber-100',
                text: 'text-amber-600',
              },
            ].map((s) => (
              <div
                key={s.label}
                className={`p-3.5 rounded-2xl border ${s.bg} text-center flex flex-col justify-center`}
              >
                <div className={`text-xl font-black ${s.text}`}>{s.value}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={updating}
            className="w-full py-3 rounded-2xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/20 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 border-0 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{updating ? 'Đang lưu...' : 'Lưu thay đổi hồ sơ'}</span>
          </button>
        </form>
      </div>

      {/* ── TOP DOCS ANALYTICS (IF ANY) ── */}
      {topDocs.length > 0 && (
        <div className="rounded-3xl bg-white/85 backdrop-blur-md border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Top tài liệu thịnh hành của bạn
            </h3>
          </div>
          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topDocs} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    fontSize: '11px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                  }}
                />
                <Bar dataKey="tải" fill="#6366f1" radius={[6, 6, 0, 0]} />
                <Bar dataKey="xem" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── PASSWORD CHANGE CARD ── */}
      <div className="rounded-3xl bg-white/85 backdrop-blur-md border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-5">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-indigo-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Đổi mật khẩu tài khoản
          </h3>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Mật khẩu hiện tại
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/70 outline-none transition-all font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Mật khẩu mới
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/70 outline-none transition-all font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Xác nhận mật khẩu mới
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/70 outline-none transition-all font-medium"
            />
          </div>

          {pwMsg && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                pwMsg.type === 'error'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              {pwMsg.type === 'error' ? (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              )}
              <span>{pwMsg.text}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={changingPw}
            className="w-full py-3 rounded-2xl font-bold text-xs text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 border-0 cursor-pointer"
          >
            <KeyRound className="w-4 h-4" />
            <span>{changingPw ? 'Đang xử lý...' : 'Cập nhật mật khẩu'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

export default Profile;