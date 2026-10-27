const express = require('express');
const { getPaymentHistory, getVIPPlans } = require('../controllers/paymentController');
const { createSepayPayment, sepayWebhook, checkPaymentStatus } = require('../controllers/sepayController');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();
const unavailable = (req, res) => res.status(503).json({ message: 'Phương thức thanh toán này chưa được hỗ trợ.' });

router.get('/plans', getVIPPlans);
router.post('/momo/create', unavailable);
router.post('/momo/ipn', unavailable);
router.post('/vnpay/create', unavailable);
router.get('/vnpay/return', unavailable);

// SePay
router.post('/sepay/create', verifyToken, createSepayPayment);
router.post('/sepay/webhook', sepayWebhook);
router.get('/sepay/status/:orderId', verifyToken, checkPaymentStatus);

router.get('/history', verifyToken, getPaymentHistory);

module.exports = router;
