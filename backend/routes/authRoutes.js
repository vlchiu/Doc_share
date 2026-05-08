const express = require('express');
const { register, login, getMe, updateProfile, changePassword, adminResetPassword, verifyEmail, resendVerifyEmail, forgotPassword, resetPassword } = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/verify-email', verifyEmail);
router.post('/resend-verify', resendVerifyEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

router.get('/me', verifyToken, getMe);
router.put('/update-profile', verifyToken, upload.single('avatar'), updateProfile);
router.put('/change-password', verifyToken, changePassword);
router.put('/admin/reset-password/:id', verifyToken, adminResetPassword);

module.exports = router;