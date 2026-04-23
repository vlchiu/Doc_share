import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import axiosClient from '../api/axiosClient';
import Spinner from '../components/Spinner';

function AdminDashboard() {
  const [tab, setTab] = useState('pending');
  const [pendingDocs, setPendingDocs] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [editingCat, setEditingCat] = useState(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [pendingRes, usersRes, statsRes, catsRes] = await Promise.all([
        axiosClient.get('/documents/pending'),
        axiosClient.get('/admin/users'),
        axiosClient.get('/admin/stats'),
        axiosClient.get('/categories'),
      ]);
      setPendingDocs(pendingRes.data);
      setUsers(usersRes.data.users);
      setStats(statsRes.data);
      setCategories(catsRes.data);
    } catch (error) { console.error("Lỗi", error); }
    finally { setLoading(false); }
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
    if (!window.confirm('⚠️ Xóa vĩnh viễn tài liệu này?')) return;
    try {
      await axiosClient.delete(`/documents/${docId}`);
      setPendingDocs(pendingDocs.filter(doc => doc.id !== docId));
      toast.success('Đã xóa tài liệu!');
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

  const thStyle = { padding: '12px 15px', textAlign: 'left', fontWeight: 'bold', color: '#64748b', fontSize: '12px', textTransform: 'uppercase' };
  const tdStyle = { padding: '12px 15px', borderBottom: '1px solid #f1f5f9', fontSize: '14px' };
  const tabStyle = (active) => ({ padding: '10px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', background: active ? '#3b82f6' : '#e2e8f0', color: active ? '#fff' : '#555' });

  return (
    <div style={{ padding: '20px 0', color: '#1a1a1a' }}>
      <h2 style={{ textAlign: 'center', color: '#b91c1c', fontSize: '26px', marginBottom: '24px' }}>🛡️ Khu vực Quản trị</h2>

      {/* THỐNG KÊ */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px', marginBottom: '30px' }}>
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
      )}

      {/* TABS */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button style={tabStyle(tab === 'pending')} onClick={() => setTab('pending')}>⏳ Chờ duyệt ({pendingDocs.length})</button>
        <button style={tabStyle(tab === 'users')} onClick={() => setTab('users')}>👥 Quản lý User ({users.length})</button>
        <button style={tabStyle(tab === 'categories')} onClick={() => setTab('categories')}>📁 Danh mục ({categories.length})</button>
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
                          <a href={`http://localhost:5000${doc.file_url}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: '#3b82f6' }}>{doc.title}</a>
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
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button onClick={() => handleToggleUser(u.id)} style={{ padding: '6px 12px', background: u.is_active ? '#fee2e2' : '#dcfce7', color: u.is_active ? '#b91c1c' : '#16a34a', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px' }}>
                            {u.is_active ? '🔒 Khóa' : '🔓 Mở'}
                          </button>
                          <button onClick={() => handleChangeRole(u.id, u.role)} style={{ padding: '6px 12px', background: '#f3e8ff', color: '#7c3aed', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px' }}>
                            👑 Role
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
    </div>
  );
}

export default AdminDashboard;
