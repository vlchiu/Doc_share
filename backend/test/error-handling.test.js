const test = require('node:test');
const assert = require('node:assert/strict');
const { loader, response } = require('./helpers');
test('API errors never expose internal exception details', async () => {
  const secret = 'provider-secret-and-database-query';
  const controller = loader({ 'db.js': { category: { findMany: async () => { throw new Error(secret); } } } })('controllers/categoryController.js');
  const res = response(); await controller.getCategories({}, res);
  assert.equal(res.statusCode, 500); assert(!JSON.stringify(res.data).includes(secret));
});
test('unhandled errors and invalid JSON return safe JSON responses', () => {
  const handler = loader()('middleware/errorHandler.js');
  for (const status of [undefined, 400, 413]) {
    const res = response();
    handler(Object.assign(new Error('private body or credential'), { status }), {}, res, () => assert.fail());
    assert.equal(res.statusCode, status || 500);
    assert(!JSON.stringify(res.data).includes('credential'));
  }
});
test('missing Google configuration does not prevent backend modules from loading', () => {
  let registered = false;
  const load = loader({
    'db.js': {},
    passport: { use() { registered = true; }, serializeUser() {}, deserializeUser() {} },
    'passport-google-oauth20': { Strategy: class { constructor() { assert.fail('Must not initialize Google without credentials'); } } },
  });
  load('controllers/googleAuthController.js'); assert.equal(registered, false);
});
test('upload errors preserve useful validation messages while hiding provider details', () => {
  const handler = loader()('middleware/uploadError.js');
  for (const [code, expected] of [['LIMIT_FILE_SIZE', 400], ['STORAGE_QUOTA_EXCEEDED', 413], ['CLOUD_ERROR', 503]]) {
    const res = response();
    handler(Object.assign(new Error('provider-secret-query'), { code, status: 400 }), {}, res, () => assert.fail());
    assert.equal(res.statusCode, expected);
    assert(!JSON.stringify(res.data).includes('provider-secret-query'));
  }
});
