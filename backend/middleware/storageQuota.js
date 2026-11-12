const quota = require('../utils/accountQuota');
const prisma = require('../db');
async function discardUpload(req, file = req.file) {
  if (req.uploadCommitted || req.uploadDiscarded || req.uploadPersisting) return;
  const url = file?.secure_url || file?.path;
  if (!url) return;
  req.uploadDiscarded = true;
  try {
    // A commit can succeed even when its acknowledgement is lost. Check the
    // database before deleting; on a DB outage leave the asset for reconciliation.
    if (await prisma.document.count({ where: { file_url: url } })) {
      req.uploadCommitted = true;
      return;
    }
    const { deleteStoredFile } = require('../utils/documentStorage');
    await deleteStoredFile(url);
  } finally {
    await quota.release(req.storageReservation);
  }
}
// Wrap storage, not the file filter: params/body are not yet complete in fileFilter.
function wrapStorage(storage) {
  return {
    async _handleFile(req, file, callback) {
      const done = (error, result) => {
        if (req.uploadClosed && result) {
          discardUpload(req, result).catch(() => console.error('Upload cleanup needs reconciliation'));
          return callback(error || new Error('Upload connection closed'));
        }
        callback(error, result);
      };
      if (file.fieldname !== 'file' || !quota.enabled()) return storage._handleFile(req, file, done);
      let reservation;
      try {
        const length = Number(req.headers['content-length']);
        if (!Number.isSafeInteger(length) || length <= 0) throw Object.assign(new Error('Cần Content-Length để kiểm tra dung lượng tải lên.'), { status: 411, code: 'UPLOAD_LENGTH_REQUIRED' });
        // Multipart length is a safe upper bound; individual files are capped at 20 MB.
        reservation = await quota.reserve(req.document?.user_id || req.user.userId, 'STORAGE', Math.min(length, 20 * 1024 * 1024));
        req.storageReservation = reservation;
        storage._handleFile(req, file, (error, result) => {
          if (error) quota.release(reservation).catch(() => {});
          done(error, result);
        });
      } catch (error) { await quota.release(reservation).catch(() => {}); callback(error); }
    },
    _removeFile(req, file, callback) { storage._removeFile(req, file, callback); }
  };
}
function cleanup(req, res, next) {
  const clean = () => {
    if (!req.uploadCommitted) {
      discardUpload(req).catch(() => console.error('Upload cleanup needs reconciliation'));
    }
  };
  res.once('finish', clean);
  res.once('close', () => { req.uploadClosed = true; clean(); });
  next();
}
async function persist(req, work) {
  // A disconnect may have disposed of the file while the controller was doing
  // pre-write validation. Never save a reference to that discarded asset.
  if (req.uploadClosed || req.uploadDiscarded) throw new Error('Upload connection closed before persistence');
  req.uploadPersisting = true;
  try {
    const result = !req.storageReservation ? await work(prisma) : await prisma.$transaction(async tx => {
      const reservation = await tx.usageReservation.findUnique({ where: { id: req.storageReservation } });
      if (!reservation || !req.file || req.file.size > reservation.amount) throw new Error('Upload reservation missing or too small');
      const result = await work(tx);
      await quota.release(req.storageReservation, tx);
      return result;
    });
    // Only a successful database write owns the uploaded asset. A version conflict
    // (count=0) must still dispose of the new file when the response finishes.
    if (result?.count !== 0) req.uploadCommitted = true;
    return result;
  } finally {
    req.uploadPersisting = false;
    if (req.uploadClosed) await discardUpload(req).catch(() => console.error('Upload cleanup needs reconciliation'));
  }
}
module.exports = { wrapStorage, cleanup, persist };
