// backend/middleware/uploadMiddleware.js
const multer = require('multer');
const path = require('path');

// Cấu hình nơi lưu và tên file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Lưu vào thư mục uploads vừa tạo
  },
  filename: (req, file, cb) => {
    // Đổi tên file: Thêm thời gian hiện tại vào trước tên gốc để tránh trùng lặp
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });
module.exports = upload;