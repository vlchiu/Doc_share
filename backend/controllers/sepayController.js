const prisma = require('../db');
const crypto = require('crypto');
const { sendVIPConfirmEmail } = require('../utils/emailService');

// Gói VIP
const VIP_PLANS = {
  1: { months: 1, amount: 29000,  label: '1 tháng' },
  3: { months: 3, amount: 79000,  label: '3 tháng' },
  12: { months: 12, amount: 249000, label: '1 năm' },
};

// ─── HELPER: Kích hoạt VIP sau thanh toán thành công ─────────────────────────
const activateVIP = async (userId, planMonths) => {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan_expires_at: true, email: true, name: true } });
  const now = new Date();
  const base = user.plan_expires_at && user.plan_expires_at > now ? user.plan_expires_at : now;
  const expiresAt = new Date(base);
  expiresAt.setMonth(expiresAt.getMonth() + planMonths);

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { plan: 'VIP', plan_expires_at: expiresAt }
  });

  // Gửi email xác nhận
  sendVIPConfirmEmail(user.email, user.name, planMonths, expiresAt).catch(() => {});

  return updatedUser;
};

// ─── [POST] Tạo QR chuyển khoản SePay ────────────────────────────────────────
const createSepayPayment = async (req, res) => {
  try {
    const { planMonths } = req.body;
    const plan = VIP_PLANS[planMonths];
    if (!plan) return res.status(400).json({ message: "Gói không hợp lệ" });

    const orderId = `SEPAY_${req.user.userId}_${Date.now()}`;
    const amount = plan.amount;

    // Lưu payment pending
    await prisma.payment.create({
      data: {
        order_id: orderId,
        amount,
        plan_months: planMonths,
        provider: 'SEPAY',
        user_id: req.user.userId,
      }
    });

    // Tạo nội dung chuyển khoản
    const transferContent = orderId;

    // Trả về thông tin để frontend hiển thị QR
    res.json({
      orderId,
      amount,
      bankCode: process.env.SEPAY_BANK_CODE,
      accountNumber: process.env.SEPAY_ACCOUNT_NUMBER,
      accountName: process.env.SEPAY_ACCOUNT_NAME,
      transferContent,
      qrUrl: `https://img.vietqr.io/image/${process.env.SEPAY_BANK_CODE}-${process.env.SEPAY_ACCOUNT_NUMBER}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(process.env.SEPAY_ACCOUNT_NAME)}`,
    });
  } catch (error) {
    console.error('SePay create error:', error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// ─── [POST] Webhook nhận callback từ SePay ───────────────────────────────────
const sepayWebhook = async (req, res) => {
  try {
    // Xác minh API Key từ header
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    if (apiKey !== process.env.SEPAY_WEBHOOK_KEY) {
      console.log('❌ SePay webhook: Invalid API Key');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { transferAmount, transferContent, transactionId } = req.body;

    console.log('✅ SePay webhook received:', { transferAmount, transferContent, transactionId });

    // Tìm payment theo order_id trong transferContent
    const orderId = transferContent?.trim();
    if (!orderId || !orderId.startsWith('SEPAY_')) {
      console.log('⚠️ Invalid order ID format:', orderId);
      return res.status(200).json({ message: 'ok' }); // Trả 200 để SePay không retry
    }

    const payment = await prisma.payment.findUnique({ where: { order_id: orderId } });
    if (!payment) {
      console.log('⚠️ Payment not found:', orderId);
      return res.status(200).json({ message: 'ok' });
    }

    if (payment.status === 'SUCCESS') {
      console.log('⚠️ Payment already processed:', orderId);
      return res.status(200).json({ message: 'ok' });
    }

    // Kiểm tra số tiền khớp
    if (parseInt(transferAmount) !== payment.amount) {
      console.log('⚠️ Amount mismatch:', { received: transferAmount, expected: payment.amount });
      return res.status(200).json({ message: 'ok' });
    }

    // Cập nhật payment thành công
    await prisma.payment.update({
      where: { order_id: orderId },
      data: { status: 'SUCCESS', provider_ref: String(transactionId) }
    });

    // Kích hoạt VIP
    await activateVIP(payment.user_id, payment.plan_months);

    console.log('✅ VIP activated for user:', payment.user_id);
    res.status(200).json({ message: 'ok' });
  } catch (error) {
    console.error('❌ SePay webhook error:', error);
    res.status(200).json({ message: 'ok' }); // Vẫn trả 200 để tránh SePay retry liên tục
  }
};

// ─── [GET] Kiểm tra trạng thái thanh toán ────────────────────────────────────
const checkPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const payment = await prisma.payment.findUnique({ where: { order_id: orderId } });
    
    if (!payment) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    }

    res.json({
      orderId: payment.order_id,
      status: payment.status,
      amount: payment.amount,
      planMonths: payment.plan_months,
      createdAt: payment.created_at,
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
};

module.exports = { createSepayPayment, sepayWebhook, checkPaymentStatus };
