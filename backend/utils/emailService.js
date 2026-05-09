const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const FROM_EMAIL = process.env.EMAIL_USER || 'noreply@docshare.com';

const sendVerifyEmail = async (toEmail, name, otp) => {
  await sgMail.send({
    to: toEmail,
    from: FROM_EMAIL,
    subject: '✅ Mã xác thực đăng ký DocShare',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#1e3a8a,#3b82f6);padding:28px 32px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:24px">📚 DocShare</h1>
        </div>
        <div style="padding:32px">
          <h2 style="color:#1a1a1a;margin:0 0 12px">Xin chào ${name}! 👋</h2>
          <p style="color:#64748b;line-height:1.6">Cảm ơn bạn đã đăng ký tài khoản DocShare. Nhập mã OTP bên dưới để xác thực email.</p>
          <div style="text-align:center;margin:28px 0">
            <div style="display:inline-block;background:#f0f7ff;border:2px dashed #3b82f6;border-radius:12px;padding:20px 40px">
              <div style="font-size:36px;font-weight:bold;letter-spacing:10px;color:#1e3a8a">${otp}</div>
            </div>
          </div>
          <p style="color:#94a3b8;font-size:13px;text-align:center">Mã có hiệu lực trong <strong>10 phút</strong>. Không chia sẻ mã này cho ai.</p>
        </div>
      </div>
    `,
  });
};

const sendResetPasswordEmail = async (toEmail, name, token) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  await sgMail.send({
    to: toEmail,
    from: FROM_EMAIL,
    subject: '🔑 Đặt lại mật khẩu DocShare',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#1e3a8a,#3b82f6);padding:28px 32px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:24px">📚 DocShare</h1>
        </div>
        <div style="padding:32px">
          <h2 style="color:#1a1a1a;margin:0 0 12px">Đặt lại mật khẩu 🔑</h2>
          <p style="color:#64748b;line-height:1.6">Xin chào <strong>${name}</strong>, chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
          <div style="text-align:center;margin:28px 0">
            <a href="${resetUrl}" style="background:linear-gradient(135deg,#f59e0b,#ef4444);color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;display:inline-block">
              🔑 Đặt lại mật khẩu
            </a>
          </div>
          <p style="color:#94a3b8;font-size:13px">Link có hiệu lực trong <strong>1 giờ</strong>. Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
        </div>
      </div>
    `,
  });
};

const sendVIPConfirmEmail = async (toEmail, name, planMonths, expiresAt) => {
  await sgMail.send({
    to: toEmail,
    from: FROM_EMAIL,
    subject: '💎 Tài khoản VIP đã được kích hoạt!',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#7c3aed,#db2777);padding:28px 32px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:24px">💎 DocShare VIP</h1>
        </div>
        <div style="padding:32px">
          <h2 style="color:#1a1a1a;margin:0 0 12px">Chúc mừng ${name}! 🎉</h2>
          <p style="color:#64748b;line-height:1.6">Tài khoản VIP của bạn đã được kích hoạt thành công.</p>
          <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:8px;padding:16px;margin:20px 0">
            <p style="margin:0;color:#7c3aed;font-weight:bold">📋 Chi tiết gói VIP:</p>
            <p style="margin:8px 0 0;color:#374151">• Gói: <strong>VIP ${planMonths} tháng</strong></p>
            <p style="margin:4px 0 0;color:#374151">• Hết hạn: <strong>${new Date(expiresAt).toLocaleDateString('vi-VN')}</strong></p>
            <p style="margin:4px 0 0;color:#374151">• Tải xuống: <strong>Không giới hạn</strong></p>
          </div>
        </div>
      </div>
    `,
  });
};

module.exports = { sendVerifyEmail, sendResetPasswordEmail, sendVIPConfirmEmail };
