const prisma = require('../db');

function canReadDocument(doc, user) {
  return !!doc && !doc.deleted_at && !doc.removed_by_admin && (
    doc.status === 'APPROVED' || (user && (user.role === 'ADMIN' || doc.user_id === user.userId))
  );
}

function readableWhere(user) {
  return { deleted_at: null, removed_by_admin: false,
    ...(user?.role === 'ADMIN' ? {} : { OR: [{ status: 'APPROVED' }, ...(user ? [{ user_id: user.userId }] : [])] }) };
}

function publicDocument(doc) {
  if (!doc) return null;
  const { file_url, thumbnail_url, ...data } = doc;
  // Original files are delivered exclusively by the authenticated file endpoint.
  // Only our normalized, separate cover assets can be exposed through the proxy.
  const { coverAsset } = require('./documentCover');
  return { ...data, thumbnail_url: coverAsset(thumbnail_url) ? `/api/documents/thumbnail/${doc.id}?v=${doc.content_version}` : null };
}

function documentAccess({ manage = false, includeDeleted = false, param = 'id' } = {}) {
  return async (req, res, next) => {
    const raw = req.params[param];
    const id = Number(raw);
    if (!/^\d+$/.test(raw || '') || !Number.isSafeInteger(id) || id < 1) return res.status(400).json({ message: 'ID tài liệu không hợp lệ.' });
    try {
      const doc = await prisma.document.findUnique({ where: { id } });
      if (!doc || (!includeDeleted && doc.deleted_at)) return res.status(404).json({ message: 'Không tìm thấy tài liệu.' });
      const permitted = manage
        ? req.user && (req.user.role === 'ADMIN' || (doc.user_id === req.user.userId && !doc.removed_by_admin))
        : canReadDocument(doc, req.user);
      if (!permitted) return res.status(403).json({ message: 'Bạn không có quyền truy cập tài liệu này.' });
      req.document = doc;
      return next();
    } catch {
      return res.status(503).json({ message: 'Chưa thể kiểm tra quyền tài liệu.' });
    }
  };
}

module.exports = { canReadDocument, readableWhere, publicDocument, documentAccess };
