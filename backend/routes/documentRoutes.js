const express = require('express');
const { 
  uploadDocument, getAllDocuments, getDocumentById, getMyDocuments, 
  updateDocument, deleteDocument, restoreDocument, permanentDeleteDocument, getTrashDocuments,
  incrementDownload, incrementView, getComments, addComment, deleteComment,
  getPendingDocuments, approveDocument, rejectDocument,
  toggleSaveDocument, getSavedDocuments
} = require('../controllers/documentController');
const { verifyToken } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

// --- STATIC ROUTES (phải đặt TRƯỚC dynamic /:id) ---
router.get('/pending', verifyToken, getPendingDocuments);
router.get('/saved', verifyToken, getSavedDocuments);
router.get('/mine', verifyToken, getMyDocuments);
router.get('/trash', verifyToken, getTrashDocuments);
router.post('/upload', verifyToken, upload.single('file'), uploadDocument);
router.delete('/comments/:commentId', verifyToken, deleteComment);

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

module.exports = router;
