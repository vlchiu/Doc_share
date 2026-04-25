import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import axiosClient from '../api/axiosClient';
import Spinner from '../components/Spinner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API_URL = import.meta.env.VITE_API_URL;

function AdminDashboard() {
  const [tab, setTab] = useState('pending');
  const [pendingDocs, setPendingDocs] = useState([]);
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [userPagination, setUserPagination] = useState({ total: 0, totalPages: 1 });
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [reports, setReports] = useState([]);
  const [trashDocs, setTrashDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [editingCat, setEditingCat] = useState(null);
  const [resolvingReport, setResolvingReport] = useState(null); // { id, docTitle }
  const [resolveAction, setResolveAction] = useState('WARN');
  const [resolveNote, setResolveNote] = useState('');

  useEffect(() => { fetchAll(); fetchUsers('', 1); }, []);

  const fetchUsers = async (search = '', page = 1) => {
    try {
      const params = new URLSearchParams({ page, limit: 20, ...(search && { search }) });
      const res = await axiosClient.get(`/admin/users?${params}`);
      setUsers(res.data.users || []);
      setUserPagination(res.data.pagination);
    } catch { toast.error('Lỗi tải danh sách user!'); }
  };

  useEffect(() => {
    if (tab === 'users') fetchUsers(userSearch, userPage);
  }, [tab, userPage]); // userSearch không trigger tự động — phải bấm nút Tìm

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [pendingRes, statsRes, catsRes, reportsRes, trashRes] = await Promise.allSettled([
        axiosClient.get('/documents/pending'),
        axiosClient.get('/admin/stats'),
        axiosClient.get('/categories'),
        axiosClient.get('/admin/reports'),
        axiosClient.get('/documents/trash'),
      ]);

      if (pendingRes.status === 'fulfilled') setPendingDocs(pendingRes.value.data);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      if (catsRes.status === 'fulfilled') setCategories(catsRes.value.data);
      if (reportsRes.status === 'fulfilled') setReports(reportsRes.value.data);
      if (trashRes.status === 'fulfilled') setTrashDocs(trashRes.value.data);

      [pendingRes, statsRes, catsRes, reportsRes, trashRes].forEach((r, i) => {
        if (r.status === 'rejected') console.error(`fetchAll[${i}] failed:`, r.reason?.response?.data || r.reason?.message);
      });
    } catch (error) {
      console.error("fetchAll error:", error);
      toast.error('Lỗi tải dữ liệu quản trị!');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (docId) => {
    try {
      await axiosClient.put(`/documents/${docId}/approve`);
      setPendingDocs(pendingDocs.filter(doc => doc.id !== docId));
      setStats(s => ({ ...s, pendingDocs: s.pendingDocs - 1, totalDocs: s.totalDocs + 1 }));
      toast.success('Đã duyệt tài liệu!');
    } catch { toast.error('Lỗi khi duyệt!'); }
  };

  const handleReject = async (docId) => {
    const reason = prompt('Nhập lý do từ chối:');
    if (!reason?.trim()) return;
    try {
      await axiosClient.put(`/documents/${docId}/reject`, { reason });
      setPendingDocs(pendingDocs.filter(doc => doc.id !== docId));
      setStats(s => ({ ...s, pendingDocs: s.pendingDocs - 1 }));
      toast.success('Đã từ chối tài liệu!');
    } catch { toast.error('Lỗi!'); }
  };

  const handleDeleteDoc = async (docId) => {
    if (!window.confirm('⚠️ Xóa vĩnh viễn tài liệu này? Không thể khôi phục!')) return;
    try {
      await axiosClient.delete(`/documents/${docId}/permanent`);
      setPendingDocs(pendingDocs.filter(doc => doc.id !== docId));
      setStats(s => s ? ({ ...s, pendingDocs: Math.max(0, s.pendingDocs - 1) }) : s);
      toast.success('Đã xóa vĩnh viễn!');
    } catch { toast.error('Lỗi khi xóa!'); }
  };

  const handleToggleUser = async (userId) => {
    try {
      const res = await axiosClient.put(`/admin/users/${userId}/toggle-active`);
      setUsers(users.map(u => u.id === userId ? { ...u, is_active: res.data.user.is_active } : u));
      toast.success(res.data.user.is_active ? 'Đã mở khóa tài khoản!' : 'Đã khóa tài khoản!');
    } catch { toast.error('Lỗi!'); }
  };

  const handleChangeRole = async (userId, currentRole) => {
    const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
    if (!window.confirm(`Đổi role thành ${newRole}?`)) return;
    try {
      const res = await axiosClient.put(`/admin/users/${userId}/role`, { role: newRole });
      setUsers(users.map(u => u.id === userId ? { ...u, role: res.data.user.role } : u));
      toast.success(`Đã đổi role thành ${newRole}!`);
    } catch { toast.error('Lỗi!'); }
  };

  const handleResetPassword = async (userId, userName) => {
    const newPassword = prompt(`Nhập mật khẩu mới cho "${userName}" (tối thiểu 6 ký tự):`);
    if (!newPassword?.trim()) return;
    if (newPassword.length < 6) { toast.error('Mật khẩu phải có ít nhất 6 ký tự!'); return; }
    try {
      await axiosClient.put(`/auth/admin/reset-password/${userId}`, { newPassword });
      toast.success(`Đã reset mật khẩu cho ${userName}!`);
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi!'); }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      const res = await axiosClient.post('/categories', { name: newCatName, description: newCatDesc });
      setCategories([...categories, res.data]);
      setNewCatName(''); setNewCatDesc('');
      toast.success('Đã thêm danh mục!');
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi!'); }
  };

  const handleUpdateCategory = async (id) => {
    if (!editingCat?.name?.trim()) return;
    try {
      const res = await axiosClient.put(`/categories/${id}`, { name: editingCat.name, description: editingCat.description });
      setCategories(categories.map(c => c.id === id ? res.data : c));
      setEditingCat(null);
      toast.success('Đã cập nhật!');
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi!'); }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Xóa danh mục này?')) return;
    try {
      await axiosClient.delete(`/categories/${id}`);
      setCategories(categories.filter(c => c.id !== id));
      toast.success('Đã xóa danh mục!');
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi!'); }
  };

  const handleResolveReport = async (reportId) => {
    if (!resolveAction) return;
    try {
      await axiosClient.put(`/admin/reports/${reportId}/resolve`, { action: resolveAction, admin_note: resolveNote });
      setReports(reports.filter(r => r.id !== reportId));
      setResolvingReport(null); setResolveNote(''); setResolveAction('WARN');
      toast.success('Đã xử lý báo cáo!');
    } catch { toast.error('Lỗi!'); }
  };

  const handleRestoreTrash = async (docId) => {
    try {
      await axiosClient.put(`/documents/${docId}/restore`);
      setTrashDocs(trashDocs.filter(d => d.id !== docId));
      toast.success('Đã khôi phục tài liệu!');
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi!'); }
  };

  const handlePermanentDeleteTrash = async (docId) => {
    if (!window.confirm('⚠️ Xóa vĩnh viễn? Không thể khôi phục!')) return;
    try {
      await axiosClient.delete(`/documents/${docId}/permanent`);
      setTrashDocs(trashDocs.filter(d => d.id !== docId));
      toast.success('Đã xóa vĩnh viễn!');
    } catch { toast.error('Lỗi!'); }
  };

  const thStyle = { padding: '12px 15px', textAlign: 'left', fontWeight: 'bold', color: '#64748b', fontSize: '12px', textTransform: 'uppercase' };
  const tdStyle = { padding: '12px 15px', borderBottom: '1px solid #f1f5f9', fontSize: '14px' };
  const tabStyle = (active) => ({ padding: '10px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', background: active ? '#3b82f6' : '#e2e8f0', color: active ? '#fff' : '#555' });

  return (
    <div style={{ padding: '20px 0', color: '#1a1a1a' }}>
      <h2 style={{ textAlign: 'center', color: '#b91c1c', fontSize: '26px', marginBottom: '24px' }}>🛡️ Khu vực Quản trị</h2>

      {/* THỐNG KÊ */}
      {stats && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: 'Tổng người dùng', value: stats.totalUsers, icon: '👥', color: '#dbeafe' },
              { label: 'Tài liệu đã duyệt', value: stats.totalDocs, icon: '📄', color: '#dcfce7' },
              { label: 'Chờ duyệt', value: stats.pendingDocs, icon: '⏳', color: '#fef9c3' },
              { label: 'Bình luận', value: stats.totalComments, icon: '💬', color: '#f3e8ff' },
            ].map(s => (
              <div key={s.label} style={{ background: s.color, padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '28px' }}>{s.icon}</div>
                <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#1a1a1a' }}>{s.value}</div>
                <div style={{ fontSize: '13px', color: '#555', marginTop: '4px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* BIỂU ĐỒ 7 NGÀY */}
          {stats.chartData && (
            <div style={{ background: '#fff', borderRadius: '14px', padding: '20px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', marginBottom: '30px' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 'bold', color: '#334155' }}>📊 Hoạt động 7 ngày gần nhất</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.chartData} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
                  <Legend wrapperStyle={{ fontSize: '13px' }} />
                  <Bar dataKey="uploads" name="Tải lên" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="downloads" name="Tải xuống" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {/* TABS */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button style={tabStyle(tab === 'pending')} onClick={() => setTab('pending')}>⏳ Chờ duyệt ({pendingDocs.length})</button>
        <button style={tabStyle(tab === 'users')} onClick={() => setTab('users')}>👥 Quản lý User {stats?.totalUsers ? `(${stats.totalUsers})` : ''}</button>
        <button style={tabStyle(tab === 'categories')} onClick={() => setTab('categories')}>📁 Danh mục ({categories.length})</button>
        <button style={tabStyle(tab === 'reports')} onClick={() => setTab('reports')}>🚨 Báo cáo {reports.length > 0 && `(${reports.length})`}</button>
        <button style={tabStyle(tab === 'trash')} onClick={() => setTab('trash')}>🗑️ Thùng rác {trashDocs.length > 0 && `(${trashDocs.length})`}</button>
        {stats?.topDocs?.length > 0 && (
          <button style={tabStyle(tab === 'top')} onClick={() => setTab('top')}>🏆 Top tài liệu</button>
        )}
      </div>

      <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        {loading ? <Spinner /> : (
          <>
            {/* TAB: CHỜ DUYỆT */}
            {tab === 'pending' && (
              pendingDocs.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#10b981', fontWeight: 'bold', padding: '30px 0' }}>🎉 Không có tài liệu nào đang chờ duyệt!</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={thStyle}>Tên tài liệu</th>
                      <th style={thStyle}>Người đăng</th>
                      <th style={thStyle}>Ngày tải lên</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingDocs.map(doc => (
                      <tr key={doc.id}>
                        <td style={{ ...tdStyle, fontWeight: 'bold' }}>
                          <a href={`${API_URL}${doc.file_url}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: '#3b82f6' }}>{doc.title}</a>
                        </td>
                        <td style={tdStyle}>{doc.user?.name}</td>
                        <td style={tdStyle}>{new Date(doc.created_at).toLocaleDateString('vi-VN')}</td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button onClick={() => handleApprove(doc.id)} style={{ padding: '7px 14px', background: '#dcfce7', color: '#16a34a', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>✅ Duyệt</button>
                            <button onClick={() => handleReject(doc.id)} style={{ padding: '7px 14px', background: '#fef9c3', color: '#a16207', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>❌ Từ chối</button>
                            <button onClick={() => handleDeleteDoc(doc.id)} style={{ padding: '7px 14px', background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>🗑️ Xóa</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}

            {/* TAB: QUẢN LÝ USER */}
            {tab === 'users' && (
              <>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', alignItems: 'center' }}>
                  <input
                    type="text" placeholder="🔍 Tìm theo tên hoặc email..."
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { setUserPage(1); fetchUsers(userSearch, 1); } }}
                    style={{ width: '100%', maxWidth: '320px', padding: '9px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '14px' }}
                  />
                  <button onClick={() => { setUserPage(1); fetchUsers(userSearch, 1); }}
                    style={{ padding: '9px 18px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                    Tìm
                  </button>
                  {userSearch && (
                    <button onClick={() => { setUserSearch(''); setUserPage(1); fetchUsers('', 1); }}
                      style={{ padding: '9px 14px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                      ✕
                    </button>
                  )}
                  <span style={{ fontSize: '13px', color: '#94a3b8', marginLeft: 'auto' }}>{userPagination.total} người dùng</span>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={thStyle}>Tên</th>
                      <th style={thStyle}>Email</th>
                      <th style={thStyle}>Role</th>
                      <th style={thStyle}>Tài liệu</th>
                      <th style={thStyle}>Trạng thái</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td style={{ ...tdStyle, fontWeight: 'bold' }}>{u.name}</td>
                        <td style={{ ...tdStyle, color: '#64748b' }}>{u.email}</td>
                        <td style={tdStyle}>
                          <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', background: u.role === 'ADMIN' ? '#fee2e2' : '#e0f2fe', color: u.role === 'ADMIN' ? '#b91c1c' : '#0369a1' }}>
                            {u.role}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, color: '#64748b' }}>{u._count?.documents || 0}</td>
                        <td style={tdStyle}>
                          <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', background: u.is_active ? '#dcfce7' : '#fee2e2', color: u.is_active ? '#16a34a' : '#b91c1c' }}>
                            {u.is_active ? 'Hoạt động' : 'Đã khóa'}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button onClick={() => handleToggleUser(u.id)} style={{ padding: '6px 12px', background: u.is_active ? '#fee2e2' : '#dcfce7', color: u.is_active ? '#b91c1c' : '#16a34a', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px' }}>
                              {u.is_active ? '🔒 Khóa' : '🔓 Mở'}
                            </button>
                            <button onClick={() => handleChangeRole(u.id, u.role)} style={{ padding: '6px 12px', background: '#f3e8ff', color: '#7c3aed', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px' }}>
                              👑 Role
                            </button>
                            <button onClick={() => handleResetPassword(u.id, u.name)} style={{ padding: '6px 12px', background: '#fef3c7', color: '#d97706', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px' }}>
                              🔑 Reset pass
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* PAGINATION USERS */}
                {userPagination.totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
                    <button onClick={() => { const p = Math.max(1, userPage - 1); setUserPage(p); fetchUsers(userSearch, p); }} disabled={userPage === 1}
                      style={{ padding: '7px 14px', borderRadius: '7px', border: '1px solid #e2e8f0', background: userPage === 1 ? '#f1f5f9' : '#fff', cursor: userPage === 1 ? 'not-allowed' : 'pointer', fontWeight: 'bold', color: '#555', fontSize: '13px' }}>← Trước</button>
                    <span style={{ padding: '7px 14px', color: '#64748b', fontSize: '13px' }}>Trang {userPage} / {userPagination.totalPages}</span>
                    <button onClick={() => { const p = Math.min(userPagination.totalPages, userPage + 1); setUserPage(p); fetchUsers(userSearch, p); }} disabled={userPage === userPagination.totalPages}
                      style={{ padding: '7px 14px', borderRadius: '7px', border: '1px solid #e2e8f0', background: userPage === userPagination.totalPages ? '#f1f5f9' : '#fff', cursor: userPage === userPagination.totalPages ? 'not-allowed' : 'pointer', fontWeight: 'bold', color: '#555', fontSize: '13px' }}>Sau →</button>
                  </div>
                )}
              </>
            )}

            {/* TAB: DANH MỤC */}
            {tab === 'categories' && (
              <div>
                {/* FORM THÊM MỚI */}
                <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
                  <input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Tên danh mục..." required
                    style={{ flex: 2, minWidth: '160px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '14px' }} />
                  <input value={newCatDesc} onChange={e => setNewCatDesc(e.target.value)} placeholder="Mô tả (không bắt buộc)..."
                    style={{ flex: 3, minWidth: '200px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '14px' }} />
                  <button type="submit" style={{ padding: '10px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>+ Thêm</button>
                </form>

                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={thStyle}>Tên danh mục</th>
                      <th style={thStyle}>Mô tả</th>
                      <th style={thStyle}>Số tài liệu</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map(cat => (
                      <tr key={cat.id}>
                        <td style={tdStyle}>
                          {editingCat?.id === cat.id ? (
                            <input value={editingCat.name} onChange={e => setEditingCat({ ...editingCat, name: e.target.value })}
                              style={{ padding: '6px 10px', borderRadius: '6px', border: '2px solid #3b82f6', outline: 'none', fontSize: '14px', width: '100%' }} />
                          ) : <b>{cat.name}</b>}
                        </td>
                        <td style={{ ...tdStyle, color: '#64748b' }}>
                          {editingCat?.id === cat.id ? (
                            <input value={editingCat.description || ''} onChange={e => setEditingCat({ ...editingCat, description: e.target.value })}
                              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '14px', width: '100%' }} />
                          ) : cat.description || '—'}
                        </td>
                        <td style={{ ...tdStyle, color: '#64748b' }}>{cat._count?.documents || 0}</td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            {editingCat?.id === cat.id ? (
                              <>
                                <button onClick={() => handleUpdateCategory(cat.id)} style={{ padding: '6px 12px', background: '#dcfce7', color: '#16a34a', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>✓ Lưu</button>
                                <button onClick={() => setEditingCat(null)} style={{ padding: '6px 12px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>✕</button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => setEditingCat({ id: cat.id, name: cat.name, description: cat.description || '' })} style={{ padding: '6px 12px', background: '#fef3c7', color: '#d97706', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>✏️ Sửa</button>
                                <button onClick={() => handleDeleteCategory(cat.id)} style={{ padding: '6px 12px', background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>🗑️ Xóa</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB: BÁO CÁO */}
            {tab === 'reports' && (
              reports.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#10b981', fontWeight: 'bold', padding: '30px 0' }}>🎉 Không có báo cáo nào đang chờ xử lý!</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={thStyle}>Tài liệu bị báo cáo</th>
                      <th style={thStyle}>Người báo cáo</th>
                      <th style={thStyle}>Lý do</th>
                      <th style={thStyle}>Ngày</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map(r => (
                      <tr key={r.id}>
                        <td style={{ ...tdStyle, fontWeight: 'bold' }}>
                          <a href={`${API_URL}${r.document?.file_url}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: '#3b82f6' }}>{r.document?.title}</a>
                        </td>
                        <td style={{ ...tdStyle, color: '#64748b' }}>{r.user?.name}</td>
                        <td style={{ ...tdStyle, color: '#ef4444' }}>{r.reason}</td>
                        <td style={{ ...tdStyle, color: '#64748b' }}>{new Date(r.created_at).toLocaleDateString('vi-VN')}</td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <button onClick={() => { setResolvingReport(r); setResolveAction('WARN'); setResolveNote(''); }}
                            style={{ padding: '7px 14px', background: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>⚙️ Xử lý</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}

            {/* TAB: THÙNG RÁC */}
            {tab === 'trash' && (
              trashDocs.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#10b981', fontWeight: 'bold', padding: '30px 0' }}>🎉 Thùng rác trống!</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={thStyle}>Tên tài liệu</th>
                      <th style={thStyle}>Người đăng</th>
                      <th style={thStyle}>Xóa lúc</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trashDocs.map(doc => (
                      <tr key={doc.id}>
                        <td style={{ ...tdStyle, color: '#94a3b8', textDecoration: 'line-through' }}>{doc.title}</td>
                        <td style={tdStyle}>{doc.user?.name}</td>
                        <td style={{ ...tdStyle, color: '#94a3b8', fontSize: '12px' }}>{new Date(doc.deleted_at).toLocaleString('vi-VN')}</td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button onClick={() => handleRestoreTrash(doc.id)} style={{ padding: '7px 14px', background: '#dcfce7', color: '#16a34a', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>♻️ Khôi phục</button>
                            <button onClick={() => handlePermanentDeleteTrash(doc.id)} style={{ padding: '7px 14px', background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>🗑️ Xóa vĩnh viễn</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}

            {/* TAB: TOP TÀI LIỆU */}
            {tab === 'top' && stats?.topDocs && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={thStyle}>#</th>
                    <th style={thStyle}>Tên tài liệu</th>
                    <th style={thStyle}>Lượt tải</th>
                    <th style={thStyle}>Lượt xem</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topDocs.map((doc, i) => (
                    <tr key={doc.id}>
                      <td style={{ ...tdStyle, fontWeight: 'bold', color: i === 0 ? '#f59e0b' : '#64748b' }}>{i + 1}</td>
                      <td style={{ ...tdStyle, fontWeight: 'bold' }}>{doc.title}</td>
                      <td style={{ ...tdStyle, color: '#3b82f6', fontWeight: 'bold' }}>⬇️ {doc.download_count}</td>
                      <td style={{ ...tdStyle, color: '#64748b' }}>👁️ {doc.view_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      {/* MODAL XỬ LÝ BÁO CÁO */}
      {resolvingReport && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setResolvingReport(null); }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', width: '460px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 'bold', color: '#1a1a1a' }}>⚙️ Xử lý báo cáo</h3>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#64748b' }}>
              Tài liệu: <b style={{ color: '#1a1a1a' }}>{resolvingReport.document?.title}</b>
            </p>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748b' }}>Lý do báo cáo: <i>{resolvingReport.reason}</i></p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', fontSize: '13px', color: '#374151', marginBottom: '8px' }}>Chọn biện pháp xử lý:</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { value: 'WARN', label: '⚠️ Cảnh báo', desc: 'Gửi thông báo cảnh báo đến chủ tài liệu', color: '#fef9c3', border: '#fde047' },
                  { value: 'REMOVE', label: '🚫 Gỡ tài liệu', desc: 'Chuyển tài liệu vào thùng rác và thông báo chủ tài liệu', color: '#fee2e2', border: '#fca5a5' },
                  { value: 'IGNORE', label: '✓ Bỏ qua', desc: 'Báo cáo không hợp lệ, không cần xử lý', color: '#f1f5f9', border: '#cbd5e1' },
                ].map(opt => (
                  <label key={opt.value} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 14px', borderRadius: '8px', border: `2px solid ${resolveAction === opt.value ? opt.border : '#e2e8f0'}`, background: resolveAction === opt.value ? opt.color : '#fff', cursor: 'pointer', transition: '0.15s' }}>
                    <input type="radio" name="action" value={opt.value} checked={resolveAction === opt.value} onChange={() => setResolveAction(opt.value)} style={{ marginTop: '2px' }} />
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#1a1a1a' }}>{opt.label}</div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', fontSize: '13px', color: '#374151', marginBottom: '6px' }}>Ghi chú (không bắt buộc):</label>
              <textarea value={resolveNote} onChange={e => setResolveNote(e.target.value)} rows={2} placeholder="Ghi chú thêm về quyết định xử lý..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '13px', resize: 'none', boxSizing: 'border-box' }} />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setResolvingReport(null)}
                style={{ padding: '10px 20px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
                Hủy
              </button>
              <button onClick={() => handleResolveReport(resolvingReport.id)}
                style={{ padding: '10px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
                Xác nhận xử lý
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
