const test = require('node:test');
const assert = require('node:assert/strict');
const { loader, database, response } = require('./helpers');
const failure = code => { throw Object.assign(new Error('DNS test'), { code }); };
function setup(mx, extra = {}) {
  let sent = 0;
  const db = database({ user: [] });
  const load = loader({
    'db.js': db,
    'node:dns': { promises: { Resolver: class {
      resolveMx() { return mx(); }
      async resolve4() { return failure('ENODATA'); }
      async resolve6() { return failure('ENODATA'); }
      cancel() {}
    } } },
    'utils/emailService.js': { sendVerifyEmail: async () => { sent++; } },
    ...extra,
  });
  return { db, load, sent: () => sent };
}
const request = { body: { name: 'Test', email: 'diachu@pro.vip', password: 'test-password' } };

test('email syntax rejects malformed addresses but permits .vip and plus aliases', () => {
  const { validEmail } = setup().load('utils/emailValidation.js');
  for (const email of ['diachu@pro.vip', 'user+tag@example.com']) assert.equal(validEmail(email), true);
  for (const email of ['diachu\\@pro.vip', 'a..b@test.com', 'a@-test.com', 'a@test..com', 'a b@test.com', 'a@test', 'a@test.com,b@test.com']) assert.equal(validEmail(email), false);
});

test('nonexistent domain rejects registration before account creation or OTP send', async () => {
  const ctx = setup(async () => failure('ENOTFOUND'));
  const res = response();
  await ctx.load('controllers/authController.js').register(request, res);
  assert.equal(res.statusCode, 400);
  assert.equal(ctx.db.snapshot().user.length, 0);
  assert.equal(ctx.sent(), 0);
});

test('temporary DNS failure is retryable and sends no OTP', async () => {
  const ctx = setup(async () => failure('ETIMEOUT'));
  const res = response();
  await ctx.load('controllers/authController.js').register(request, res);
  assert.equal(res.statusCode, 503);
  assert.equal(ctx.sent(), 0);
  assert.equal(ctx.db.snapshot().user.length, 0);
});

test('null MX and absence of mail routing reject email domain', async () => {
  for (const mx of [async () => [{ exchange: '', priority: 0 }], async () => [], async () => failure('ENODATA')]) {
    const ctx = setup(mx);
    assert.equal((await ctx.load('utils/emailValidation.js').checkEmailDomain('diachu@pro.vip')).status, 400);
  }
});

test('valid mail domain creates only an unverified account and sends one OTP', async () => {
  const ctx = setup(async () => [{ exchange: 'mail.example.invalid' }]);
  const res = response();
  await ctx.load('controllers/authController.js').register(request, res);
  assert.equal(res.statusCode, 200);
  assert.equal(ctx.sent(), 1);
  assert.equal(ctx.db.snapshot().user[0].is_email_verified, false);
});

test('SMTP failure does not return successful OTP delivery', async () => {
  const ctx = setup(async () => [{ exchange: 'mail.example.invalid' }], {
    'utils/emailService.js': { sendVerifyEmail: async () => { throw new Error('SMTP rejected'); } },
  });
  const res = response();
  await ctx.load('controllers/authController.js').register(request, res);
  assert.equal(res.statusCode, 503);
  assert.equal(ctx.db.snapshot().user[0].is_email_verified, false);
});

test('resending to an existing pending account rechecks domain before sending', async () => {
  const ctx = setup(async () => failure('ENOTFOUND'));
  await ctx.db.user.create({ data: { email: 'diachu@pro.vip', is_email_verified: false, is_active: true, google_id: null } });
  const res = response();
  await ctx.load('controllers/authController.js').resendVerifyEmail(request, res);
  assert.equal(res.statusCode, 400);
  assert.equal(ctx.sent(), 0);
});

test('OTP recipient is the registering address, not the configured sender', async () => {
  let envelope;
  const load = loader({ nodemailer: { createTransport: () => ({ sendMail: async data => { envelope = data; } }) } }, { EMAIL_USER: 'admin@example.invalid' });
  await load('utils/emailService.js').sendVerifyEmail('diachu@pro.vip', 'Test', '123456');
  assert.equal(envelope.to, 'diachu@pro.vip');
  assert.equal(envelope.cc, undefined);
  assert.equal(envelope.bcc, undefined);
});

test('absent MX accepts implicit SMTP routing via A/AAAA', async () => {
  const ctx = setup(null, { 'node:dns': { promises: { Resolver: class {
    async resolveMx() { return failure('ENODATA'); }
    async resolve4() { return ['192.0.2.1']; }
    async resolve6() { return failure('ENODATA'); }
    cancel() {}
  } } } });
  assert.equal(await ctx.load('utils/emailValidation.js').checkEmailDomain('user@example.com'), null);
});
