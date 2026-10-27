const express = require('express');
const { chatWithDocument, chatGeneral } = require('../controllers/chatController');
const { verifyToken } = require('../middleware/authMiddleware');

const { documentAccess } = require('../utils/documentAccess');
const { aiLimit } = require('../middleware/rateLimits');
const router = express.Router();

// Chat chung — không gắn tài liệu cụ thể
router.post('/general', verifyToken, aiLimit, chatGeneral);

// Chat với tài liệu cụ thể
router.post('/:docId', verifyToken, aiLimit, documentAccess({ param: 'docId' }), chatWithDocument);

module.exports = router;
