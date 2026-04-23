const express = require('express');
const { getNotifications, markAllRead } = require('../controllers/notificationController');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', verifyToken, getNotifications);
router.put('/read-all', verifyToken, markAllRead);

module.exports = router;
