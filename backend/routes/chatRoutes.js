const express = require('express');
const { chatWithDocument } = require('../controllers/chatController');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

// Chat với tài liệu — yêu cầu đăng nhập
router.post('/:docId', verifyToken, chatWithDocument);

module.exports = router;
