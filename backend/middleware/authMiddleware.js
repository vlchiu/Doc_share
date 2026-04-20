// backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const prisma = require('../db');

const verifyToken = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader) return res.status(401).json({ message: "Từ chối truy cập! Không có token." });

  try {
    const token = authHeader.replace("Bearer ", "");
    const verified = jwt.verify(token, process.env.JWT_SECRET);

    // Kiểm tra tài khoản có bị khóa không
    const user = await prisma.user.findUnique({
      where: { id: verified.userId },
      select: { is_active: true, role: true }
    });

    if (!user || !user.is_active) {
      return res.status(403).json({ message: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin." });
    }

    req.user = { ...verified, role: user.role };
    next();
  } catch (error) {
    res.status(400).json({ message: "Token không hợp lệ hoặc đã hết hạn!" });
  }
};

module.exports = { verifyToken };
