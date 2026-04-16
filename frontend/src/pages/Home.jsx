import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axiosClient from '../api/axiosClient';

function Home() {
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  const [activeCommentDocId, setActiveCommentDocId] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  
  const [currentUser, setCurrentUser] = useState(null);
  const [savedDocIds, setSavedDocIds] = useState([]); 
  const isAuthenticated = !!localStorage.getItem('token');

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const currentType = queryParams.get('type') || 'All';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [docsRes, catsRes] = await Promise.all([
          axiosClient.get('/documents'),
          axiosClient.get('/categories')
        ]);
        setDocuments(docsRes.data);
        setCategories(catsRes.data);

        if (isAuthenticated) {
          const userRes = await axiosClient.get('/auth/me');
          setCurrentUser(userRes.data);
          const savedRes = await axiosClient.get('/documents/saved');
          setSavedDocIds(savedRes.data.map(doc => doc.id)); 
        }
      } catch (error) { console.error('Lỗi khi lấy dữ liệu', error); }
    };
    fetchData();
  }, [isAuthenticated]);

  const handleDownload = async (doc) => {
    if (!isAuthenticated) {
      alert("🔒 Vui lòng đăng nhập hoặc đăng ký tài khoản để tải xuống tài liệu này!");
      return; 
    }
    try {
      await axiosClient.post(`/documents/${doc.id}/download`);
      const fileUrl = `http://localhost:5000${doc.file_url}`;
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const fileName = doc.file_url.split('/').pop() || doc.title;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      setDocuments(documents.map(d => d.id === doc.id ? { ...d, download_count: d.download_count + 1 } : d));
    } catch (error) { alert("❌ Lỗi khi tải file. Vui lòng thử lại!"); }
  };

  const handleView = async (doc) => {
    try {
      await axiosClient.post(`/documents/${doc.id}/view`);
      window.open(`http://localhost:5000${doc.file_url}`, '_blank');
      setDocuments(documents.map(d => d.id === doc.id ? { ...d, view_count: d.view_count + 1 } : d));
    } catch (error) {}
  };

  const handleToggleSave = async (docId) => {
    try {
      const res = await axiosClient.post(`/documents/${docId}/save`);
      if (res.data.isSaved) {
        setSavedDocIds([...savedDocIds, docId]);
      } else {
        setSavedDocIds(savedDocIds.filter(id => id !== docId));
      }
    } catch (error) { alert("❌ Lỗi khi lưu tài liệu!"); }
  };

  const handleDeleteAdmin = async (docId) => {
    if (window.confirm("⚠️ QUYỀN ADMIN: Bạn có chắc chắn muốn xóa vĩnh viễn tài liệu này?")) {
      try {
        await axiosClient.delete(`/documents/${docId}`);
        setDocuments(documents.filter(doc => doc.id !== docId));
      } catch (error) { alert("❌ Lỗi khi xóa!"); }
    }
  };

  const toggleComments = async (docId) => {
    if (activeCommentDocId === docId) {
      setActiveCommentDocId(null);
      return;
    }
    setActiveCommentDocId(docId);
    try {
      const res = await axiosClient.get(`/documents/${docId}/comments`);
      setComments(res.data);
    } catch (error) { console.error("Lỗi lấy bình luận"); }
  };

  const submitComment = async (e, docId) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const res = await axiosClient.post(`/documents/${docId}/comments`, { content: newComment });
      setComments([res.data.comment, ...comments]);
      setNewComment('');
    } catch (error) { alert("Bạn cần đăng nhập để bình luận!"); }
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = selectedCategory === 'All' || doc.category_id === selectedCategory;
    const matchType = currentType === 'All' || doc.doc_type === currentType; 
    return matchSearch && matchCategory && matchType;
  });

  // STYLE MẶC ĐỊNH CHO NÚT BẤM (Thiết kế mới)
  const btnStyle = { padding: '10px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' };

  return (
    <div style={{ color: '#1a1a1a' }}>
      <h2 style={{ textAlign: 'center', color: '#1a1a1a', fontSize: '28px', marginBottom: '10px' }}>
        {currentType === 'All' ? '📚 Thư viện Tài liệu' : `📂 ${currentType}`}
      </h2>
      
      <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0 30px' }}>
        <input type="text" placeholder="🔍 Tìm kiếm tài liệu..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', maxWidth: '400px', padding: '12px 20px', borderRadius: '30px', border: 'none', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', outline: 'none', fontSize: '15px' }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '40px' }}>
        <button onClick={() => setSelectedCategory('All')} style={{ padding: '8px 20px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: selectedCategory === 'All' ? '#10b981' : '#e2e8f0', color: selectedCategory === 'All' ? 'white' : '#555' }}>🌟 Tất cả</button>
        {categories.map(cat => (
          <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} style={{ padding: '8px 20px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: selectedCategory === cat.id ? '#10b981' : '#e2e8f0', color: selectedCategory === cat.id ? 'white' : '#555' }}>{cat.name}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '25px' }}>
        {filteredDocuments.map((doc) => {
          const isSaved = savedDocIds.includes(doc.id);

          return (
            // THIẾT KẾ THẺ MỚI - Bo góc lớn, đổ bóng nhẹ
            <div key={doc.id} style={{ background: '#fff', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#1a1a1a', fontSize: '18px' }}>{doc.title}</h3>
              
              <div style={{ fontSize: '13px', color: '#555', background: '#f8fafc', padding: '12px 15px', borderRadius: '12px', marginBottom: '20px' }}>
                <p style={{ margin: '0 0 5px 0' }}>👤 Đăng bởi: <b>{doc.user?.name}</b></p>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
                  <span>🏷️ {doc.doc_type} | 📁 {doc.category?.name}</span>
                  <div style={{ display: 'flex', gap: '15px', fontWeight: 'bold' }}>
                    <span style={{ color: '#64748b' }}>👁️ {doc.view_count || 0}</span>
                    <span style={{ color: '#3b82f6' }}>⬇️ {doc.download_count || 0}</span>
                  </div>
                </div>
              </div>

              {/* KHU VỰC NÚT BẤM HIỆN ĐẠI */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 'auto' }}>
                
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => handleView(doc)} style={{ ...btnStyle, flex: 1, background: '#e2e8f0', color: '#1a1a1a' }}>👀 Xem</button>
                  <button onClick={() => handleDownload(doc)} style={{ ...btnStyle, flex: 1, background: '#3b82f6', color: '#fff' }}>⬇️ Tải xuống</button>
                </div>

                {isAuthenticated && (
                  // NÚT LƯU PASTEL (Màu nhạt)
                  <button onClick={() => handleToggleSave(doc.id)} style={{ ...btnStyle, width: '100%', background: isSaved ? '#fee2e2' : '#fef3c7', color: isSaved ? '#b91c1c' : '#d97706' }}>
                    {isSaved ? "❌ Bỏ lưu" : "🔖 Lưu tài liệu"}
                  </button>
                )}

                <button onClick={() => toggleComments(doc.id)} style={{ ...btnStyle, width: '100%', background: 'transparent', color: '#555', border: '1px solid #e2e8f0' }}>
                  💬 {activeCommentDocId === doc.id ? "Đóng bình luận" : "Bình luận"}
                </button>

                {currentUser?.role === 'ADMIN' && (
                  <button onClick={() => handleDeleteAdmin(doc.id)} style={{ ...btnStyle, width: '100%', background: '#fee2e2', color: '#b91c1c' }}>
                    🗑️ Xóa 
                  </button>
                )}
              </div>

              {/* KHU VỰC BÌNH LUẬN */}
              {activeCommentDocId === doc.id && (
                <div style={{ marginTop: '15px', borderTop: '1px solid #e2e8f0', paddingTop: '15px' }}>
                  {/* Bình luận code giữ nguyên */}
                  {isAuthenticated ? (
                    <form onSubmit={(e) => submitComment(e, doc.id)} style={{ display: 'flex', gap: '5px', marginBottom: '15px' }}>
                      <input type="text" placeholder="Nhập bình luận..." value={newComment} onChange={(e) => setNewComment(e.target.value)} style={{ flex: 1, padding: '10px 15px', borderRadius: '20px', border: '1px solid #e2e8f0', outline: 'none' }} />
                      <button type="submit" style={{ padding: '8px 15px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}>Gửi</button>
                    </form>
                  ) : (
                    <p style={{ fontSize: '12px', color: '#ef4444', textAlign: 'center' }}>Vui lòng đăng nhập để bình luận.</p>
                  )}
                  <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                    {comments.length === 0 ? <p style={{ fontSize: '13px', color: '#999', textAlign: 'center' }}>Chưa có bình luận.</p> : comments.map(cmt => (
                      <div key={cmt.id} style={{ display: 'flex', gap: '10px', marginBottom: '10px', background: '#f8fafc', padding: '10px', borderRadius: '12px' }}>
                        <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px', overflow: 'hidden', flexShrink: 0 }}>
                          {cmt.user?.avatar_url ? <img src={`http://localhost:5000${cmt.user.avatar_url}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : cmt.user?.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#1a1a1a' }}>{cmt.user?.name}</div>
                          <div style={{ fontSize: '13px', color: '#555', marginTop: '2px' }}>{cmt.content}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Home;