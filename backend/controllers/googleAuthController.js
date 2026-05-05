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
    const email = profile.emails?.[0]?.value;
    const name = profile.displayName;
    const googleId = profile.id;
    const avatar = profile.photos?.[0]?.value;

    if (!email) return done(new Error('Không lấy được email từ Google'), null);

    // Tìm user theo google_id
    let user = await prisma.user.findUnique({ where: { google_id: googleId } });

    if (!user) {
      // Tìm theo email (user đã đăng ký thủ công)
      user = await prisma.user.findUnique({ where: { email } });

      if (user) {
        // Liên kết google_id vào tài khoản cũ
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            google_id: googleId,
            avatar_url: user.avatar_url || avatar || null
          }
        });
      } else {
        // Tạo tài khoản mới từ Google
        user = await prisma.user.create({
          data: {
            name,
            email,
            password: '',
            google_id: googleId,
            avatar_url: avatar || null,
          }
        });
      }
    }

    if (!user.is_active) {
      return done(new Error('Tài khoản đã bị khóa. Vui lòng liên hệ Admin.'), null);
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
