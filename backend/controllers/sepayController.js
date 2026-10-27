const prisma = require('../db');
const crypto = require('crypto');
const { serializable } = require('../utils/transaction');
const { sendVIPConfirmEmail } = require('../utils/emailService');

const VIP_PLANS = { 1: 29000, 3: 79000, 12: 249000 };

function orderReferences(code, content) {
  const refs = new Set();
  for (const value of [code, content]) {
    if (typeof value !== 'string') continue;
    // Exact identifiers only. Legacy bank descriptions sometimes remove underscores.
    for (const match of value.toUpperCase().matchAll(/\b(SEPAY[A-F0-9]{24}|SEPAY_\d+_\d{13}|SEPAY\d{14,23})\b/g)) {
      const ref = match[1];
      if (/^SEPAY\d{14,23}$/.test(ref)) {
        const digits = ref.slice(5);
        refs.add(`SEPAY_${digits.slice(0, -13)}_${digits.slice(-13)}`);
      } else refs.add(ref);
    }
  }
  return [...refs];
}

const createSepayPayment = async (req, res) => {
  try {
    const { planMonths } = req.body;
    if (!Number.isInteger(planMonths) || !Object.hasOwn(VIP_PLANS, planMonths)) return res.status(400).json({ message: 'Gói không hợp lệ.' });
    const { SEPAY_BANK_CODE: bankCode, SEPAY_ACCOUNT_NUMBER: accountNumber, SEPAY_ACCOUNT_NAME: accountName, SEPAY_WEBHOOK_KEY: key } = process.env;
    if (!bankCode || !accountNumber || !accountName || !key) return res.status(503).json({ message: 'Thanh toán chưa được cấu hình đầy đủ.' });
    const orderId = `SEPAY${crypto.randomBytes(12).toString('hex').toUpperCase()}`;
    const amount = VIP_PLANS[planMonths];
    await prisma.payment.create({ data: { order_id: orderId, amount, plan_months: planMonths, provider: 'SEPAY', user_id: req.user.userId } });
    res.json({ orderId, amount, bankCode, accountNumber, accountName, transferContent: orderId,
      qrUrl: `https://img.vietqr.io/image/${encodeURIComponent(bankCode)}-${encodeURIComponent(accountNumber)}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(orderId)}&accountName=${encodeURIComponent(accountName)}` });
  } catch (error) {
    console.error('SePay create error:', error.code || error.name);
    res.status(500).json({ message: 'Chưa thể tạo đơn thanh toán.' });
  }
};

const sepayWebhook = async (req, res) => {
  const key = process.env.SEPAY_WEBHOOK_KEY;
  const account = process.env.SEPAY_ACCOUNT_NUMBER;
  if (!key || !account) return res.status(503).json({ success: false });
  const supplied = /^Apikey (.+)$/i.exec(req.headers.authorization || '')?.[1] || '';
  const left = Buffer.from(supplied), right = Buffer.from(key);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return res.status(401).json({ success: false });

  const { id, transferAmount, accountNumber, transferType, code, content } = req.body;
  if (!/^[1-9]\d{0,30}$/.test(String(id)) || (typeof id === 'number' && !Number.isSafeInteger(id)) ||
      !Number.isSafeInteger(transferAmount) || transferAmount <= 0 || transferAmount > 2147483647 ||
      typeof accountNumber !== 'string' || !['in', 'out'].includes(transferType)) {
    return res.status(400).json({ success: false, message: 'Payload không hợp lệ.' });
  }
  const receiptId = String(id);
  const refs = orderReferences(code, content);
  try {
    const activated = await serializable(async tx => {
      if (await tx.sepayReceipt.findUnique({ where: { id: receiptId } })) return null;
      const receipt = { id: receiptId, amount: transferAmount, order_ref: refs.length === 1 ? refs[0] : null };
      const unmatched = async reason => {
        await tx.sepayReceipt.create({ data: { ...receipt, status: 'UNMATCHED', reason } });
        return null;
      };
      if (transferType !== 'in') return unmatched('OUTGOING_TRANSFER');
      if (accountNumber.trim() !== account.trim()) return unmatched('ACCOUNT_MISMATCH');
      if (refs.length !== 1) return unmatched('MISSING_OR_AMBIGUOUS_ORDER');
      const payment = await tx.payment.findUnique({ where: { order_id: refs[0] } });
      if (!payment || payment.provider !== 'SEPAY') return unmatched('ORDER_NOT_FOUND');
      // Also reject replay of transactions recorded by the pre-migration handler.
      if (await tx.payment.findFirst({ where: { provider: 'SEPAY', provider_ref: receiptId } })) return unmatched('TRANSACTION_ALREADY_USED');
      if (payment.status !== 'PENDING') return unmatched('ORDER_NOT_PENDING');
      if (payment.amount !== transferAmount) return unmatched('AMOUNT_MISMATCH');
      const user = await tx.user.findUnique({ where: { id: payment.user_id } });
      if (!user || !user.is_active) return unmatched('ACCOUNT_UNAVAILABLE');
      const now = new Date();
      const expiresAt = new Date(user.plan_expires_at && user.plan_expires_at > now ? user.plan_expires_at : now);
      // Clamp to end of month rather than overflowing Jan 31 into March.
      const day = expiresAt.getUTCDate();
      expiresAt.setUTCDate(1);
      expiresAt.setUTCMonth(expiresAt.getUTCMonth() + payment.plan_months);
      const lastDay = new Date(Date.UTC(expiresAt.getUTCFullYear(), expiresAt.getUTCMonth() + 1, 0)).getUTCDate();
      expiresAt.setUTCDate(Math.min(day, lastDay));
      const claimed = await tx.payment.updateMany({ where: { id: payment.id, status: 'PENDING' }, data: { status: 'SUCCESS', provider_ref: receiptId } });
      if (claimed.count !== 1) throw new Error('Payment changed concurrently');
      await tx.user.update({ where: { id: user.id }, data: { plan: 'VIP', plan_expires_at: expiresAt } });
      await tx.sepayReceipt.create({ data: { ...receipt, status: 'APPLIED' } });
      return { email: user.email, name: user.name, months: payment.plan_months, expiresAt };
    });
    if (activated) sendVIPConfirmEmail(activated.email, activated.name, activated.months, activated.expiresAt).catch(() => {});
    return res.json({ success: true });
  } catch (error) {
    // Concurrent duplicate receipt: acknowledge only if the other transaction committed.
    if (error.code === 'P2002') {
      try {
        if (await prisma.sepayReceipt.findUnique({ where: { id: receiptId } })) return res.json({ success: true });
      } catch { /* Return retryable failure below. */ }
    }
    console.error('SePay webhook processing failed:', error.code || error.name);
    return res.status(500).json({ success: false, message: 'Vui lòng gửi lại giao dịch.' });
  }
};

const checkPaymentStatus = async (req, res) => {
  try {
    const payment = await prisma.payment.findFirst({ where: { order_id: req.params.orderId, user_id: req.user.userId, provider: 'SEPAY' } });
    if (!payment) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
    res.setHeader('Cache-Control', 'no-store');
    res.json({ orderId: payment.order_id, status: payment.status, amount: payment.amount, planMonths: payment.plan_months, createdAt: payment.created_at });
  } catch {
    res.status(500).json({ message: 'Chưa thể kiểm tra đơn hàng.' });
  }
};

module.exports = { createSepayPayment, sepayWebhook, checkPaymentStatus, orderReferences };
