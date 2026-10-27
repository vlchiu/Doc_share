const test = require('node:test');
const assert = require('node:assert/strict');
const { loader } = require('./helpers');
const { cleanupRegistrations, expiredRegistrationWhere } = loader({ 'db.js': {} })('jobs/cleanupRegistrations.js');
const now = new Date('2026-10-17T12:00:00Z');

test('cleanup excludes verified, Google, disabled, privileged and paid accounts', () => {
  const where = expiredRegistrationWhere(now);
  assert.equal(where.created_at.lt.toISOString(), '2026-10-17T11:30:00.000Z');
  assert.equal(where.is_email_verified, false);
  assert.equal(where.google_id, null);
  assert.equal(where.is_active, true);
  assert.equal(where.role, 'USER');
  assert.equal(where.plan, 'FREE');
  assert.equal(where.plan_expires_at, null);
});

test('cleanup preserves accounts with valid OTP/reset tokens or related data', () => {
  const where = expiredRegistrationWhere(now);
  assert.equal(where.OR[0].email_verify_expires, null);
  assert.equal(where.OR[1].email_verify_expires.lte, now);
  assert.equal(where.AND[0].OR[0].reset_token_expires, null);
  assert.equal(where.AND[0].OR[1].reset_token_expires.lte, now);
  for (const relation of ['comments', 'documents', 'download_history', 'following', 'followers', 'notifications', 'payments', 'ratings', 'reports', 'saved_docs']) {
    assert.equal(Object.keys(where[relation].none).length, 0);
  }
});

test('deletion repeats all eligibility filters and limits itself to scanned IDs', async () => {
  let scan;
  const db = { user: {
    async findMany(args) { scan = args; return [{ id: 4 }, { id: 9 }]; },
    async deleteMany({ where }) {
      const { id, ...conditions } = where;
      assert.equal(JSON.stringify(conditions), JSON.stringify(scan.where));
      assert.equal(JSON.stringify(id.in), '[4,9]');
      assert.equal(scan.take, 500);
      // DB can exclude a candidate verified after the scan; propagate its actual count.
      return { count: 1 };
    },
  } };
  assert.equal((await cleanupRegistrations({ db, now })).count, 1);
});

test('empty scan never issues delete and DB failures propagate to scheduler', async () => {
  assert.equal((await cleanupRegistrations({ now, db: { user: {
    findMany: async () => [], deleteMany: () => assert.fail('must not delete'),
  } } })).count, 0);
  await assert.rejects(cleanupRegistrations({ now, db: { user: { findMany: async () => { throw new Error('DB unavailable'); } } } }), /DB unavailable/);
});
