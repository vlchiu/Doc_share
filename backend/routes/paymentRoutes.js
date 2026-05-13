const express = require('express');
const { createMomoPayment, momoIPN, createVNPayPayment, vnpayReturn, getPaymentHistory, getVIPPlans } = require('../controllers/paymentController');
const { createSepayPayment, sepayWebhook, checkPaymentStatus } = require('../controllers/sepayController');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/plans', getVIPPlans);
router.post('/momo/create', verifyToken, createMomoPayment);
router.post('/momo/ipn', momoIPN);
router.post('/vnpay/create', verifyToken, createVNPayPayment);
router.get('/vnpay/return', vnpayReturn);

// SePay
router.post('/sepay/create', verifyToken, createSepayPayment);
router.post('/sepay/webhook', sepayWebhook);
router.get('/sepay/status/:orderId', verifyToken, checkPaymentStatus);

router.get('/history', verifyToken, getPaymentHistory);

module.exports = router;
