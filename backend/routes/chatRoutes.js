const express = require('express');
const { chatWithDocument, chatGeneral } = require('../controllers/chatController');
const { verifyToken } = require('../middleware/authMiddleware');

const { documentAccess } = require('../utils/documentAccess');
const { aiLimit } = require('../middleware/rateLimits');
const router = express.Router();
const conversations = require('../controllers/conversationController');
router.get('/conversations', verifyToken, conversations.list);
router.post('/conversations', verifyToken, aiLimit, conversations.create);
router.get('/conversations/:id/messages', verifyToken, conversations.messages);
router.patch('/conversations/:id', verifyToken, conversations.rename);
router.delete('/conversations/:id', verifyToken, conversations.remove);
router.post('/conversations/:id/messages', verifyToken, aiLimit, conversations.send);

// Chat chung — không gắn tài liệu cụ thể
router.post('/general', verifyToken, aiLimit, chatGeneral);

// Chat với tài liệu cụ thể
router.post('/:docId', verifyToken, aiLimit, documentAccess({ param: 'docId' }), chatWithDocument);

module.exports = router;
