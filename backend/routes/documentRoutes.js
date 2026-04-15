const express = require('express');
// SỬA DÒNG IMPORT:
const { uploadDocument, getAllDocuments, updateDocument, deleteDocument, incrementDownload, incrementView, getComments, addComment, getPendingDocuments, approveDocument, toggleSaveDocument, getSavedDocuments } = require('../controllers/documentController');
const { verifyToken } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

// Route cho Admin (Nên đặt lên trên để không bị nhầm với /:id)
router.get('/pending', verifyToken, getPendingDocuments);
router.put('/:id/approve', verifyToken, approveDocument);

// --- ROUTE CHO TÀI LIỆU ĐÃ LƯU (ĐẶT Ở ĐÂY) ---
router.get('/saved', verifyToken, getSavedDocuments);
router.post('/:id/save', verifyToken, toggleSaveDocument);
// ... (giữ nguyên các route cũ)
router.get('/', getAllDocuments);
router.post('/upload', verifyToken, upload.single('file'), uploadDocument);
router.put('/:id', verifyToken, updateDocument);
router.delete('/:id', verifyToken, deleteDocument);
router.post('/:id/download', verifyToken, incrementDownload);
router.post('/:id/view', incrementView);


// --- 2 ROUTE MỚI CHO BÌNH LUẬN ---
router.get('/:id/comments', getComments); // Ai cũng xem được bình luận
router.post('/:id/comments', verifyToken, addComment); // Phải đăng nhập mới được bình luận



module.exports = router;