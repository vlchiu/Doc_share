const { validEmail, checkEmailDomain } = require('../utils/emailValidation');
const prisma = require('../db');
const bcrypt = require('bcryptjs');
const { issueToken } = require('../utils/session');
const { serializable } = require('../utils/transaction');
const crypto = require('crypto');
const hashSecret = value => crypto.createHash('sha256').update(value).digest('hex');
const { sendVerifyEmail, sendResetPasswordEmail } = require('../utils/emailService');

// [POST] Đăng ký tài khoản chờ xác thực; không thay thông tin tài khoản đã tồn tại.
const register = async (req, res) => {
  try {
    const { name, password } = req.body;
    const email = typeof req.body.email === 'string' ? req.body.email.trim() : '';

    if (typeof name !== 'string' || name.trim().length < 2) return res.status(400).json({ message: "Tên phải có ít nhất 2 ký tự" });
    if (name.trim().length > 100) return res.status(400).json({ message: "Tên không được quá 100 ký tự" });
    if (!validEmail(email)) return res.status(400).json({ message: "Email không hợp lệ" });
    if (typeof password !== 'string' || password.length < 6 || password.length > 72) return res.status(400).json({ message: "Mật khẩu phải có ít nhất 6 ký tự" });

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser && (existingUser.is_email_verified || existingUser.google_id || !existingUser.is_active)) {
      return res.status(400).json({ message: "Email này đã được sử dụng!" });
    }

    const domainError = await checkEmailDomain(email);
    if (domainError) return res.status(domainError.status).json({ message: domainError.message });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Tạo OTP 6 số
    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 phút

    if (existingUser) {
      return res.status(409).json({ message: 'Tài khoản đang chờ xác thực. Hãy gửi lại OTP hoặc dùng chức năng quên mật khẩu.', needVerify: true, email });
    }
    await prisma.user.create({ data: {
      name: name.trim(), email, password: hashedPassword,
      email_verify_token: hashSecret(otp), email_verify_expires: otpExpires,
      is_email_verified: false,
    } });

    try {
      await sendVerifyEmail(email, name.trim(), otp);
    } catch {
      return res.status(503).json({ message: 'Chưa gửi được OTP. Vui lòng thử gửi lại sau 60 giây.' });
    }

    res.status(200).json({
      message: "Đã gửi yêu cầu chuyển thư xác thực. Vui lòng kiểm tra hộp thư và thư rác.",
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
    if (typeof email !== 'string' || typeof otp !== 'string' || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: 'Email hoặc OTP không hợp lệ.' });
    }
    const result = await serializable(async tx => {
      const user = await tx.user.findUnique({ where: { email: email.trim() } });
      if (!user || user.is_email_verified || user.google_id || !user.is_active ||
          !user.email_verify_expires || user.email_verify_expires <= new Date() || user.email_verify_attempts >= 5) return false;
      if (user.email_verify_token !== hashSecret(otp)) {
        await tx.user.update({ where: { id: user.id }, data: { email_verify_attempts: { increment: 1 } } });
        return false;
      }
      await tx.user.update({ where: { id: user.id }, data: {
        is_email_verified: true, email_verify_token: null, email_verify_expires: null, email_verify_attempts: 0,
      } });
      return true;
    });
    if (!result) return res.status(400).json({ message: 'OTP không đúng, đã hết hạn hoặc hết số lần thử. Vui lòng gửi lại mã.' });

    res.json({ message: "Xác thực thành công! Bạn có thể đăng nhập." });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// [POST] Gửi lại OTP xác thực
const resendVerifyEmail = async (req, res) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim() : '';
    if (!email) return res.status(400).json({ message: 'Email không hợp lệ.' });
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: "Email không tồn tại" });
    if (user.is_email_verified || user.google_id || !user.is_active) return res.status(400).json({ message: "Email đã được xác thực" });

    const domainError = await checkEmailDomain(email);
    if (domainError) return res.status(domainError.status).json({ message: domainError.message });

    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    const resent = await prisma.user.updateMany({
      where: { id: user.id, is_email_verified: false, google_id: null, OR: [
        { email_verify_expires: null }, { email_verify_expires: { lte: new Date(Date.now() + 9 * 60 * 1000) } },
      ] },
      data: { email_verify_token: hashSecret(otp), email_verify_expires: otpExpires, email_verify_attempts: 0 }
    });
    if (!resent.count) return res.status(429).json({ message: 'Vui lòng đợi ít nhất 60 giây trước khi gửi lại OTP.' });

    try {
      await sendVerifyEmail(email, user.name, otp);
    } catch {
      return res.status(503).json({ message: 'Chưa gửi được OTP. Vui lòng thử lại sau 60 giây.' });
    }
    res.json({ message: "Đã gửi lại mã OTP!" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// [POST] Quên mật khẩu — gửi link reset
const forgotPassword = async (req, res) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim() : '';
    if (!email) return res.status(400).json({ message: 'Email không hợp lệ.' });
    if (!email) return res.status(400).json({ message: "Vui lòng nhập email" });

    const user = await prisma.user.findUnique({ where: { email } });
    // Luôn trả về thành công để tránh lộ thông tin email tồn tại
    if (!user || !user.is_active || !user.password) {
      return res.json({ message: "Nếu email tồn tại, chúng tôi đã gửi link đặt lại mật khẩu." });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1h

    await prisma.user.update({
      where: { id: user.id },
      data: { reset_token: hashSecret(resetToken), reset_token_expires: resetExpires }
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
    if (typeof token !== 'string' || typeof newPassword !== 'string') return res.status(400).json({ message: "Thiếu thông tin" });
    if (newPassword.length < 6 || newPassword.length > 72) return res.status(400).json({ message: "Mật khẩu phải có ít nhất 6 ký tự" });

    const user = await prisma.user.findFirst({
      where: {
        reset_token: hashSecret(token),
        reset_token_expires: { gt: new Date() },
      }
    });

    if (!user || !user.is_active) return res.status(400).json({ message: "Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn" });

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(newPassword, salt);

    const changed = await prisma.user.updateMany({
      where: { id: user.id, reset_token: hashSecret(token), reset_token_expires: { gt: new Date() } },
      data: { password: hashed, reset_token: null, reset_token_expires: null, token_version: { increment: 1 } }
    });
    if (!changed.count) return res.status(400).json({ message: 'Link đã được sử dụng hoặc hết hạn.' });

    res.json({ message: "Đặt lại mật khẩu thành công! Bạn có thể đăng nhập." });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// [POST] ĐĂNG NHẬP
const login = async (req, res) => {
  try {
    const { password } = req.body;
    const email = typeof req.body.email === 'string' ? req.body.email.trim() : '';
    if (!email || typeof password !== 'string' || password.length > 72) return res.status(400).json({ message: 'Thông tin đăng nhập không hợp lệ.' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) return res.status(400).json({ message: "Email hoặc mật khẩu không đúng! Hãy dùng Google nếu tài khoản chưa có mật khẩu." });

    if (!user.is_active) return res.status(403).json({ message: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin." });

    // Password login requires a verified account regardless of linked OAuth providers.
    if (!user.is_email_verified) {
      return res.status(403).json({
        message: "Email chưa được xác thực. Vui lòng kiểm tra hộp thư và xác thực email.",
        needVerify: true,
        email: user.email
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Email hoặc mật khẩu không đúng!" });

    const token = issueToken(user);

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
      select: {
        id: true, name: true, email: true, role: true,
        avatar_url: true, created_at: true,
        plan: true, plan_expires_at: true, monthly_downloads: true,
        download_reset_at: true
      }
    });

    if (!user) return res.status(404).json({ message: "Không tìm thấy tài khoản" });

    // Kiểm tra nếu tài khoản VIP đã hết hạn thì tự động cập nhật về FREE
    const now = new Date();
    if (user.plan === 'VIP' && user.plan_expires_at && user.plan_expires_at < now) {
      const expired = await prisma.user.updateMany({
        where: { id: user.id, plan: 'VIP', plan_expires_at: { lt: now } }, data: { plan: 'FREE' }
      });
      if (expired.count) user.plan = 'FREE';
      else {
        const latest = await prisma.user.findUnique({ where: { id: user.id }, select: { plan: true, plan_expires_at: true } });
        Object.assign(user, latest);
      }
    }

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
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) return res.status(400).json({ message: 'Tên phải từ 2 đến 100 ký tự.' });
    updateData.name = name.trim();
    if (file) updateData.avatar_url = file.secure_url || file.path;

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

    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin" });
    if (newPassword.length < 6 || newPassword.length > 72) return res.status(400).json({ message: "Mật khẩu mới phải có ít nhất 6 ký tự" });

    const user = await prisma.user.findUnique({ where: { id: userId } });

    // User đăng nhập Google không có password
    if (!user.password) return res.status(400).json({ message: "Tài khoản Google không thể đổi mật khẩu theo cách này" });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: "Mật khẩu hiện tại không đúng" });

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(newPassword, salt);
    const changed = await prisma.user.updateMany({ where: { id: userId, token_version: user.token_version }, data: { password: hashed, token_version: { increment: 1 }, reset_token: null, reset_token_expires: null } });
    if (!changed.count) return res.status(409).json({ message: 'Phiên đã thay đổi. Vui lòng đăng nhập lại.' });

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
    if (typeof newPassword !== 'string' || newPassword.length < 6 || newPassword.length > 72) return res.status(400).json({ message: "Mật khẩu mới phải có ít nhất 6 ký tự" });

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(newPassword, salt);
    await prisma.user.update({ where: { id: parseInt(id) }, data: { password: hashed, token_version: { increment: 1 }, reset_token: null, reset_token_expires: null } });
    res.json({ message: "Đã reset mật khẩu thành công!" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

module.exports = { register, login, getMe, updateProfile, changePassword, adminResetPassword, verifyEmail, resendVerifyEmail, forgotPassword, resetPassword };