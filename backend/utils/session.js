const jwt = require('jsonwebtoken');

function issueToken(user) {
  return jwt.sign({ userId: user.id, tokenVersion: user.token_version }, process.env.JWT_SECRET, {
    expiresIn: '7d', algorithm: 'HS256',
  });
}

module.exports = { issueToken };
