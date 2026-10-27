const express = require('express');
const { 
  uploadDocument, getAllDocuments, getDocumentById, getMyDocuments, getUserDocuments,
  updateDocument, deleteDocument, restoreDocument, permanentDeleteDocument, getTrashDocuments,
  incrementView, getDownloadHistory, deleteDownloadHistory, clearDownloadHistory,
  getComments, addComment, deleteComment,
  getPendingDocuments, approveDocument, rejectDocument,
  toggleSaveDocument, getSavedDocuments, rateDocument
} = require('../controllers/documentController');
const { verifyToken, optionalAuth } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { reportDocument } = require('../controllers/reportController');

const { documentAccess } = require('../utils/documentAccess');
const { serveDocumentFile, downloadDocumentFile } = require('../controllers/fileController');
const router = express.Router();

// --- STATIC ROUTES (phải đặt TRƯỚC dynamic /:id) ---
router.get('/pending', verifyToken, getPendingDocuments);
router.get('/saved', verifyToken, getSavedDocuments);
router.get('/mine', verifyToken, getMyDocuments);
router.get('/history', verifyToken, getDownloadHistory);
router.delete('/history/clear', verifyToken, clearDownloadHistory);
router.delete('/history/:historyId', verifyToken, deleteDownloadHistory);
router.get('/user/:userId', getUserDocuments);
router.get('/trash', verifyToken, getTrashDocuments);
router.post('/upload', verifyToken, upload.single('file'), uploadDocument);

// ── Error handler cho multer (v2 dùng next(err) thay vì throw) ───────────────
// eslint-disable-next-line no-unused-vars
router.use('/upload', (err, req, res, next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'File quá lớn! Giới hạn tối đa là 20MB.' });
  }
  if (err && err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ message: 'Tên field file không hợp lệ. Vui lòng dùng field "file".' });
  }
  if (err) {
    return res.status(400).json({ message: err.message || 'Lỗi khi tải file lên.' });
  }
  next();
});
router.delete('/comments/:commentId', verifyToken, deleteComment);

// --- AUTOCOMPLETE SUGGEST ---
router.get('/suggest', async (req, res) => {
  try {
    const { q = '' } = req.query;
    const query = q.trim();
    if (!query || query.length < 2) return res.json([]);

    const prisma = require('../db');
    const results = await prisma.document.findMany({
      where: {
        status: 'APPROVED',
        deleted_at: null,
        removed_by_admin: false,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ]
      },
      select: { id: true, title: true, file_type: true, doc_type: true },
      orderBy: { download_count: 'desc' },
      take: 6,
    });
    res.json(results);
  } catch (err) {
    res.json([]);
  }
});

router.get('/proxy-file/:id', verifyToken, documentAccess(), serveDocumentFile);

// --- COLLECTION ROUTE ---
router.get('/', getAllDocuments);

// --- DYNAMIC ROUTES /:id (phải đặt SAU static) ---
router.get('/:id', optionalAuth, documentAccess(), getDocumentById);
router.put('/:id', verifyToken, documentAccess({ manage: true }), upload.single('file'), updateDocument);
router.delete('/:id', verifyToken, documentAccess({ manage: true, includeDeleted: false }), deleteDocument);
router.put('/:id/approve', verifyToken, approveDocument);
router.put('/:id/reject', verifyToken, rejectDocument);
router.put('/:id/restore', verifyToken, documentAccess({ manage: true, includeDeleted: true }), restoreDocument);
router.delete('/:id/permanent', verifyToken, documentAccess({ manage: true, includeDeleted: true }), permanentDeleteDocument);
router.post('/:id/save', verifyToken, documentAccess(), toggleSaveDocument);
router.post('/:id/download', verifyToken, documentAccess(), downloadDocumentFile);
router.post('/:id/view', optionalAuth, documentAccess(), incrementView);
router.get('/:id/comments', optionalAuth, documentAccess(), getComments);
router.post('/:id/comments', verifyToken, documentAccess(), addComment);
router.post('/:id/rate', verifyToken, documentAccess(), rateDocument);
router.post('/:id/report', verifyToken, documentAccess(), reportDocument);

module.exports = router;
