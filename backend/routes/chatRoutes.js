const express = require('express');
const { chatWithDocument, chatGeneral } = require('../controllers/chatController');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

// Chat chung — không gắn tài liệu cụ thể
router.post('/general', verifyToken, chatGeneral);

// Chat với tài liệu cụ thể
router.post('/:docId', verifyToken, chatWithDocument);

module.exports = router;
