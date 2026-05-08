const prisma = require('../db');
const crypto = require('crypto');
const https = require('https');
const { sendVIPConfirmEmail } = require('../utils/emailService');

// Gói VIP
const VIP_PLANS = {
  1: { months: 1, amount: 29000,  label: '1 tháng' },
  3: { months: 3, amount: 79000,  label: '3 tháng' },
  12: { months: 12, amount: 249000, label: '1 năm' },
};

// ─── HELPER: Kích hoạt VIP sau thanh toán thành công ─────────────────────────
const activateVIP = async (userId, planMonths) => {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan_expires_at: true } });
  const now = new Date();
  const base = user.plan_expires_at && user.plan_expires_at > now ? user.plan_expires_at : now;
  const expiresAt = new Date(base);
  expiresAt.setMonth(expiresAt.getMonth() + planMonths);

  return prisma.user.update({
    where: { id: userId },
    data: { plan: 'VIP', plan_expires_at: expiresAt }
  });
};

// ─── MOMO ────────────────────────────────────────────────────────────────────
const createMomoPayment = async (req, res) => {
  try {
    const { planMonths } = req.body;
    const plan = VIP_PLANS[planMonths];
    if (!plan) return res.status(400).json({ message: "Gói không hợp lệ" });

    const partnerCode = process.env.MOMO_PARTNER_CODE;
    const accessKey   = process.env.MOMO_ACCESS_KEY;
    const secretKey   = process.env.MOMO_SECRET_KEY;
    const orderId     = `DOCSHARE_${req.user.userId}_${Date.now()}`;
    const requestId   = orderId;
    const amount      = plan.amount;
    const orderInfo   = `Nâng cấp VIP ${plan.label} - DocShare`;
    const redirectUrl = `${process.env.FRONTEND_URL}/payment/result`;
    const ipnUrl      = `${process.env.BACKEND_URL}/api/payment/momo/ipn`;
    const requestType = 'payWithMethod';
    const extraData   = Buffer.from(JSON.stringify({ userId: req.user.userId, planMonths })).toString('base64');

    const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
    const signature = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');

    const body = JSON.stringify({
      partnerCode, accessKey, requestId, amount, orderId, orderInfo,
      redirectUrl, ipnUrl, extraData, requestType, signature,
      lang: 'vi',
    });

    // Lưu payment pending
    await prisma.payment.create({
      data: { order_id: orderId, amount, plan_months: planMonths, provider: 'MOMO', user_id: req.user.userId }
    });

    // Gọi MoMo API
    const options = {
      hostname: 'test-payment.momo.vn', // Đổi thành payment.momo.vn khi production
      port: 443,
      path: '/v2/gateway/api/create',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };

    const momoRes = await new Promise((resolve, reject) => {
      const req = https.request(options, r => {
        let data = '';
        r.on('data', chunk => data += chunk);
        r.on('end', () => resolve(JSON.parse(data)));
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });

    if (momoRes.resultCode !== 0) {
      return res.status(400).json({ message: momoRes.message || "Tạo thanh toán MoMo thất bại" });
    }

    res.json({ payUrl: momoRes.payUrl, orderId });
  } catch (error) {
    console.error('MoMo error:', error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// IPN callback từ MoMo
const momoIPN = async (req, res) => {
  try {
    const { orderId, resultCode, transId, extraData } = req.body;
    res.status(200).json({ message: 'ok' }); // Phải trả về 200 ngay

    if (resultCode !== 0) {
      await prisma.payment.updateMany({ where: { order_id: orderId }, data: { status: 'FAILED' } });
      return;
    }

    const payment = await prisma.payment.findUnique({ where: { order_id: orderId } });
    if (!payment || payment.status === 'SUCCESS') return;

    await prisma.payment.update({
      where: { order_id: orderId },
      data: { status: 'SUCCESS', provider_ref: String(transId) }
    });

    const updatedUser = await activateVIP(payment.user_id, payment.plan_months);
    const user = await prisma.user.findUnique({ where: { id: payment.user_id }, select: { email: true, name: true } });
    sendVIPConfirmEmail(user.email, user.name, payment.plan_months, updatedUser.plan_expires_at).catch(() => {});
  } catch (error) {
    console.error('MoMo IPN error:', error);
  }
};

// ─── VNPAY ───────────────────────────────────────────────────────────────────
// Helper: format date theo GMT+7 cho VNPay (yyyyMMddHHmmss)
const formatVNPayDate = (date) => {
  const pad = n => String(n).padStart(2, '0');
  const d = new Date(date.getTime() + 7 * 60 * 60 * 1000); // UTC+7
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
};

const createVNPayPayment = async (req, res) => {
  try {
    const { planMonths } = req.body;
    const plan = VIP_PLANS[planMonths];
    if (!plan) return res.status(400).json({ message: "Gói không hợp lệ" });

    const tmnCode   = process.env.VNPAY_TMN_CODE;
    const secretKey = process.env.VNPAY_HASH_SECRET;
    const orderId   = `DS${req.user.userId}${Date.now()}`;
    const amount    = plan.amount * 100; // VNPay nhân 100
    const now       = new Date();
    const createDate = formatVNPayDate(now);
    const expireDate = formatVNPayDate(new Date(now.getTime() + 15 * 60 * 1000)); // +15 phút

    // Lấy IP thực, tránh IPv6
    const ipAddr = (req.headers['x-forwarded-for'] || req.ip || '127.0.0.1')
      .split(',')[0].trim().replace('::ffff:', '') || '127.0.0.1';

    const params = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Amount: amount,
      vnp_CreateDate: createDate,
      vnp_CurrCode: 'VND',
      vnp_IpAddr: ipAddr,
      vnp_Locale: 'vn',
      vnp_OrderInfo: `VIP${planMonths}T_${req.user.userId}`,
      vnp_OrderType: 'other',
      vnp_ReturnUrl: `${process.env.VNPAY_RETURN_URL || process.env.BACKEND_URL + '/api/payment/vnpay/return'}`,
      vnp_TxnRef: orderId,
      vnp_ExpireDate: expireDate,
    };

    const sortedKeys = Object.keys(params).sort();
    const sortedParams = {};
    sortedKeys.forEach(key => { sortedParams[key] = params[key]; });

    const signData = sortedKeys.map(key => `${key}=${encodeURIComponent(sortedParams[key]).replace(/%20/g, '+')}`).join('&');
    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    const queryString = sortedKeys.map(key => `${key}=${encodeURIComponent(sortedParams[key]).replace(/%20/g, '+')}`).join('&');
    const payUrl = `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?${queryString}&vnp_SecureHash=${signed}`;

    await prisma.payment.create({
      data: { order_id: orderId, amount: plan.amount, plan_months: planMonths, provider: 'VNPAY', user_id: req.user.userId }
    });

    res.json({ payUrl, orderId });
  } catch (error) {
    console.error('VNPay error:', error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// Return URL từ VNPay (redirect về frontend)
const vnpayReturn = async (req, res) => {
  try {
    // Bỏ qua trang cảnh báo ngrok
    res.setHeader('ngrok-skip-browser-warning', 'true');

    const params = { ...req.query };
    const secureHash = params.vnp_SecureHash;
    delete params.vnp_SecureHash;
    delete params.vnp_SecureHashType;

    const sortedKeys = Object.keys(params).sort();
    const signData = sortedKeys.map(key => `${key}=${encodeURIComponent(params[key]).replace(/%20/g, '+')}`).join('&');
    const hmac = crypto.createHmac('sha512', process.env.VNPAY_HASH_SECRET);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    const orderId = params.vnp_TxnRef;
    const responseCode = params.vnp_ResponseCode;

    if (signed !== secureHash || responseCode !== '00') {
      await prisma.payment.updateMany({ where: { order_id: orderId }, data: { status: 'FAILED' } });
      return res.redirect(`${process.env.FRONTEND_URL}/payment/result?status=failed`);
    }

    const payment = await prisma.payment.findUnique({ where: { order_id: orderId } });
    if (payment && payment.status !== 'SUCCESS') {
      await prisma.payment.update({
        where: { order_id: orderId },
        data: { status: 'SUCCESS', provider_ref: params.vnp_TransactionNo }
      });
      const updatedUser = await activateVIP(payment.user_id, payment.plan_months);
      const user = await prisma.user.findUnique({ where: { id: payment.user_id }, select: { email: true, name: true } });
      sendVIPConfirmEmail(user.email, user.name, payment.plan_months, updatedUser.plan_expires_at).catch(() => {});
    }

    res.redirect(`${process.env.FRONTEND_URL}/payment/result?status=success`);
  } catch (error) {
    console.error('VNPay return error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/payment/result?status=failed`);
  }
};

// ─── Lấy lịch sử thanh toán ──────────────────────────────────────────────────
const getPaymentHistory = async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { user_id: req.user.userId },
      orderBy: { created_at: 'desc' }
    });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

// ─── Lấy danh sách gói VIP ───────────────────────────────────────────────────
const getVIPPlans = async (req, res) => {
  res.json(Object.entries(VIP_PLANS).map(([key, val]) => ({ key: parseInt(key), ...val })));
};

module.exports = { createMomoPayment, momoIPN, createVNPayPayment, vnpayReturn, getPaymentHistory, getVIPPlans };
