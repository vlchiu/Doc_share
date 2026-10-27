const test = require('node:test');
const assert = require('node:assert/strict');
const { loader, response } = require('./helpers');
const target = { id: 2, role: 'USER', email: 'test@example.invalid', _count: { documents: 0, payments: 0, reports: 0 } };
function setup(user = target, failure = false) {
  let deleted = [];
  const tx = { user: { findUnique: async () => user, delete: async () => { if (failure) throw Object.assign(new Error('FK'), { code: 'P2003' }); deleted.push('user'); } } };
  for (const model of ['comment', 'rating', 'savedDocument', 'downloadHistory', 'notification', 'follow']) tx[model] = { deleteMany: async args => { deleted.push(model); assert(args.where); } };
  const db = { $transaction: async work => { const before = [...deleted]; try { return await work(tx); } catch (e) { deleted = before; throw e; } } };
  const load = loader({ 'db.js': db });
  return { run: load('controllers/adminController.js').deleteUser, deleted: () => deleted };
}
const req = () => ({ user: { role: 'ADMIN', userId: 1 }, params: { id: '2' }, body: { confirmEmail: target.email } });

test('delete user requires admin, valid ID, another account and email confirmation', async () => {
  for (const change of [r => r.user.role = 'USER', r => r.params.id = '2bad', r => r.params.id = '1', r => r.body.confirmEmail = 'wrong']) {
    const ctx = setup(); const request = req(); change(request); const res = response();
    await ctx.run(request, res);
    assert([400, 403].includes(res.statusCode)); assert.equal(ctx.deleted().length, 0);
  }
});
test('delete preserves administrators, documents, payments and reports', async () => {
  for (const user of [{ ...target, role: 'ADMIN' }, ...['documents', 'payments', 'reports'].map(key => ({ ...target, _count: { ...target._count, [key]: 1 } }))]) {
    const ctx = setup(user); const res = response(); await ctx.run(req(), res);
    assert([403, 409].includes(res.statusCode)); assert.equal(ctx.deleted().length, 0);
  }
});
test('eligible account and interactions are removed; missing account returns 404', async () => {
  const ctx = setup(); const res = response(); await ctx.run(req(), res);
  assert.equal(res.statusCode, 200); assert.equal(ctx.deleted().length, 7); assert.equal(ctx.deleted().at(-1), 'user');
  const missing = setup(null); const absent = response(); await missing.run(req(), absent); assert.equal(absent.statusCode, 404);
});
test('failed account deletion rolls back interaction deletions', async () => {
  const ctx = setup(target, true); const res = response(); await ctx.run(req(), res);
  assert.equal(res.statusCode, 409); assert.equal(ctx.deleted().length, 0);
});
