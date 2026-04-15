import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';

function Upload() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  
  // STATE MỚI CHO LOẠI TÀI LIỆU
  const [docType, setDocType] = useState('Chung'); 

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await axiosClient.get('/categories');
        setCategories(res.data);
        if (res.data.length > 0) setCategoryId(res.data[0].id);
      } catch (error) { console.error('Lỗi lấy danh mục', error); }
    };
    fetchCategories();
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return alert('Vui lòng chọn file!');

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('category_id', categoryId);
    formData.append('doc_type', docType); // Gửi loại tài liệu lên Backend
    formData.append('file', file);

    try {
      await axiosClient.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('✅ Tải lên thành công! Tài liệu đang chờ duyệt.');
      window.location.href = '/my-documents';
    } catch (error) { alert('❌ Lỗi khi tải lên'); }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', background: '#fff', padding: '30px', borderRadius: '8px', border: '1px solid #ddd' }}>
      <h2 style={{ color: '#555', textAlign: 'center', marginBottom: '20px' }}>📤 Tải lên Tài liệu mới</h2>
      <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        <div>
          <label style={{ fontWeight: 'bold', color: '#555' }}>Tên tài liệu:</label>
          <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }} />
        </div>

        <div>
          <label style={{ fontWeight: 'bold', color: '#555' }}>Danh mục (Chủ đề):</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }}>
            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
        </div>

        {/* Ô CHỌN LOẠI TÀI LIỆU MỚI */}
        <div>
          <label style={{ fontWeight: 'bold', color: '#555' }}>Phân loại dự án:</label>
          <select value={docType} onChange={(e) => setDocType(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc', background: '#f9f9f9' }}>
            <option value="Chung">Chung</option>
            <option value="Hardware">Hardware</option>
            <option value="Software">Software</option>
            <option value="Thông báo">Thông báo</option>
          </select>
        </div>

        <div>
          <label style={{ fontWeight: 'bold', color: '#555' }}>Mô tả:</label>
          <textarea rows="4" value={description} onChange={(e) => setDescription(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }}></textarea>
        </div>

        <div>
          <label style={{ fontWeight: 'bold', color: '#555' }}>Chọn File:</label>
          <input type="file" required onChange={(e) => setFile(e.target.files[0])} style={{ width: '100%', marginTop: '5px' }} />
        </div>

        <button type="submit" style={{ padding: '12px', background: '#3498db', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>
          Tải lên ngay
        </button>
      </form>
    </div>
  );
}

export default Upload;