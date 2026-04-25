import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import axiosClient from '../api/axiosClient';

function Upload() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [docType, setDocType] = useState('Chung');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axiosClient.get('/categories').then(res => {
      setCategories(res.data);
      if (res.data.length > 0) setCategoryId(res.data[0].id);
    }).catch(() => toast.error('Lỗi lấy danh mục!'));
  }, []);

  const ALLOWED_TYPES = ['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation','text/plain','image/jpeg','image/png','image/gif','application/zip','application/x-rar-compressed','application/xml','text/xml'];
  const MAX_SIZE = 20 * 1024 * 1024;

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > MAX_SIZE) { toast.error('File quá lớn! Tối đa 20MB.'); e.target.value = null; return; }
    if (!ALLOWED_TYPES.includes(f.type)) { toast.error('Loại file không được hỗ trợ!'); e.target.value = null; return; }
    setFile(f);
    if (!title.trim()) setTitle(f.name.replace(/\.[^/.]+$/, ''));
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return toast.error('Vui lòng chọn file!');
    setLoading(true);

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
      toast.success('Tải lên thành công! Tài liệu đang chờ duyệt.');
      setTimeout(() => { window.location.href = '/my-documents'; }, 1000);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi tải lên!');
    } finally { setLoading(false); }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const labelStyle = { fontWeight: 'bold', color: '#374151', marginBottom: '6px', display: 'block', fontSize: '14px' };
  const inputStyle = { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '14px', boxSizing: 'border-box', outline: 'none' };

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', background: '#fff', padding: '40px', borderRadius: '16px', boxShadow: '0 8px 30px rgba(0,0,0,0.07)' }}>
      <h2 style={{ color: '#1a1a1a', textAlign: 'center', marginBottom: '30px', fontSize: '22px' }}>📤 Tải lên Tài liệu mới</h2>
      <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

        {/* CHỌN FILE — đặt lên đầu để tự điền tên */}
        <div>
          <label style={labelStyle}>Chọn File: <span style={{ color: '#ef4444' }}>*</span></label>
          <label htmlFor="file-input" style={{
            display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
            border: '2px dashed #cbd5e1', borderRadius: '10px', cursor: 'pointer',
            background: file ? '#f0fdf4' : '#f8fafc', transition: '0.2s',
            borderColor: file ? '#86efac' : '#cbd5e1'
          }}>
            <span style={{ fontSize: '28px' }}>{file ? '✅' : '📁'}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              {file ? (
                <>
                  <p style={{ margin: 0, fontWeight: 'bold', color: '#15803d', fontSize: '14px',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>{formatSize(file.size)}</p>
                </>
              ) : (
                <>
                  <p style={{ margin: 0, fontWeight: 'bold', color: '#64748b', fontSize: '14px' }}>Bấm để chọn file</p>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94a3b8' }}>PDF, Word, Excel, PowerPoint, TXT, ảnh, ZIP — tối đa 20MB</p>
                </>
              )}
            </div>
            {file && <button type="button" onClick={(e) => { e.preventDefault(); setFile(null); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '18px', padding: '0 4px' }}>✕</button>}
          </label>
          <input id="file-input" type="file" required onChange={handleFileChange} style={{ display: 'none' }} />
        </div>

        <div>
          <label style={labelStyle}>Tên tài liệu: <span style={{ color: '#ef4444' }}>*</span></label>
          <input type="text" required value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} placeholder="Nhập tên tài liệu..." />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Danh mục:</label>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} style={inputStyle}>
              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Phân loại:</label>
            <select value={docType} onChange={e => setDocType(e.target.value)} style={inputStyle}>
              <option value="Chung">Chung</option>
              <option value="Hardware">Hardware</option>
              <option value="Software">Software</option>
              <option value="Thông báo">Thông báo</option>
            </select>
          </div>
        </div>

        <div>
          <label style={labelStyle}>Mô tả:</label>
          <textarea rows="4" value={description} onChange={e => setDescription(e.target.value)}
            style={{ ...inputStyle, resize: 'vertical' }} placeholder="Mô tả ngắn về tài liệu (không bắt buộc)..." />
        </div>

        <button type="submit" disabled={loading} style={{
          padding: '14px', background: loading ? '#93c5fd' : '#3b82f6', color: '#fff',
          border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '15px', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
        }}>
          {loading ? (<><span style={{ width: '16px', height: '16px', border: '2px solid #fff', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />Đang tải lên...</>) : '📤 Tải lên ngay'}
        </button>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </form>
    </div>
  );
}

export default Upload;
