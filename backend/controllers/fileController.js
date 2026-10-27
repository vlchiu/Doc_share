const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const prisma = require('../db');
const { serializable } = require('../utils/transaction');
const { canReadDocument } = require('../utils/documentAccess');
const { sourceForDocument } = require('../utils/documentStorage');

function serveDocumentFile(req, res) {
  return deliverFile(req, res, true);
}

function quota(user, doc, actor) {
  const now = new Date();
  const period = date => date?.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit' });
  const used = period(now) === period(user.download_reset_at) ? user.monthly_downloads : 0;
  const vip = user.plan === 'VIP' && user.plan_expires_at && user.plan_expires_at > now;
  const exempt = actor.role === 'ADMIN' || doc.user_id === actor.userId;
  const limit = Math.max(1, Number.parseInt(process.env.FREE_DOWNLOAD_LIMIT, 10) || 10);
  return { now, used, vip, exempt, exceeded: !exempt && !vip && used >= limit };
}

async function deliverFile(req, res, preview) {
  try {
    const deliveryKey = req.get?.('X-Delivery-ID') || crypto.randomUUID();
    if (!/^[a-f0-9-]{36}$/i.test(deliveryKey)) return res.status(400).json({ message: 'Mã yêu cầu không hợp lệ.' });
    const matches = grant => grant && grant.user_id === req.user.userId && grant.document_id === req.document.id &&
      grant.content_version === req.document.content_version && grant.created_at > new Date(Date.now() - 5 * 60 * 1000);
    const previous = await prisma.downloadHistory.findUnique({ where: { delivery_key: deliveryKey } });
    if (previous && !matches(previous)) return res.status(409).json({ message: 'Yêu cầu đã hết hạn. Vui lòng mở lại tài liệu.' });
    const currentUser = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!currentUser?.is_active || currentUser.token_version !== req.user.tokenVersion) return res.status(401).json({ code: 'AUTH_INVALID', message: 'Vui lòng đăng nhập lại.' });
    if (!previous && quota(currentUser, req.document, req.user).exceeded) return res.status(403).json({ limitReached: true, message: 'Đã đạt giới hạn tải tháng này.' });
    const source = sourceForDocument(req.document);
    // Fetch before charging quota so a storage failure does not consume a download.
    const bytes = source.path ? await fs.promises.readFile(source.path) : Buffer.from((await axios.get(source.url, {
      responseType: 'arraybuffer', timeout: 30000, maxRedirects: 0, maxContentLength: 20 * 1024 * 1024,
    })).data);
    const result = await serializable(async tx => {
      const doc = await tx.document.findUnique({ where: { id: req.document.id } });
      const user = await tx.user.findUnique({ where: { id: req.user.userId } });
      if (!user?.is_active || user.token_version !== req.user.tokenVersion || !canReadDocument(doc, req.user) || doc.content_version !== req.document.content_version) return { status: 'DENIED' };
      const prior = await tx.downloadHistory.findUnique({ where: { delivery_key: deliveryKey } });
      if (prior) return { status: matches(prior) ? 'OK' : 'DENIED', count: doc.download_count };
      const { now, used, vip, exempt, exceeded } = quota(user, doc, req.user);
      if (exceeded) return { status: 'LIMIT' };
      if (exempt) return { status: 'OK', count: doc.download_count };
      await tx.user.update({ where: { id: user.id }, data: {
        monthly_downloads: used + 1, download_reset_at: now, ...(vip ? {} : { plan: 'FREE' }),
      } });
      const updated = await tx.document.update({ where: { id: doc.id }, data: { download_count: { increment: 1 } } });
      await tx.downloadHistory.create({ data: { user_id: user.id, document_id: doc.id, delivery_key: deliveryKey, content_version: doc.content_version } });
      return { status: 'OK', count: updated.download_count };
    });
    if (result.status === 'DENIED') return res.status(403).json({ message: 'Quyền hoặc phiên bản tài liệu đã thay đổi. Vui lòng tải lại trang.' });
    if (result.status === 'LIMIT') return res.status(403).json({ limitReached: true, message: 'Đã đạt giới hạn tải tháng này.' });
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Type', req.document.file_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', preview ? 'inline' : 'attachment');
    res.setHeader('X-Download-Count', String(result.count));
    if (preview) res.setHeader('Content-Security-Policy', "sandbox; default-src 'none'");
    return res.send(bytes);
  } catch (error) {
    console.error('Download failed:', error.code || error.name);
    return res.status(503).json({ message: 'Chưa thể tải tài liệu. Vui lòng thử lại.' });
  }
}

module.exports = { serveDocumentFile, downloadDocumentFile: (req, res) => deliverFile(req, res, false) };
