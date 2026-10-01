const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const FROM_EMAIL = `"DocShare" <${process.env.EMAIL_USER}>`;

// ── Gửi OTP xác thực đăng ký ──────────────────────────────────────────────────
const sendVerifyEmail = async (toEmail, name, otp) => {
  await transporter.sendMail({
    from: FROM_EMAIL,
    to: toEmail,
    subject: 'Ma xac thuc dang ky DocShare',
    // Plain text — quan trọng để tránh spam
    text: `Xin chao ${name},\n\nMa OTP cua ban la: ${otp}\n\nMa co hieu luc trong 10 phut. Khong chia se ma nay cho ai.\n\nTran trong,\nDocShare`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#1e3a8a,#3b82f6);padding:28px 32px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:24px">DocShare</h1>
        </div>
        <div style="padding:32px">
          <h2 style="color:#1a1a1a;margin:0 0 12px">Xin chao ${name}!</h2>
          <p style="color:#64748b;line-height:1.6">Cam on ban da dang ky tai khoan DocShare. Nhap ma OTP ben duoi de xac thuc email.</p>
          <div style="text-align:center;margin:28px 0">
            <div style="display:inline-block;background:#f0f7ff;border:2px solid #3b82f6;border-radius:12px;padding:20px 40px">
              <div style="font-size:36px;font-weight:bold;letter-spacing:10px;color:#1e3a8a">${otp}</div>
            </div>
          </div>
          <p style="color:#94a3b8;font-size:13px;text-align:center">Ma co hieu luc trong <strong>10 phut</strong>. Khong chia se ma nay cho ai.</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
          <p style="color:#94a3b8;font-size:12px;text-align:center">DocShare - Nen tang chia se tai lieu</p>
        </div>
      </div>
    `,
  });
};

// ── Gửi link reset mật khẩu ───────────────────────────────────────────────────
const sendResetPasswordEmail = async (toEmail, name, token) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  await transporter.sendMail({
    from: FROM_EMAIL,
    to: toEmail,
    subject: 'Dat lai mat khau DocShare',
    text: `Xin chao ${name},\n\nBan da yeu cau dat lai mat khau. Truy cap link sau de dat lai:\n${resetUrl}\n\nLink co hieu luc trong 1 gio.\n\nNeu ban khong yeu cau, hay bo qua email nay.\n\nDocShare`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#1e3a8a,#3b82f6);padding:28px 32px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:24px">DocShare</h1>
        </div>
        <div style="padding:32px">
          <h2 style="color:#1a1a1a;margin:0 0 12px">Dat lai mat khau</h2>
          <p style="color:#64748b;line-height:1.6">Xin chao <strong>${name}</strong>, chung toi nhan duoc yeu cau dat lai mat khau cho tai khoan cua ban.</p>
          <div style="text-align:center;margin:28px 0">
            <a href="${resetUrl}" style="background:#3b82f6;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;display:inline-block">
              Dat lai mat khau
            </a>
          </div>
          <p style="color:#94a3b8;font-size:13px">Link co hieu luc trong <strong>1 gio</strong>. Neu ban khong yeu cau, hay bo qua email nay.</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
          <p style="color:#94a3b8;font-size:12px;text-align:center">DocShare - Nen tang chia se tai lieu</p>
        </div>
      </div>
    `,
  });
};

// ── Gửi xác nhận kích hoạt VIP ────────────────────────────────────────────────
const sendVIPConfirmEmail = async (toEmail, name, planMonths, expiresAt) => {
  await transporter.sendMail({
    from: FROM_EMAIL,
    to: toEmail,
    subject: 'Tai khoan VIP da duoc kich hoat - DocShare',
    text: `Xin chao ${name},\n\nTai khoan VIP cua ban da duoc kich hoat thanh cong.\n\nGoi: VIP ${planMonths} thang\nHet han: ${new Date(expiresAt).toLocaleDateString('vi-VN')}\nTai xuong: Khong gioi han\n\nDocShare`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#7c3aed,#db2777);padding:28px 32px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:24px">DocShare VIP</h1>
        </div>
        <div style="padding:32px">
          <h2 style="color:#1a1a1a;margin:0 0 12px">Chuc mung ${name}!</h2>
          <p style="color:#64748b;line-height:1.6">Tai khoan VIP cua ban da duoc kich hoat thanh cong.</p>
          <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:8px;padding:16px;margin:20px 0">
            <p style="margin:0;color:#7c3aed;font-weight:bold">Chi tiet goi VIP:</p>
            <p style="margin:8px 0 0;color:#374151">Goi: <strong>VIP ${planMonths} thang</strong></p>
            <p style="margin:4px 0 0;color:#374151">Het han: <strong>${new Date(expiresAt).toLocaleDateString('vi-VN')}</strong></p>
            <p style="margin:4px 0 0;color:#374151">Tai xuong: <strong>Khong gioi han</strong></p>
          </div>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
          <p style="color:#94a3b8;font-size:12px;text-align:center">DocShare - Nen tang chia se tai lieu</p>
        </div>
      </div>
    `,
  });
};

module.exports = { sendVerifyEmail, sendResetPasswordEmail, sendVIPConfirmEmail };
