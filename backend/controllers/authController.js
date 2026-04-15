const prisma = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// [POST] ĐĂNG KÝ
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // 1. Kiểm tra email đã tồn tại chưa
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Email này đã được sử dụng!" });
    }

    // 2. Mã hóa mật khẩu
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Lưu vào Database
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    res.status(201).json({ message: "Đăng ký thành công!", userId: newUser.id });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// [POST] ĐĂNG NHẬP
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Tìm user theo email
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: "Email hoặc mật khẩu không đúng!" });
    }

    // 2. Kiểm tra mật khẩu
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Email hoặc mật khẩu không đúng!" });
    }

    // 3. Tạo Token (JWT)
    const token = jwt.sign(
      { userId: user.id, role: user.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' } // Token có hạn 7 ngày
    );

    res.status(200).json({ 
      message: "Đăng nhập thành công!", 
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};
// [GET] Lấy thông tin người dùng hiện tại
const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, name: true, email: true, role: true, created_at: true }
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};
// [PUT] Cập nhật thông tin cá nhân
const updateProfile = async (req, res) => {
  try {
    const { name } = req.body;
    const file = req.file; // Ảnh avatar mới (nếu có)
    const userId = req.user.userId;

    const updateData = {};
    if (name) updateData.name = name;
    if (file) updateData.avatar_url = `/uploads/${file.filename}`;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, name: true, email: true, avatar_url: true }
    });

    res.json({ message: "Cập nhật thành công!", user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: "Lỗi cập nhật", error: error.message });
  }
};

// Nhớ export thêm updateProfile nhé!
module.exports = { register, login, getMe, updateProfile };