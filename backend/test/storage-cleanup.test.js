const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { loader, response } = require('./helpers');
const flush = () => new Promise(resolve => setImmediate(resolve));
function setup(references = 0) {
  const removed = [], released = [];
  const service = loader({
    'db.js': { document: { count: async () => references } },
    'utils/accountQuota.js': { enabled: () => false, release: async id => { released.push(id); } },
    'utils/documentStorage.js': { deleteStoredFile: async url => { removed.push(url); } },
  })('middleware/storageQuota.js');
  const req = { file: { path: 'new-upload', size: 10 } };
  const res = new EventEmitter(); res.statusCode = 400;
  service.cleanup(req, res, () => {});
  return { service, req, res, removed, released };
}
test('failed upload is removed even when quotas are off; finish/close do not double delete', async () => {
  const ctx = setup(); ctx.res.emit('finish'); ctx.res.emit('close'); await flush();
  assert.deepEqual(ctx.removed, ['new-upload']);
});
test('a persisted reference protects an asset after a lost database acknowledgement', async () => {
  const ctx = setup(1);
  ctx.res.emit('finish'); await flush();
  assert.deepEqual(ctx.removed, []);
  assert.equal(ctx.req.uploadCommitted, true);
});
test('committed file survives a lost HTTP response, even if a later error sets status 500', async () => {
  const ctx = setup();
  await ctx.service.persist(ctx.req, async () => ({ id: 1 }));
  ctx.res.statusCode = 500; ctx.res.emit('finish'); ctx.res.emit('close'); await flush();
  assert.deepEqual(ctx.removed, []);
});
test('version conflict removes new upload rather than treating count=0 as committed', async () => {
  const ctx = setup(); await ctx.service.persist(ctx.req, async () => ({ count: 0 }));
  ctx.res.emit('finish'); await flush(); assert.deepEqual(ctx.removed, ['new-upload']);
});
test('disconnect during database commit does not delete a successfully persisted file', async () => {
  const ctx = setup(); let complete;
  const write = ctx.service.persist(ctx.req, () => new Promise(resolve => { complete = resolve; }));
  ctx.res.emit('close'); await flush(); assert.deepEqual(ctx.removed, []);
  complete({ id: 1 }); await write; assert.deepEqual(ctx.removed, []);
});
test('disconnect before persistence prevents writing a reference to a discarded upload', async () => {
  const ctx = setup(); ctx.res.emit('close'); await flush();
  await assert.rejects(ctx.service.persist(ctx.req, async () => { assert.fail('Must not write after the asset was discarded'); }));
  assert.deepEqual(ctx.removed, ['new-upload']);
});
test('disconnect during failed database write cleans the upload after rollback', async () => {
  const ctx = setup(); let fail;
  const write = ctx.service.persist(ctx.req, () => new Promise((resolve, reject) => { fail = reject; }));
  ctx.res.emit('close'); fail(new Error('DB failed'));
  await assert.rejects(write); assert.deepEqual(ctx.removed, ['new-upload']);
});
test('upload completing after disconnection is cleaned when quotas are off', async () => {
  const ctx = setup(); delete ctx.req.file;
  let uploaded;
  const storage = ctx.service.wrapStorage({ _handleFile(req, file, done) { uploaded = done; } });
  const complete = new Promise(resolve => storage._handleFile(ctx.req, { fieldname: 'file' }, resolve));
  ctx.res.emit('close'); uploaded(null, { path: 'late-upload' });
  assert(await complete); await flush(); assert.deepEqual(ctx.removed, ['late-upload']);
});
test('category containing only trashed documents cannot be deleted', async () => {
  let deleted = false;
  const controller = loader({ 'db.js': {
    document: { async count({ where }) { assert.equal(where.deleted_at, undefined); return 1; } },
    category: { async delete() { deleted = true; } },
  } })('controllers/categoryController.js');
  const res = response();
  await controller.deleteCategory({ params: { id: '1' }, user: { role: 'ADMIN' } }, res);
  assert.equal(res.statusCode, 400); assert.equal(deleted, false);
});
test('category assigned concurrently returns a conflict rather than a raw FK error', async () => {
  const controller = loader({ 'db.js': {
    document: { async count() { return 0; } },
    category: { async delete() { throw Object.assign(new Error('private details'), { code: 'P2003' }); } },
  } })('controllers/categoryController.js');
  const res = response();
  await controller.deleteCategory({ params: { id: '1' }, user: { role: 'ADMIN' } }, res);
  assert.equal(res.statusCode, 409); assert(!JSON.stringify(res.data).includes('private details'));
});
test('replacing a file removes the old asset only when no other document references it', async () => {
  for (const references of [0, 1]) {
    let removed = [];
    let doc = { id: 1, user_id: 1, file_url: 'old-asset', thumbnail_url: null, content_version: 1, deleted_at: null, removed_by_admin: false };
    const db = {
      user: { findUnique: async () => ({ role: 'USER' }) },
      document: {
        findUnique: async () => ({ ...doc }),
        updateMany: async ({ data }) => { doc = { ...doc, ...data }; return { count: 1 }; },
        count: async ({ where }) => { assert.equal(where.file_url, 'old-asset'); return references; },
      },
    };
    const controller = loader({
      'db.js': db,
      'utils/documentCover.js': { deleteCover: async () => {} },
      'utils/documentStorage.js': { deleteStoredFile: async url => { removed.push(url); } },
      'utils/documentAccess.js': { publicDocument: row => row },
    })('controllers/documentController.js');
    const res = response();
    await controller.updateDocument({ params: { id: '1' }, user: { userId: 1 }, body: {}, file: { path: 'new-asset', mimetype: 'text/plain', size: 5 } }, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(removed, references ? [] : ['old-asset']);
  }
});
