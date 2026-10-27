// Explicit opt-in, disposable local PostgreSQL only. Never uses DATABASE_URL.
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { loader, response } = require('./helpers');
const target = process.env.TEST_DATABASE_URL;
if (!target || !new URL(target).searchParams.get('host')?.startsWith('/tmp/docshare-security-pg.')) {
  throw new Error('TEST_DATABASE_URL must target a disposable /tmp/docshare-security-pg.* Unix socket');
}
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: target }) });
const env = { SEPAY_WEBHOOK_KEY: 'test-key', SEPAY_ACCOUNT_NUMBER: '123456' };
const load = loader({ 'db.js': db, 'utils/emailService.js': { sendVIPConfirmEmail: async () => {} },
  'middleware/uploadMiddleware.js': { cloudinary: {} },
  'utils/documentStorage.js': { sourceForDocument: () => ({ url: 'https://example.invalid/local-fixture' }) },
  axios: { get: async () => ({ data: Buffer.from('local test file') }) },
}, env);
const sepay = load('controllers/sepayController.js');
async function notify(id, order, changes = {}) {
  const res = response();
  await sepay.sepayWebhook({ headers: { authorization: 'Apikey test-key' }, body: {
    id, transferAmount: order.amount, accountNumber: '123456', transferType: 'in', content: order.order_id, ...changes,
  } }, res);
  return res;
}
async function main() {
  const unique = Date.now().toString();
  const user = await db.user.create({ data: { name: 'Integration', email: `integration-${unique}@example.invalid`, is_email_verified: true,
    plan_expires_at: new Date('2030-01-31T10:00:00Z') } });
  const order = await db.payment.create({ data: { order_id: 'SEPAY' + unique.padStart(24, 'A'), amount: 29000, plan_months: 1, provider: 'SEPAY', user_id: user.id } });
  const receipts = await Promise.all(Array.from({ length: 8 }, () => notify(Number(unique), order)));
  for (const res of receipts) if (res.statusCode === 500) assert.equal((await notify(Number(unique), order)).statusCode, 200); else assert.equal(res.statusCode, 200);
  assert.equal(await db.sepayReceipt.count({ where: { id: unique } }), 1);
  assert.equal((await db.user.findUnique({ where: { id: user.id } })).plan_expires_at.toISOString(), '2030-02-28T10:00:00.000Z');
  console.log('PASS PostgreSQL: 8 concurrent duplicate callbacks grant one month once.');

  const orders = await Promise.all([1, 2].map(n => db.payment.create({ data: { order_id: 'SEPAY' + (unique + n).padStart(24, 'B'), amount: 29000, plan_months: 1, provider: 'SEPAY', user_id: user.id } })));
  const outcomes = await Promise.all(orders.map((o, i) => notify(Number(unique) + i + 1, o)));
  assert(outcomes.every(r => r.statusCode === 200));
  assert.equal((await db.user.findUnique({ where: { id: user.id } })).plan_expires_at.toISOString(), '2030-04-28T10:00:00.000Z');
  console.log('PASS PostgreSQL: concurrent separate orders preserve both VIP extensions.');

  await db.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION security_test_reject_vip() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.name = 'FAIL_TEST' AND NEW.plan = 'VIP' THEN RAISE EXCEPTION 'test rollback'; END IF; RETURN NEW; END $$`);
  await db.$executeRawUnsafe(`CREATE TRIGGER security_test_reject_vip BEFORE UPDATE ON "User" FOR EACH ROW EXECUTE FUNCTION security_test_reject_vip()`);
  const failUser = await db.user.create({ data: { name: 'FAIL_TEST', email: `rollback-${unique}@example.invalid`, is_email_verified: true } });
  const failOrder = await db.payment.create({ data: { order_id: 'SEPAY' + unique.padStart(24, 'C'), amount: 29000, plan_months: 1, provider: 'SEPAY', user_id: failUser.id } });
  const failId = Number(unique) + 10;
  assert.equal((await notify(failId, failOrder)).statusCode, 500);
  assert.equal((await db.payment.findUnique({ where: { id: failOrder.id } })).status, 'PENDING');
  assert.equal(await db.sepayReceipt.count({ where: { id: String(failId) } }), 0);
  await db.user.update({ where: { id: failUser.id }, data: { name: 'RECOVERED' } });
  assert.equal((await notify(failId, failOrder)).statusCode, 200);
  await db.$executeRawUnsafe('DROP TRIGGER security_test_reject_vip ON "User"');
  await db.$executeRawUnsafe('DROP FUNCTION security_test_reject_vip()');
  console.log('PASS PostgreSQL: failed VIP write rolls back payment and receipt; retry succeeds.');

  const reader = await db.user.create({ data: { name: 'Reader', email: `reader-${unique}@example.invalid`, is_email_verified: true, monthly_downloads: 9, download_reset_at: new Date() } });
  const category = await db.category.create({ data: { name: 'Integration' } });
  const doc = await db.document.create({ data: { title: 'Test file', file_type: 'text/plain', file_url: 'fixture', user_id: user.id, category_id: category.id, status: 'APPROVED' } });
  const file = load('controllers/fileController.js');
  const downloads = await Promise.all(Array.from({ length: 6 }, async () => {
    const res = response(); await file.downloadDocumentFile({ document: doc, user: { userId: reader.id, role: 'USER', tokenVersion: reader.token_version } }, res); return res;
  }));
  assert.equal(downloads.filter(r => r.statusCode === 200).length, 1);
  assert.equal((await db.user.findUnique({ where: { id: reader.id } })).monthly_downloads, 10);
  assert.equal(await db.downloadHistory.count({ where: { user_id: reader.id } }), 1);
  console.log('PASS PostgreSQL: 6 concurrent downloads cannot exceed one remaining quota slot.');

  await db.user.update({ where: { id: reader.id }, data: { monthly_downloads: 0 } });
  const deliveryId = require('node:crypto').randomUUID();
  const previews = await Promise.all(Array.from({ length: 6 }, async () => {
    const res = response(); await file.serveDocumentFile({ get: () => deliveryId, document: doc, user: { userId: reader.id, role: 'USER', tokenVersion: reader.token_version } }, res); return res;
  }));
  assert(previews.every(r => r.statusCode === 200));
  assert.equal((await db.user.findUnique({ where: { id: reader.id } })).monthly_downloads, 1);
  assert.equal(await db.downloadHistory.count({ where: { delivery_key: deliveryId } }), 1);
  const ownerBefore = (await db.user.findUnique({ where: { id: user.id } })).monthly_downloads;
  const ownerPreview = response();
  await file.serveDocumentFile({ document: doc, user: { userId: user.id, role: 'USER', tokenVersion: user.token_version } }, ownerPreview);
  assert.equal(ownerPreview.statusCode, 200);
  assert.equal((await db.user.findUnique({ where: { id: user.id } })).monthly_downloads, ownerBefore);
  console.log('PASS PostgreSQL: duplicate preview requests charge once; owner previews are exempt.');

  const draft = await db.document.create({ data: { title: 'Draft', file_type: 'text/plain', file_url: 'private-fixture', user_id: user.id, category_id: category.id } });
  await db.savedDocument.createMany({ data: [{ user_id: reader.id, document_id: doc.id }, { user_id: reader.id, document_id: draft.id }] });
  const documents = load('controllers/documentController.js');
  const saved = response(); await documents.getSavedDocuments({ user: { userId: reader.id, role: 'USER' } }, saved);
  assert.equal(saved.data.length, 1); assert.equal(saved.data[0].file_url, undefined);
  const edit = response(); await documents.updateDocument({ params: { id: String(doc.id) }, body: { title: 'Edited' }, user: { userId: user.id, role: 'USER' } }, edit);
  assert.equal(edit.statusCode, 200); assert.equal(edit.data.document.status, 'PENDING'); assert.equal(edit.data.document.content_version, 2);
  await db.document.update({ where: { id: doc.id }, data: { deleted_at: new Date(), removed_by_admin: true } });
  const restore = response(); await documents.restoreDocument({ params: { id: String(doc.id) }, user: { userId: user.id, role: 'USER' } }, restore);
  assert.equal(restore.statusCode, 403);
  console.log('PASS PostgreSQL: saved list hides drafts; edits require moderation; owner cannot restore admin removal.');
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
