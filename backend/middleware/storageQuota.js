const quota = require('../utils/accountQuota');
const prisma = require('../db');
// Wrap storage, not the file filter: params/body are not yet complete in fileFilter.
function wrapStorage(storage) {
  return {
    async _handleFile(req, file, callback) {
      if (file.fieldname !== 'file' || !quota.enabled()) return storage._handleFile(req, file, callback);
      let reservation;
      try {
        const length = Number(req.headers['content-length']);
        if (!Number.isSafeInteger(length) || length <= 0) throw Object.assign(new Error('Cần Content-Length để kiểm tra dung lượng tải lên.'), { status: 411 });
        // Multipart length is a safe upper bound; individual files are capped at 20 MB.
        reservation = await quota.reserve(req.document?.user_id || req.user.userId, 'STORAGE', Math.min(length, 20 * 1024 * 1024));
        req.storageReservation = reservation;
        storage._handleFile(req, file, (error, result) => {
          if (error) quota.release(reservation).catch(() => {});
          callback(error, result);
        });
      } catch (error) { await quota.release(reservation).catch(() => {}); callback(error); }
    },
    _removeFile(req, file, callback) { storage._removeFile(req, file, callback); }
  };
}
function cleanup(req, res, next) {
  res.once('finish', () => {
    // Completed document writes already release this reservation atomically.
    if (res.statusCode >= 400 && req.storageReservation) {
      (async () => {
        if (req.file?.path) {
          const { deleteStoredFile } = require('../utils/documentStorage');
          await deleteStoredFile(req.file.path);
        }
        await quota.release(req.storageReservation);
      })().catch(() => { console.error('Upload quota cleanup needs reconciliation'); });
    }
  });
  next();
}
async function persist(req, work) {
  if (!req.storageReservation) return work(prisma);
  return prisma.$transaction(async tx => {
    const reservation = await tx.usageReservation.findUnique({ where: { id: req.storageReservation } });
    if (!reservation || !req.file || req.file.size > reservation.amount) throw new Error('Upload reservation missing or too small');
    const result = await work(tx);
    await quota.release(req.storageReservation, tx);
    return result;
  });
}
module.exports = { wrapStorage, cleanup, persist };
