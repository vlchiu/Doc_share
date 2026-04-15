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
  
  // STATE MỚI ĐỂ LƯU THÔNG TIN USER (XÁC ĐỊNH ADMIN)
  const [currentUser, setCurrentUser] = useState(null);
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

        // Lấy thông tin user đăng nhập để check quyền Admin
        if (isAuthenticated) {
          const userRes = await axiosClient.get('/auth/me');
          setCurrentUser(userRes.data);
        }
      } catch (error) { console.error('Lỗi khi lấy dữ liệu', error); }
    };
    fetchData();
  }, [isAuthenticated]);

const handleDownload = async (doc) => {
    // 1. Vẫn giữ nguyên lớp bảo mật: Yêu cầu đăng nhập
    if (!isAuthenticated) {
      alert("🔒 Vui lòng đăng nhập hoặc đăng ký tài khoản để tải xuống tài liệu này!");
      return; 
    }

    try {
      // 2. Gọi API để cộng 1 vào lượt tải trong CSDL
      await axiosClient.post(`/documents/${doc.id}/download`);

      // 3. Kỹ thuật ÉP TẢI XUỐNG (Thay vì mở tab mới)
      const fileUrl = `http://localhost:5000${doc.file_url}`;
      
      // Kéo file về dưới dạng dữ liệu thô (Blob)
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      
      // Tạo một đường link ảo trong bộ nhớ
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      // Lấy tên file gốc từ url (ví dụ: hinhanh.png)
      const fileName = doc.file_url.split('/').pop() || doc.title;
      link.setAttribute('download', fileName); // Lệnh download bắt buộc trình duyệt phải lưu file
      
      // Gắn link vào web, tự động click, rồi xóa link đi cho sạch
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      // 4. Cập nhật con số lượt tải trên giao diện
      setDocuments(documents.map(d => d.id === doc.id ? { ...d, download_count: d.download_count + 1 } : d));
    } catch (error) {
      console.error("Lỗi khi tải file:", error);
      alert("❌ Lỗi khi tải file. Vui lòng thử lại!");
    }
  };
  // --- HÀM XÓA TÀI LIỆU DÀNH CHO ADMIN ---
  const handleDeleteAdmin = async (docId) => {
    if (window.confirm("⚠️ QUYỀN ADMIN: Bạn có chắc chắn muốn xóa vĩnh viễn tài liệu này khỏi hệ thống?")) {
      try {
        await axiosClient.delete(`/documents/${docId}`);
        // Cập nhật lại giao diện, làm biến mất tài liệu vừa xóa
        setDocuments(documents.filter(doc => doc.id !== docId));
        alert("✅ Đã thi hành lệnh xóa thành công!");
      } catch (error) {
        alert("❌ Lỗi khi xóa: " + (error.response?.data?.message || "Lỗi không xác định"));
      }
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

  return (
    <div style={{ padding: '20px', color: '#333' }}>
      <h2 style={{ textAlign: 'center', color: '#555' }}>
        {currentType === 'All' ? '📚 Thư viện Tài liệu' : `📂 Tài liệu: ${currentType}`}
      </h2>
      
      <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
        <input type="text" placeholder="🔍 Tìm kiếm tài liệu..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', maxWidth: '400px', padding: '10px 15px', borderRadius: '6px', border: '1px solid #ccc', outline: 'none', background: '#fafafa' }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '30px' }}>
        <button onClick={() => setSelectedCategory('All')} style={{ padding: '8px 15px', borderRadius: '6px', border: '1px solid #ddd', cursor: 'pointer', fontWeight: 'bold', background: selectedCategory === 'All' ? '#2ecc71' : '#ecf0f1', color: selectedCategory === 'All' ? 'white' : '#555' }}>🌟 Tất cả</button>
        {categories.map(cat => (
          <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} style={{ padding: '8px 15px', borderRadius: '6px', border: '1px solid #ddd', cursor: 'pointer', fontWeight: 'bold', background: selectedCategory === cat.id ? '#2ecc71' : '#ecf0f1', color: selectedCategory === cat.id ? 'white' : '#555' }}>{cat.name}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {filteredDocuments.map((doc) => (
          <div key={doc.id} style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', background: '#fff', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#333', fontSize: '18px' }}>{doc.title}</h3>
            
            <div style={{ fontSize: '13px', color: '#555', background: '#f9f9f9', padding: '10px', borderRadius: '6px', marginBottom: '15px' }}>
              <p style={{ margin: '0 0 5px 0' }}>👤 Đăng bởi: <b>{doc.user?.name}</b></p>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #eee', paddingTop: '5px' }}>
                <span>🏷️ {doc.doc_type} | 📁 {doc.category?.name}</span>
                <div style={{ display: 'flex', gap: '15px' }}>
                  <span>👁️ {doc.view_count || 0}</span>
                  <span>⬇️ {doc.download_count || 0}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
              <button onClick={() => handleView(doc)} style={{ flex: 1, padding: '10px', background: '#95a5a6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>👀 Xem</button>
              <button onClick={() => handleDownload(doc)} style={{ flex: 1, padding: '10px', background: '#3498db', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>⬇️ Tải xuống</button>
            </div>

            {isAuthenticated && (
              <button onClick={() => handleToggleSave(doc.id)} style={{ marginTop: '10px', width: '100%', padding: '10px', background: '#7f8c8d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                🔖 Lưu tài liệu
              </button>
            )}

            <button onClick={() => toggleComments(doc.id)} style={{ marginTop: '10px', width: '100%', padding: '10px', background: 'transparent', color: '#555', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              💬 {activeCommentDocId === doc.id ? "Đóng bình luận" : "Bình luận"}
            </button>

            {/* NÚT XÓA QUYỀN LỰC CỦA ADMIN - MÀU ĐỎ */}
            {currentUser?.role === 'ADMIN' && (
              <button onClick={() => handleDeleteAdmin(doc.id)} style={{ marginTop: '10px', width: '100%', padding: '10px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                🗑️ Xóa 
              </button>
            )}

            {activeCommentDocId === doc.id && (
              <div style={{ marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                {isAuthenticated ? (
                  <form onSubmit={(e) => submitComment(e, doc.id)} style={{ display: 'flex', gap: '5px', marginBottom: '15px' }}>
                    <input type="text" placeholder="Nhập bình luận..." value={newComment} onChange={(e) => setNewComment(e.target.value)} style={{ flex: 1, padding: '8px 12px', borderRadius: '4px', border: '1px solid #ccc', outline: 'none' }} />
                    <button type="submit" style={{ padding: '8px 15px', background: '#95a5a6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Gửi</button>
                  </form>
                ) : (
                  <p style={{ fontSize: '13px', color: '#7f8c8d', textAlign: 'center' }}>Vui lòng đăng nhập để bình luận.</p>
                )}
                <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                  {comments.length === 0 ? <p style={{ fontSize: '13px', color: '#999', textAlign: 'center' }}>Chưa có bình luận.</p> : comments.map(cmt => (
                    <div key={cmt.id} style={{ display: 'flex', gap: '10px', marginBottom: '10px', borderBottom: '1px solid #f0f0f0', paddingBottom: '10px' }}>
                      <div style={{ width: '25px', height: '25px', borderRadius: '50%', background: '#bdc3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px', overflow: 'hidden', flexShrink: 0 }}>
                        {cmt.user?.avatar_url ? <img src={`http://localhost:5000${cmt.user.avatar_url}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : cmt.user?.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#333' }}>{cmt.user?.name}</div>
                        <div style={{ fontSize: '13px', color: '#555', marginTop: '2px' }}>{cmt.content}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Home;