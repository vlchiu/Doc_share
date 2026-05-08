const express = require('express');
const { createMomoPayment, momoIPN, createVNPayPayment, vnpayReturn, getPaymentHistory, getVIPPlans } = require('../controllers/paymentController');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/plans', getVIPPlans);
router.post('/momo/create', verifyToken, createMomoPayment);
router.post('/momo/ipn', momoIPN);
router.post('/vnpay/create', verifyToken, createVNPayPayment);
router.get('/vnpay/return', vnpayReturn);
router.get('/history', verifyToken, getPaymentHistory);

module.exports = router;
