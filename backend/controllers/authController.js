const prisma = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// [POST] ĐĂNG KÝ
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || name.trim().length < 2) return res.status(400).json({ message: "Tên phải có ít nhất 2 ký tự" });
    if (name.trim().length > 100) return res.status(400).json({ message: "Tên không được quá 100 ký tự" });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: "Email không hợp lệ" });
    if (!password || password.length < 6) return res.status(400).json({ message: "Mật khẩu phải có ít nhất 6 ký tự" });

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
    if (!user) return res.status(400).json({ message: "Email hoặc mật khẩu không đúng!" });

    // 2. Kiểm tra tài khoản có bị khóa không
    if (!user.is_active) return res.status(403).json({ message: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin." });

    // 3. Kiểm tra mật khẩu
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Email hoặc mật khẩu không đúng!" });

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
      select: { id: true, name: true, email: true, role: true, avatar_url: true, created_at: true }
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

// [PUT] Đổi mật khẩu
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    if (!currentPassword || !newPassword) return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin" });
    if (newPassword.length < 6) return res.status(400).json({ message: "Mật khẩu mới phải có ít nhất 6 ký tự" });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: "Mật khẩu hiện tại không đúng" });

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(newPassword, salt);
    await prisma.user.update({ where: { id: userId }, data: { password: hashed } });

    res.json({ message: "Đổi mật khẩu thành công!" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// [PUT] Admin reset mật khẩu cho user
const adminResetPassword = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: "Không có quyền" });
    const { id } = req.params;
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ message: "Mật khẩu mới phải có ít nhất 6 ký tự" });

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(newPassword, salt);
    await prisma.user.update({ where: { id: parseInt(id) }, data: { password: hashed } });
    res.json({ message: "Đã reset mật khẩu thành công!" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

module.exports = { register, login, getMe, updateProfile, changePassword, adminResetPassword };