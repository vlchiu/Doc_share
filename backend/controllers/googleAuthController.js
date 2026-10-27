const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const prisma = require('../db');

// Cấu hình Google Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL,
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value?.trim();
    const verifiedEmail = profile._json?.email_verified === true || profile._json?.verified_email === true || profile.emails?.[0]?.verified === true;
    const name = profile.displayName;
    const googleId = profile.id;
    const avatar = profile.photos?.[0]?.value;

    if (!email || !verifiedEmail) return done(new Error('Không lấy được email từ Google'), null);

    // Tìm user theo google_id
    let user = await prisma.user.findUnique({ where: { google_id: googleId } });

    if (!user) {
      // Tìm theo email (user đã đăng ký thủ công)
      user = await prisma.user.findUnique({ where: { email } });

      if (user) {
        if (user.google_id && user.google_id !== googleId) return done(new Error('Liên kết Google không hợp lệ'), null);
        if (!user.is_active) return done(new Error('Tài khoản đã bị khóa'), null);
        // Discard credentials from an unfinished registration before linking.
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            google_id: googleId,
            is_email_verified: true,
            email_verify_token: null, email_verify_expires: null,
            ...(!user.is_email_verified ? { password: null, reset_token: null, reset_token_expires: null, token_version: { increment: 1 } } : {}),
            avatar_url: user.avatar_url || avatar || null
          }
        });
      } else {
        // Tạo tài khoản mới từ Google
        user = await prisma.user.create({
          data: {
            name,
            email,
            password: null,
            is_email_verified: true,
            google_id: googleId,
            avatar_url: avatar || null,
          }
        });
      }
    }

    if (!user.is_active) {
      return done(new Error('Tài khoản đã bị khóa. Vui lòng liên hệ Admin.'), null);
    }

    if (!user.is_email_verified) {
      user = await prisma.user.update({ where: { id: user.id }, data: {
        is_email_verified: true, password: null, reset_token: null, reset_token_expires: null,
        email_verify_token: null, email_verify_expires: null, token_version: { increment: 1 },
      } });
    }
    return done(null, user);
  } catch (error) {
    console.error('Google Strategy error:', error);
    return done(error, null);
  }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (e) { done(e, null); }
});
