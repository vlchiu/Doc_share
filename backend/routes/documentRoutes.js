const express = require('express');
// SỬA DÒNG IMPORT:
const { uploadDocument, getAllDocuments, getDocumentById, getMyDocuments, updateDocument, deleteDocument, incrementDownload, incrementView, getComments, addComment, deleteComment, getPendingDocuments, approveDocument, toggleSaveDocument, getSavedDocuments } = require('../controllers/documentController');
const { verifyToken } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

router.get('/pending', verifyToken, getPendingDocuments);
router.put('/:id/approve', verifyToken, approveDocument);

router.get('/saved', verifyToken, getSavedDocuments);
router.post('/:id/save', verifyToken, toggleSaveDocument);

router.get('/mine', verifyToken, getMyDocuments);
router.get('/', getAllDocuments);
router.get('/:id', getDocumentById);
router.post('/upload', verifyToken, upload.single('file'), uploadDocument);
router.put('/:id', verifyToken, updateDocument);
router.delete('/:id', verifyToken, deleteDocument);
router.post('/:id/download', verifyToken, incrementDownload);
router.post('/:id/view', incrementView);


// --- 2 ROUTE MỚI CHO BÌNH LUẬN ---
router.get('/:id/comments', getComments);
router.post('/:id/comments', verifyToken, addComment);
router.delete('/comments/:commentId', verifyToken, deleteComment);



module.exports = router;