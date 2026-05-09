const prisma = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendVerifyEmail, sendResetPasswordEmail } = require('../utils/emailService');

// [POST] ĐĂNG KÝ — Bước 1: validate + gửi OTP, chưa tạo user
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || name.trim().length < 2) return res.status(400).json({ message: "Tên phải có ít nhất 2 ký tự" });
    if (name.trim().length > 100) return res.status(400).json({ message: "Tên không được quá 100 ký tự" });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: "Email không hợp lệ" });
    if (!password || password.length < 6) return res.status(400).json({ message: "Mật khẩu phải có ít nhất 6 ký tự" });

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser && existingUser.is_email_verified) {
      return res.status(400).json({ message: "Email này đã được sử dụng!" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Tạo OTP 6 số
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 phút

    if (existingUser && !existingUser.is_email_verified) {
      // Cập nhật lại nếu đã đăng ký nhưng chưa verify
      await prisma.user.update({
        where: { email },
        data: {
          name: name.trim(),
          password: hashedPassword,
          email_verify_token: otp,
          email_verify_expires: otpExpires,
        }
      });
    } else {
      // Tạo user mới, chưa verified
      await prisma.user.create({
        data: {
          name: name.trim(),
          email,
          password: hashedPassword,
          email_verify_token: otp,
          email_verify_expires: otpExpires,
          is_email_verified: false,
        },
      });
    }

    // Gửi email background — không block response
    sendVerifyEmail(email, name.trim(), otp).catch(err =>
      console.error('Send OTP email error:', err.message)
    );

    res.status(200).json({
      message: "Mã xác thực đã được gửi về email. Vui lòng kiểm tra hộp thư.",
      email
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// [POST] ĐĂNG KÝ — Bước 2: xác thực OTP → kích hoạt tài khoản
const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: "Thiếu thông tin" });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: "Không tìm thấy tài khoản" });
    if (user.is_email_verified) return res.status(400).json({ message: "Email đã được xác thực" });

    if (user.email_verify_token !== otp) {
      return res.status(400).json({ message: "Mã OTP không đúng" });
    }
    if (!user.email_verify_expires || user.email_verify_expires < new Date()) {
      return res.status(400).json({ message: "Mã OTP đã hết hạn. Vui lòng đăng ký lại." });
    }

    await prisma.user.update({
      where: { email },
      data: {
        is_email_verified: true,
        email_verify_token: null,
        email_verify_expires: null,
      }
    });

    res.json({ message: "Xác thực thành công! Bạn có thể đăng nhập." });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// [POST] Gửi lại OTP xác thực
const resendVerifyEmail = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: "Email không tồn tại" });
    if (user.is_email_verified) return res.status(400).json({ message: "Email đã được xác thực" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { email_verify_token: otp, email_verify_expires: otpExpires }
    });

    sendVerifyEmail(email, user.name, otp).catch(err =>
      console.error('Resend OTP error:', err.message)
    );
    res.json({ message: "Đã gửi lại mã OTP!" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// [POST] Quên mật khẩu — gửi link reset
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Vui lòng nhập email" });

    const user = await prisma.user.findUnique({ where: { email } });
    // Luôn trả về thành công để tránh lộ thông tin email tồn tại
    if (!user || user.google_id) {
      return res.json({ message: "Nếu email tồn tại, chúng tôi đã gửi link đặt lại mật khẩu." });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1h

    await prisma.user.update({
      where: { id: user.id },
      data: { reset_token: resetToken, reset_token_expires: resetExpires }
    });

    sendResetPasswordEmail(email, user.name, resetToken).catch(err =>
      console.error('Send reset email error:', err.message)
    );
    res.json({ message: "Nếu email tồn tại, chúng tôi đã gửi link đặt lại mật khẩu." });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// [POST] Đặt lại mật khẩu
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ message: "Thiếu thông tin" });
    if (newPassword.length < 6) return res.status(400).json({ message: "Mật khẩu phải có ít nhất 6 ký tự" });

    const user = await prisma.user.findFirst({
      where: {
        reset_token: token,
        reset_token_expires: { gt: new Date() },
      }
    });

    if (!user) return res.status(400).json({ message: "Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn" });

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, reset_token: null, reset_token_expires: null }
    });

    res.json({ message: "Đặt lại mật khẩu thành công! Bạn có thể đăng nhập." });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// [POST] ĐĂNG NHẬP
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ message: "Email hoặc mật khẩu không đúng!" });

    if (!user.is_active) return res.status(403).json({ message: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin." });

    // Kiểm tra email đã xác thực chưa (bỏ qua với tài khoản Google)
    if (!user.google_id && !user.is_email_verified) {
      return res.status(403).json({
        message: "Email chưa được xác thực. Vui lòng kiểm tra hộp thư và xác thực email.",
        needVerify: true,
        email: user.email
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Email hoặc mật khẩu không đúng!" });

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: "Đăng nhập thành công!",
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, plan: user.plan }
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

    // User đăng nhập Google không có password
    if (!user.password) return res.status(400).json({ message: "Tài khoản Google không thể đổi mật khẩu theo cách này" });

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

module.exports = { register, login, getMe, updateProfile, changePassword, adminResetPassword, verifyEmail, resendVerifyEmail, forgotPassword, resetPassword };