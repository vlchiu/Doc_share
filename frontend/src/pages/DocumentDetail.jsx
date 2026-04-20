import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import axiosClient from '../api/axiosClient';
import Spinner from '../components/Spinner';
import { openOrDownload, FILE_ICONS, FILE_BADGE_COLORS, getFileLabel } from '../utils/fileHelper';

const API_URL = import.meta.env.VITE_API_URL;

function DocumentDetail() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const isAuthenticated = !!localStorage.getItem('token');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const docRes = await axiosClient.get(`/documents/${id}`);
        setDoc(docRes.data);
        setIsSaved(docRes.data.isSaved || false);

        if (isAuthenticated) {
          const userRes = await axiosClient.get('/auth/me');
          setCurrentUser(userRes.data);
        }
      } catch {
        toast.error('Không tìm thấy tài liệu!');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleView = async () => {
    try {
      await axiosClient.post(`/documents/${id}/view`);
      const fileUrl = `${API_URL}${doc.file_url}`;
      const fileName = doc.file_url.split('/').pop();
      openOrDownload(fileUrl, doc.file_type, fileName, handleDownload);
      setDoc(d => ({ ...d, view_count: d.view_count + 1 }));
    } catch {}
  };

  const handleDownload = async () => {
    if (!isAuthenticated) { toast.error('Vui lòng đăng nhập để tải xuống!'); return; }
    try {
      await axiosClient.post(`/documents/${id}/download`);
      const res = await fetch(`${API_URL}${doc.file_url}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_url.split('/').pop();
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setDoc(d => ({ ...d, download_count: d.download_count + 1 }));
      toast.success('Đang tải xuống...');
    } catch { toast.error('Lỗi khi tải file!'); }
  };

  const handleToggleSave = async () => {
    if (!isAuthenticated) { toast.error('Vui lòng đăng nhập!'); return; }
    try {
      const res = await axiosClient.post(`/documents/${id}/save`);
      setIsSaved(res.data.isSaved);
      toast.success(res.data.isSaved ? 'Đã lưu tài liệu!' : 'Đã bỏ lưu!');
    } catch { toast.error('Lỗi!'); }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const res = await axiosClient.post(`/documents/${id}/comments`, { content: newComment });
      setDoc(d => ({ ...d, comments: [res.data.comment, ...d.comments] }));
      setNewComment('');
      toast.success('Đã bình luận!');
    } catch { toast.error('Bạn cần đăng nhập để bình luận!'); }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await axiosClient.delete(`/documents/comments/${commentId}`);
      setDoc(d => ({ ...d, comments: d.comments.filter(c => c.id !== commentId) }));
      toast.success('Đã xóa bình luận!');
    } catch { toast.error('Lỗi khi xóa!'); }
  };

  if (loading) return <Spinner />;
  if (!doc) return <div style={{ textAlign: 'center', padding: '60px' }}>Không tìm thấy tài liệu.</div>;

  const fileIcon = FILE_ICONS[doc.file_type] || '📎';
  const fileLabel = getFileLabel(doc.file_type, doc.file_url);
  const badgeColor = FILE_BADGE_COLORS[fileLabel] || { bg: '#f1f5f9', color: '#475569' };

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto' }}>
      <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#64748b', textDecoration: 'none', marginBottom: '20px', fontSize: '14px', fontWeight: '500' }}>
        ← Quay lại
      </Link>

      {/* CARD CHÍNH */}
      <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        
        {/* HEADER */}
        <div style={{ padding: '32px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
            <div style={{ fontSize: '56px', flexShrink: 0 }}>{fileIcon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                <span style={{ padding: '3px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', background: badgeColor.bg, color: badgeColor.color }}>{fileLabel}</span>
                <span style={{ padding: '3px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', background: '#e0f2fe', color: '#0369a1' }}>{doc.doc_type}</span>
                <span style={{ padding: '3px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', background: '#f3e8ff', color: '#7c3aed' }}>{doc.category?.name}</span>
              </div>
              <h1 style={{ margin: '0 0 12px', fontSize: '24px', fontWeight: 'bold', color: '#1a1a1a', lineHeight: 1.4 }}>{doc.title}</h1>
              <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: '#64748b', flexWrap: 'wrap' }}>
                <span>👤 {doc.user?.name}</span>
                <span>📅 {new Date(doc.created_at).toLocaleDateString('vi-VN')}</span>
                <span>👁️ {doc.view_count} lượt xem</span>
                <span>⬇️ {doc.download_count} lượt tải</span>
              </div>
            </div>
          </div>
        </div>

        {/* MÔ TẢ */}
        {doc.description && (
          <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '15px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mô tả</h3>
            <p style={{ margin: 0, color: '#334155', lineHeight: 1.7, fontSize: '15px' }}>{doc.description}</p>
          </div>
        )}

        {/* NÚT HÀNH ĐỘNG */}
        <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button onClick={handleView} style={{ padding: '12px 24px', background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
            👀 Xem tài liệu
          </button>
          <button onClick={handleDownload} style={{ padding: '12px 24px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
            ⬇️ Tải xuống
          </button>
          {isAuthenticated && (
            <button onClick={handleToggleSave} style={{ padding: '12px 24px', background: isSaved ? '#fee2e2' : '#fef3c7', color: isSaved ? '#b91c1c' : '#d97706', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
              {isSaved ? '❌ Bỏ lưu' : '🔖 Lưu tài liệu'}
            </button>
          )}
          <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Đã copy link!'); }}
            style={{ padding: '12px 24px', background: '#f0fdf4', color: '#16a34a', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
            🔗 Chia sẻ
          </button>
        </div>

        {/* BÌNH LUẬN */}
        <div style={{ padding: '24px 32px' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '17px', fontWeight: 'bold', color: '#1a1a1a' }}>
            💬 Bình luận ({doc.comments?.length || 0})
          </h3>

          {isAuthenticated ? (
            <form onSubmit={handleSubmitComment} style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>
                {currentUser?.name?.charAt(0).toUpperCase()}
              </div>
              <input
                type="text"
                placeholder="Viết bình luận..."
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                style={{ flex: 1, padding: '10px 16px', borderRadius: '20px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '14px' }}
              />
              <button type="submit" style={{ padding: '10px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}>Gửi</button>
            </form>
          ) : (
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>
              <Link to="/login" style={{ color: '#3b82f6', fontWeight: 'bold' }}>Đăng nhập</Link> để bình luận.
            </p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {doc.comments?.length === 0 && (
              <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px 0', fontSize: '14px' }}>Chưa có bình luận nào.</p>
            )}
            {doc.comments?.map(cmt => (
              <div key={cmt.id} style={{ display: 'flex', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '14px', overflow: 'hidden', flexShrink: 0 }}>
                  {cmt.user?.avatar_url
                    ? <img src={`${API_URL}${cmt.user.avatar_url}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : cmt.user?.name?.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, background: '#f8fafc', padding: '12px 16px', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#1a1a1a' }}>{cmt.user?.name}</span>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>{new Date(cmt.created_at).toLocaleDateString('vi-VN')}</span>
                      {(currentUser?.id === cmt.user_id || currentUser?.role === 'ADMIN') && (
                        <button onClick={() => handleDeleteComment(cmt.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '12px', padding: '2px 6px' }}>🗑️</button>
                      )}
                    </div>
                  </div>
                  <p style={{ margin: 0, fontSize: '14px', color: '#334155', lineHeight: 1.5 }}>{cmt.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DocumentDetail;
