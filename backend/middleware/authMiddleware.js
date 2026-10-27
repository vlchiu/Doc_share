const jwt = require('jsonwebtoken');
const prisma = require('../db');

async function authenticate(req, res, next, optional = false) {
  const header = req.get('Authorization');
  if (!header && optional) return next();
  const token = typeof header === 'string' && /^Bearer ([^\s]+)$/i.exec(header)?.[1];
  if (!token) return res.status(401).json({ code: 'AUTH_REQUIRED', message: 'Vui lòng đăng nhập.' });
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (!Number.isSafeInteger(payload.userId) || !Number.isSafeInteger(payload.tokenVersion)) throw new Error('Invalid claims');
  } catch {
    return res.status(401).json({ code: 'AUTH_INVALID', message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' });
  }
  try {
    const user = await prisma.user.findUnique({ where: { id: payload.userId },
      select: { id: true, role: true, is_active: true, is_email_verified: true, token_version: true } });
    if (!user || user.token_version !== payload.tokenVersion) {
      return res.status(401).json({ code: 'AUTH_INVALID', message: 'Vui lòng đăng nhập lại.' });
    }
    if (!user.is_active) return res.status(403).json({ code: 'ACCOUNT_DISABLED', message: 'Tài khoản đã bị khóa.' });
    if (!user.is_email_verified) return res.status(403).json({ code: 'EMAIL_UNVERIFIED', message: 'Vui lòng xác thực email.' });
    req.user = { userId: user.id, role: user.role, tokenVersion: user.token_version };
    return next();
  } catch (error) {
    console.error('Authentication database error:', error.code || error.name);
    return res.status(503).json({ code: 'AUTH_UNAVAILABLE', message: 'Chưa thể kiểm tra phiên đăng nhập. Vui lòng thử lại.' });
  }
}

module.exports = {
  verifyToken: (req, res, next) => authenticate(req, res, next),
  optionalAuth: (req, res, next) => authenticate(req, res, next, true),
};
