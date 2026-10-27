const express = require('express');
const { register, login, getMe, updateProfile, changePassword, adminResetPassword, verifyEmail, resendVerifyEmail, forgotPassword, resetPassword } = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');
const { avatarUpload: upload } = require('../middleware/uploadMiddleware');
const { authLimit, emailLimit } = require('../middleware/rateLimits');

const router = express.Router();

router.post('/register', emailLimit, register);
router.post('/login', authLimit, login);
router.post('/verify-email', authLimit, verifyEmail);
router.post('/resend-verify', emailLimit, resendVerifyEmail);
router.post('/forgot-password', emailLimit, forgotPassword);
router.post('/reset-password', authLimit, resetPassword);

router.get('/me', verifyToken, getMe);
router.put('/update-profile', verifyToken, upload.single('avatar'), updateProfile);
router.put('/change-password', verifyToken, authLimit, changePassword);
router.put('/admin/reset-password/:id', verifyToken, authLimit, adminResetPassword);

module.exports = router;