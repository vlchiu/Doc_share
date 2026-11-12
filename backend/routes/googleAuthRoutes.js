const express = require('express');
const passport = require('passport');
const crypto = require('crypto');
const { issueToken } = require('../utils/session');

const router = express.Router();
router.use(['/google', '/google/callback'], (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_CALLBACK_URL) {
    return res.status(503).json({ message: 'Đăng nhập Google chưa được cấu hình. Vui lòng dùng email và mật khẩu.' });
  }
  next();
});

// Bước 1: Redirect sang Google — luôn hiện màn hình chọn tài khoản
const cookieOptions = { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/api/auth/google' };
router.get('/google', (req, res, next) => {
  const state = crypto.randomBytes(32).toString('hex');
  res.cookie('oauth_state', state, { ...cookieOptions, maxAge: 10 * 60 * 1000 });
  passport.authenticate('google', { scope: ['profile', 'email'], prompt: 'select_account', state })(req, res, next);
});

// Bước 2: Google callback — dùng custom callback để xử lý lỗi tốt hơn
router.get('/google/callback', (req, res, next) => {
  const cookie = (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith('oauth_state='))?.slice('oauth_state='.length);
  res.clearCookie('oauth_state', cookieOptions);
  const state = req.query.state;
  if (!cookie || !/^[a-f0-9]{64}$/.test(cookie) || typeof state !== 'string' || !/^[a-f0-9]{64}$/.test(state) || cookie.length !== state.length ||
      !crypto.timingSafeEqual(Buffer.from(cookie), Buffer.from(state))) {
    return res.redirect(`${process.env.FRONTEND_URL}/login?error=google_failed`);
  }
  passport.authenticate('google', { session: false }, (err, user) => {
    if (err || !user) {
      console.error('Google auth error:', err?.code || err?.name || 'No user returned');
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=google_failed`);
    }

    try {
      const token = issueToken(user);
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Referrer-Policy', 'no-referrer');
      res.redirect(`${process.env.FRONTEND_URL}/auth/google/success#token=${encodeURIComponent(token)}&userId=${user.id}`);
    } catch (e) {
      console.error('JWT sign error:', e.code || e.name);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=google_failed`);
    }
  })(req, res, next);
});

module.exports = router;
