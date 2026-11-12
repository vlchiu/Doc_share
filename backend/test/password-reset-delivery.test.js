const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { loader, database, response } = require('./helpers');
const email = 'reader@example.invalid';
function setup(send) {
  const db = database({ user: [{ id: 1, email, name: 'Reader', password: 'hash', is_active: true }] });
  const controller = loader({ 'db.js': db, 'utils/emailService.js': { sendResetPasswordEmail: send } })('controllers/authController.js');
  return { db, controller };
}
test('password reset waits for SMTP acceptance before reporting success', async () => {
  let deliver, token;
  const ctx = setup(async (to, name, value) => {
    assert.equal(to, email); token = value;
    await new Promise(resolve => { deliver = resolve; });
  });
  const res = response();
  const work = ctx.controller.forgotPassword({ body: { email } }, res);
  while (!deliver) await new Promise(resolve => setImmediate(resolve));
  assert.equal(res.data, undefined);
  deliver(); await work;
  assert.equal(res.statusCode, 200);
  assert.equal(ctx.db.snapshot().user[0].reset_token, crypto.createHash('sha256').update(token).digest('hex'));
  assert(!JSON.stringify(res.data).includes(token));
});
test('SMTP rejection returns retryable error and removes only the failed reset token', async () => {
  const ctx = setup(async () => { throw Object.assign(new Error('private SMTP detail'), { code: 'EAUTH' }); });
  const res = response();
  await ctx.controller.forgotPassword({ body: { email } }, res);
  assert.equal(res.statusCode, 503);
  assert.equal(ctx.db.snapshot().user[0].reset_token, null);
  assert(!JSON.stringify(res.data).includes('private SMTP detail'));
});
test('failed delivery cannot invalidate a newer password reset request', async () => {
  let ctx;
  ctx = setup(async () => {
    await ctx.db.user.update({ where: { id: 1 }, data: { reset_token: 'newer-token' } });
    throw new Error('SMTP failed');
  });
  await ctx.controller.forgotPassword({ body: { email } }, response());
  assert.equal(ctx.db.snapshot().user[0].reset_token, 'newer-token');
});
test('unknown and unverified accounts without passwords do not send mail', async () => {
  let sent = 0;
  const ctx = setup(async () => { sent++; });
  const missing = response();
  await ctx.controller.forgotPassword({ body: { email: 'unknown@example.invalid' } }, missing);
  await ctx.db.user.update({ where: { id: 1 }, data: { password: null } });
  const unverified = response();
  await ctx.controller.forgotPassword({ body: { email } }, unverified);
  assert.equal(sent, 0);
  assert.equal(missing.statusCode, 200);
  assert.deepEqual(missing.data, unverified.data);
});
test('verified Google-only accounts receive a reset link to establish a local password', async () => {
  let token;
  const ctx = setup(async (to, name, value) => { token = value; });
  await ctx.db.user.update({ where: { id: 1 }, data: { password: null, google_id: 'verified-google', is_email_verified: true } });
  const res = response();
  await ctx.controller.forgotPassword({ body: { email } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(typeof token, 'string');
  const reset = response();
  await ctx.controller.resetPassword({ body: { token, newPassword: 'new-test-password' } }, reset);
  assert.equal(reset.statusCode, 200);
  const user = ctx.db.snapshot().user[0];
  assert(await require('bcryptjs').compare('new-test-password', user.password));
  assert.equal(user.google_id, 'verified-google');
  assert.equal(user.reset_token, null);
});
test('mail service rejects an unaccepted recipient and uses finite SMTP timeouts', async () => {
  let settings, message;
  const service = loader({ nodemailer: { createTransport(options) {
    settings = options;
    return { async sendMail(mail) { message = mail; return { accepted: [], rejected: [email] }; } };
  } } }, { EMAIL_USER: 'sender@example.invalid', FRONTEND_URL: 'http://localhost:5173' })('utils/emailService.js');
  await assert.rejects(service.sendResetPasswordEmail(email, 'Reader', 'test-token'), { code: 'MAIL_NOT_ACCEPTED' });
  assert(settings.connectionTimeout > 0 && settings.socketTimeout > 0);
  assert(message.text.includes('http://localhost:5173/reset-password?token=test-token'));
});
