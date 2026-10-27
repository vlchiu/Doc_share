const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { loader, response, database } = require('./helpers');
const bcrypt = require('bcryptjs');
const mail = { sendVerifyEmail: async () => {}, sendResetPasswordEmail: async () => {}, sendVIPConfirmEmail: async () => {} };
const account = { id: 1, name: 'Test', email: 'test@example.invalid', role: 'USER', is_active: true, is_email_verified: true, token_version: 1, plan: 'FREE', monthly_downloads: 0 };
const env = { SEPAY_WEBHOOK_KEY: 'fake-webhook-key', SEPAY_ACCOUNT_NUMBER: '123456', SEPAY_BANK_CODE: 'TEST', SEPAY_ACCOUNT_NAME: 'TEST' };
const order = { id: 1, order_id: 'SEPAYABCDEF0123456789ABCDEF01', user_id: 1, plan_months: 1, provider: 'SEPAY', amount: 29000, status: 'PENDING' };
const event = { id: 100, transferAmount: 29000, transferType: 'in', accountNumber: '123456', content: order.order_id };
function setup(seed = {}, extraMocks = {}) {
  const db = database({ user: [account], payment: [order], ...seed });
  const load = loader({ 'db.js': db, 'utils/emailService.js': mail, 'node:dns': { promises: { Resolver: class { async resolveMx() { return [{ exchange: 'mail.example.invalid' }]; } cancel() {} } } }, ...extraMocks }, env);
  return { db, load };
}
async function webhook(ctx, body, authorization = 'Apikey fake-webhook-key') {
  const res = response();
  await ctx.load('controllers/sepayController.js').sepayWebhook({ headers: { authorization }, body }, res);
  return res;
}

test('registration cannot replace credentials on Google accounts, including legacy unverified accounts', async () => {
  for (const verified of [false, true]) {
    const { db, load } = setup({ user: [{ ...account, google_id: 'google-1', is_email_verified: verified, password: 'unchanged' }] });
    const res = response();
    await load('controllers/authController.js').register({ body: { name: 'Other', email: account.email, password: 'new-password' } }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(db.snapshot().user[0].password, 'unchanged');
  }
});
test('pending registration cannot replace a previously chosen password', async () => {
  const { db, load } = setup({ user: [{ ...account, is_email_verified: false, password: 'unchanged' }] });
  const res = response();
  await load('controllers/authController.js').register({ body: { name: 'Other', email: account.email, password: 'new-password' } }, res);
  assert.equal(res.statusCode, 409); assert.equal(db.snapshot().user[0].password, 'unchanged');
});
test('unverified Google account cannot bypass email verification using password login', async () => {
  const { load } = setup({ user: [{ ...account, google_id: 'google-1', is_email_verified: false, password: await bcrypt.hash('test-password', 4) }] });
  const res = response();
  await load('controllers/authController.js').login({ body: { email: account.email, password: 'test-password' } }, res);
  assert.equal(res.statusCode, 403); assert.equal(res.data.token, undefined);
});
test('JWT validation rejects legacy, revoked and disabled sessions but preserves database outages as 503', async () => {
  const { db, load } = setup();
  const jwt = require('jsonwebtoken');
  const auth = load('middleware/authMiddleware.js');
  for (const token of [jwt.sign({ userId: 1 }, 'local-test-only'), jwt.sign({ userId: 1, tokenVersion: 0 }, 'local-test-only'), 'bad']) {
    const res = response(); await auth.verifyToken({ get: () => `Bearer ${token}` }, res, () => assert.fail('must reject'));
    assert.equal(res.statusCode, 401);
  }
  const token = load('utils/session.js').issueToken(account);
  await db.user.update({ where: { id: 1 }, data: { is_active: false } });
  let res = response(); await auth.verifyToken({ get: () => `Bearer ${token}` }, res, () => assert.fail()); assert.equal(res.statusCode, 403);
  db.user.findUnique = async () => { throw new Error('DB down'); };
  res = response(); await auth.verifyToken({ get: () => `Bearer ${token}` }, res, () => assert.fail()); assert.equal(res.statusCode, 503);
});
test('password reset consumes token once and increments session version', async () => {
  const token = 'reset-test';
  const { db, load } = setup({ user: [{ ...account, reset_token: crypto.createHash('sha256').update(token).digest('hex'), reset_token_expires: new Date(Date.now() + 60000) }] });
  const auth = load('controllers/authController.js');
  const first = response(); await auth.resetPassword({ body: { token, newPassword: 'replacement-password' } }, first);
  assert.equal(first.statusCode, 200); assert.equal(db.snapshot().user[0].token_version, 2);
  const second = response(); await auth.resetPassword({ body: { token, newPassword: 'replacement-password' } }, second);
  assert.equal(second.statusCode, 400);
});
test('OTP stops after five failed guesses and is stored as a hash', async () => {
  const hash = crypto.createHash('sha256').update('123456').digest('hex');
  const { db, load } = setup({ user: [{ ...account, is_email_verified: false, email_verify_token: hash, email_verify_attempts: 0, email_verify_expires: new Date(Date.now() + 60000) }] });
  const auth = load('controllers/authController.js');
  for (let i = 0; i < 5; i++) await auth.verifyEmail({ body: { email: account.email, otp: '999999' } }, response());
  const res = response(); await auth.verifyEmail({ body: { email: account.email, otp: '123456' } }, res);
  assert.equal(res.statusCode, 400); assert.equal(db.snapshot().user[0].is_email_verified, false);
});
test('SePay rejects missing/wrong credentials without state changes', async () => {
  const ctx = setup();
  assert.equal((await webhook(ctx, event, '')).statusCode, 401);
  assert.equal((await webhook(ctx, event, 'Bearer fake-webhook-key')).statusCode, 401);
  assert.equal(ctx.db.snapshot().payment[0].status, 'PENDING');
});
test('SePay rejects malformed transfer fields', async () => {
  const ctx = setup();
  for (const changes of [{ id: null }, { transferAmount: '29000' }, { transferAmount: -1 }, { accountNumber: undefined }]) {
    assert.equal((await webhook(ctx, { ...event, ...changes })).statusCode, 400);
  }
});
test('unmatched amount, bank, order and outgoing transfers are recorded without activating VIP', async () => {
  for (const changes of [{ content: 'unrelated transfer' }, { accountNumber: '99999' }, { transferType: 'out' }, { transferAmount: 79000 }, { content: `${order.order_id} SEPAYFFFFFFFFFFFFFFFFFFFFFFFF` }]) {
    const ctx = setup(); const res = await webhook(ctx, { ...event, ...changes });
    assert.equal(res.data.success, true); assert.equal(ctx.db.snapshot().payment[0].status, 'PENDING');
    assert.equal(ctx.db.snapshot().user[0].plan, 'FREE'); assert.equal(ctx.db.snapshot().sepayReceipt[0].status, 'UNMATCHED');
  }
});
test('duplicate concurrent SePay deliveries activate a single month once', async () => {
  const ctx = setup({ user: [{ ...account, plan_expires_at: new Date('2030-01-31T10:00:00Z') }] });
  const results = await Promise.all(Array.from({ length: 8 }, () => webhook(ctx, event)));
  assert(results.every(r => r.data.success)); const data = ctx.db.snapshot();
  assert.equal(data.sepayReceipt.length, 1); assert.equal(data.payment[0].status, 'SUCCESS');
  assert.equal(data.user[0].plan_expires_at.toISOString(), '2030-02-28T10:00:00.000Z');
});
test('payment and receipt roll back when VIP update fails; retry succeeds', async () => {
  const ctx = setup(); const original = ctx.db.user.update;
  ctx.db.user.update = async () => { throw new Error('Simulated write failure'); };
  assert.equal((await webhook(ctx, event)).statusCode, 500);
  assert.equal(ctx.db.snapshot().payment[0].status, 'PENDING'); assert.equal(ctx.db.snapshot().sepayReceipt.length, 0);
  ctx.db.user.update = original;
  assert.equal((await webhook(ctx, event)).data.success, true); assert.equal(ctx.db.snapshot().user[0].plan, 'VIP');
});
test('legacy provider transaction cannot be replayed onto a new order', async () => {
  const ctx = setup({ payment: [order, { ...order, id: 2, order_id: 'old', status: 'SUCCESS', provider_ref: '100' }] });
  await webhook(ctx, event); assert.equal(ctx.db.snapshot().payment[0].status, 'PENDING');
});
test('payment status is owner-only', async () => {
  const ctx = setup(); const res = response();
  await ctx.load('controllers/sepayController.js').checkPaymentStatus({ params: { orderId: order.order_id }, user: { userId: 99 } }, res);
  assert.equal(res.statusCode, 404);
});
test('document policy covers draft, rejected, removed and deleted documents', () => {
  const { load } = setup(); const { canReadDocument, publicDocument } = load('utils/documentAccess.js');
  const doc = { id: 1, user_id: 1, status: 'PENDING', file_url: 'secret-url', deleted_at: null, removed_by_admin: false };
  assert.equal(canReadDocument(doc, { userId: 2, role: 'USER' }), false);
  assert.equal(canReadDocument(doc, { userId: 1, role: 'USER' }), true);
  assert.equal(canReadDocument(doc, { userId: 2, role: 'ADMIN' }), true);
  assert.equal(canReadDocument({ ...doc, status: 'APPROVED' }), true);
  assert.equal(canReadDocument({ ...doc, status: 'APPROVED', deleted_at: new Date() }, { userId: 1 }), false);
  assert.equal(canReadDocument({ ...doc, status: 'APPROVED', removed_by_admin: true }, { userId: 1 }), false);
  assert.equal(publicDocument(doc).file_url, undefined);
});
test('owner cannot restore or modify a document removed by admin', async () => {
  const { load } = setup({ document: [{ id: 1, user_id: 1, status: 'APPROVED', removed_by_admin: true, deleted_at: new Date() }] });
  const res = response();
  await load('utils/documentAccess.js').documentAccess({ manage: true, includeDeleted: true })({ params: { id: '1' }, user: { userId: 1, role: 'USER' } }, res, () => assert.fail());
  assert.equal(res.statusCode, 403);
});
test('moderation rejects stale versions and consumes the current version once', async () => {
  const { db, load } = setup({ notification: [], document: [{ id: 1, user_id: 1, title: 'Test', status: 'PENDING', content_version: 2, deleted_at: null, removed_by_admin: false }] }, { 'utils/aiModerator.js': { moderateDocument: async () => {} } });
  const controller = load('controllers/documentController.js');
  const request = version => ({ params: { id: '1' }, user: { userId: 2, role: 'ADMIN' }, body: { contentVersion: version, reason: 'Review' } });
  for (const action of ['approveDocument', 'rejectDocument']) {
    const stale = response();
    await controller[action](request(1), stale);
    assert.equal(stale.statusCode, 409);
    assert.equal(db.snapshot().document[0].status, 'PENDING');
  }
  const accepted = response();
  await controller.approveDocument(request(2), accepted);
  assert.equal(accepted.statusCode, 200);
  assert.equal(db.snapshot().document[0].content_version, 3);
  const replay = response();
  await controller.rejectDocument(request(2), replay);
  assert.equal(replay.statusCode, 409);
  assert.equal(db.snapshot().document[0].status, 'APPROVED');
});
test('document policy middleware denies access before a file or AI handler runs', async () => {
  const { load } = setup({ document: [{ id: 2, user_id: 1, status: 'PENDING' }] });
  const res = response();
  await load('utils/documentAccess.js').documentAccess({ param: 'docId' })({ params: { docId: '2' }, user: { userId: 9, role: 'USER' } }, res, () => assert.fail());
  assert.equal(res.statusCode, 403);
});
test('MoMo and VNPay routes are disabled including callbacks', () => {
  const empty = () => {};
  const load = loader({
    'controllers/paymentController.js': { getVIPPlans: empty, getPaymentHistory: empty },
    'controllers/sepayController.js': { createSepayPayment: empty, sepayWebhook: empty, checkPaymentStatus: empty },
    'middleware/authMiddleware.js': { verifyToken: empty },
  });
  const router = load('routes/paymentRoutes.js');
  for (const routePath of ['/momo/create', '/momo/ipn', '/vnpay/create', '/vnpay/return']) {
    const route = router.stack.find(layer => layer.route?.path === routePath).route;
    const res = response(); route.stack[0].handle({}, res); assert.equal(res.statusCode, 503);
  }
});
test('storage rejects external URLs and local path traversal', () => {
  const load = loader({ 'middleware/uploadMiddleware.js': { cloudinary: { url: () => 'signed' } } }, { CLOUDINARY_CLOUD_NAME: 'test-cloud' });
  const { sourceForDocument } = load('utils/documentStorage.js');
  for (const file_url of ['https://example.invalid/file', '/uploads/../../etc/passwd', 'http://127.0.0.1/private']) assert.throws(() => sourceForDocument({ file_url }));
  assert.equal(sourceForDocument({ file_url: 'https://res.cloudinary.com/test-cloud/raw/authenticated/v123/docshare/file.pdf' }).url, 'signed');
});

test('storage recognizes signed authenticated URLs returned by Cloudinary conversion', () => {
  const calls = [];
  const load = loader({ 'middleware/uploadMiddleware.js': { cloudinary: { url: (id, options) => { calls.push({ id, options }); return 'fresh-signature'; } } } }, { CLOUDINARY_CLOUD_NAME: 'test-cloud' });
  const { cloudAsset, sourceForDocument } = load('utils/documentStorage.js');
  for (const resource of ['raw', 'image']) {
    const file_url = `https://res.cloudinary.com/test-cloud/${resource}/authenticated/s--Ab_cd-12--/v123/docshare/my%20file.pdf`;
    const asset = cloudAsset(file_url);
    assert.equal(asset.type, 'authenticated');
    assert.equal(asset.version, 123);
    assert.equal(asset.publicId, resource === 'raw' ? 'docshare/my file.pdf' : 'docshare/my file');
    assert.equal(sourceForDocument({ file_url }).url, 'fresh-signature');
    assert.equal(calls.at(-1).options.sign_url, true);
  }
  for (const url of [
    'https://res.cloudinary.com/other/raw/authenticated/s--Abcd1234--/v123/file.pdf',
    'https://res.cloudinary.com/test-cloud/raw/authenticated/s--Abcd1234--/w_100/v123/file.pdf',
    'https://res.cloudinary.com/test-cloud/raw/authenticated/v123/%ZZ.pdf',
  ]) assert.equal(cloudAsset(url), null);
});

test('Google creates verified accounts without local passwords and rejects unverified provider emails', async () => {
  let callback;
  const ctx = setup({ user: [] }, {
    passport: { use() {}, serializeUser() {}, deserializeUser() {} },
    'passport-google-oauth20': { Strategy: class { constructor(options, cb) { callback = cb; } } },
  });
  ctx.load('controllers/googleAuthController.js');
  const profile = { id: 'google-new', displayName: 'Test', emails: [{ value: account.email }], _json: { email_verified: false } };
  const run = p => new Promise(resolve => callback(null, null, p, (error, user) => resolve({ error, user })));
  assert((await run(profile)).error);
  const result = await run({ ...profile, _json: { email_verified: true } });
  assert.equal(result.error, null); assert.equal(result.user.is_email_verified, true); assert.equal(result.user.password, null);
});
test('Google linking clears password and reset secrets on unfinished registrations', async () => {
  let callback;
  const ctx = setup({ user: [{ ...account, is_email_verified: false, password: 'attacker-chosen', reset_token: 'old' }] }, {
    passport: { use() {}, serializeUser() {}, deserializeUser() {} },
    'passport-google-oauth20': { Strategy: class { constructor(options, cb) { callback = cb; } } },
  });
  ctx.load('controllers/googleAuthController.js');
  const result = await new Promise(resolve => callback(null, null, { id: 'google-id', displayName: 'Test', emails: [{ value: account.email }], _json: { email_verified: true } }, (error, user) => resolve({ error, user })));
  assert.equal(result.error, null); assert.equal(result.user.password, null); assert.equal(result.user.reset_token, null); assert.equal(result.user.token_version, 2);
});
test('OAuth callback with absent or mismatched state never invokes the provider', () => {
  const load = loader({ passport: { authenticate() { assert.fail('provider must not run'); } }, 'utils/session.js': {} });
  const router = load('routes/googleAuthRoutes.js');
  const callback = router.stack.find(layer => layer.route?.path === '/google/callback').route.stack[0].handle;
  for (const query of [{}, { state: 'b'.repeat(64) }]) {
    const res = response(); res.clearCookie = () => {};
    callback({ query, headers: { cookie: 'oauth_state=' + 'a'.repeat(64) } }, res, () => assert.fail());
    assert(res.url.endsWith('/login?error=google_failed'));
  }
});
test('serializable helper retries only serialization conflicts', async () => {
  let calls = 0;
  const load = loader({ 'db.js': { $transaction: async fn => {
    calls++;
    if (calls < 3) throw Object.assign(new Error('conflict'), { code: 'P2034' });
    return fn('tx');
  } } });
  assert.equal(await load('utils/transaction.js').serializable(tx => tx), 'tx'); assert.equal(calls, 3);
});
test('legacy SePay references are reconstructed exactly without amount fallback', () => {
  const { load } = setup(); const { orderReferences } = load('controllers/sepayController.js');
  assert.equal(orderReferences(null, 'SEPAY_5_1778658363362 transfer')[0], 'SEPAY_5_1778658363362');
  assert.equal(orderReferences(null, 'SEPAY51778658363362 transfer')[0], 'SEPAY_5_1778658363362');
  assert.equal(orderReferences(null, 'just 29000 transfer').length, 0);
});
