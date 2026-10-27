const { rateLimit } = require('express-rate-limit');

const limiter = (limit, windowMs) => rateLimit({
  windowMs, limit, standardHeaders: 'draft-7', legacyHeaders: false,
  message: { code: 'RATE_LIMITED', message: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.' },
});

module.exports = {
  authLimit: limiter(30, 15 * 60 * 1000),
  emailLimit: limiter(5, 15 * 60 * 1000),
  aiLimit: limiter(20, 60 * 1000),
};
