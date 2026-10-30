const router = require('express').Router();
const { rateLimit } = require('express-rate-limit');
const { verifyToken } = require('../middleware/authMiddleware');
const { webSearch } = require('../controllers/webSearchController');
router.post('/', verifyToken, rateLimit({
  windowMs: 60000, limit: 10, keyGenerator: req => String(req.user.userId),
  standardHeaders: 'draft-7', legacyHeaders: false,
  message: { code: 'RATE_LIMITED', message: 'Bạn đã tìm kiếm quá nhanh. Vui lòng thử lại sau một phút.' },
}), webSearch);
module.exports = router;
