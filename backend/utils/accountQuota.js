const prisma = require('../db');
const { serializable } = require('./transaction');
const { randomUUID } = require('node:crypto');
const enabled = () => process.env.ACCOUNT_QUOTAS_ENABLED === 'true';
const problem = (status, code, message) => Object.assign(new Error(message), { status, code });
function dayWindow(now = new Date()) {
  const day = new Date(now.getTime() + 7 * 3600000).toISOString().slice(0, 10);
  return { day, resetAt: new Date(Date.parse(`${day}T00:00:00+07:00`) + 86400000).toISOString() };
}
function limits(user, now = new Date()) {
  const plan = user.plan === 'VIP' && user.plan_expires_at && new Date(user.plan_expires_at) > now ? 'VIP' : 'FREE';
  const read = (name, factor = 1) => {
    const raw = process.env[`${plan}_${name}`] || '0';
    if (!/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw) * factor)) throw problem(503, 'QUOTA_CONFIG', 'Cấu hình hạn mức chưa hợp lệ.');
    return Number(raw) * factor;
  };
  return { plan, ai: read('AI_DAILY_LIMIT'), storage: read('STORAGE_MB', 1024 * 1024) };
}
async function snapshot(tx, userId) {
  const user = await tx.user.findUnique({ where: { id: userId } });
  if (!user?.is_active) throw problem(403, 'ACCOUNT_DISABLED', 'Tài khoản không khả dụng.');
  const config = limits(user), window = dayWindow();
  const ai = await tx.usageReservation.aggregate({ where: { user_id: userId, kind: 'AI', day: window.day }, _sum: { amount: true } });
  const storage = await tx.document.aggregate({ where: { user_id: userId }, _sum: { file_size: true } });
  const pending = await tx.usageReservation.aggregate({ where: { user_id: userId, kind: 'STORAGE' }, _sum: { amount: true } });
  const unknown = await tx.document.count({ where: { user_id: userId, file_size: null } });
  return { enabled: true, plan: config.plan, resetAt: window.resetAt, day: window.day,
    ai: { used: ai._sum.amount || 0, limit: config.ai || null },
    storage: { used: storage._sum.file_size || 0, reserved: pending._sum.amount || 0, unknownFiles: unknown, limit: config.storage || null } };
}
async function reserve(userId, kind, amount = 1) {
  if (!enabled()) return null;
  if (!Number.isSafeInteger(amount) || amount < 1) throw problem(400, 'QUOTA_SIZE', 'Kích thước yêu cầu không hợp lệ.');
  return serializable(async tx => {
    // Serialize reservation decisions per account across all server instances.
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
    const usage = await snapshot(tx, userId);
    if (kind === 'AI' && usage.ai.limit && usage.ai.used + amount > usage.ai.limit) throw problem(429, 'AI_QUOTA_EXCEEDED', 'Đã hết lượt AI hôm nay. Hạn mức đặt lại lúc 00:00 giờ Việt Nam.');
    if (kind === 'STORAGE') {
      if (usage.storage.limit && usage.storage.unknownFiles) throw problem(409, 'STORAGE_UNVERIFIED', 'Cần đối soát kích thước tài liệu cũ trước khi tải thêm.');
      if (usage.storage.limit && usage.storage.used + usage.storage.reserved + amount > usage.storage.limit) throw problem(413, 'STORAGE_QUOTA_EXCEEDED', 'Dung lượng tài khoản không đủ cho tệp mới.');
    }
    const id = randomUUID();
    await tx.usageReservation.create({ data: { id, user_id: userId, kind, day: usage.day, amount } });
    return id;
  });
}
async function release(id, tx = prisma) { if (id) await tx.usageReservation.deleteMany({ where: { id, completed: false } }); }
async function complete(id, tx = prisma) { if (id) await tx.usageReservation.updateMany({ where: { id }, data: { completed: true } }); }
async function usage(req, res) {
  try { res.setHeader('Cache-Control', 'no-store'); res.json(enabled() ? await snapshot(prisma, req.user.userId) : { enabled: false }); }
  catch (e) { res.status(e.status || 503).json({ message: e.status ? e.message : 'Chưa thể tải hạn mức.' }); }
}
// Legacy chat endpoints have no persistence/idempotency; each successful call counts.
function limitedChat(handler) {
  return async (req, res) => {
    let id;
    try {
      id = await reserve(req.user.userId, 'AI');
      let status = 200, payload;
      await handler(req, { status(s) { status = s; return this; }, json(p) { payload = p; return this; } });
      if (status < 400 && payload?.reply) await complete(id);
      else await release(id);
      res.status(status).json(payload);
    } catch (e) {
      await release(id).catch(() => {});
      res.status(e.status || 503).json({ code: e.code, message: e.status ? e.message : 'Chưa thể xử lý hạn mức AI.' });
    }
  };
}
module.exports = { enabled, limits, dayWindow, reserve, release, complete, usage, limitedChat };
