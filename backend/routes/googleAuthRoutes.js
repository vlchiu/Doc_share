const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Bước 1: Redirect sang Google — luôn hiện màn hình chọn tài khoản
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
  prompt: 'select_account',
}));

// Bước 2: Google callback — dùng custom callback để xử lý lỗi tốt hơn
router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', (err, user) => {
    if (err || !user) {
      console.error('Google auth error:', err?.message || 'No user returned');
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=google_failed`);
    }

    try {
      const token = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      console.log('Google login success for user:', user.email);
      res.redirect(`${process.env.FRONTEND_URL}/auth/google/success?token=${token}&userId=${user.id}`);
    } catch (e) {
      console.error('JWT sign error:', e.message);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=google_failed`);
    }
  })(req, res, next);
});

module.exports = router;
