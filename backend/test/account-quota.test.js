const test = require('node:test');
const assert = require('node:assert/strict');
const { loader, response } = require('./helpers');

test('quota defaults off; invalid settings fail closed; expired VIP uses free limit', async () => {
  const q = loader({ 'db.js': {} })('utils/accountQuota.js');
  assert.equal(await q.reserve(1, 'AI'), null);
  const configured = loader({ 'db.js': {} }, { FREE_AI_DAILY_LIMIT: '2', VIP_AI_DAILY_LIMIT: '10' })('utils/accountQuota.js');
  assert.equal(configured.limits({ plan: 'VIP', plan_expires_at: '2000-01-01' }).ai, 2);
  assert.equal(configured.limits({ plan: 'VIP', plan_expires_at: '2099-01-01' }).ai, 10);
  const invalid = loader({ 'db.js': {} }, { FREE_STORAGE_MB: '-1' })('utils/accountQuota.js');
  assert.throws(() => invalid.limits({ plan: 'FREE' }), { code: 'QUOTA_CONFIG' });
});

test('storage refuses unknown Content-Length before invoking provider', async () => {
  let called = false;
  const q = { enabled: () => true, release: async () => {}, reserve: async () => { throw new Error('Must not reserve'); } };
  const { wrapStorage } = loader({ 'db.js': {}, 'utils/accountQuota.js': q })('middleware/storageQuota.js');
  const wrapped = wrapStorage({ _handleFile() { called = true; } });
  const error = await new Promise(resolve => wrapped._handleFile({ headers: {}, user: { userId: 1 } }, { fieldname: 'file' }, resolve));
  assert.equal(error.status, 411);
  assert.equal(called, false);
});

test('storage quota applies to document owner when admin replaces file; provider failure refunds reservation', async () => {
  const calls = [];
  const q = { enabled: () => true, reserve: async (...args) => { calls.push(args); return 'reservation'; }, release: async id => { calls.push(id); } };
  const { wrapStorage } = loader({ 'db.js': {}, 'utils/accountQuota.js': q })('middleware/storageQuota.js');
  const wrapped = wrapStorage({ _handleFile(req, file, cb) { cb(new Error('Upload failed')); } });
  const req = { headers: { 'content-length': '500' }, user: { userId: 9 }, document: { user_id: 2 } };
  const error = await new Promise(resolve => wrapped._handleFile(req, { fieldname: 'file' }, resolve));
  assert.equal(error.message, 'Upload failed');
  assert.deepEqual(calls[0], [2, 'STORAGE', 500]);
  assert.equal(calls[1], 'reservation');
});

test('usage endpoint with quotas off exposes no fabricated counts', async () => {
  const q = loader({ 'db.js': {} })('utils/accountQuota.js');
  const res = response(); await q.usage({ user: { userId: 1 } }, res);
  assert.equal(res.data.enabled, false);
  assert.equal(res.headers['Cache-Control'], 'no-store');
});
