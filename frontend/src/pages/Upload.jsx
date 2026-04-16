import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';

function Upload() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState('');
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
    formData.append('doc_type', docType); 
    formData.append('file', file);

    try {
      await axiosClient.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('✅ Tải lên thành công! Tài liệu đang chờ duyệt.');
      window.location.href = '/my-documents';
    } catch (error) { alert('❌ Lỗi khi tải lên'); }
  };

  const labelStyle = { fontWeight: 'bold', color: '#1a1a1a', marginBottom: '8px', display: 'block' };
  const inputStyle = { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc' };

  return (
    // THIẾT KẾ ISLAND FORM - Bo góc, đổ bóng, trên nền xám
    <div style={{ maxWidth: '600px', margin: '40px auto', background: '#fff', padding: '40px', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.06)' }}>
      <h2 style={{ color: '#1a1a1a', textAlign: 'center', marginBottom: '30px', fontSize: '24px' }}>📤 Tải lên Tài liệu mới</h2>
      <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        <div>
          <label style={labelStyle}>Tên tài liệu:</label>
          <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
        </div>

        <div>
          <label style={labelStyle}>Danh mục (Chủ đề):</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={inputStyle}>
            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Phân loại dự án:</label>
          <select value={docType} onChange={(e) => setDocType(e.target.value)} style={inputStyle}>
            <option value="Chung">Chung</option>
            <option value="Hardware">Hardware</option>
            <option value="Software">Software</option>
            <option value="Thông báo">Thông báo</option>
          </select>
        </div>

        <div>
          <label style={labelStyle}>Mô tả:</label>
          <textarea rows="5" value={description} onChange={(e) => setDescription(e.target.value)} style={inputStyle}></textarea>
        </div>

        <div>
          <label style={labelStyle}>Chọn File:</label>
          <input type="file" required onChange={(e) => setFile(e.target.files[0])} style={{ width: '100%', marginTop: '5px' }} />
        </div>

        <button type="submit" style={{ padding: '15px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '20px', fontSize: '15px' }}>
          Tải lên ngay
        </button>
      </form>
    </div>
  );
}

export default Upload;