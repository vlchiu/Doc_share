// backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  // Lấy token từ Header của request
  const authHeader = req.header('Authorization');
  if (!authHeader) return res.status(401).json({ message: "Từ chối truy cập! Không có token." });

  try {
    // Cắt bỏ chữ "Bearer " để lấy đúng chuỗi mã
    const token = authHeader.replace("Bearer ", "");
    // Giải mã token bằng Secret Key
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    
    // Gắn thông tin user (đã giải mã) vào request để các hàm sau sử dụng
    req.user = verified; 
    next(); // Cho phép đi tiếp
  } catch (error) {
    res.status(400).json({ message: "Token không hợp lệ hoặc đã hết hạn!" });
  }
};

module.exports = { verifyToken };