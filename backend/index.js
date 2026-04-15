const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const documentRoutes = require('./routes/documentRoutes'); // Import thêm route tài liệu
const categoryRoutes = require('./routes/categoryRoutes');

const app = express();

app.use(cors());
app.use(express.json()); 

// Cấp quyền cho trình duyệt truy cập vào thư mục uploads
app.use('/uploads', express.static('uploads'));

app.get('/api/test', (req, res) => {
  res.json({ message: "🚀 Backend Document Sharing Web đang chạy mượt mà!" });
});

app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes); // Sử dụng route tài liệu
app.use('/api/categories', categoryRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server Backend đang chạy tại http://localhost:${PORT}`);
});