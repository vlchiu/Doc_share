import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import axiosClient from '../api/axiosClient';
import Spinner from '../components/Spinner';
import { FILE_ICONS, FILE_BADGE_COLORS, getFileLabel } from '../utils/fileHelper';

const API_URL = import.meta.env.VITE_API_URL;

function UserProfile() {
  const { userId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [followStatus, setFollowStatus] = useState({ followers: 0, following: 0, isFollowing: false });
  const [followModal, setFollowModal] = useState(null); // 'followers' | 'following'
  const [followList, setFollowList] = useState([]);
  const isAuthenticated = !!localStorage.getItem('token');
  const currentUserId = parseInt(localStorage.getItem('userId') || '0');

  useEffect(() => {
    Promise.all([
      axiosClient.get(`/documents/user/${userId}`),
      axiosClient.get(`/follow/${userId}/status`),
    ]).then(([docRes, followRes]) => {
      setData(docRes.data);
      setFollowStatus(followRes.data);
    }).catch(() => toast.error('Không tìm thấy người dùng!'))
      .finally(() => setLoading(false));
  }, [userId]);

  const handleToggleFollow = async () => {
    if (!isAuthenticated) { toast.error('Vui lòng đăng nhập!'); return; }
    try {
      const res = await axiosClient.post(`/follow/${userId}`);
      setFollowStatus(s => ({ ...s, isFollowing: res.data.isFollowing, followers: s.followers + (res.data.isFollowing ? 1 : -1) }));
      toast.success(res.data.message);
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi!'); }
  };

  const openFollowModal = async (type) => {
    try {
      const res = await axiosClient.get(`/follow/${userId}/${type}`);
      setFollowList(res.data);
      setFollowModal(type);
    } catch { toast.error('Lỗi!'); }
  };

  if (loading) return <Spinner />;
  if (!data) return <div style={{ textAlign: 'center', padding: '60px' }}>Không tìm thấy.</div>;

  const { user, documents } = data;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', color: '#1a1a1a' }}>
      {/* HEADER USER */}
      <div style={{ background: '#fff', borderRadius: '16px', padding: '28px 32px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', marginBottom: '24px', display: 'flex', gap: '20px', alignItems: 'center' }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '50%', overflow: 'hidden', background: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '28px', fontWeight: 'bold', flexShrink: 0 }}>
          {user.avatar_url
            ? <img src={`${API_URL}${user.avatar_url}`} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : user.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 style={{ margin: '0 0 6px', fontSize: '22px', fontWeight: 'bold' }}>{user.name}</h2>
          <p style={{ margin: '0 0 12px', color: '#64748b', fontSize: '14px' }}>
            📅 Tham gia {new Date(user.created_at).toLocaleDateString('vi-VN')} · 📄 {documents.length} tài liệu
            · <button onClick={() => openFollowModal('followers')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', fontWeight: 'bold', fontSize: '14px', padding: 0 }}>{followStatus.followers} người theo dõi</button>
            · <button onClick={() => openFollowModal('following')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', fontWeight: 'bold', fontSize: '14px', padding: 0 }}>đang theo dõi {followStatus.following}</button>
          </p>
          {isAuthenticated && String(userId) !== String(currentUserId) && (
            <button onClick={handleToggleFollow}
              style={{ padding: '8px 20px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', background: followStatus.isFollowing ? '#fee2e2' : '#3b82f6', color: followStatus.isFollowing ? '#b91c1c' : '#fff' }}>
              {followStatus.isFollowing ? '✕ Bỏ theo dõi' : '+ Theo dõi'}
            </button>
          )}
        </div>
      </div>

      {/* DANH SÁCH TÀI LIỆU */}
      <h3 style={{ fontSize: '17px', fontWeight: 'bold', marginBottom: '16px', color: '#334155' }}>
        Tài liệu đã đăng
      </h3>

      {documents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px', background: '#fff', borderRadius: '14px' }}>
          <div style={{ fontSize: '48px', marginBottom: '10px' }}>📭</div>
          <p style={{ color: '#64748b' }}>Chưa có tài liệu nào được duyệt.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {documents.map(doc => {
            const fileIcon = FILE_ICONS[doc.file_type] || '📎';
            const fileLabel = getFileLabel(doc.file_type, doc.file_url);
            const badgeColor = FILE_BADGE_COLORS[fileLabel] || { bg: '#f1f5f9', color: '#475569' };
            return (
              <Link key={doc.id} to={`/documents/${doc.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', display: 'flex', gap: '12px', alignItems: 'flex-start', transition: '0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.04)'}>
                  <span style={{ fontSize: '28px', flexShrink: 0 }}>{fileIcon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <p style={{ margin: 0, fontWeight: 'bold', fontSize: '14px', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</p>
                      <span style={{ flexShrink: 0, padding: '1px 7px', borderRadius: '5px', fontSize: '10px', fontWeight: 'bold', background: badgeColor.bg, color: badgeColor.color }}>{fileLabel}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>📁 {doc.category?.name} · 👁️ {doc.view_count} · ⬇️ {doc.download_count}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* MODAL FOLLOWERS / FOLLOWING */}
      {followModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setFollowModal(null); }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', width: '380px', maxHeight: '500px', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 'bold', color: '#1a1a1a' }}>
                {followModal === 'followers' ? '👥 Người theo dõi' : '👤 Đang theo dõi'}
              </h3>
              <button onClick={() => setFollowModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '20px' }}>✕</button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {followList.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#94a3b8', padding: '20px 0', fontSize: '14px' }}>Chưa có ai.</p>
              ) : followList.map(u => (
                <Link key={u.id} to={`/users/${u.id}`} onClick={() => setFollowModal(null)} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', borderRadius: '10px', background: '#f8fafc', transition: '0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#e0f2fe'}
                  onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', background: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', flexShrink: 0 }}>
                    {u.avatar_url ? <img src={`${API_URL}${u.avatar_url}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : u.name.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontWeight: 'bold', color: '#1a1a1a', fontSize: '14px' }}>{u.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserProfile;