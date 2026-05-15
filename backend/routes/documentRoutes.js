const express = require('express');
const { 
  uploadDocument, getAllDocuments, getDocumentById, getMyDocuments, getUserDocuments,
  updateDocument, deleteDocument, restoreDocument, permanentDeleteDocument, getTrashDocuments,
  incrementDownload, incrementView, getDownloadHistory, deleteDownloadHistory, clearDownloadHistory,
  getComments, addComment, deleteComment,
  getPendingDocuments, approveDocument, rejectDocument,
  toggleSaveDocument, getSavedDocuments, rateDocument
} = require('../controllers/documentController');
const { verifyToken } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { reportDocument } = require('../controllers/reportController');

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
router.delete('/comments/:commentId', verifyToken, deleteComment);

// --- PROXY: stream file từ Cloudinary về frontend (tránh CORS) ---
router.get('/proxy-file/:id', async (req, res) => {
  try {
    const jwt = require('jsonwebtoken');
    const axios = require('axios');
    const prisma = require('../db');

    // Xác thực token
    const token = req.query.token || req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Unauthorized' });
    try { jwt.verify(token, process.env.JWT_SECRET); } catch { return res.status(401).json({ message: 'Token không hợp lệ' }); }

    const doc = await prisma.document.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!doc) return res.status(404).json({ message: 'Không tìm thấy tài liệu' });

    const fileUrl = doc.file_url;

    const response = await axios.get(fileUrl, {
      responseType: 'stream',
      timeout: 30000,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    res.setHeader('Content-Type', doc.file_type || 'application/octet-stream');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    response.data.pipe(res);
  } catch (err) {
    console.error('Proxy file error:', err.response?.status, err.message);
    res.status(500).json({ message: 'Không thể tải file' });
  }
});

// --- COLLECTION ROUTE ---
router.get('/', getAllDocuments);

// --- DYNAMIC ROUTES /:id (phải đặt SAU static) ---
router.get('/:id', getDocumentById);
router.put('/:id', verifyToken, upload.single('file'), updateDocument);
router.delete('/:id', verifyToken, deleteDocument);
router.put('/:id/approve', verifyToken, approveDocument);
router.put('/:id/reject', verifyToken, rejectDocument);
router.put('/:id/restore', verifyToken, restoreDocument);
router.delete('/:id/permanent', verifyToken, permanentDeleteDocument);
router.post('/:id/save', verifyToken, toggleSaveDocument);
router.post('/:id/download', verifyToken, incrementDownload);
router.post('/:id/view', incrementView);
router.get('/:id/comments', getComments);
router.post('/:id/comments', verifyToken, addComment);
router.post('/:id/rate', verifyToken, rateDocument);
router.post('/:id/report', verifyToken, reportDocument);

module.exports = router;
